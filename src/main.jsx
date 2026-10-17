import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Workbook } from "@fortune-sheet/react";
import "@fortune-sheet/react/dist/index.css";
import {
  Trophy,
  FolderOpen,
  Plus,
  Upload,
  Download,
  Save,
  Sparkles,
  ChartColumn,
  Table2,
  Palette,
  History,
  Settings,
  LogOut,
  Search,
  X,
  Check,
  ChevronDown,
  ArrowRight,
  FileSpreadsheet,
  ShieldCheck,
  Undo2,
  Redo2,
  Printer,
  HelpCircle,
  Copy,
  Trash2,
  AlertTriangle,
  Lock,
  CheckCheck,
} from "lucide-react";
import {
  blankWorkbook,
  normalizeSheets,
  normalizeMeta,
  parseRange,
  columnName,
  cellAt,
  cellScalar,
  sheetMatrix,
  buildPivot,
  validateProposal,
  csvImport,
  csvExport,
} from "./workbook.mjs";
import { templates } from "./templates.mjs";
import "./style.css";
import { acceptSaved, mayLeaveDocument } from "./save-state.mjs";
const themes = [
  ["midnight", "Meia-noite", "#24c9d3"],
  ["paper", "Papel", "#228c77"],
  ["graphite", "Grafite", "#b8c1cf"],
  ["amethyst", "Ametista", "#b59aff"],
  ["ocean", "Oceano", "#5cafff"],
];
const toolbar = [
  "undo",
  "redo",
  "format-painter",
  "clear-format",
  "|",
  "currency-format",
  "percentage-format",
  "number-decrease",
  "number-increase",
  "format",
  "|",
  "font",
  "font-size",
  "|",
  "bold",
  "italic",
  "strike-through",
  "underline",
  "|",
  "font-color",
  "background",
  "border",
  "merge-cell",
  "|",
  "horizontal-align",
  "vertical-align",
  "text-wrap",
  "text-rotation",
  "|",
  "freeze",
  "conditionFormat",
  "filter",
  "comment",
  "quick-formula",
  "dataVerification",
  "splitColumn",
  "locationCondition",
  "search",
];
function download(name, data, type = "application/octet-stream") {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const fname = (t) =>
  t.replace(/[\\/:*?"<>|]/g, "_").slice(0, 100) || "Excellence";
function IconButton({ icon: Icon, children, ...props }) {
  return (
    <button {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}
function Dialog({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const prior = document.activeElement;
    ref.current?.querySelector("input,button,select,textarea")?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const list = ref.current.querySelectorAll(
          "button,input,select,textarea,a[href]",
        );
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prior?.focus?.();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "wide" : "")}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="Fechar diálogo" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Auth({ session, onAuth, api }) {
  const [user, setUser] = useState(""),
    [password, setPassword] = useState(""),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const s = await api(session.setupRequired ? "/setup" : "/login", "POST", {
        username: user,
        password,
        token,
      });
      onAuth(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <div className="auth-story">
        <div className="brand">
          <img src="/trophy.svg" alt="Troféu" />
          <span>Excellence</span>
          <small>PLANILHAS LIVRES</small>
        </div>
        <span className="eyebrow">DÊ ESPAÇO ÀS SUAS IDEIAS</span>
        <h1>
          Grandes resultados.
          <br />
          <em>Célula por célula.</em>
        </h1>
        <p>
          Calcule, descubra e crie com liberdade.
          <br />
          Seus arquivos, seus modelos, seu espaço.
        </p>
        <div className="story-grid" aria-hidden="true">
          {[
            "A",
            "B",
            "C",
            "D",
            "1",
            "Categoria",
            "Planejado",
            "Realizado",
            "2",
            "Equipe",
            "6.500",
            "6.200",
            "3",
            "Infraestrutura",
            "1.200",
            "1.050",
            "4",
            "Saldo",
            "=C2−B2",
            "+ 300",
          ].map((x, i) => (
            <span key={i}>{x}</span>
          ))}
        </div>
        <footer>
          <ShieldCheck size={15} /> Código aberto · Licença MIT · Sem telemetria
          própria
        </footer>
      </div>
      <main className="auth-form">
        <span className="pill">
          <Lock size={13} /> SEU ESPAÇO DE TRABALHO
        </span>
        <h2>
          {session.setupRequired
            ? "Bem-vindo ao Excellence."
            : "Bom ter você de volta."}
        </h2>
        <p>
          {session.setupRequired
            ? "Crie o administrador desta instalação."
            : "Entre para acessar suas planilhas."}
        </p>
        <form onSubmit={submit}>
          {session.setupRequired && (
            <label>
              Token de instalação
              <input
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <small>Exibido no terminal que iniciou o Excellence.</small>
            </label>
          )}
          <label>
            Usuário
            <input
              autoComplete="username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
              minLength={3}
              maxLength={48}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete={
                session.setupRequired ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={session.setupRequired ? 12 : 1}
            />
          </label>
          {session.setupRequired && (
            <small>A senha precisa ter pelo menos 12 caracteres.</small>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Aguarde…"
              : session.setupRequired
                ? "Criar administrador"
                : "Entrar"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-note">
          Executado na sua infraestrutura.
          <br />A IA só recebe dados quando você solicita.
        </p>
      </main>
    </div>
  );
}
function ChartPreview({ config, sheet, theme }) {
  const ref = useRef(),
    [error, setError] = useState(""),
    [rows, setRows] = useState([]);
  useEffect(() => {
    let chart,
      cancel = false;
    (async () => {
      try {
        const matrix = sheetMatrix(sheet, config.range);
        setRows(matrix);
        const { default: Chart } = await import("chart.js/auto");
        if (cancel) return;
        const styles = getComputedStyle(ref.current);
        const textColor = styles.getPropertyValue("--muted").trim();
        const gridColor = styles.getPropertyValue("--border").trim();
        chart = new Chart(ref.current, {
          type: config.type,
          data: {
            labels: matrix.slice(1).map((r) => String(r[0])),
            datasets: [
              {
                label: String(matrix[0]?.[1] || "Valor"),
                data: matrix.slice(1).map((r) => Number(r[1]) || 0),
                backgroundColor: [
                  "#24c9d3",
                  "#e6bd6b",
                  "#a493e6",
                  "#69c698",
                  "#ec8e84",
                  "#67a9e5",
                ],
                borderColor: "#24c9d3",
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: config.type === "doughnut",
                labels: { color: textColor },
              },
            },
            scales:
              config.type === "doughnut"
                ? {}
                : {
                    x: {
                      ticks: { color: textColor },
                      grid: { display: false },
                    },
                    y: {
                      ticks: { color: textColor },
                      grid: { color: gridColor },
                    },
                  },
          },
        });
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => {
      cancel = true;
      chart?.destroy();
    };
  }, [sheet, config, theme]);
  return (
    <div className="chart-preview">
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <div className="chart-canvas">
            <canvas ref={ref} role="img" aria-label="Gráfico da planilha" />
          </div>
          <details>
            <summary>Dados do gráfico</summary>
            <table>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j}>{String(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}
function App() {
  if (/^\/demo\/?$/.test(window.location.pathname))
    return (
      <Workspace demo user={{ id: "demo", username: "Visitante", role: "demo" }} />
    );
  return <SessionApp />;
}
function SessionApp() {
  const [session, setSession] = useState(null),
    csrf = useRef("");
  const api = useCallback(async (path, method = "GET", body) => {
    const r = await fetch("/api" + path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(csrf.current ? { "x-csrf-token": csrf.current } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let data;
    try {
      data = await r.json();
    } catch {
      throw Error(
        "Servidor indisponível. Seu trabalho continua na memória desta página.",
      );
    }
    if (!r.ok) {
      const e = Error(data.error || "Falha na operação.");
      e.status = r.status;
      throw e;
    }
    if (data.csrf) csrf.current = data.csrf;
    return data;
  }, []);
  const [fatal, setFatal] = useState("");
  useEffect(() => {
    api("/session")
      .then(setSession)
      .catch((e) => setFatal(e.message));
  }, []);
  if (fatal)
    return (
      <div className="loading">
        <Trophy />
        <h2>Não foi possível conectar</h2>
        <p>{fatal}</p>
        <button onClick={() => location.reload()}>Tentar novamente</button>
      </div>
    );
  if (!session)
    return (
      <div className="loading">
        <img src="/trophy.svg" alt="" />
        <p>Abrindo Excellence…</p>
      </div>
    );
  if (!session.user)
    return <Auth session={session} api={api} onAuth={setSession} />;
  return (
    <Workspace
      key={session.user.id}
      user={session.user}
      api={api}
      logout={() => setSession({ ...session, user: null })}
    />
  );
}
function Workspace({ user, api, logout, demo = false }) {
  const first = useRef({
    id: null,
    title: demo ? "Orçamento de demonstração" : "Meu orçamento",
    revision: 0,
    sheets: normalizeSheets(templates.budget.create()),
    meta: { charts: [] },
  });
  const current = useRef(first.current),
    latest = useRef(first.current.sheets),
    grid = useRef(),
    epoch = useRef(0),
    timer = useRef(),
    inFlight = useRef(null),
    saveRef = useRef(),
    mounted = useRef(true),
    unsaved = useRef(false),
    recoveryWarning = useRef(false);
  const [initial, setInitial] = useState(first.current.sheets),
    [gridKey, setGridKey] = useState(0),
    [title, setTitle] = useState(first.current.title),
    [files, setFiles] = useState([]),
    [status, setStatus] = useState("draft"),
    [message, setMessage] = useState(""),
    [panel, setPanel] = useState(null),
    [dialog, setDialog] = useState(null),
    [theme, setTheme] = useState(
      demo ? "paper" : localStorage.getItem("excellence-theme") || "paper",
    ),
    [gridDark, setGridDark] = useState(
      !demo && localStorage.getItem("excellence-dark-cells") === "true",
    ),
    [menu, setMenu] = useState(""),
    [search, setSearch] = useState(""),
    [meta, setMeta] = useState({ charts: [] }),
    [address, setAddress] = useState("A1"),
    [edit, setEdit] = useState(""),
    [cellResult, setCellResult] = useState(""),
    [auto, setAuto] = useState(!demo),
    [ready, setReady] = useState(false),
    [engineReady, setEngineReady] = useState(false);
  const [providers, setProviders] = useState([]),
    [provider, setProvider] = useState(""),
    [prompt, setPrompt] = useState(""),
    [selection, setSelection] = useState("A1:D9"),
    [aiResult, setAiResult] = useState(null),
    [aiBusy, setAiBusy] = useState(false),
    [aiContext, setAiContext] = useState(null);
  const [chartRange, setChartRange] = useState("A1:B8"),
    [chartType, setChartType] = useState("bar"),
    [chartConfig, setChartConfig] = useState(null),
    [pivotKey, setPivotKey] = useState("0"),
    [pivotValue, setPivotValue] = useState("1"),
    [pivotOp, setPivotOp] = useState("sum"),
    [versions, setVersions] = useState([]),
    [users, setUsers] = useState([]),
    [audit, setAudit] = useState([]),
    [newUser, setNewUser] = useState(""),
    [newPass, setNewPass] = useState(""),
    [oldPass, setOldPass] = useState(""),
    [nextPass, setNextPass] = useState("");
  const input = useRef(),
    pendingCell = useRef(null),
    changeCallback = useRef(),
    lastSelection = useRef("");
  const stableChanged = useCallback(
    (data) => changeCallback.current?.(data),
    [],
  );
  const recoveryKey = "excellence-recovery-" + user.id;
  function notice(text) {
    setMessage(text);
  }
  async function refreshFiles() {
    const data = await api("/workbooks");
    setFiles(data.workbooks);
    return data.workbooks;
  }
  function activeId() {
    try {
      return grid.current?.getSheet()?.id;
    } catch {
      return null;
    }
  }
  function capture() {
    const all = normalizeSheets(grid.current?.getAllSheets() || latest.current),
      id = activeId();
    if (id)
      all.forEach((s) => {
        s.status = s.id === id ? 1 : 0;
      });
    return all;
  }
  function stash(sheets) {
    if (demo) return;
    try {
      localStorage.setItem(
        recoveryKey,
        JSON.stringify({
          ...current.current,
          sheets: sheets || latest.current,
          localUpdated: new Date().toISOString(),
        }),
      );
    } catch {
      if (!recoveryWarning.current) {
        recoveryWarning.current = true;
        notice(
          "A recuperação local está sem espaço. Salve no servidor ou exporte uma cópia antes de fechar.",
        );
      }
    }
  }
  function changed(data) {
    try {
      latest.current = normalizeSheets(data);
      setEngineReady(true);
      const selectedId = activeId();
      if (selectedId)
        latest.current.forEach((s) => {
          s.status = s.id === selectedId ? 1 : 0;
        });
      if (pendingCell.current) {
        const q = parseRange(pendingCell.current);
        const s =
          latest.current.find((s) => s.status === 1) || latest.current[0];
        setCellResult(String(cellScalar(cellAt(s, q.r1, q.c1))));
        pendingCell.current = null;
      }
      epoch.current++;
      unsaved.current = true;
      setStatus("dirty");
      stash();
      if (auto) {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => saveRef.current?.(), 1200);
      }
    } catch (e) {
      notice(e.message);
      setStatus("error");
    }
  }
  changeCallback.current = changed;
  function dirty() {
    epoch.current++;
    unsaved.current = true;
    setStatus("dirty");
    stash();
    if (auto) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => saveRef.current?.(), 1200);
    }
  }
  const save = async (copy = false) => {
    clearTimeout(timer.current);
    if (demo) {
      unsaved.current = false;
      setStatus("draft");
      return true;
    }
    if (inFlight.current) {
      await inFlight.current;
      return save(copy);
    }
    let snapshot;
    try {
      snapshot = { ...current.current, sheets: capture() };
    } catch (e) {
      notice(e.message);
      setStatus("error");
      unsaved.current = true;
      return false;
    }
    const seq = epoch.current;
    setStatus("saving");
    const operation = (async () => {
      try {
        const result = await api(
          copy || !snapshot.id ? "/workbooks" : "/workbooks/" + snapshot.id,
          copy || !snapshot.id ? "POST" : "PUT",
          {
            ...snapshot,
            title: copy ? snapshot.title + " (cópia)" : snapshot.title,
          },
        );
        current.current = acceptSaved(current.current, snapshot, result, copy);
        if (copy) setTitle(current.current.title);
        if (epoch.current === seq) {
          unsaved.current = false;
          setStatus("saved");
          try {
            localStorage.removeItem(recoveryKey);
          } catch {}
        } else {
          setStatus("dirty");
          stash();
          if (auto) timer.current = setTimeout(() => saveRef.current?.(), 1200);
        }
        await refreshFiles();
        return mayLeaveDocument(epoch.current, seq);
      } catch (e) {
        setStatus(e.status === 409 ? "conflict" : "error");
        stash();
        notice(e.message);
        return false;
      }
    })();
    inFlight.current = operation;
    try {
      return await operation;
    } finally {
      inFlight.current = null;
    }
  };
  saveRef.current = save;
  function load(doc) {
    doc = {
      ...doc,
      sheets: normalizeSheets(doc.sheets),
      meta: normalizeMeta(doc.meta || {}),
    };
    lastSelection.current = "";
    clearTimeout(timer.current);
    current.current = { ...doc, meta: doc.meta || { charts: [] } };
    latest.current = doc.sheets;
    epoch.current = 0;
    unsaved.current = false;
    setTitle(doc.title);
    setInitial(doc.sheets);
    setEngineReady(false);
    setMeta(doc.meta || { charts: [] });
    setGridKey((k) => k + 1);
    setStatus(doc.id ? "saved" : "draft");
    setAddress("A1");
    setEdit("");
    setCellResult("");
    setChartConfig(null);
    setAiResult(null);
  }
  useEffect(() => {
    mounted.current = true;
    if (demo) {
      setReady(true);
      return;
    }
    (async () => {
      try {
        const list = await refreshFiles();
        let recovery;
        try {
          recovery = JSON.parse(localStorage.getItem(recoveryKey));
        } catch {}
        if (recovery?.sheets) {
          setDialog({ type: "recovery", data: recovery });
        } else if (list[0]) load(await api("/workbooks/" + list[0].id));
        const p = await api("/ai/providers");
        setProviders(p.providers);
        setProvider(p.providers[0]?.id || "");
      } catch (e) {
        notice(e.message);
      } finally {
        setReady(true);
      }
    })();
    const before = (e) => {
      if (unsaved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      window.removeEventListener("beforeunload", before);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (!demo) localStorage.setItem("excellence-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!demo) localStorage.setItem("excellence-dark-cells", String(gridDark));
  }, [gridDark]);
  useEffect(() => {
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveRef.current?.();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 9000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && event.target.closest(".dropdown"))
        return;
      setMenu("");
      if (event.type === "keydown")
        document.getElementById("export-trigger")?.focus();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [menu]);
  async function openFile(id) {
    if (id === current.current.id) {
      setPanel(null);
      return;
    }
    if (!(await save())) return;
    try {
      load(await api("/workbooks/" + id));
      setPanel(null);
    } catch (e) {
      notice(e.message);
    }
  }
  async function newFile(key) {
    if (!(await save())) return;
    load({
      id: null,
      title:
        templates[key].label === "Em branco"
          ? "Sem título"
          : templates[key].label,
      revision: 0,
      sheets: templates[key].create(),
      meta: { charts: [] },
    });
    setDialog(null);
  }
  async function exportFile(type) {
    setMenu("");
    try {
      const sheets = capture();
      if (type === "xlsx") {
        const { toXlsx } = await import("./xlsx.mjs");
        download(
          fname(title) + ".xlsx",
          await toXlsx(sheets),
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        notice("XLSX exportado. Recursos avançados ficam no formato nativo.");
      } else if (type === "csv") {
        download(
          fname(title) + ".csv",
          csvExport(activeSheet(sheets)),
          "text/csv;charset=utf-8",
        );
      } else {
        download(
          fname(title) + ".excellence.json",
          JSON.stringify(
            {
              format: "excellence",
              formatVersion: 1,
              title,
              sheets,
              meta: current.current.meta,
            },
            null,
            2,
          ),
          "application/json",
        );
      }
    } catch (e) {
      notice(e.message);
    }
  }
  async function importFile(file) {
    input.current.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notice("Arquivo excede 10 MB.");
      return;
    }
    setDialog({ type: "import", file });
  }
  async function doImport(file) {
    try {
      let sheets,
        metadata = { charts: [] },
        warnings = [];
      if (/\.xlsx$/i.test(file.name)) {
        const { fromXlsx } = await import("./xlsx.mjs");
        ({ sheets, warnings } = await fromXlsx(await file.arrayBuffer()));
      } else if (/\.csv$/i.test(file.name)) {
        sheets = [csvImport(await file.text())];
      } else if (/\.json$/i.test(file.name)) {
        const data = JSON.parse(await file.text());
        if (data.format !== "excellence" || data.formatVersion !== 1)
          throw Error("Formato nativo inválido.");
        sheets = normalizeSheets(data.sheets);
        metadata = data.meta || metadata;
      } else throw Error("Use XLSX, CSV ou Excellence JSON.");
      if (!(await save())) return;
      load({
        id: null,
        title: file.name.replace(/\.(excellence\.json|xlsx|csv|json)$/i, ""),
        revision: 0,
        sheets,
        meta: metadata,
      });
      setDialog(null);
      notice(
        warnings[0] ||
          "Arquivo importado. Salve para mantê-lo nesta instalação.",
      );
    } catch (e) {
      notice(e.message);
    }
  }
  function activeSheet(sheets) {
    const all = sheets || capture();
    return (
      all.find((s) => s.id === activeId()) ||
      all.find((s) => s.status === 1) ||
      all[0]
    );
  }
  function readCell(addr = address) {
    try {
      const q = parseRange(addr),
        s = activeSheet(),
        v = cellAt(s, q.r1, q.c1);
      setEdit(String(v?.f ?? cellScalar(v)));
      setCellResult(String(cellScalar(v)));
    } catch (e) {
      notice(e.message);
    }
  }
  function goCell() {
    try {
      const q = parseRange(address);
      grid.current.setSelection([{ row: [q.r1, q.r2], column: [q.c1, q.c2] }]);
      grid.current.scroll({ targetRow: q.r1, targetColumn: q.c1 });
      readCell();
    } catch (e) {
      notice(e.message);
    }
  }
  function applyCell() {
    try {
      const q = parseRange(address);
      if (q.r1 !== q.r2 || q.c1 !== q.c2)
        throw Error("Escolha uma célula para editar.");
      pendingCell.current = address;
      setCellResult("…");
      grid.current.batchCallApis([
        {
          name: "setSelection",
          args: [[{ row: [q.r1, q.r1], column: [q.c1, q.c1] }]],
        },
        { name: "setCellValue", args: [q.r1, q.c1, edit] },
      ]);
    } catch (e) {
      notice(e.message);
    }
  }
  function choosePanel(p) {
    if (demo && !["ai", "charts"].includes(p)) return;
    setPanel(panel === p ? null : p);
    setMenu("");
    if (p === "history") {
      if (!current.current.id) {
        setVersions([]);
        return;
      }
      api("/workbooks/" + current.current.id + "/versions")
        .then((d) => setVersions(d.versions))
        .catch((e) => notice(e.message));
    }
    if (p === "settings" && user.role === "admin") {
      api("/users")
        .then((d) => setUsers(d.users))
        .catch((e) => notice(e.message));
      api("/audit")
        .then((d) => setAudit(d.events))
        .catch((e) => notice(e.message));
    }
  }
  async function askAI() {
    setAiBusy(true);
    setAiResult(null);
    try {
      const s = activeSheet(),
        q = parseRange(selection),
        matrix = sheetMatrix(s, selection);
      const cellLimit = demo ? 20 : 500;
      if (matrix.flat().length > cellLimit)
        throw Error(`Selecione até ${cellLimit} células.`);
      const cells = matrix.flatMap((row, r) =>
        row.map((v, c) => ({
          cell: columnName(c + q.c1) + (r + q.r1 + 1),
          value: v,
        })),
      );
      const context = { sheetId: s.id, selection, epoch: epoch.current };
      setAiContext(context);
      if (demo) {
        const body = JSON.stringify({ prompt, selection, cells });
        if (prompt.length > 300 || new TextEncoder().encode(body).length > 1500)
          throw Error("Reduza a seleção ou a pergunta: a demonstração aceita até 300 caracteres e 1.500 bytes por pedido.");
        const response = await fetch("/api/demo/ai/assist", {
          method: "POST",
          credentials: "omit",
          headers: { "content-type": "application/json" },
          body,
          signal: AbortSignal.timeout(35000),
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(result.error || "A IA de demonstração não está disponível agora.");
        setAiResult(result);
      } else {
        setAiResult(
          await api("/ai/assist", "POST", { provider, prompt, selection, cells }),
        );
      }
    } catch (e) {
      notice(e.name === "TimeoutError"
        ? "A consulta demorou mais que o esperado. Aguarde antes de tentar novamente."
        : e.message);
    } finally {
      setAiBusy(false);
    }
  }
  function applyAI() {
    try {
      if (
        !aiContext ||
        activeSheet().id !== aiContext.sheetId ||
        epoch.current !== aiContext.epoch
      )
        throw Error(
          "A planilha mudou. Solicite uma nova proposta antes de aplicar.",
        );
      const p = validateProposal(aiResult.proposal, aiContext.selection);
      grid.current.batchCallApis(
        p.map((x) => {
          const q = parseRange(x.cell);
          return { name: "setCellValue", args: [q.r1, q.c1, x.value] };
        }),
      );
      setAiResult(null);
      notice("Proposta aplicada. Use Desfazer se necessário.");
    } catch (e) {
      notice(e.message);
    }
  }
  function createChart() {
    try {
      const rows = sheetMatrix(activeSheet(), chartRange);
      if (rows.length < 2 || rows[0].length !== 2 || rows.length > 501)
        throw Error("Use duas colunas, cabeçalho e até 500 linhas.");
      const cfg = {
        id: crypto.randomUUID(),
        sheetId: activeSheet().id,
        range: chartRange,
        type: chartType,
      };
      const m = {
        ...current.current.meta,
        charts: [...(current.current.meta.charts || []), cfg].slice(-20),
      };
      current.current.meta = m;
      setMeta(m);
      setChartConfig(cfg);
      dirty();
    } catch (e) {
      notice(e.message);
    }
  }
  function createPivot() {
    try {
      const sheets = capture(),
        p = buildPivot(
          activeSheet(sheets),
          Number(pivotKey),
          Number(pivotValue),
          pivotOp,
        );
      sheets.forEach((s) => (s.status = 0));
      p.status = 1;
      const next = { ...current.current, sheets: [...sheets, p] };
      load(next);
      dirty();
      setDialog(null);
      notice(
        "Resumo criado em uma nova aba. Gere novamente se os dados mudarem.",
      );
    } catch (e) {
      notice(e.message);
    }
  }
  const hooks = useRef({
    afterSelectionChange: (_id, s) => {
      if (document.activeElement?.closest?.(".formula-bar")) return;
      const q =
        s?.row && s?.column
          ? {
              r1: s.row[0],
              r2: Number.isInteger(s.row[1]) ? s.row[1] : s.row[0],
              c1: s.column[0],
              c2: Number.isInteger(s.column[1]) ? s.column[1] : s.column[0],
            }
          : null;
      if (q && Number.isInteger(q.r1) && Number.isInteger(q.c1)) {
        const signature = [_id, q.r1, q.r2, q.c1, q.c2].join(":");
        if (lastSelection.current === signature) return;
        lastSelection.current = signature;
        const a = columnName(q.c1) + (q.r1 + 1),
          b = columnName(q.c2) + (q.r2 + 1);
        setAddress(a === b ? a : a + ":" + b);
        setSelection(a === b ? a : a + ":" + b);
        readCell(a);
      }
    },
    beforeUpdateCell: (r, c) => r < 10000 && c < 256,
    beforeAddSheet: () => latest.current.length < 30,
  });
  useEffect(() => {
    if (!ready || !engineReady) return;
    const frame = requestAnimationFrame(() => {
      try {
        const all = normalizeSheets(grid.current?.getAllSheets() || initial),
          selected = all.find((s) => s.status === 1) || all[0],
          calls = [];
        for (const sheet of all) {
          const formulas = sheet.celldata.filter((c) => c.v.f);
          if (!formulas.length) continue;
          calls.push({ name: "activateSheet", args: [{ id: sheet.id }] });
          for (const cell of formulas)
            calls.push({
              name: "setCellValue",
              args: [cell.r, cell.c, { f: cell.v.f }],
            });
        }
        if (calls.length) {
          calls.push({ name: "activateSheet", args: [{ id: selected.id }] });
          grid.current.batchCallApis(calls);
        }
      } catch (e) {
        notice("Falha ao recalcular: " + e.message);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, engineReady, gridKey]);
  const labels = {
    draft: demo ? "Somente nesta sessão" : "Rascunho",
    dirty: demo ? "Alterações nesta sessão" : "Alterações pendentes",
    saving: "Salvando…",
    saved: "Salvo",
    conflict: "Conflito de versões",
    error: "Falha ao salvar",
  };
  return (
    <div
      className="workspace"
      onDragOverCapture={demo ? (event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "none";
          }
        } : undefined}
      onDropCapture={demo ? (event) => {
          if (event.dataTransfer.files.length) {
            event.preventDefault();
            event.stopPropagation();
            notice("Uploads não estão disponíveis na demonstração.");
          }
        } : undefined}
      onPasteCapture={demo ? (event) => {
          if (event.clipboardData.files.length) {
            event.preventDefault();
            event.stopPropagation();
            notice("Uploads não estão disponíveis na demonstração.");
          }
        } : undefined}
    >
      {demo && (
        <div className="demo-banner" role="note">
          <strong>DEMO</strong>
          <span>Dados fictícios. Edições temporárias, sem uploads. Recarregar reinicia a planilha.</span>
          <a href="/">Entrar</a>
        </div>
      )}
      <header className="app-header">
        <div className="brand">
          <img src="/trophy.svg" alt="Troféu" />
          <span>Excellence</span>
        </div>
        <div className="title-block">
          <input
            aria-label="Nome do arquivo"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              current.current.title = e.target.value;
              dirty();
            }}
            maxLength={120}
          />
          <span className={"save-status " + status} data-testid="save-status" role="status">
            {status === "saved" ? (
              <CheckCheck size={12} />
            ) : (
              <span className="status-dot" />
            )}
            {labels[status]}
          </span>
        </div>
        <div className="header-actions">
          <span className="local-badge">
            <ShieldCheck size={13} /> Seu espaço
          </span>
          <IconButton
            icon={Sparkles}
            className={panel === "ai" ? "ai-button active" : "ai-button"}
            aria-pressed={panel === "ai"}
            aria-label="Assistente IA"
            onClick={() => choosePanel("ai")}
          >
            Assistente IA
          </IconButton>
          {!demo && <button
            className="avatar"
            title={"Configurações de " + user.username}
            aria-label="Configurações da conta"
            onClick={() => choosePanel("settings")}
          >
            {user.username.slice(0, 2).toUpperCase()}
          </button>}
        </div>
      </header>
      <nav className="menu-bar" aria-label="Ferramentas da pasta de trabalho">
        <div className="command-group" role="group" aria-label="Arquivo">
          {!demo && <IconButton
            icon={FolderOpen}
            onClick={() => choosePanel("files")}
            className={panel === "files" ? "active" : ""}
            aria-pressed={panel === "files"}
          >
            Arquivos
          </IconButton>}
          <IconButton icon={Plus} onClick={() => setDialog({ type: "new" })}>
            Novo
          </IconButton>
          {!demo && <IconButton icon={Upload} onClick={() => input.current.click()}>
            Importar
          </IconButton>}
          <div className="dropdown">
            <IconButton
              id="export-trigger"
              icon={Download}
              aria-expanded={menu === "export"}
              aria-controls={menu === "export" ? "export-options" : undefined}
              onClick={() => setMenu(menu === "export" ? "" : "export")}
            >
              Exportar
              <ChevronDown size={12} />
            </IconButton>
            {menu === "export" && (
              <div className="dropdown-menu" id="export-options" aria-label="Formatos de exportação">
                <button onClick={() => exportFile("xlsx")}>
                  Excel (.xlsx)
                </button>
                <button onClick={() => exportFile("csv")}>
                  CSV seguro (.csv)
                </button>
                <button onClick={() => exportFile("json")}>
                  Excellence (.json)
                </button>
              </div>
            )}
          </div>
          {!demo && <><span className="divider" />
          <IconButton
            icon={Save}
            aria-label="Salvar agora"
            onClick={() => save()}
            disabled={status === "saving"}
          >
            Salvar
          </IconButton></>}
          {status === "conflict" && (
            <button className="warning-text" onClick={() => save(true)}>
              Salvar cópia
            </button>
          )}
        </div>
        <div className="command-group" role="group" aria-label="Análise e exibição">
          <IconButton icon={ChartColumn} aria-pressed={panel === "charts"} onClick={() => choosePanel("charts")}>
            Gráficos
          </IconButton>
          <IconButton
            icon={Table2}
            onClick={() => setDialog({ type: "pivot" })}
          >
            Resumo
          </IconButton>
          <IconButton
            icon={Palette}
            onClick={() => setDialog({ type: "themes" })}
          >
            Temas
          </IconButton>
          {!demo && <IconButton icon={History} aria-pressed={panel === "history"} onClick={() => choosePanel("history")}>
            Histórico
          </IconButton>}
          <button
            aria-label="Ajuda"
            onClick={() => setDialog({ type: "help" })}
          >
            <HelpCircle size={17} />
          </button>
        </div>
      </nav>
      {!demo && <input
        ref={input}
        type="file"
        hidden
        accept=".xlsx,.csv,.json"
        onChange={(e) => importFile(e.target.files[0])}
      />}
      <div className="work-area">
        {panel === "files" && (
          <aside className="file-panel">
            <div className="panel-title">
              <h2>Suas planilhas</h2>
              <button
                aria-label="Fechar arquivos"
                onClick={() => setPanel(null)}
              >
                <X size={17} />
              </button>
            </div>
            <label className="search">
              <Search size={15} />
              <input
                aria-label="Buscar arquivos"
                placeholder="Buscar arquivo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={() => setDialog({ type: "new" })}
            >
              <Plus size={16} /> Nova planilha
            </button>
            <span className="eyebrow">NESTA INSTALAÇÃO</span>
            {files
              .filter((f) =>
                f.title.toLowerCase().includes(search.toLowerCase()),
              )
              .map((f) => (
                <div
                  className={
                    "file-row " +
                    (f.id === current.current.id ? "selected" : "")
                  }
                  key={f.id}
                >
                  <button onClick={() => openFile(f.id)}>
                    <FileSpreadsheet size={23} />
                    <span>
                      {f.title}
                      <small>
                        {new Date(f.updated).toLocaleDateString("pt-BR")} ·
                        revisão {f.revision}
                      </small>
                    </span>
                  </button>
                  <button
                    aria-label={"Excluir " + f.title}
                    onClick={() => setDialog({ type: "delete", file: f })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            {!files.length && (
              <p className="muted">
                Seus arquivos aparecerão aqui após salvar.
              </p>
            )}
            <p className="panel-note">
              Até 100 arquivos e 50 MB por conta. Cada arquivo mantém até 20
              revisões.
            </p>
          </aside>
        )}
        <main className="sheet-main" aria-label="Editor de planilhas">
          <div className="formula-bar">
            <input
              aria-label="Endereço da célula"
              disabled={!ready}
              value={address}
              onChange={(e) => setAddress(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") goCell();
              }}
            />
            <button
              aria-label="Ir para célula"
              title="Ir para célula"
              onClick={goCell}
            >
              <ArrowRight size={14} />
            </button>
            <span className="fx">ƒx</span>
            <input
              aria-label="Valor ou fórmula"
              disabled={!ready}
              placeholder="Digite um valor ou =SUM(A1:A10)"
              value={edit}
              onChange={(e) => setEdit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCell();
              }}
            />
            <button
              aria-label="Aplicar célula"
              disabled={!ready}
              title="Aplicar célula"
              onClick={applyCell}
            >
              <Check size={17} />
            </button>
            <output data-testid="cell-result" aria-label="Resultado da célula">
              {cellResult}
            </output>
          </div>
          <div className={"sheet-surface " + (gridDark ? "dark-cells" : "")}>
            {ready ? (
              <Workbook
                key={gridKey}
                ref={grid}
                data={initial}
                lang="en"
                currency="R$"
                showFormulaBar={false}
                toolbarItems={toolbar}
                cellContextMenu={[
                  "copy",
                  "paste",
                  "|",
                  "insert-row",
                  "insert-column",
                  "delete-row",
                  "delete-column",
                  "hide-row",
                  "hide-column",
                  "set-row-height",
                  "set-column-width",
                  "|",
                  "clear",
                  "sort",
                  "orderAZ",
                  "orderZA",
                  "filter",
                  "data",
                  "cell-format",
                ]}
                hooks={hooks.current}
                onChange={stableChanged}
              />
            ) : (
              <div className="loading">Abrindo planilhas…</div>
            )}
          </div>
        </main>
        {["ai", "charts", "history", "settings"].includes(panel) && (
          <aside className="side-panel">
            <div className="panel-title">
              <h2>
                {panel === "ai" ? (
                  <>
                    <Sparkles size={18} /> Assistente IA
                  </>
                ) : panel === "charts" ? (
                  "Gráficos"
                ) : panel === "history" ? (
                  "Histórico de versões"
                ) : (
                  "Configurações"
                )}
              </h2>
              <button aria-label="Fechar painel" onClick={() => setPanel(null)}>
                <X size={17} />
              </button>
            </div>
            {panel === "ai" && (
              <>
                <p className="muted">
                  Da pergunta ao resultado, com você no controle.
                </p>
                {!demo && !providers.length ? (
                  <div className="empty-state">
                    <Sparkles size={30} />
                    <h3>Nenhum provedor configurado.</h3>
                    <p>
                      Configure OpenAI, um serviço compatível, Anthropic, Gemini
                      ou Ollama no servidor. Veja o arquivo{" "}
                      <code>docs/LLM.md</code> incluído no projeto.
                    </p>
                  </div>
                ) : (
                  <>
                    {demo ? (
                      <p className="demo-ai-note" role="note">
                        Demonstração compartilhada: até 3 consultas a cada 30
                        minutos, sujeitas ao limite global de 20 por hora.
                        Use até 20 células e 300 caracteres. Revise a
                        resposta antes de aplicar; não envie dados pessoais.
                      </p>
                    ) : <label>
                      Modelo
                      <select
                        value={provider}
                        onChange={(e) => {
                          setProvider(e.target.value);
                          setAiResult(null);
                        }}
                      >
                        {providers.map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.label} · {p.model}
                          </option>
                        ))}
                      </select>
                    </label>}
                    <label>
                      Intervalo enviado
                      <input
                        value={selection}
                        onChange={(e) =>
                          setSelection(e.target.value.toUpperCase())
                        }
                      />
                    </label>
                    <details className="selection-preview">
                      <summary>Revisar dados que serão enviados</summary>
                      <pre>
                        {(() => {
                          try {
                            return JSON.stringify(
                              sheetMatrix(activeSheet(), selection),
                              null,
                              2,
                            );
                          } catch {
                            return "Intervalo inválido.";
                          }
                        })()}
                      </pre>
                    </details>
                    <label>
                      O que você quer fazer?
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex.: explique estes dados ou proponha uma fórmula para calcular a variação percentual."
                        rows={5}
                        maxLength={demo ? 300 : undefined}
                      />
                    </label>
                    <p className="privacy-note">
                      <Lock size={13} /> Ao enviar, {demo ? "o modelo local recebe" : "o provedor escolhido recebe"}
                      {" "}sua instrução e somente o intervalo acima.
                    </p>
                    <button
                      className="primary"
                      onClick={askAI}
                      disabled={aiBusy || !prompt.trim()}
                    >
                      {aiBusy ? "Consultando…" : "Enviar seleção ao modelo"}
                      <ArrowRight size={16} />
                    </button>
                    {demo && <p><a className="demo-link" href="/">Entrar na sua conta</a></p>}
                  </>
                )}
                {aiResult && (
                  <div className="ai-result">
                    <p>{aiResult.message}</p>
                    {aiResult.proposal?.length > 0 && (
                      <>
                        <table>
                          <thead>
                            <tr>
                              <th>Célula</th>
                              <th>Proposta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aiResult.proposal.map((p) => (
                              <tr key={p.cell}>
                                <td>{p.cell}</td>
                                <td>{String(p.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button className="primary" onClick={applyAI}>
                          Aplicar proposta revisada
                        </button>
                        <button onClick={() => setAiResult(null)}>
                          Descartar
                        </button>
                      </>
                    )}
                  </div>
                )}
                <div className="panel-note">
                  A IA pode cometer erros. Revise fórmulas e resultados antes de
                  usar. Propostas nunca são aplicadas automaticamente.
                </div>
              </>
            )}
            {panel === "charts" && (
              <>
                <p className="muted">
                  Transforme duas colunas em uma nova perspectiva.
                </p>
                <label>
                  Intervalo do gráfico
                  <input
                    value={chartRange}
                    onChange={(e) =>
                      setChartRange(e.target.value.toUpperCase())
                    }
                  />
                  <small>
                    Primeira linha: cabeçalhos. Coluna 1: rótulos. Coluna 2:
                    números.
                  </small>
                </label>
                <label>
                  Tipo
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                  >
                    <option value="bar">Colunas</option>
                    <option value="line">Linhas</option>
                    <option value="doughnut">Rosca</option>
                  </select>
                </label>
                <button className="primary" onClick={createChart}>
                  <ChartColumn size={16} /> Criar gráfico
                </button>
                {(meta.charts || []).map((c) => (
                  <div className="chart-list" key={c.id}>
                    <button onClick={() => setChartConfig(c)}>
                      {c.range} · {c.type}
                    </button>
                    <button
                      aria-label="Excluir gráfico"
                      onClick={() => {
                        const m = {
                          ...current.current.meta,
                          charts: current.current.meta.charts.filter(
                            (x) => x.id !== c.id,
                          ),
                        };
                        current.current.meta = m;
                        setMeta(m);
                        setChartConfig(null);
                        dirty();
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {chartConfig && (
                  <ChartPreview
                    theme={theme}
                    config={chartConfig}
                    sheet={
                      capture().find((s) => s.id === chartConfig.sheetId) ||
                      activeSheet()
                    }
                  />
                )}
                <p className="panel-note">
                  Gráficos são preservados no formato Excellence. A exportação
                  XLSX contém as células.
                </p>
              </>
            )}
            {panel === "history" && (
              <>
                <p className="muted">
                  Cada versão salva é um ponto de retorno.
                </p>
                {versions.map((v) => (
                  <div className="version" key={v.revision}>
                    <History size={16} />
                    <div>
                      <strong>Revisão {v.revision}</strong>
                      <small>
                        {v.title}
                        <br />
                        {new Date(v.created).toLocaleString("pt-BR")}
                      </small>
                    </div>
                    <button
                      disabled={v.revision === current.current.revision}
                      onClick={() => setDialog({ type: "restore", version: v })}
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
                {!versions.length && (
                  <p>Salve o arquivo para iniciar seu histórico.</p>
                )}
                <p className="panel-note">
                  Restaurar cria uma nova revisão. Até 20 revisões por arquivo.
                </p>
              </>
            )}
            {panel === "settings" && (
              <>
                <h3>Conta</h3>
                <p>
                  {user.username} ·{" "}
                  {user.role === "admin" ? "Administrador" : "Usuário"}
                </p>
                <label>
                  Senha atual
                  <input
                    type="password"
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                  />
                </label>
                <label>
                  Nova senha
                  <input
                    type="password"
                    value={nextPass}
                    onChange={(e) => setNextPass(e.target.value)}
                    minLength={12}
                  />
                </label>
                <button
                  onClick={async () => {
                    try {
                      await api("/password", "POST", {
                        current: oldPass,
                        password: nextPass,
                      });
                      setOldPass("");
                      setNextPass("");
                      notice("Senha atualizada e outras sessões encerradas.");
                    } catch (e) {
                      notice(e.message);
                    }
                  }}
                >
                  Alterar senha
                </button>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={auto}
                    onChange={(e) => setAuto(e.target.checked)}
                  />{" "}
                  Salvamento automático
                </label>
                {user.role === "admin" && (
                  <>
                    <h3>Administrar usuários</h3>
                    <label>
                      Novo usuário
                      <input
                        value={newUser}
                        onChange={(e) => setNewUser(e.target.value)}
                      />
                    </label>
                    <label>
                      Senha inicial
                      <input
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                      />
                    </label>
                    <button
                      onClick={async () => {
                        try {
                          await api("/users", "POST", {
                            username: newUser,
                            password: newPass,
                          });
                          setNewUser("");
                          setNewPass("");
                          setUsers((await api("/users")).users);
                          notice("Usuário criado.");
                        } catch (e) {
                          notice(e.message);
                        }
                      }}
                    >
                      Criar usuário
                    </button>
                    {users.map((u) => (
                      <div className="user-row" key={u.id}>
                        <span>
                          {u.username}
                          <small>{u.role}</small>
                        </span>
                        {u.role !== "admin" && (
                          <button
                            aria-label={"Remover usuário " + u.username}
                            onClick={() =>
                              setDialog({ type: "deleteUser", user: u })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <details>
                      <summary>Atividades recentes</summary>
                      {audit.map((a) => (
                        <p className="audit-row" key={a.id}>
                          {a.action} · {a.username || "Conta removida"}
                          <small>
                            {new Date(a.created).toLocaleString("pt-BR")}
                          </small>
                        </p>
                      ))}
                    </details>
                  </>
                )}
                <hr />
                <IconButton
                  icon={LogOut}
                  onClick={async () => {
                    if (await save()) {
                      await api("/logout", "POST", {});
                      logout();
                    }
                  }}
                >
                  Salvar e sair
                </IconButton>
              </>
            )}
          </aside>
        )}
      </div>
      <footer className="status-bar">
        <span>
          <span className="connected-dot" /> Excellence · MIT
        </span>
        <span>
          {address} <span className="muted">·</span>{" "}
          {demo ? "Sessão temporária" : "Ctrl+S para salvar"}
        </span>
        <span>
          <ShieldCheck size={12} /> Sem telemetria própria{" "}
          <span className="muted">·</span> 0.1.0-rc.1
        </span>
      </footer>
      {message && (
        <div className="toast" role="status">
          <AlertTriangle size={18} />
          <span>{message}</span>
          <button aria-label="Dispensar aviso" onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {dialog && (
        <Dialog
          title={
            {
              new: "Comece algo excelente",
              themes: "Seu jeito de trabalhar",
              pivot: "Criar resumo por grupo",
              import: "Importar arquivo",
              delete: "Excluir arquivo",
              restore: "Restaurar versão",
              recovery: "Trabalho recuperado",
              deleteUser: "Remover usuário",
              help: "Conheça o Excellence",
            }[dialog.type]
          }
          wide={dialog.type === "new" || dialog.type === "help"}
          onClose={() => setDialog(null)}
        >
          {dialog.type === "new" && (
            <>
              <p className="muted">
                Uma tela em branco ou um ponto de partida.
              </p>
              <div className="templates">
                {Object.entries(templates).map(([k, t]) => (
                  <button key={k} onClick={() => newFile(k)}>
                    <div className={"template-preview " + k}>
                      <Table2 size={32} />
                    </div>
                    <strong>{t.label}</strong>
                    <small>{t.description}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {dialog.type === "themes" && (
            <>
              <p className="muted">Um ambiente que acompanha seu foco.</p>
              <div className="theme-grid">
                {themes.map(([id, label, color]) => (
                  <button
                    key={id}
                    className={theme === id ? "selected" : ""}
                    onClick={() => setTheme(id)}
                  >
                    <span
                      className={"theme-preview " + id}
                      style={{ "--swatch": color }}
                    >
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      {label}
                      {theme === id && <Check size={15} />}
                    </span>
                  </button>
                ))}
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={gridDark}
                  onChange={(e) => setGridDark(e.target.checked)}
                />{" "}
                Adaptar células para tela escura
              </label>
              <p className="muted small">
                A opção escura transforma as cores somente na tela. Valores e
                cores dos arquivos exportados são preservados.
              </p>
            </>
          )}
          {dialog.type === "pivot" && (
            <>
              <p className="muted">
                A primeira linha da aba atual deve conter cabeçalhos. O resumo é
                uma cópia agregada dos dados, sem atualização automática.
              </p>
              <label>
                Coluna de agrupamento
                <select
                  value={pivotKey}
                  onChange={(e) => setPivotKey(e.target.value)}
                >
                  {Array.from({ length: 26 }, (_, c) => (
                    <option key={c} value={c}>
                      {columnName(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Coluna de valores
                <select
                  value={pivotValue}
                  onChange={(e) => setPivotValue(e.target.value)}
                >
                  {Array.from({ length: 26 }, (_, c) => (
                    <option key={c} value={c}>
                      {columnName(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Operação
                <select
                  value={pivotOp}
                  onChange={(e) => setPivotOp(e.target.value)}
                >
                  <option value="sum">Soma</option>
                  <option value="count">Contagem</option>
                  <option value="average">Média</option>
                  <option value="min">Mínimo</option>
                  <option value="max">Máximo</option>
                </select>
              </label>
              <button className="primary" onClick={createPivot}>
                Criar resumo em nova aba
              </button>
            </>
          )}
          {dialog.type === "import" && (
            <>
              <p>
                <strong>{dialog.file.name}</strong>
              </p>
              <div className="callout">
                <AlertTriangle size={19} />
                <p>
                  XLSX é convertido para o formato do Excellence. Macros,
                  gráficos, pivôs, conexões externas, validações e formatação
                  condicional do original podem ser perdidos. Mantenha uma cópia
                  do arquivo original. A importação não executa macros.
                </p>
              </div>
              <p>
                Para preservar os recursos do Excellence, use o formato nativo
                JSON.
              </p>
              <button className="primary" onClick={() => doImport(dialog.file)}>
                Importar como nova planilha
              </button>
            </>
          )}
          {dialog.type === "delete" && (
            <>
              <p>
                Excluir <strong>{dialog.file.title}</strong> e seu histórico
                desta instalação? Exporte uma cópia se precisar manter os dados.
              </p>
              <button
                className="danger"
                onClick={async () => {
                  try {
                    await api("/workbooks/" + dialog.file.id, "DELETE");
                    await refreshFiles();
                    if (dialog.file.id === current.current.id) {
                      localStorage.removeItem(recoveryKey);
                      load({
                        id: null,
                        title: "Sem título",
                        revision: 0,
                        sheets: blankWorkbook(),
                        meta: { charts: [] },
                      });
                    }
                    setDialog(null);
                  } catch (e) {
                    notice(e.message);
                  }
                }}
              >
                Excluir arquivo e histórico
              </button>
            </>
          )}
          {dialog.type === "restore" && (
            <>
              <p>
                Restaurar a revisão {dialog.version.revision}? As alterações
                atuais serão salvas antes da restauração.
              </p>
              <button
                className="primary"
                onClick={async () => {
                  try {
                    clearTimeout(timer.current);
                    if (inFlight.current) await inFlight.current;
                    const seq = epoch.current;
                    const preserved = unsaved.current
                      ? { ...current.current, sheets: capture() }
                      : undefined;
                    const d = await api(
                      "/workbooks/" + current.current.id + "/restore",
                      "POST",
                      {
                        version: dialog.version.revision,
                        revision: current.current.revision,
                        ...(preserved ? { preserveCurrent: preserved } : {}),
                      },
                    );
                    if (epoch.current !== seq) {
                      current.current.revision = d.revision;
                      stash();
                      notice(
                        "Novas alterações foram preservadas localmente. Exporte ou salve uma cópia.",
                      );
                      return;
                    }
                    load(d);
                    setDialog(null);
                    setVersions(
                      (await api("/workbooks/" + d.id + "/versions")).versions,
                    );
                    notice("Versão restaurada.");
                  } catch (e) {
                    notice(e.message);
                  }
                }}
              >
                Restaurar revisão
              </button>
            </>
          )}
          {dialog.type === "recovery" && (
            <>
              <p>
                Há uma cópia local de <strong>{dialog.data.title}</strong> com
                alterações que podem não ter sido salvas no servidor.
              </p>
              <button
                className="primary"
                onClick={() => {
                  load({
                    ...dialog.data,
                    id: null,
                    revision: 0,
                    title: dialog.data.title + " (recuperado)",
                  });
                  dirty();
                  setDialog(null);
                }}
              >
                Recuperar como novo arquivo
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(recoveryKey);
                  setDialog(null);
                }}
              >
                Descartar cópia local
              </button>
            </>
          )}
          {dialog.type === "deleteUser" && (
            <>
              <p>
                Remover {dialog.user.username} e todos os arquivos dessa conta?
                Esta ação não pode ser desfeita.
              </p>
              <button
                className="danger"
                onClick={async () => {
                  try {
                    await api("/users/" + dialog.user.id, "DELETE");
                    setUsers((await api("/users")).users);
                    setDialog(null);
                  } catch (e) {
                    notice(e.message);
                  }
                }}
              >
                Remover conta e arquivos
              </button>
            </>
          )}
          {dialog.type === "help" && (
            <div className="help-content">
              <p>
                Planilhas livres com edição, fórmulas e arquivos na sua
                infraestrutura.
              </p>
              <h3>Trabalhar com células</h3>
              <p>
                Clique ou navegue com as setas. Use a barra de fórmulas acima
                para editar com teclado. Fórmulas usam nomes em inglês, como{" "}
                <code>=SUM(A1:A10)</code>, <code>=IF(B1&gt;0,"Sim","Não")</code>{" "}
                e <code>=VLOOKUP(A1,B1:D10,2,FALSE)</code>.
              </p>
              <p>
                Use os menus da grade para formatação, filtros, ordenação,
                validação, comentários e congelamento. Copiar/colar e
                desfazer/refazer seguem os atalhos usuais. Parte dos menus da
                grade está em inglês.
              </p>
              <h3>Arquivos e dados</h3>
              <p>
                {demo ? "Nesta demonstração, as edições duram somente nesta sessão. " : "Ctrl+S salva. "}
                O formato Excellence mantém os recursos nativos;
                XLSX e CSV são conversões com limites. Até 10.000 linhas, 256
                colunas e 100.000 células preenchidas por arquivo. Revisões
                concorrentes geram conflito; salve uma cópia para preservar o
                trabalho.
              </p>
              <h3>Imprimir e PDF</h3>
              <p>
                Exporte XLSX e use um aplicativo compatível para definir páginas
                e imprimir em PDF. A grade ainda não fornece paginação de
                impressão.
              </p>
              <h3>Compatibilidade</h3>
              <p>
                Esta versão não implementa VBA, Power Query, Power Pivot, ODS ou
                toda a compatibilidade do Excel. Resumos são estáticos. Consulte
                docs/COMPATIBILITY.md e o relatório de validação antes de usar
                em produção.
              </p>
              <h3>Licença MIT</h3>
              <p>
                Uso pessoal e comercial permitidos, com os avisos de licença. O
                código e as dependências acompanham a distribuição com suas
                licenças.
              </p>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="loading">
        <h2>O editor encontrou um problema.</h2>
        <p>
          Recarregue para restaurar a última versão salva. Alterações locais
          podem estar disponíveis na recuperação.
        </p>
        <button onClick={() => location.reload()}>Reabrir Excellence</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
