import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { patchSource } from "../scripts/patch-fortune.mjs";
test("inserção de linhas opera sem new Function e mantém clones independentes", () => {
  const src = readFileSync(
    "node_modules/@fortune-sheet/core/dist/index.esm.js",
    "utf8",
  );
  const result = patchSource(src);
  assert.ok(!result.includes('new Function("d", "return d.'));
  assert.equal(patchSource(result), result);
});
