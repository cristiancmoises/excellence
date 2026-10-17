import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { acceptSaved, mayLeaveDocument } from "../src/save-state.mjs";
import { withinDirectory } from "../server/fs-path.mjs";
test("resposta de salvamento preserva título e metadados editados durante a requisição", () => {
  const live = { id: null, title: "Título mais novo", meta: { charts: [1] } },
    snapshot = { title: "Título antigo" };
  const next = acceptSaved(live, snapshot, { id: "id-1", revision: 1 });
  assert.equal(next.title, "Título mais novo");
  assert.deepEqual(next.meta.charts, [1]);
  assert.equal(next.id, "id-1");
});
test("navegação é bloqueada quando há alterações posteriores ao snapshot salvo", () => {
  assert.equal(mayLeaveDocument(5, 4), false);
  assert.equal(mayLeaveDocument(5, 5), true);
});
test("contenção de arquivos é portátil e permite raiz em Windows e POSIX", () => {
  assert.equal(withinDirectory("/app/dist", "/app/dist", path.posix), true);
  assert.equal(
    withinDirectory("/app/dist", "/app/dist/a.js", path.posix),
    true,
  );
  assert.equal(
    withinDirectory("/app/dist", "/app/dist-other/a.js", path.posix),
    false,
  );
  assert.equal(
    withinDirectory("C:\\App\\dist", "C:\\App\\dist", path.win32),
    true,
  );
  assert.equal(
    withinDirectory("C:\\App\\dist", "C:\\App\\dist\\assets\\a.js", path.win32),
    true,
  );
  assert.equal(
    withinDirectory("C:\\App\\dist", "C:\\App\\secret.txt", path.win32),
    false,
  );
});
