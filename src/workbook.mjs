import Papa from "papaparse";
import {
  normalizeSheets,
  blankWorkbook,
  sheetMatrix,
  LIMITS,
  cellScalar,
} from "./shared.mjs";
export * from "./shared.mjs";
export function csvImport(text, name = "Dados CSV") {
  const result = Papa.parse(String(text).replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    dynamicTyping: true,
  });
  if (result.errors.some((e) => e.type === "Quotes"))
    throw Error("CSV com aspas incompletas.");
  if (result.data.length > LIMITS.rows)
    throw Error("CSV excede 10.000 linhas.");
  const celldata = [];
  result.data.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v !== null && v !== "") celldata.push({ r, c, v: { v } });
    }),
  );
  return normalizeSheets([{ ...blankWorkbook(name)[0], celldata }])[0];
}
export function csvExport(sheet, formulas = false) {
  const s = normalizeSheets([sheet])[0],
    matrix = sheetMatrix(s);
  for (const { r, c, v } of s.celldata) {
    let value = formulas && v.f ? v.f : cellScalar(v);
    if (typeof value === "string" && /^[\s]*[=+@\-\t\r]/.test(value))
      value = "'" + value;
    matrix[r][c] = value;
  }
  return "\uFEFF" + Papa.unparse(matrix, { newline: "\r\n" });
}
