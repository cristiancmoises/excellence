import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";
const sheets = [
  {
    id: "s1",
    name: "Dados",
    row: 100,
    column: 26,
    celldata: [{ r: 0, c: 0, v: { v: 42 } }],
  },
];
async function fixture(t, options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "excellence-test-"));
  const app = await createApp({
    dataDir: dir,
    setupToken: "test-setup-token",
    ...options,
  });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  t.after(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const client = () => ({
    cookie: "",
    csrf: "",
    async call(path, method = "GET", body, extra = {}) {
      const r = await fetch(base + path, {
        method,
        headers: {
          "content-type": "application/json",
          origin: base,
          ...(this.cookie ? { cookie: this.cookie } : {}),
          ...(this.csrf ? { "x-csrf-token": this.csrf } : {}),
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const sc = r.headers.get("set-cookie");
      if (sc) this.cookie = sc.split(";")[0];
      const data = await r.json();
      if (data.csrf) this.csrf = data.csrf;
      return { status: r.status, data, headers: r.headers };
    },
  });
  return { app, base, client, dir };
}
async function admin(c) {
  return c.call("/api/setup", "POST", {
    token: "test-setup-token",
    username: "admin",
    password: "Long-Admin-Password-42",
  });
}
test("setup exige token, só ocorre uma vez e cookie protege sessão", async (t) => {
  const { client } = await fixture(t);
  const c = client();
  assert.equal(
    (
      await c.call("/api/setup", "POST", {
        token: "wrong",
        username: "admin",
        password: "Long-Admin-Password-42",
      })
    ).status,
    403,
  );
  const r = await admin(c);
  assert.equal(r.status, 201);
  assert.match(r.headers.get("set-cookie"), /HttpOnly/);
  assert.ok(c.csrf);
  assert.equal((await admin(client())).status, 409);
  assert.equal((await c.call("/api/session")).data.user.username, "admin");
});
test("login rejeita senha incorreta e logout revoga sessão", async (t) => {
  const { client } = await fixture(t);
  const c = client();
  await admin(c);
  await c.call("/api/logout", "POST", {});
  assert.equal((await c.call("/api/workbooks")).status, 401);
  assert.equal(
    (
      await c.call("/api/login", "POST", {
        username: "admin",
        password: "invalid",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await c.call("/api/login", "POST", {
        username: "admin",
        password: "Long-Admin-Password-42",
      })
    ).status,
    200,
  );
});
test("CSRF e Origin bloqueiam gravação sem alterar dados", async (t) => {
  const { client } = await fixture(t);
  const c = client();
  await admin(c);
  const token = c.csrf;
  c.csrf = "";
  assert.equal(
    (await c.call("/api/workbooks", "POST", { title: "X", sheets })).status,
    403,
  );
  c.csrf = token;
  assert.equal(
    (
      await c.call(
        "/api/workbooks",
        "POST",
        { title: "X", sheets },
        { origin: "https://attacker.example" },
      )
    ).status,
    403,
  );
  assert.equal((await c.call("/api/workbooks")).data.workbooks.length, 0);
});
test("salvamento otimista, versões, restore e isolamento entre usuários", async (t) => {
  const { client } = await fixture(t);
  const a = client();
  await admin(a);
  const created = await a.call("/api/workbooks", "POST", {
    title: "Financeiro",
    sheets,
  });
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(
    (
      await a.call(`/api/workbooks/${id}`, "PUT", {
        title: "Novo",
        sheets,
        revision: 1,
      })
    ).data.revision,
    2,
  );
  assert.equal(
    (
      await a.call(`/api/workbooks/${id}`, "PUT", {
        title: "Velho",
        sheets,
        revision: 1,
      })
    ).status,
    409,
  );
  const hist = await a.call(`/api/workbooks/${id}/versions`);
  assert.equal(hist.data.versions.length, 2);
  const restored = await a.call(`/api/workbooks/${id}/restore`, "POST", {
    version: 1,
    revision: 2,
  });
  assert.equal(restored.data.title, "Financeiro");
  assert.equal(restored.data.revision, 3);
  assert.equal(
    (
      await a.call("/api/users", "POST", {
        username: "editor",
        password: "Long-Editor-Password-42",
      })
    ).status,
    201,
  );
  const b = client();
  await b.call("/api/login", "POST", {
    username: "editor",
    password: "Long-Editor-Password-42",
  });
  assert.equal((await b.call(`/api/workbooks/${id}`)).status, 404);
  assert.equal((await b.call(`/api/workbooks/${id}`, "DELETE")).status, 404);
  assert.equal((await b.call("/api/users")).status, 403);
});
test("IA não expõe chaves e não altera planilhas sem aplicar proposta", async (t) => {
  const { client } = await fixture(t, {
    providers: [
      {
        id: "mock",
        label: "Teste",
        kind: "openai",
        endpoint: "http://127.0.0.1:1",
        model: "x",
        apiKey: "SUPERSECRET",
      },
    ],
  });
  const c = client();
  await admin(c);
  const p = await c.call("/api/ai/providers");
  assert.equal(p.status, 200);
  assert.ok(!JSON.stringify(p.data).includes("SUPERSECRET"));
  assert.ok(!JSON.stringify(p.data).includes("endpoint"));
  const r = await c.call("/api/ai/assist", "POST", {
    provider: "unknown",
    prompt: "test",
    selection: "A1",
    cells: [],
  });
  assert.equal(r.status, 400);
});
test("IA local exige sessão, retorna proposta sem gravar e informa indisponibilidade", async (t) => {
  let requests = 0;
  const model = http.createServer((req, res) => {
    requests++;
    req.resume();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: { content: JSON.stringify({
      message: "Soma sugerida.", proposal: [{ cell: "B1", value: "=SUM(A1:A3)" }],
    }) } }));
  });
  await new Promise((resolve) => model.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => model.close(resolve)));
  const { client } = await fixture(t, { providers: [
    { id: "local", kind: "ollama", model: "qwen3.5:2b-q4_K_M", endpoint: `http://127.0.0.1:${model.address().port}` },
    { id: "offline", kind: "ollama", model: "qwen3.5:2b-q4_K_M", endpoint: "http://127.0.0.1:1" },
  ] });
  const c = client();
  const input = { provider: "local", prompt: "Some A1:A3 em B1", selection: "A1:B3", cells: [{ cell: "A1", value: 42 }] };
  assert.equal((await c.call("/api/ai/assist", "POST", input)).status, 401);
  assert.equal(requests, 0);
  await admin(c);
  const before = await c.call("/api/workbooks");
  const result = await c.call("/api/ai/assist", "POST", input);
  assert.equal(result.status, 200);
  assert.equal(result.data.proposal[0].value, "=SUM(A1:A3)");
  assert.deepEqual((await c.call("/api/workbooks")).data, before.data);
  assert.equal(requests, 1);
  const unavailable = await c.call("/api/ai/assist", "POST", { ...input, provider: "offline" });
  assert.equal(unavailable.status, 502);
  assert.match(unavailable.data.error, /Ollama local indisponível/);
  assert.doesNotMatch(unavailable.data.error, /127\.0\.0\.1/);
});
test("corpo inválido e planilha excessiva retornam erro controlado", async (t) => {
  const { client } = await fixture(t);
  const c = client();
  await admin(c);
  assert.equal(
    (
      await c.call("/api/workbooks", "POST", {
        title: "x",
        sheets: [{ name: "x", celldata: [{ r: -1, c: 0, v: { v: 5 } }] }],
      })
    ).status,
    400,
  );
  assert.equal(
    (await c.call("/api/workbooks", "POST", { title: "", sheets })).status,
    400,
  );
});
test("SQLite mantém pastas de trabalho ao reabrir a aplicação", async (t) => {
  const { client, app, dir } = await fixture(t);
  const c = client();
  await admin(c);
  const { data } = await c.call("/api/workbooks", "POST", {
    title: "Persistente",
    sheets,
  });
  await app.close();
  const reopened = await createApp({ dataDir: dir, setupToken: "other" });
  assert.equal(
    reopened.db.prepare("SELECT title FROM workbooks WHERE id=?").get(data.id)
      .title,
    "Persistente",
  );
  await reopened.close();
});
test("URL inicial serve index e assets sem liberar travessia de diretório", async (t) => {
  const { base } = await fixture(t);
  const r = await fetch(base + "/");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<title>Excellence/);
  const missing = await fetch(base + "/missing.js");
  assert.equal(missing.status, 404);
  const secret = await fetch(base + "/%2e%2e%2fserver/app.mjs");
  assert.equal(secret.status, 404);
});
test("demo pública serve o aplicativo sem liberar gravações, IA ou uploads", async (t) => {
  const dist = mkdtempSync(join(tmpdir(), "excellence-demo-dist-"));
  t.after(() => rmSync(dist, { recursive: true, force: true }));
  writeFileSync(join(dist, "index.html"), "<!doctype html><title>Excellence</title>");
  // An unrelated build artifact must never shadow the explicit demo entry.
  writeFileSync(join(dist, "demo"), "not the application");
  const { base, client } = await fixture(t, { distDir: dist });
  const root = await fetch(base + "/");
  const html = await root.text();
  for (const path of ["/demo", "/demo/"]) {
    const demo = await fetch(base + path);
    assert.equal(demo.status, 200);
    assert.equal(await demo.text(), html);
    for (const header of ["content-security-policy", "x-content-type-options", "referrer-policy", "cache-control"])
      assert.equal(demo.headers.get(header), root.headers.get(header));
    assert.match(demo.headers.get("content-security-policy"), /default-src/);
  }
  const c = client();
  assert.equal((await c.call("/api/workbooks")).status, 401);
  assert.equal((await c.call("/api/workbooks", "POST", { title: "Demo", sheets })).status, 401);
  assert.equal((await c.call("/api/ai/assist", "POST", { provider: "local", prompt: "test", selection: "A1", cells: [] })).status, 401);
  const form = new FormData();
  form.set("file", new Blob(["private contents"]), "workbook.csv");
  assert.equal((await fetch(base + "/demo/upload", { method: "POST", body: form })).status, 405);
  assert.equal((await fetch(base + "/api/upload", { method: "POST", headers: { origin: base }, body: form })).status, 401);
});

