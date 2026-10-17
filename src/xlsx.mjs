import ExcelJS from "exceljs";
import { normalizeSheets, blankWorkbook, LIMITS } from "./workbook.mjs";
const hex = (color) => {
  if (!color) return undefined;
  const m = String(color).match(/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i);
  return m ? (m[1].length === 6 ? "FF" + m[1] : m[1]).toUpperCase() : undefined;
};
const css = (c) => (c?.argb ? "#" + c.argb.slice(-6) : undefined);
const ht = ["center", "left", "right"],
  vt = ["middle", "top", "bottom"];
export async function toXlsx(input) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Excellence";
  wb.calcProperties.fullCalcOnLoad = true;
  for (const s of normalizeSheets(input)) {
    const ws = wb.addWorksheet(s.name);
    for (const { r, c, v } of s.celldata) {
      const cell = ws.getCell(r + 1, c + 1);
      cell.value = v.f
        ? { formula: v.f.replace(/^=/, ""), result: v.v ?? undefined }
        : v.ct?.t === "inlineStr"
          ? {
              richText: (v.ct.s || []).map((x) => ({
                text: String(x.v ?? ""),
                font: {
                  bold: !!x.bl,
                  italic: !!x.it,
                  size: Number(x.fs) || 11,
                  color: hex(x.fc) ? { argb: hex(x.fc) } : undefined,
                },
              })),
            }
          : (v.v ?? null);
      cell.font = {
        name: v.ff || "Calibri",
        size: Number(v.fs) || 11,
        bold: !!v.bl,
        italic: !!v.it,
        underline: !!v.un,
        strike: !!v.cl,
        color: hex(v.fc) ? { argb: hex(v.fc) } : undefined,
      };
      if (hex(v.bg))
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: hex(v.bg) },
        };
      if (v.ct?.fa) cell.numFmt = v.ct.fa;
      cell.alignment = {
        horizontal: ht[v.ht] || "left",
        vertical: vt[v.vt] || "middle",
        wrapText: v.tb === 2,
      };
      if (v.ps?.value) cell.note = String(v.ps.value);
    }
    for (const merge of Object.values(s.config?.merge || {})) {
      const { r, c, rs, cs } = merge;
      if (r + rs <= LIMITS.rows && c + cs <= LIMITS.cols)
        ws.mergeCells(r + 1, c + 1, r + rs, c + cs);
    }
    for (const [col, width] of Object.entries(s.config?.columnlen || {}))
      if (+col < LIMITS.cols)
        ws.getColumn(+col + 1).width = Math.max(1, Number(width) / 7);
    for (const [row, height] of Object.entries(s.config?.rowlen || {}))
      if (+row < LIMITS.rows)
        ws.getRow(+row + 1).height = Number(height) * 0.75;
    if (s.frozen?.range) {
      ws.views = [
        {
          state: "frozen",
          xSplit: s.frozen.range.column_focus + 1 || 0,
          ySplit: s.frozen.range.row_focus + 1 || 0,
        },
      ];
    }
  }
  return wb.xlsx.writeBuffer();
}
export function checkZipSize(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data),
    dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length > 10 * 1024 * 1024) throw Error("Arquivo excede 10 MB.");
  let total = 0,
    entries = 0;
  for (let i = 0; i < bytes.length - 46; i++)
    if (dv.getUint32(i, true) === 0x02014b50) {
      total += dv.getUint32(i + 24, true);
      entries++;
      if (total > 64 * 1024 * 1024 || entries > 3000)
        throw Error("Arquivo XLSX descompactado excede os limites.");
      i +=
        45 +
        dv.getUint16(i + 28, true) +
        dv.getUint16(i + 30, true) +
        dv.getUint16(i + 32, true);
    }
  if (!entries) throw Error("Não é um arquivo XLSX válido.");
}
export async function fromXlsx(data) {
  checkZipSize(data);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  if (wb.worksheets.length > LIMITS.sheets)
    throw Error("Muitas abas no arquivo.");
  const warnings = [
    "A conversão XLSX não preserva macros, gráficos, tabelas dinâmicas, conexões externas, regras de validação e formatação condicional. Guarde o original.",
  ];
  const sheets = [];
  let count = 0;
  for (const ws of wb.worksheets) {
    if (ws.rowCount > LIMITS.rows || ws.columnCount > LIMITS.cols)
      throw Error("XLSX excede 10.000 linhas ou 256 colunas.");
    const s = {
      ...blankWorkbook(ws.name)[0],
      celldata: [],
      config: { merge: {}, columnlen: {}, rowlen: {} },
    };
    ws.eachRow({ includeEmpty: false }, (row, r) => {
      if (row.height) s.config.rowlen[r - 1] = row.height / 0.75;
      row.eachCell({ includeEmpty: false }, (cell, c) => {
        if (cell.isMerged && cell.master.address !== cell.address) return;
        if (++count > LIMITS.cells) throw Error("XLSX excede 100.000 células.");
        let value = cell.value;
        const v = {};
        if (cell.formula) {
          v.f = "=" + cell.formula;
          value = cell.result;
        }
        if (value instanceof Date) {
          value = (value.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
          v.ct = { t: "n", fa: cell.numFmt || "yyyy-mm-dd" };
        }
        if (value && typeof value === "object") {
          if (value.richText) {
            v.ct = {
              t: "inlineStr",
              s: value.richText.map((x) => ({
                v: x.text,
                ...(x.font?.bold ? { bl: 1 } : {}),
                ...(x.font?.italic ? { it: 1 } : {}),
                ...(x.font?.size ? { fs: x.font.size } : {}),
                ...(css(x.font?.color) ? { fc: css(x.font.color) } : {}),
              })),
            };
            value = undefined;
          } else if (value.error) value = value.error;
          else value = value.text ?? "";
        }
        if (value != null) v.v = value;
        if (cell.numFmt && v.ct?.t !== "inlineStr")
          v.ct = { t: typeof value === "number" ? "n" : "g", fa: cell.numFmt };
        const f = cell.font || {};
        if (f.bold) v.bl = 1;
        if (f.italic) v.it = 1;
        if (f.underline) v.un = 1;
        if (f.strike) v.cl = 1;
        if (f.name) v.ff = f.name;
        if (f.size) v.fs = f.size;
        if (css(f.color)) v.fc = css(f.color);
        if (css(cell.fill?.fgColor)) v.bg = css(cell.fill.fgColor);
        v.ht = ht.indexOf(cell.alignment?.horizontal);
        v.vt = vt.indexOf(cell.alignment?.vertical);
        if (cell.alignment?.wrapText) v.tb = 2;
        if (typeof cell.note === "string") v.ps = { value: cell.note };
        s.celldata.push({ r: r - 1, c: c - 1, v });
      });
    });
    for (const addr of ws.model.merges || []) {
      const m = ws.getCell(addr.split(":")[0]),
        end = ws.getCell(addr.split(":")[1]);
      s.config.merge[`${m.row - 1}_${m.col - 1}`] = {
        r: m.row - 1,
        c: m.col - 1,
        rs: end.row - m.row + 1,
        cs: end.col - m.col + 1,
      };
    }
    ws.columns.forEach((c, i) => {
      if (c.width) s.config.columnlen[i] = c.width * 7;
    });
    const view = ws.views?.find((v) => v.state === "frozen");
    if (view)
      s.frozen = {
        type: "both",
        range: {
          row_focus: (view.ySplit || 0) - 1,
          column_focus: (view.xSplit || 0) - 1,
        },
      };
    sheets.push(s);
  }
  return { sheets: normalizeSheets(sheets), warnings };
}
