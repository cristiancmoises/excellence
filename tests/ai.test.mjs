import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { assist, loadProviders, validateAssist } from "../server/ai.mjs";
const answer = {
  message: "Use a soma.",
  proposal: [{ cell: "B1", value: "=SUM(A1:A3)" }],
};
for (const kind of ["openai", "anthropic", "gemini", "ollama"])
  test(`adaptador ${kind}: HTTP real, autenticação e proposta JSON`, async (t) => {
    let received;
    const server = http.createServer(async (req, res) => {
      let data = "";
      for await (const c of req) data += c;
      received = {
        path: req.url,
        headers: req.headers,
        body: JSON.parse(data),
      };
      res.setHeader("content-type", "application/json");
      const text = JSON.stringify(answer);
      res.end(
        JSON.stringify(
          kind === "anthropic"
            ? { content: [{ type: "text", text }] }
            : kind === "gemini"
              ? { candidates: [{ content: { parts: [{ text }] } }] }
              : kind === "ollama"
                ? { message: { content: text } }
                : { choices: [{ message: { content: text } }] },
        ),
      );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    t.after(() => new Promise((r) => server.close(r)));
    const p = {
      id: kind,
      kind,
      endpoint: `http://127.0.0.1:${server.address().port}`,
      apiKey: "test-key",
      model: "test-model",
    };
    const result = await assist(p, {
      prompt: "Calcule a soma",
      selection: "A1:B3",
      cells: [{ cell: "A1", value: 5 }],
    });
    assert.deepEqual(result, answer);
    if (kind === "openai")
      assert.equal(received.headers.authorization, "Bearer test-key");
    if (kind === "anthropic")
      assert.equal(received.headers["x-api-key"], "test-key");
    if (kind === "gemini")
      assert.equal(received.headers["x-goog-api-key"], "test-key");
    if (kind === "ollama") assert.equal(received.body.stream, false);
    assert.match(JSON.stringify(received.body), /Calcule a soma/);
  });
test("configuração rejeita protocolos externos e seleção excessiva", () => {
  assert.throws(() =>
    loadProviders({
      EXCELLENCE_LLM_PROVIDERS: JSON.stringify([
        { id: "x", kind: "openai", endpoint: "file:///etc/passwd", model: "m" },
      ]),
    }),
  );
  assert.throws(() =>
    validateAssist({ prompt: "test", selection: "A1:Z1000", cells: [] }),
  );
});
test("resposta fora da seleção nunca vira proposta aplicável", async (t) => {
  const server = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: "x",
                proposal: [{ cell: "Z99", value: 3 }],
              }),
            },
          },
        ],
      }),
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  await assert.rejects(
    assist(
      {
        kind: "openai",
        endpoint: `http://127.0.0.1:${server.address().port}`,
        model: "m",
      },
      { prompt: "test", selection: "A1", cells: [] },
    ),
    /fora da seleção/,
  );
});
