import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { normalizeBooleanLiterals } from "../src/formula-input.mjs";
const edits = [
  [
    'sessionStorage.setItem("localClipboard", plainText);',
    "excellenceLocalClipboard = plainText;",
  ],
  [
    "delFunctionGroup(ctx, row, column);\n    setCellValue(ctx, row, column, data, value);",
    "delFunctionGroup(ctx, row, column);\n    execFunctionGroup(ctx, row, column, value);\n    setCellValue(ctx, row, column, data, value);",
  ],
  [
    "delFunctionGroup(ctx, row, column);\n      setCellValue(ctx, row, column, data, value);",
    "delFunctionGroup(ctx, row, column);\n      execFunctionGroup(ctx, row, column, value);\n      setCellValue(ctx, row, column, data, value);",
  ],
  [
    "function normalizeSelection(ctx, selection) {\n  if (!selection) return selection;",
    "function normalizeSelection(ctx, selection) {\n  if (!selection) return selection;\n  selection = _.cloneDeep(selection);",
  ],
  [
    'new Function("d", "return d.unshift(".concat(arr.join(","), ")"))(d);',
    "d.unshift(...arr.map(x => JSON.parse(x)));",
  ],
  [
    'new Function("d", "return d.splice(".concat(index, ", 0, ").concat(arr.join(","), ")"))(d);',
    "d.splice(index, 0, ...arr.map(x => JSON.parse(x)));",
  ],
  [
    'new Function("d", "return d.splice(".concat(index + 1, ", 0, ").concat(arr.join(","), ")"))(d);',
    "d.splice(index + 1, 0, ...arr.map(x => JSON.parse(x)));",
  ],
];
export function patchSource(source) {
  let out = source;
  for (const [before, after] of edits) {
    if (out.includes(after)) continue;
    if (out.includes(before)) out = out.replace(before, after);
    else
      throw Error("FortuneSheet mudou. Revise o patch CSP antes de compilar.");
  }
  const clipboard = 'export let excellenceLocalClipboard = "";';
  if (!out.includes(clipboard)) out += "\n" + clipboard + "\n";
  const localeStart = "function locale(ctx) {";
  const localeBranch = 'if (ctx.lang === "pt-BR" && excellencePortugueseLocale) return excellencePortugueseLocale;';
  if (!out.includes(localeStart))
    throw Error("FortuneSheet mudou. Revise o registro de idioma antes de compilar.");
  if (!out.includes(localeBranch))
    out = out.replace(localeStart, localeStart + "\n  " + localeBranch);
  const localeExport = "export function excellenceSetPortugueseLocale(value) { excellencePortugueseLocale = value; }";
  if (!out.includes(localeExport))
    out += "\nlet excellencePortugueseLocale;\n" + localeExport + "\n";
  return out;
}
export function patchReactSource(source) {
  const before = 'sessionStorage.getItem("localClipboard")';
  const imported = 'import { excellenceLocalClipboard } from "@fortune-sheet/core";';
  let out = source;
  if (!out.includes(imported) || out.includes(before)) {
    if (!out.includes(before))
      throw Error("FortuneSheet mudou. Revise o fallback de clipboard antes de compilar.");
    out = imported + "\n" + out.replaceAll(before, "excellenceLocalClipboard")
      .replace("Attempting to use sessionStorage fallback.", "Attempting to use in-memory fallback.");
  }
  // The pinned build hardcodes Chinese text for these accessible toolbar labels.
  for (const [original, localized] of [
    ['text: "\\u5408\\u5E76\\u5355\\u5143\\u683C",', 'text: toolbar["merge-cell"],'],
    ['text: "\\u8FB9\\u6846\\u8BBE\\u7F6E",', 'text: toolbar.border,'],
    ['d: getPath(currency),', 'd: getPath(currency === "R$" ? "$" : currency),'],
  ]) {
    if (out.includes(localized)) continue;
    if (!out.includes(original)) throw Error("FortuneSheet toolbar changed. Review the locale patch before building.");
    out = out.replace(original, localized);
  }
  return out;
}
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const path = "node_modules/@fortune-sheet/core/dist/index.esm.js";
  writeFileSync(path, patchSource(readFileSync(path, "utf8")));
  const reactPath = "node_modules/@fortune-sheet/react/dist/index.esm.js";
  writeFileSync(reactPath, patchReactSource(readFileSync(reactPath, "utf8")));
  for (const format of ["es", "lib"]) {
    const dividePath =
      "node_modules/@fortune-sheet/formula-parser/" +
      format +
      "/evaluate-by-operator/operator/divide.js";
    const divideBody =
      'function func(first,...rest){return rest.reduce((acc,value)=>acc instanceof Error?acc:excellenceFormulaJS.DIVIDE(acc,value),first); }\nfunc.SYMBOL="/";\n';
    writeFileSync(
      dividePath,
      format === "es"
        ? 'import * as excellenceFormulaJS from "@formulajs/formulajs";\nexport var SYMBOL="/";\nexport default ' +
            divideBody
        : '"use strict";Object.defineProperty(exports,"__esModule",{value:true});var excellenceFormulaJS=require("@formulajs/formulajs");\n' +
            divideBody +
            'exports.default=func;exports.SYMBOL="/";\n',
    );
    const path =
      "node_modules/@fortune-sheet/formula-parser/" + format + "/parser.js";
    let src = readFileSync(path, "utf8");
    if (!src.includes("excellenceNormalizeBooleans(expression)")) {
      const before = "this.parser.parse(expression)";
      if (!src.includes(before))
        throw Error("Parser de fórmulas mudou. Revise o patch.");
      src = src.replace(
        before,
        "this.parser.parse(excellenceNormalizeBooleans(expression))",
      );
      src +=
        "\n" +
        normalizeBooleanLiterals
          .toString()
          .replace("normalizeBooleanLiterals", "excellenceNormalizeBooleans") +
        "\n";
      writeFileSync(path, src);
    }
  }
  console.log(
    "FortuneSheet: patches de CSP, seleção imutável, literais lógicos e erro de divisão aplicados.",
  );
}