test("demo IA exige origem, limita uso persistente e ignora IPs e cookies forjados", async (t) => {
  let calls = 0, received;
  const model = http.createServer(async (req, res) => {
    calls++;
    let raw = "";
    for await (const chunk of req) raw += chunk;
    received = JSON.parse(raw);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: { content: JSON.stringify({ message: "Soma", proposal: [{ cell: "A3", value: "=SUM(A1:A2)" }] }) } }));
  });
  await new Promise((resolve) => model.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => model.close(resolve)));
  const { base, client } = await fixture(t, {
    env: { EXCELLENCE_DEMO_AI: "true" },
    providers: [{ id: "local", kind: "ollama", model: "qwen3.5:2b-q4_K_M", endpoint: `http://127.0.0.1:${model.address().port}` }],
  });
  const input = { prompt: "Some A1 e A2 em A3", selection: "A1:A3", cells: [{ cell: "A1", value: 2 }, { cell: "A2", value: 3 }] };
  const c = client();
  assert.equal((await c.call("/api/demo/ai/assist", "POST", input, { origin: "https://attacker.invalid" })).status, 403);
  assert.equal((await c.call("/api/demo/ai/assist", "POST", input, { origin: "" })).status, 403);
  assert.equal((await c.call("/api/demo/ai/assist", "POST", input, { "sec-fetch-site": "cross-site" })).status, 403);
  for (const extra of [{ prompt: "x".repeat(301) }, { selection: "A1:A21" }, { provider: "paid" }, { cells: [{ cell: "A1", value: "x".repeat(1600) }] }])
    assert.equal((await c.call("/api/demo/ai/assist", "POST", { ...input, ...extra })).status, 400);
  assert.equal((await c.call("/api/demo/ai/assist", "POST", { ...input, prompt: "x".repeat(3000) })).status, 413);
  assert.equal(calls, 0);
  for (let i = 0; i < 3; i++) {
    const result = await c.call("/api/demo/ai/assist", "POST", input, { "x-forwarded-for": `192.0.2.${i}`, "x-real-ip": `198.51.100.${i}`, cookie: `excellence_session=fake${i}` });
    assert.equal(result.status, 200);
    assert.equal(result.data.proposal[0].cell, "A3");
  }
  const limited = await c.call("/api/demo/ai/assist", "POST", input, { "x-forwarded-for": "203.0.113.200" });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(calls, 3);
  assert.equal(received.options.num_predict, 256);
  assert.equal(received.format.properties.proposal.maxItems, 5);
  assert.equal((await c.call("/api/ai/assist", "POST", input)).status, 401);
  assert.equal((await c.call("/api/workbooks")).status, 401);
  assert.equal((await fetch(base + "/api/demo/ai/assist")).status, 401);
});

