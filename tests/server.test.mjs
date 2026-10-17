import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
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
