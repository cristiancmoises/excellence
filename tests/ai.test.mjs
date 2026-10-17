import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { assist, loadProviders, validateAssist } from "../server/ai.mjs";
import { validateProposal } from "../src/shared.mjs";
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
    if (kind === "ollama") {
      assert.equal(received.body.stream, false);
      assert.equal(received.body.format.type, "object");
      assert.deepEqual(received.body.format.required, ["message", "proposal"]);
      assert.equal(received.body.options.num_ctx, 4096);
      assert.equal(received.body.options.num_predict, 768);
      assert.equal(received.body.options.temperature, 0);
      assert.equal(received.body.options.num_thread, 2);
    }
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

test("valida células e minimiza o conteúdo enviado", () => {
  const input = { prompt: "Explique", selection: "A1:B2", cells: [{ cell: "$a$1", value: 5, hidden: "private" }], workbook: "private" };
  assert.deepEqual(validateAssist(input), {
    prompt: "Explique", selection: "A1:B2", cells: [{ cell: "A1", value: 5 }],
  });
  for (const cells of [
    [{ cell: "Z1", value: 1 }],
    [{ cell: "A1:B1", value: 1 }],
    [{ cell: "A1", value: {} }],
    [{ cell: "A1", value: Infinity }],
    [{ cell: "A1", value: 1 }, { cell: "$a$1", value: 2 }],
    [null],
  ]) assert.throws(() => validateAssist({ ...input, cells }));
});

async function localProvider(t, reply, status = 200) {
  let received;
  const server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    received = JSON.parse(raw);
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(reply));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return {
    provider: { kind: "ollama", model: "qwen3.5:2b", endpoint: `http://127.0.0.1:${server.address().port}` },
    received: () => received,
  };
}
const smallInput = { prompt: "Some A1:A3 em B1", selection: "A1:B3", cells: [{ cell: "A1", value: 5 }] };

test('assistant instructions use English by default and Portuguese only when selected', async (t) => {
  const local = await localProvider(t, { message: { content: JSON.stringify(answer) }, done: true });
  await assist(local.provider, smallInput);
  assert.match(local.received().messages[0].content, /one short sentence in English/);
  assert.doesNotMatch(local.received().messages[0].content, /one short sentence in Brazilian Portuguese/);
  await assist(local.provider, smallInput, { language: 'pt-BR' });
  assert.match(local.received().messages[0].content, /one short sentence in Brazilian Portuguese/);
  assert.deepEqual(JSON.parse(local.received().messages[1].content).cells, smallInput.cells);
});

test("Ollama local usa Qwen leve sem raciocínio e envia somente a seleção", async (t) => {
  const local = await localProvider(t, { message: { content: JSON.stringify(answer), thinking: "private reasoning" }, done: true });
  const result = await assist(local.provider, { ...smallInput, workbook: "private", cells: [{ ...smallInput.cells[0], extra: "private" }] });
  assert.deepEqual(result, answer);
  assert.equal(local.received().think, false);
  assert.deepEqual(local.received().options, { num_predict: 768, num_ctx: 4096, temperature: 0, num_thread: 2, presence_penalty: 0, frequency_penalty: 0, repeat_penalty: 1 });
  assert.deepEqual(JSON.parse(local.received().messages[1].content), { task: smallInput.prompt, selection: smallInput.selection, cells: smallInput.cells });
});

test("Ollama rejeita entrada além do contexto antes de chamar o modelo", async (t) => {
  const local = await localProvider(t, {});
  await assert.rejects(assist(local.provider, { ...smallInput, prompt: "a".repeat(6000) }), /contexto local.*reduza/i);
  assert.equal(local.received(), undefined);
});

for (const [name, reply, expected] of [
  ["JSON incompleto", { message: { content: '{"proposal":[' } }, /JSON válido/],
  ["JSON nulo", { message: { content: "null" } }, /formato esperado/],
  ["proposta inválida", { message: { content: JSON.stringify({ message: "x", proposal: "bad" }) } }, /100 células/],
  ["resposta truncada", { message: { content: JSON.stringify(answer) }, done_reason: "length" }, /limite de resposta/],
  ["fórmula não permitida", { message: { content: JSON.stringify({ message: "x", proposal: [{ cell: "B1", value: '=CUSTOMFUNC(A1)' }] }) } }, /função.*permitida/],
  ["função Unicode não permitida", { message: { content: JSON.stringify({ message: "x", proposal: [{ cell: "B1", value: '=λSUM(A1)' }] }) } }, /função.*permitida/],
  ["acesso externo", { message: { content: JSON.stringify({ message: "x", proposal: [{ cell: "B1", value: '=WEBSERVICE("https://example.org")' }] }) } }, /externas/],
]) test(`Ollama rejeita ${name} sem alterações aplicáveis`, async (t) => {
  const local = await localProvider(t, reply);
  await assert.rejects(assist(local.provider, smallInput), expected);
});