test("demo IA desativada ou sem modelo local falha fechada", async (t) => {
  for (const options of [{ env: {} }, { env: { EXCELLENCE_DEMO_AI: "true" }, providers: [] }]) {
    const { client } = await fixture(t, options);
    assert.equal((await client().call("/api/demo/ai/assist", "POST", { prompt: "x", selection: "A1", cells: [] })).status, 503);
  }
});

test("consultas públicas e privadas compartilham uma inferência sem fila", async (t) => {
  let calls = 0, finish, started;
  const observed = new Promise((resolve) => { started = resolve; });
  const held = new Promise((resolve) => { finish = resolve; });
  const model = http.createServer(async (req, res) => {
    req.resume();
    calls++;
    if (calls === 1) { started(); await held; }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: { content: '{"message":"Olá","proposal":[]}' } }));
  });
  await new Promise((resolve) => model.listen(0, "127.0.0.1", resolve));
  t.after(() => { finish(); model.closeAllConnections(); return new Promise((resolve) => model.close(resolve)); });
  const { client } = await fixture(t, {
    env: { EXCELLENCE_DEMO_AI: "true" },
    providers: [{ id: "local", kind: "ollama", model: "qwen3.5:2b-q4_K_M", endpoint: `http://127.0.0.1:${model.address().port}` }],
  });
  const account = client(), anonymous = client();
  await admin(account);
  const input = { prompt: "Explique", selection: "A1", cells: [] };
  const pending = anonymous.call("/api/demo/ai/assist", "POST", input);
  await observed;
  assert.equal((await account.call("/api/ai/assist", "POST", { ...input, provider: "local" })).status, 503);
  assert.equal((await anonymous.call("/api/demo/ai/assist", "POST", input)).status, 503);
  assert.equal(calls, 1);
  finish();
  assert.equal((await pending).status, 200);
  assert.equal((await account.call("/api/ai/assist", "POST", { ...input, provider: "local" })).status, 200);
  assert.equal(calls, 2);
  assert.deepEqual((await account.call("/api/workbooks")).data.workbooks, []);
});

