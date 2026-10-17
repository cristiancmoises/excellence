import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  mkdirSync,
  readFileSync,
  statSync,
  existsSync,
  chmodSync,
} from "node:fs";
import { resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSheets, normalizeMeta } from "../src/shared.mjs";
import { loadProviders, assist, validateAssist, validateDemoAssist, AssistError } from "./ai.mjs";
import { createAiGuard } from "./ai-limits.mjs";
import { withinDirectory } from "./fs-path.mjs";
import { requestLanguage, translateError } from "../src/error-messages.mjs";
const scrypt = promisify(scryptCb),
  sha = (x) => createHash("sha256").update(x).digest("hex"),
  random = () => randomBytes(32).toString("hex");
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
const fail = (s, m, e) => {
  throw new HttpError(s, m, e);
};
const credential = (username, password) => {
  if (typeof username !== "string" || !/^[a-zA-Z0-9_.-]{3,48}$/.test(username))
    fail(400, "Usuário: 3 a 48 letras, números, ponto, hífen ou sublinhado.");
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 256
  )
    fail(400, "Use uma senha de 12 a 256 caracteres.");
  return username.toLowerCase();
};
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return salt + ":" + hash.toString("hex");
}
async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const actual = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
export async function createApp(options = {}) {
  const env = options.env || process.env;
  const dataDir = resolve(
    options.dataDir || env.EXCELLENCE_DATA_DIR || join(root, "data"),
  );
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(dataDir, "excellence.sqlite"));
  try {
    chmodSync(join(dataDir, "excellence.sqlite"), 0o600);
  } catch {}
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS workbooks(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS versions(workbook_id TEXT NOT NULL REFERENCES workbooks(id) ON DELETE CASCADE,revision INTEGER NOT NULL,title TEXT NOT NULL,payload TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(workbook_id,revision));
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT,action TEXT NOT NULL,target TEXT,created TEXT NOT NULL);
 PRAGMA user_version=1;`);
  const setupToken =
    options.setupToken || env.EXCELLENCE_SETUP_TOKEN || random();
  const providers = options.providers || loadProviders(env);
  const acquireAi = createAiGuard(db);
  const infer = async (provider, input, response, release, demo = false, language = "en") => {
    const controller = new AbortController();
    const disconnected = () => {
      if (!response.writableEnded) controller.abort();
    };
    response.once("close", disconnected);
    if (response.destroyed) controller.abort();
    let uncertain = false;
    try {
      return await assist(provider, input, { demo, signal: controller.signal, language });
    } catch (error) {
      uncertain = error.inferenceUncertain === true;
      throw error;
    } finally {
      response.off("close", disconnected);
      // A cancelled HTTP request does not prove provider computation stopped.
      // Keep the persistent lease until its bounded expiry on transport failure.
      if (!uncertain) release();
    }
  };
  const publicUrl = env.EXCELLENCE_PUBLIC_URL
    ? new URL(env.EXCELLENCE_PUBLIC_URL)
    : null;
  const secure =
    env.EXCELLENCE_SECURE_COOKIE === "true" || publicUrl?.protocol === "https:";
  const allowedHosts = new Set([
    "localhost",
    "127.0.0.1",
    "[::1]",
    ...(env.EXCELLENCE_ALLOWED_HOSTS || "").split(",").filter(Boolean),
    ...(publicUrl ? [publicUrl.hostname] : []),
  ]);
  const limits = new Map();
  const rate = (key, max = 120) => {
    const now = Date.now();
    let b = limits.get(key);
    if (!b || b.until < now) {
      b = { count: 0, until: now + 60000 };
      limits.set(key, b);
    }
    if (++b.count > max) fail(429, "Muitas tentativas. Aguarde um minuto.");
    if (limits.size > 10000) {
      for (const [k, v] of limits) if (v.until < now) limits.delete(k);
      if (limits.size > 10000) limits.clear();
    }
  };
  const audit = (actor, action, target) => {
    db.prepare(
      "INSERT INTO audit(actor,action,target,created)VALUES(?,?,?,?)",
    ).run(actor, action, target, new Date().toISOString());
    db.exec(
      "DELETE FROM audit WHERE id < (SELECT COALESCE(MAX(id),0)-10000 FROM audit)",
    );
  };
  const tx = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      db.exec("COMMIT");
      return value;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  const shape = (input) => {
    if (
      typeof input.title !== "string" ||
      !input.title.trim() ||
      input.title.length > 120
    )
      fail(400, "Título obrigatório, até 120 caracteres.");
    const sheets = normalizeSheets(input.sheets),
      meta = normalizeMeta(input.meta || {});
    const payload = JSON.stringify({ sheets, meta });
    if (Buffer.byteLength(payload) > 8 * 1024 * 1024)
      fail(413, "A pasta de trabalho excede 8 MB.");
    return { title: input.title.trim(), payload };
  };
  const document = (r) => ({
    id: r.id,
    title: r.title,
    revision: r.revision,
    updated: r.updated,
    ...JSON.parse(r.payload),
  });
  const recordVersion = (id, rev, title, payload) => {
    db.prepare("INSERT INTO versions VALUES(?,?,?,?,?)").run(
      id,
      rev,
      title,
      payload,
      new Date().toISOString(),
    );
    db.prepare("DELETE FROM versions WHERE workbook_id=? AND revision<=?").run(
      id,
      rev - 20,
    );
  };
  const body = async (req, maxBytes = 9 * 1024 * 1024) => {
    if (
      !String(req.headers["content-type"] || "").startsWith("application/json")
    )
      fail(415, "Use application/json.");
    if (Number(req.headers["content-length"]) > maxBytes)
      fail(413, "Corpo muito grande.");
    const parts = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxBytes) fail(413, "Corpo muito grande.");
      parts.push(chunk);
    }
    try {
      const data = JSON.parse(Buffer.concat(parts).toString("utf8"));
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw Error();
      return data;
    } catch {
      fail(400, "JSON inválido.");
    }
  };
  const server = http.createServer(async (req, res) => {
    const language = requestLanguage(req.headers["accept-language"]);
    const send = (status, data) => {
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "content-language": language,
      });
      res.end(JSON.stringify(typeof data.error === "string"
        ? { ...data, error: translateError(data.error, language) } : data));
    };
    try {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
      );
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
      const host = req.headers.host;
      if (!host) fail(400, "Host obrigatório.");
      let hostname;
      try {
        hostname = new URL("http://" + host).hostname;
      } catch {
        fail(400, "Host inválido.");
      }
      if (!allowedHosts.has(hostname))
        fail(
          403,
          "Host não autorizado. Configure EXCELLENCE_PUBLIC_URL no servidor.",
        );
      const url = new URL(req.url, "http://" + host),
        path = url.pathname,
        method = req.method;
      if (path === "/health") {
        return send(200, {
          status: "ok",
          app: "excellence",
          version: "0.1.0-rc.1",
        });
      }
      if (path.startsWith("/api/")) {
        res.setHeader("Cache-Control", "no-store");
        rate("api:" + req.socket.remoteAddress, 600);
        const mutation = !["GET", "HEAD"].includes(method);
        if (mutation) {
          const expected = publicUrl?.origin || "http://" + host;
          if (req.headers.origin !== expected)
            fail(403, "Origem não autorizada.");
          if (req.headers["sec-fetch-site"] === "cross-site")
            fail(403, "Requisição entre sites bloqueada.");
        }
        if (path === "/api/demo/ai/assist" && method === "POST") {
          const provider = providers.find((p) => p.kind === "ollama");
          if (env.EXCELLENCE_DEMO_AI !== "true" || !provider)
            fail(503, "O assistente da demonstração está indisponível.");
          const input = validateDemoAssist(await body(req, 2048));
          // Forwarded headers and cookies are deliberately not trusted here.
          // With a reverse proxy, visitors share the proxy's source budget.
          const source = sha(req.socket.remoteAddress || "unknown");
          const release = acquireAi(source, true);
          try {
            return send(200, await infer(provider, input, res, release, true, language));
          } catch (error) {
            return send(502, { error: error instanceof AssistError
              ? error.message : "Não foi possível obter uma proposta válida do modelo local." });
          }
        }
        const rawCookie = String(req.headers.cookie || "")
          .split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith("excellence_session="))
          ?.split("=")[1];
        const session = rawCookie
          ? db
              .prepare(
                "SELECT s.*,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
              )
              .get(sha(rawCookie), Date.now())
          : null;
        const user = session
          ? {
              id: session.user_id,
              username: session.username,
              role: session.role,
            }
          : null;
        const newSession = (u) => {
          const token = random(),
            csrf = random();
          db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
          db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(
            sha(token),
            u.id,
            csrf,
            Date.now() + 12 * 3600000,
          );
          db.prepare(
            "DELETE FROM sessions WHERE user_id=? AND token NOT IN (SELECT token FROM sessions WHERE user_id=? ORDER BY expires DESC LIMIT 10)",
          ).run(u.id, u.id);
          res.setHeader(
            "Set-Cookie",
            `excellence_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure ? "; Secure" : ""}`,
          );
          return {
            user: { id: u.id, username: u.username, role: u.role },
            csrf,
          };
        };
        if (path === "/api/session" && method === "GET")
          return send(200, {
            user,
            csrf: session?.csrf || null,
            setupRequired: !db.prepare("SELECT 1 FROM users LIMIT 1").get(),
          });
        if (path === "/api/setup" && method === "POST") {
          rate("setup:" + req.socket.remoteAddress, 10);
          if (db.prepare("SELECT 1 FROM users LIMIT 1").get())
            fail(409, "Instalação já configurada.");
          const input = await body(req);
          if (
            typeof input.token !== "string" ||
            sha(input.token) !== sha(setupToken)
          )
            fail(403, "Token de instalação inválido.");
          const username = credential(input.username, input.password),
            password = await hashPassword(input.password);
          const u = { id: randomUUID(), username, role: "admin" };
          tx(() => {
            if (db.prepare("SELECT 1 FROM users LIMIT 1").get())
              fail(409, "Instalação já configurada.");
            db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
              u.id,
              username,
              password,
              "admin",
              new Date().toISOString(),
            );
          });
          audit(u.id, "setup", u.id);
          return send(201, newSession(u));
        }
        if (path === "/api/login" && method === "POST") {
          rate("login:" + req.socket.remoteAddress, 10);
          const input = await body(req);
          if (
            typeof input.username !== "string" ||
            typeof input.password !== "string" ||
            input.password.length > 256
          )
            fail(401, "Usuário ou senha incorretos.");
          const u = db
            .prepare("SELECT * FROM users WHERE username=?")
            .get(input.username.toLowerCase());
          const valid = await verifyPassword(
            input.password,
            u?.password ||
              "00000000000000000000000000000000:" + "00".repeat(64),
          );
          if (!u || !valid) fail(401, "Usuário ou senha incorretos.");
          audit(u.id, "login", u.id);
          return send(200, newSession(u));
        }
        if (!user) fail(401, "Entre para continuar.");
        if (mutation && req.headers["x-csrf-token"] !== session.csrf)
          fail(403, "Token CSRF inválido. Atualize a página.");
        if (path === "/api/logout" && method === "POST") {
          db.prepare("DELETE FROM sessions WHERE token=?").run(session.token);
          res.setHeader(
            "Set-Cookie",
            `excellence_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? "; Secure" : ""}`,
          );
          return send(200, { ok: true });
        }
        if (path === "/api/password" && method === "POST") {
          rate("password:" + user.id, 5);
          const input = await body(req);
          credential(user.username, input.password);
          const u = db
            .prepare("SELECT password FROM users WHERE id=?")
            .get(user.id);
          if (
            typeof input.current !== "string" ||
            !(await verifyPassword(input.current, u.password))
          )
            fail(403, "Senha atual incorreta.");
          const password = await hashPassword(input.password);
          tx(() => {
            db.prepare("UPDATE users SET password=? WHERE id=?").run(
              password,
              user.id,
            );
            db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
          });
          audit(user.id, "password", user.id);
          return send(200, newSession(user));
        }
        if (path === "/api/users") {
          if (user.role !== "admin")
            fail(403, "Acesso de administrador necessário.");
          if (method === "GET")
            return send(200, {
              users: db
                .prepare(
                  "SELECT id,username,role,created FROM users ORDER BY username",
                )
                .all(),
            });
          if (method === "POST") {
            const input = await body(req),
              username = credential(input.username, input.password);
            if (
              db.prepare("SELECT 1 FROM users WHERE username=?").get(username)
            )
              fail(409, "Usuário já existe.");
            if (db.prepare("SELECT COUNT(*) AS n FROM users").get().n >= 100)
              fail(409, "Limite de 100 usuários.");
            const password = await hashPassword(input.password),
              id = randomUUID();
            try {
              db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
                id,
                username,
                password,
                "user",
                new Date().toISOString(),
              );
            } catch {
              fail(409, "Usuário já existe.");
            }
            audit(user.id, "user.create", id);
            return send(201, { id, username, role: "user" });
          }
        }
        const userMatch = path.match(/^\/api\/users\/([a-f0-9-]+)$/);
        if (userMatch && method === "DELETE") {
          if (user.role !== "admin")
            fail(403, "Acesso de administrador necessário.");
          if (userMatch[1] === user.id)
            fail(400, "Não é possível remover sua própria conta.");
          db.prepare("DELETE FROM users WHERE id=? AND role!=?").run(
            userMatch[1],
            "admin",
          );
          audit(user.id, "user.delete", userMatch[1]);
          return send(200, { ok: true });
        }
        if (path === "/api/audit" && method === "GET") {
          if (user.role !== "admin")
            fail(403, "Acesso de administrador necessário.");
          return send(200, {
            events: db
              .prepare(
                "SELECT a.*,u.username FROM audit a LEFT JOIN users u ON u.id=a.actor ORDER BY a.id DESC LIMIT 100",
              )
              .all(),
          });
        }
        if (path === "/api/workbooks") {
          if (method === "GET")
            return send(200, {
              workbooks: db
                .prepare(
                  "SELECT id,title,revision,updated FROM workbooks WHERE user_id=? ORDER BY updated DESC",
                )
                .all(user.id),
            });
          if (method === "POST") {
            const input = await body(req),
              s = shape(input),
              id = randomUUID(),
              updated = new Date().toISOString();
            tx(() => {
              const quota = db
                .prepare(
                  "SELECT COUNT(*) AS n,COALESCE(SUM(length(payload)),0) AS bytes FROM workbooks WHERE user_id=?",
                )
                .get(user.id);
              if (
                quota.n >= 100 ||
                quota.bytes + s.payload.length > 50 * 1024 * 1024
              )
                fail(
                  413,
                  "Cota de 100 arquivos ou 50 MB por usuário atingida.",
                );
              db.prepare("INSERT INTO workbooks VALUES(?,?,?,?,?,?)").run(
                id,
                user.id,
                s.title,
                1,
                s.payload,
                updated,
              );
              recordVersion(id, 1, s.title, s.payload);
            });
            audit(user.id, "workbook.create", id);
            return send(201, { id, title: s.title, revision: 1, updated });
          }
        }
        const match = path.match(
          /^\/api\/workbooks\/([a-f0-9-]+)(?:\/(versions|restore))?$/,
        );
        if (match) {
          const id = match[1],
            r = db
              .prepare("SELECT * FROM workbooks WHERE id=? AND user_id=?")
              .get(id, user.id);
          if (!r) fail(404, "Arquivo não encontrado.");
          if (method === "GET" && !match[2]) return send(200, document(r));
          if (method === "GET" && match[2] === "versions")
            return send(200, {
              versions: db
                .prepare(
                  "SELECT revision,title,created FROM versions WHERE workbook_id=? ORDER BY revision DESC",
                )
                .all(id),
            });
          if (method === "DELETE" && !match[2]) {
            db.prepare("DELETE FROM workbooks WHERE id=? AND user_id=?").run(
              id,
              user.id,
            );
            audit(user.id, "workbook.delete", id);
            return send(200, { ok: true });
          }
          if (
            (method === "PUT" && !match[2]) ||
            (method === "POST" && match[2] === "restore")
          ) {
            const input = await body(req);
            if (input.revision !== r.revision)
              fail(
                409,
                "Arquivo alterado em outra sessão. Reabra ou salve uma cópia.",
                { revision: r.revision },
              );
            let s;
            if (match[2] === "restore") {
              const v = db
                .prepare(
                  "SELECT title,payload FROM versions WHERE workbook_id=? AND revision=?",
                )
                .get(id, input.version);
              if (!v) fail(404, "Versão não encontrada.");
              s = v;
            } else s = shape(input);
            const preserved =
              match[2] === "restore" && input.preserveCurrent
                ? shape(input.preserveCurrent)
                : null;
            const revision = r.revision + (preserved ? 2 : 1),
              updated = new Date().toISOString();
            tx(() => {
              const quota = db
                .prepare(
                  "SELECT COALESCE(SUM(length(payload)),0) AS bytes FROM workbooks WHERE user_id=? AND id!=?",
                )
                .get(user.id, id);
              if (quota.bytes + s.payload.length > 50 * 1024 * 1024)
                fail(413, "Cota de armazenamento atingida.");
              const changed = db
                .prepare(
                  "UPDATE workbooks SET title=?,payload=?,revision=?,updated=? WHERE id=? AND revision=?",
                )
                .run(s.title, s.payload, revision, updated, id, r.revision);
              if (!changed.changes)
                fail(409, "Arquivo alterado por outra sessão.");
              if (preserved)
                recordVersion(
                  id,
                  r.revision + 1,
                  preserved.title,
                  preserved.payload,
                );
              recordVersion(id, revision, s.title, s.payload);
            });
            audit(
              user.id,
              match[2] === "restore" ? "workbook.restore" : "workbook.save",
              id,
            );
            return send(
              200,
              match[2] === "restore"
                ? {
                    id,
                    title: s.title,
                    revision,
                    updated,
                    ...JSON.parse(s.payload),
                  }
                : { id, revision, updated },
            );
          }
        }
        if (path === "/api/ai/providers" && method === "GET")
          return send(200, {
            providers: providers.map((p) => ({
              id: p.id,
              label: p.label || p.id,
              model: p.model,
              kind: p.kind,
            })),
          });
        if (path === "/api/ai/assist" && method === "POST") {
          rate("ai:" + user.id, 10);
          const input = await body(req);
          validateAssist(input);
          const p = providers.find((p) => p.id === input.provider);
          if (!p) fail(400, "Provedor não configurado.");
          const release = acquireAi(user.id);
          try {
            const result = await infer(p, input, res, release, false, language);
            audit(user.id, "ai.assist", p.id);
            return send(200, result);
          } catch (e) {
            return send(502, {
              error:
                e instanceof AssistError
                  ? e.message
                  : "Não foi possível obter uma proposta válida do provedor.",
            });
          }
        }
        fail(404, "Endpoint não encontrado.");
      }
      if (!["GET", "HEAD"].includes(method)) fail(405, "Método não permitido.");
      const dist = resolve(options.distDir || join(root, "dist"));
      let file = path === "/demo" || path === "/demo/"
        ? join(dist, "index.html")
        : resolve(dist, "." + decodeURIComponent(path));
      if (!withinDirectory(dist, file)) fail(404, "Arquivo não encontrado.");
      if (!existsSync(file) || !statSync(file).isFile()) {
        if (extname(path)) fail(404, "Arquivo não encontrado.");
        file = join(dist, "index.html");
      }
      if (!existsSync(file))
        fail(503, "Execute npm run build antes de iniciar.");
      const mime =
        {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".json": "application/json",
          ".woff2": "font/woff2",
        }[extname(file)] || "application/octet-stream";
      res.setHeader(
        "Cache-Control",
        file.includes("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
      res.writeHead(200, { "content-type": mime });
      res.end(method === "HEAD" ? undefined : readFileSync(file));
    } catch (e) {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (e.retryAfter) res.setHeader("Retry-After", String(e.retryAfter));
      send(e.status || 400, {
        error: e.status
          ? e.message
          : e.message?.startsWith("SQLITE")
            ? "Falha ao salvar dados."
            : String(e.message || "Requisição inválida.").slice(0, 250),
        ...e.extra,
      });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.maxHeadersCount = 50;
  let closed = false;
  return {
    server,
    db,
    setupToken,
    needsSetup: () => !db.prepare("SELECT 1 FROM users LIMIT 1").get(),
    dataDir,
    async close() {
      if (closed) return;
      closed = true;
      if (server.listening) await new Promise((r) => server.close(r));
      db.close();
    },
  };
}
