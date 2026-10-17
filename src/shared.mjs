export const LIMITS = { rows: 10000, cols: 256, cells: 100000, sheets: 30 };
export const uid = () => crypto.randomUUID();
export function blankWorkbook(name = "Planilha 1") {
  return [
    {
      id: uid(),
      name,
      status: 1,
      order: 0,
      row: 200,
      column: 26,
      celldata: [],
      config: {},
    },
  ];
}
export function columnName(n) {
  let s = "";
  for (n++; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
export function parseRange(input) {
  const m = String(input)
    .trim()
    .toUpperCase()
    .replaceAll("$", "")
    .match(/^([A-Z]{1,3})([1-9]\d*)(?::([A-Z]{1,3})([1-9]\d*))?$/);
  if (!m) throw Error("Intervalo inválido. Use A1:B10.");
  const col = (s) =>
    [...s].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const a = [
    Number(m[2]) - 1,
    col(m[1]),
    Number(m[4] || m[2]) - 1,
    col(m[3] || m[1]),
  ];
  if (a[2] >= LIMITS.rows || a[3] >= LIMITS.cols || a[0] > a[2] || a[1] > a[3])
    throw Error("Intervalo fora do limite (10.000 linhas, 256 colunas).");
  return { r1: a[0], c1: a[1], r2: a[2], c2: a[3] };
}
export function normalizeSheets(sheets) {
  if (!Array.isArray(sheets) || !sheets.length || sheets.length > LIMITS.sheets)
    throw Error("Número de abas inválido (1–30).");
  const ids = new Set(),
    names = new Set();
  let count = 0;
  return sheets.map((raw, i) => {
    if (!raw || typeof raw !== "object") throw Error("Aba inválida.");
    const s = JSON.parse(JSON.stringify(raw));
    s.id = String(s.id || uid());
    s.name = String(s.name || `Planilha ${i + 1}`).trim();
    if (
      s.id.length > 100 ||
      ids.has(s.id) ||
      !s.name ||
      s.name.length > 31 ||
      /[\\/?*\[\]:]/.test(s.name) ||
      names.has(s.name.toLowerCase())
    )
      throw Error("Nome ou identificador de aba inválido ou repetido.");
    ids.add(s.id);
    names.add(s.name.toLowerCase());
    if (s.data) {
      if (!Array.isArray(s.data) || s.data.length > LIMITS.rows)
        throw Error("Planilha muito grande.");
      s.celldata = [];
      s.data.forEach((row, r) => {
        if (!row) return;
        if (!Array.isArray(row) || row.length > LIMITS.cols)
          throw Error("Muitas colunas.");
        row.forEach((v, c) => {
          if (v != null)
            s.celldata.push({ r, c, v: typeof v === "object" ? v : { v } });
        });
      });
      delete s.data;
    }
    if (!Array.isArray(s.celldata || [])) throw Error("Células inválidas.");
    const seen = new Set();
    s.celldata = (s.celldata || [])
      .filter((c) => c?.v != null)
      .map((cell) => {
        const { r, c } = cell;
        if (
          !Number.isInteger(r) ||
          !Number.isInteger(c) ||
          r < 0 ||
          c < 0 ||
          r >= LIMITS.rows ||
          c >= LIMITS.cols ||
          seen.has(`${r}:${c}`)
        )
          throw Error("Coordenada de célula inválida ou repetida.");
        seen.add(`${r}:${c}`);
        if (++count > LIMITS.cells)
          throw Error("Limite de 100.000 células preenchidas.");
        const v = typeof cell.v === "object" ? cell.v : { v: cell.v };
        if (v.f != null && (typeof v.f !== "string" || v.f.length > 8192))
          throw Error("Fórmula inválida.");
        if (
          v.v != null &&
          !["number", "string", "boolean"].includes(typeof v.v)
        )
          throw Error("Valor de célula inválido.");
        if (typeof v.v === "string" && v.v.length > 32767)
          throw Error("Texto de célula muito longo.");
        if(v.ct?.t==='n'&&v.ct.fa!=='@'&&typeof v.v==='string'&&v.v.trim()!==''&&Number.isFinite(Number(v.v)))v.v=Number(v.v);
      if (v.m == null && v.v != null) v.m = String(v.v);
        if (!v.ct && v.v != null)
          v.ct = { fa: "General", t: typeof v.v === "number" ? "n" : "g" };
        return { r, c, v };
      });
    s.row = Math.max(
      100,
      Math.min(LIMITS.rows, Number(s.row) || 200),
      ...s.celldata.map((c) => c.r + 1),
    );
    s.column = Math.max(
      26,
      Math.min(LIMITS.cols, Number(s.column) || 26),
      ...s.celldata.map((c) => c.c + 1),
    );
    s.calcChain = s.celldata
      .filter((c) => c.v.f)
      .map((c) => ({ r: c.r, c: c.c, id: s.id }));
    delete s.luckysheet_select_save;
    delete s.luckysheet_selection_range;
    s.order = i;
    s.status = raw.status === 1 ? 1 : 0;
    s.config = s.config || {};
    for (const m of Object.values(s.config.merge || {})) {
      if (
        !m ||
        ![m.r, m.c, m.rs, m.cs].every(Number.isInteger) ||
        m.r < 0 ||
        m.c < 0 ||
        m.rs < 1 ||
        m.cs < 1 ||
        m.r + m.rs > LIMITS.rows ||
        m.c + m.cs > LIMITS.cols
      )
        throw Error("Mesclagem fora dos limites.");
    }
    for (const [kind, max] of [
      ["rowlen", LIMITS.rows],
      ["columnlen", LIMITS.cols],
    ])
      for (const [key, size] of Object.entries(s.config[kind] || {})) {
        if (
          !/^\d+$/.test(key) ||
          Number(key) >= max ||
          !Number.isFinite(size) ||
          size < 1 ||
          size > 2000
        )
          throw Error("Dimensão de linha ou coluna inválida.");
      }
    // The grid has no remote image proxy. Only inlined raster images are retained.
    delete s.images;
    delete s.image;
    return s;
  });
}
export function cellScalar(cell) {
  if (cell?.ct?.t === "inlineStr" && Array.isArray(cell.ct.s))
    return cell.ct.s.map((x) => String(x.v ?? "")).join("");
  return cell?.v ?? "";
}
export function cellAt(sheet, r, c) {
  return (
    sheet.data?.[r]?.[c] ??
    sheet.celldata?.find((x) => x.r === r && x.c === c)?.v ??
    null
  );
}
export function sheetMatrix(sheet, range) {
  const s = normalizeSheets([sheet])[0];
  const map = new Map(s.celldata.map((c) => [`${c.r}:${c.c}`, c.v]));
  const maxR = Math.max(0, ...s.celldata.map((c) => c.r)),
    maxC = Math.max(0, ...s.celldata.map((c) => c.c));
  const q = range ? parseRange(range) : { r1: 0, c1: 0, r2: maxR, c2: maxC };
  if ((q.r2 - q.r1 + 1) * (q.c2 - q.c1 + 1) > 100000)
    throw Error("Intervalo muito grande.");
  return Array.from({ length: q.r2 - q.r1 + 1 }, (_, r) =>
    Array.from({ length: q.c2 - q.c1 + 1 }, (_, c) =>
      cellScalar(map.get(`${r + q.r1}:${c + q.c1}`)),
    ),
  );
}
export function buildPivot(sheet, keyCol, valueCol, operation = "sum") {
  if (!["sum", "count", "average", "min", "max"].includes(operation))
    throw Error("Agregação inválida.");
  const matrix = sheetMatrix(sheet);
  const rows = new Map();
  for (const row of matrix.slice(1)) {
    const key = String(row[keyCol] ?? "");
    if (!key) continue;
    const g = rows.get(key) || {
      sum: 0,
      count: 0,
      numeric: 0,
      min: Infinity,
      max: -Infinity,
    };
    g.count++;
    const n = Number(row[valueCol]);
    if (row[valueCol] !== "" && Number.isFinite(n)) {
      g.sum += n;
      g.numeric++;
      g.min = Math.min(g.min, n);
      g.max = Math.max(g.max, n);
    }
    rows.set(key, g);
  }
  const celldata = [
    { r: 0, c: 0, v: { v: String(matrix[0]?.[keyCol] || "Grupo"), bl: 1 } },
    { r: 0, c: 1, v: { v: operation, bl: 1 } },
  ];
  let r = 1;
  for (const [key, g] of rows) {
    const val =
      operation === "count"
        ? g.count
        : operation === "average"
          ? g.numeric
            ? g.sum / g.numeric
            : 0
          : operation === "min"
            ? g.numeric
              ? g.min
              : 0
            : operation === "max"
              ? g.numeric
                ? g.max
                : 0
              : g.sum;
    celldata.push(
      { r, c: 0, v: { v: key } },
      { r, c: 1, v: { v: val, ct: { fa: "0.00", t: "n" } } },
    );
    r++;
  }
  return {
    ...blankWorkbook(
      "Resumo " + new Date().toISOString().slice(11, 19).replaceAll(":", ""),
    )[0],
    celldata,
  };
}
export function validateProposal(proposal, selection = "A1:Z100") {
  const q = parseRange(selection);
  if (!Array.isArray(proposal) || proposal.length > 100)
    throw Error("A IA pode sugerir até 100 células.");
  const seen = new Set();
  return proposal.map((p) => {
    const a = parseRange(p.cell);
    if (
      a.r1 !== a.r2 ||
      a.c1 !== a.c2 ||
      a.r1 < q.r1 ||
      a.r1 > q.r2 ||
      a.c1 < q.c1 ||
      a.c1 > q.c2 ||
      seen.has(p.cell)
    )
      throw Error("Proposta altera células fora da seleção ou repetidas.");
    if (
      !["string", "number", "boolean"].includes(typeof p.value) ||
      (typeof p.value === "number" && !Number.isFinite(p.value))
    )
      throw Error("Valor inválido na proposta.");
    if (
      typeof p.value === "string" &&
      (p.value.length > 8192 ||
        (p.value.startsWith("=") &&
          (/\b(WEBSERVICE|HYPERLINK|IMPORTXML|IMPORTDATA|IMAGE|CALL|EXEC|REGISTER)\s*\(/i.test(
            p.value,
          ) ||
            /[\[\]|]/.test(p.value) ||
            /https?:/i.test(p.value))))
    )
      throw Error("Fórmulas externas não são aceitas em propostas de IA.");
    seen.add(p.cell);
    return { cell: p.cell.toUpperCase(), value: p.value };
  });
}
export function normalizeMeta(meta = {}) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta))
    throw Error("Metadados inválidos.");
  const charts = meta.charts || [];
  if (!Array.isArray(charts) || charts.length > 20)
    throw Error("Metadados de gráficos inválidos.");
  return {
    charts: charts.map((c) => {
      if (
        !c ||
        !["bar", "line", "doughnut"].includes(c.type) ||
        typeof c.sheetId !== "string" ||
        typeof c.id !== "string"
      )
        throw Error("Configuração de gráfico inválida.");
      const q = parseRange(c.range);
      if (q.c2 - q.c1 !== 1 || q.r2 - q.r1 > 500)
        throw Error("Intervalo de gráfico inválido.");
      return {
        id: c.id.slice(0, 100),
        sheetId: c.sheetId.slice(0, 100),
        range: c.range,
        type: c.type,
      };
    }),
  };
}