test("falhas do modelo consomem cota demo e não prendem a inferência", async (t) => {
  let calls = 0;
  const model = http.createServer((req, res) => { calls++; req.resume(); res.writeHead(404); res.end("not installed"); });
  await new Promise((resolve) => model.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => model.close(resolve)));
  const { client } = await fixture(t, {
    env: { EXCELLENCE_DEMO_AI: "true" },
    providers: [{ id: "local", kind: "ollama", model: "missing", endpoint: `http://127.0.0.1:${model.address().port}` }],
  });
  const c = client(), input = { prompt: "x", selection: "A1", cells: [] };
  for (let i = 0; i < 3; i++) assert.equal((await c.call("/api/demo/ai/assist", "POST", input)).status, 502);
  assert.equal((await c.call("/api/demo/ai/assist", "POST", input)).status, 429);
  assert.equal(calls, 3);
});

test("timeout incerto preserva reserva e bloqueia nova chamada ao provedor", async (t) => {
  let calls = 0;
  const model = http.createServer(async (req, res) => {
    for await (const chunk of req) {}
    calls++;
    // Simulate a provider that continues processing after its socket closes.
    setTimeout(() => res.end('{"message":{"content":"{}"}}'), 120);
  });
  await new Promise((resolve) => model.listen(0, "127.0.0.1", resolve));
  t.after(() => { model.closeAllConnections(); return new Promise((resolve) => model.close(resolve)); });
  const originalTimeout = AbortSignal.timeout;
  t.mock.method(AbortSignal, "timeout", () => originalTimeout(35));
  const { app, client } = await fixture(t, {
    env: { EXCELLENCE_DEMO_AI: "true" },
    providers: [{ id: "local", kind: "ollama", model: "qwen3.5:2b-q4_K_M", endpoint: `http://127.0.0.1:${model.address().port}` }],
  });
  const input = { prompt: "x", selection: "A1", cells: [] }, c = client();
  assert.equal((await c.call("/api/demo/ai/assist", "POST", input)).status, 502);
  assert.equal((await c.call("/api/demo/ai/assist", "POST", input)).status, 503);
  assert.equal(calls, 1);
  assert.equal(app.db.prepare("SELECT count(*) AS n FROM ai_inference_lease").get().n, 1);
});

