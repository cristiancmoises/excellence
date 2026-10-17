import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { patchSource, patchReactSource, patchContextMenuSource } from "../scripts/patch-fortune.mjs";
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
  assert.ok(react.includes('text: toolbar["merge-cell"],'));
  assert.ok(react.includes('text: toolbar.border,'));
  assert.ok(react.includes('d: getPath(currency === "R$" ? "$" : currency),'));
  assert.equal(patchReactSource(react), react);
  assert.throws(() => patchReactSource("changed dependency"), /FortuneSheet mudou/);
});
test("Portuguese locale registration is explicit, guarded and idempotent", () => {
  const core = patchSource(readFileSync("node_modules/@fortune-sheet/core/dist/index.esm.js", "utf8"));
  assert.ok(core.includes("export function excellenceSetPortugueseLocale(value)"));
  assert.ok(core.includes('if (ctx.lang === "pt-BR" && excellencePortugueseLocale) return excellencePortugueseLocale;'));
  assert.equal(patchSource(core), core);
  assert.throws(() => patchSource(core.replace("function locale(ctx)", "function changedLocale(ctx)")), /FortuneSheet/);
});
test("native menu integration is guarded and idempotent", () => {
  const original = readFileSync("node_modules/@fortune-sheet/react/dist/index.esm.js", "utf8");
  const patched = patchContextMenuSource(original);
  assert.equal(patchContextMenuSource(patched), patched);
  assert.ok(patched.includes("excellencePositionContextMenu"));
  assert.ok(patched.includes("noHistory: true, logPatch: false"));
  assert.throws(() => patchContextMenuSource(original.replace("var ContextMenu = function ContextMenu()", "var ChangedMenu = function ChangedMenu()")), /FortuneSheet context menu/);
  assert.throws(() => patchContextMenuSource(original.replace("className: \"fortune-context-menu luckysheet-cols-menu\"", "className: \"changed-menu\"")), /FortuneSheet context menu/);
});