test("Ollama indisponível retorna instrução sem expor erro remoto", async (t) => {
  const local = await localProvider(t, { error: "private diagnostic" }, 404);
  await assert.rejects(assist(local.provider, smallInput), (error) => {
    assert.match(error.message, /modelo.*instalado/i);
    assert.doesNotMatch(error.message, /private diagnostic/);
    return true;
  });
});

test("falha de conexão retorna mensagem útil", async (t) => {
  const local = await localProvider(t, {});
  await assert.rejects(assist({ ...local.provider, endpoint: "http://127.0.0.1:1" }, smallInput), /Ollama.*indisponível/);
});

test("Ollama tem limite de tempo e erro sem detalhes internos", async (t) => {
  const local = await localProvider(t, {});
  t.mock.method(AbortSignal, "timeout", (milliseconds) => {
    assert.equal(milliseconds, 90000);
    return AbortSignal.abort(new DOMException("private diagnostic", "TimeoutError"));
  });
  await assert.rejects(assist(local.provider, smallInput), /excedeu 90 segundos/);
  assert.equal(local.received(), undefined);
});

test("Ollama rejeita respostas excessivas", async (t) => {
  const local = await localProvider(t, { message: { content: "a".repeat(128001) } });
  await assert.rejects(assist(local.provider, smallInput), /excede o limite/);
});

test("modelo local padrão e rótulo refletem configuração", () => {
  const [provider] = loadProviders({ OLLAMA_BASE_URL: "http://ollama:11434" });
  assert.equal(provider.model, "qwen3.5:2b-q4_K_M");
  assert.equal(provider.label, "Qwen3.5 2B · local");
  assert.equal(loadProviders({ OLLAMA_BASE_URL: "http://ollama:11434", OLLAMA_MODEL: "custom" })[0].label, "Local Ollama");
});

test("threads Ollama são limitadas a 1–4 e configuráveis pelo operador", async (t) => {
  const env = { OLLAMA_BASE_URL: "http://ollama:11434", OLLAMA_NUM_THREAD: "3" };
  assert.equal(loadProviders(env)[0].numThread, 3);
  assert.equal(loadProviders({ OLLAMA_BASE_URL: env.OLLAMA_BASE_URL })[0].numThread, 2);
  for (const value of ["0", "5", "1.5", "bad", "", true])
    assert.throws(() => loadProviders({ ...env, OLLAMA_NUM_THREAD: value }), /OLLAMA_NUM_THREAD/);
  const local = await localProvider(t, { message: { content: JSON.stringify(answer) } });
  await assist({ ...local.provider, numThread: 3 }, smallInput);
  assert.equal(local.received().options.num_thread, 3);
});

test("resposta IF incompleta observada no modelo real nunca vira proposta", async (t) => {
  const local = await localProvider(t, { message: { content: JSON.stringify({
    message: "Use IF", proposal: [{ cell: "A1", value: "=IF(A1>10, " }, { cell: "B1", value: "Não" }],
  }) } });
  await assert.rejects(assist(local.provider, smallInput), /incompleta|parênteses|aspas/);
});

test("propostas normalizam coordenadas e rejeitam variantes repetidas", () => {
  assert.deepEqual(validateProposal([{ cell: "$a$1", value: 1 }], "A1:B2"), [{ cell: "A1", value: 1 }]);
  for (const cell of ["a1", "$A$1", "A1:A1"])
    assert.throws(() => validateProposal([{ cell: "A1", value: 1 }, { cell, value: 2 }], "A1:B2"), /repetidas/);
});

test("propostas rejeitam fórmulas incompletas e autorreferências inequívocas", () => {
  for (const value of ['=IF(A2>10,"Sim","Não"', '=SUM(A2))', '="incompleta', "='Aba!A2", "=IF(A1>10,1,0)", "=$A$1+2", "=SUM(A1:A5)", "=SUM(A2:A1)"])
    assert.throws(() => validateProposal([{ cell: "A1", value }], "A1:B5"));
  for (const value of ['=IF(A2>10,"Sim","Não")', '=IF(A2="A1","texto ""(citado)""",0)', "='Aba A1'!A1", "=S1!A1", '=SUM(A2:A5)'])
    assert.equal(validateProposal([{ cell: "A1", value }], "A1:B5")[0].value, value);
});

test("demo tem prazo menor e rejeita mais de cinco alterações", async (t) => {
  const local = await localProvider(t, { message: { content: JSON.stringify({ message: "x", proposal: ["A1", "A2", "A3", "B1", "B2", "B3"].map((cell) => ({ cell, value: 1 })) }) } });
  await assert.rejects(assist(local.provider, smallInput, { demo: true }), /no máximo 5/);
  t.mock.method(AbortSignal, "timeout", (milliseconds) => {
    assert.equal(milliseconds, 30000);
    return AbortSignal.abort(new DOMException("timeout", "TimeoutError"));
  });
  await assert.rejects(assist(local.provider, smallInput, { demo: true }), /excedeu 30 segundos/);
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