test("desconexão do cliente cancela o transporte e preserva a reserva", async (t) => {
  let started, disconnected;
  const observed = new Promise((resolve) => { started = resolve; });
  const closed = new Promise((resolve) => { disconnected = resolve; });
  const model = http.createServer(async (req, res) => {
    for await (const chunk of req) {}
    res.once("close", disconnected);
    started();
  });
  await new Promise((resolve) => model.listen(0, "127.0.0.1", resolve));
  t.after(() => { model.closeAllConnections(); return new Promise((resolve) => model.close(resolve)); });
  const { app, base, client } = await fixture(t, {
    env: { EXCELLENCE_DEMO_AI: "true" },
    providers: [{ id: "local", kind: "ollama", model: "qwen3.5:2b-q4_K_M", endpoint: `http://127.0.0.1:${model.address().port}` }],
  });
  const request = http.request(base + "/api/demo/ai/assist", { method: "POST", headers: { origin: base, "content-type": "application/json" } });
  request.on("error", () => {});
  request.end(JSON.stringify({ prompt: "x", selection: "A1", cells: [] }));
  await observed;
  request.destroy();
  await Promise.race([closed, new Promise((_, reject) => { const timer = setTimeout(() => reject(Error("Provider transport was not cancelled")), 1000); timer.unref(); })]);
  assert.equal(app.db.prepare("SELECT count(*) AS n FROM ai_inference_lease").get().n, 1);
  assert.equal((await client().call("/api/demo/ai/assist", "POST", { prompt: "x", selection: "A1", cells: [] })).status, 503);
});
test("restore preserva alterações atuais sem perder a versão mais antiga retida", async (t) => {
  const { client } = await fixture(t);
  const c = client();
  await admin(c);
  const created = (
    await c.call("/api/workbooks", "POST", { title: "Original", sheets })
  ).data;
  for (let rev = 1; rev < 20; rev++)
    assert.equal(
      (
        await c.call("/api/workbooks/" + created.id, "PUT", {
          title: "Revisão " + (rev + 1),
          sheets,
          revision: rev,
        })
      ).status,
      200,
    );
  const result = await c.call(
    "/api/workbooks/" + created.id + "/restore",
    "POST",
    {
      version: 1,
      revision: 20,
      preserveCurrent: { title: "Alteração pendente", sheets, meta: {} },
    },
  );
  assert.equal(result.status, 200);
  assert.equal(result.data.title, "Original");
  assert.equal(result.data.revision, 22);
  const prior = c;
  const versions = (
    await prior.call("/api/workbooks/" + created.id + "/versions")
  ).data.versions;
  assert.equal(
    versions.find((v) => v.revision === 21).title,
    "Alteração pendente",
  );
});
