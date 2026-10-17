import test from "node:test";
import assert from "node:assert/strict";
import {
  blankWorkbook,
  normalizeSheets,
  parseRange,
  buildPivot,
  csvImport,
  csvExport,
  validateProposal,
} from "../src/workbook.mjs";
import { toXlsx, fromXlsx } from "../src/xlsx.mjs";

test("normalização compacta preserva fórmulas e estilos e rejeita áreas abusivas", () => {
  const s = normalizeSheets([
    {
      id: "s1",
      name: "Dados",
      data: [[{ v: 3 }, { f: "=A1*2", v: 6, bg: "#ff0000" }]],
      row: 100,
      column: 26,
    },
  ]);
  assert.equal(s[0].celldata[1].v.f, "=A1*2");
  assert.equal(s[0].data, undefined);
  assert.throws(() =>
    normalizeSheets([
      { id: "s", name: "S", celldata: [{ r: 1000000, c: 0, v: { v: 1 } }] },
    ]),
  );
  assert.throws(() =>
    normalizeSheets([
      { id: "s", name: "S" },
      { id: "s", name: "Outra" },
    ]),
  );
});
test("áreas A1 aceitam absolutas e rejeitam coordenadas inválidas", () => {
  assert.deepEqual(parseRange("$B$2:D4"), { r1: 1, c1: 1, r2: 3, c2: 3 });
  assert.throws(() => parseRange("A0"));
  assert.throws(() => parseRange("A1:XFD999999"));
});
test("CSV real preserva aspas, vírgulas, unicode e quebras de linha", () => {
  const sheet = csvImport('Nome,Nota\r\n"São, Paulo","linha 1\nlinha 2"');
  assert.equal(
    sheet.celldata.find((c) => c.r === 1 && c.c === 0).v.v,
    "São, Paulo",
  );
  const again = csvImport(csvExport(sheet));
  assert.equal(
    again.celldata.find((c) => c.r === 1 && c.c === 1).v.v,
    "linha 1\nlinha 2",
  );
});
test("CSV neutraliza fórmulas e prefixos perigosos por padrão", () => {
  const s = {
    id: "x",
    name: "S",
    celldata: [
      { r: 0, c: 0, v: { v: '=HYPERLINK("x")' } },
      { r: 0, c: 1, v: { f: "=1+1", v: 2 } },
      { r: 0, c: 2, v: { v: "+cmd" } },
    ],
  };
  const csv = csvExport(s);
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /'\+cmd/);
  assert.match(csv, /,2,/);
});
test("pivô agrupa valores numéricos sem concatenar strings", () => {
  const s = csvImport("Região,Total\nSul,10\nNorte,7\nSul,20");
  const pivot = buildPivot(s, 0, 1, "sum");
  assert.equal(pivot.celldata.find((c) => c.r === 1 && c.c === 1).v.v, 30);
  assert.equal(pivot.celldata.find((c) => c.r === 2 && c.c === 1).v.v, 7);
});
test("propostas IA só alteram seleção, sem fórmulas externas ou comandos", () => {
  assert.deepEqual(
    validateProposal([{ cell: "B2", value: "=SUM(A1:A3)" }], "B2:C3"),
    [{ cell: "B2", value: "=SUM(A1:A3)" }],
  );
  assert.throws(() => validateProposal([{ cell: "A1", value: 3 }], "B2:C3"));
  assert.throws(() =>
    validateProposal(
      [{ cell: "B2", value: '=WEBSERVICE("https://x")' }],
      "B2:C3",
    ),
  );
  assert.throws(() =>
    validateProposal([{ cell: "B2", value: { code: "abc" } }], "B2:C3"),
  );
});
test("XLSX roundtrip preserva valor, fórmula, número, fonte, merge e abas", async () => {
  const sheets = blankWorkbook();
  sheets[0].name = "Orçamento";
  sheets[0].celldata = [
    {
      r: 0,
      c: 0,
      v: { v: 5, bl: 1, fc: "#00ffff", ct: { fa: "0.00", t: "n" } },
    },
    { r: 1, c: 0, v: { f: "=A1*2", v: 10, ct: { fa: "0.00", t: "n" } } },
    { r: 3, c: 0, v: { v: "Título" } },
  ];
  sheets[0].config = {
    merge: { "3_0": { r: 3, c: 0, rs: 1, cs: 2 } },
    columnlen: { 0: 160 },
  };
  sheets.push({
    id: "extra",
    name: "Resumo",
    row: 100,
    column: 26,
    celldata: [{ r: 0, c: 0, v: { v: true } }],
  });
  const data = await toXlsx(sheets);
  assert.ok(data.byteLength > 1000);
  const result = await fromXlsx(data);
  assert.equal(result.sheets.length, 2);
  const s = result.sheets[0];
  assert.equal(s.name, "Orçamento");
  assert.equal(s.celldata.find((c) => c.r === 1 && c.c === 0).v.f, "=A1*2");
  assert.equal(s.celldata.find((c) => c.r === 0 && c.c === 0).v.bl, 1);
  assert.equal(s.celldata.find((c) => c.r === 0 && c.c === 0).v.ct.fa, "0.00");
  assert.equal(s.config.merge["3_0"].cs, 2);
});
test("texto rico e multilinha não desaparece em matriz, CSV ou XLSX", async () => {
  const sheet = {
    id: "rich",
    name: "Texto",
    celldata: [
      {
        r: 0,
        c: 0,
        v: {
          ct: {
            t: "inlineStr",
            s: [{ v: "Texto importante", bl: 1 }, { v: "\nsegunda linha" }],
          },
        },
      },
    ],
  };
  const csv = csvExport(sheet);
  assert.match(csv, /Texto importante/);
  assert.match(csv, /segunda linha/);
  const data = await toXlsx([sheet]);
  const result = await fromXlsx(data);
  const text = result.sheets[0].celldata[0].v;
  assert.equal(
    text.ct.s.map((x) => x.v).join(""),
    "Texto importante\nsegunda linha",
  );
  assert.equal(text.ct.s[0].bl, 1);
});
test("mesclagens e metadados inválidos são rejeitados antes de abrir o editor", async () => {
  const { normalizeMeta } = await import("../src/shared.mjs");
  assert.throws(() =>
    normalizeSheets([
      {
        id: "x",
        name: "S",
        config: { merge: { bad: { r: 0, c: 0, rs: 1000000, cs: 5 } } },
      },
    ]),
  );
  assert.throws(() => normalizeMeta({ charts: { not: "an array" } }));
  assert.throws(() =>
    normalizeMeta({
      charts: [{ id: "x", range: "A0:B2", type: "bar", sheetId: "s" }],
    }),
  );
  assert.equal(normalizeMeta({ charts: [] }).charts.length, 0);
});
test('células marcadas como numéricas preservam tipo numérico nos arquivos e no backup local',()=>{const s=normalizeSheets([{id:'n',name:'S',celldata:[{r:0,c:0,v:{v:'913',ct:{t:'n',fa:'General'}}},{r:0,c:1,v:{v:'00123',ct:{t:'s',fa:'@'}}}]}])[0];assert.equal(s.celldata[0].v.v,913);assert.equal(s.celldata[1].v.v,'00123');});
