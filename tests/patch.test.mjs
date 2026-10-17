import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { patchSource, patchReactSource } from "../scripts/patch-fortune.mjs";
test("inserção de linhas opera sem new Function e mantém clones independentes", () => {
  const src = readFileSync(
    "node_modules/@fortune-sheet/core/dist/index.esm.js",
    "utf8",
  );
  const result = patchSource(src);
  assert.ok(!result.includes('new Function("d", "return d.'));
  assert.equal(patchSource(result), result);
});
test("clipboard fallback uses page memory instead of shared account/demo storage", () => {
  const core = patchSource(readFileSync("node_modules/@fortune-sheet/core/dist/index.esm.js", "utf8"));
  const react = patchReactSource(readFileSync("node_modules/@fortune-sheet/react/dist/index.esm.js", "utf8"));
  assert.ok(!core.includes('sessionStorage.setItem("localClipboard"'));
  assert.ok(!react.includes('sessionStorage.getItem("localClipboard"'));
  assert.ok(core.includes('export let excellenceLocalClipboard = "";'));
  assert.ok(react.includes('import { excellenceLocalClipboard } from "@fortune-sheet/core";'));
  assert.equal(patchReactSource(react), react);
  assert.throws(() => patchReactSource("changed dependency"), /FortuneSheet mudou/);
});
