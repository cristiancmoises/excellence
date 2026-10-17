import { createApp } from "../server/app.mjs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Excellence requer Node.js 24 LTS.");
  process.exit(1);
}
const port = Number(process.env.PORT || 3210),
  url = `http://127.0.0.1:${port}`;
function open() {
  const args =
    process.platform === "win32"
      ? ["cmd.exe", ["/d", "/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  const child = spawn(args[0], args[1], { stdio: "ignore", detached: true });
  child.on("error", () => console.log("Abra no navegador: " + url));
  child.unref();
}
try {
  const r = await fetch(url + "/health", { signal: AbortSignal.timeout(800) });
  const data = await r.json();
  if (data.app === "excellence") {
    open();
    process.exit(0);
  }
} catch {}
const base =
  process.platform === "win32"
    ? join(
        process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
        "Excellence",
      )
    : join(
        process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"),
        "excellence",
      );
const app = await createApp({
  dataDir: process.env.EXCELLENCE_DATA_DIR || join(base, "data"),
});
app.server.on("error", async (e) => {
  console.error("Não foi possível iniciar:", e.code || e.message);
  await app.close();
  process.exit(1);
});
app.server.listen(port, "127.0.0.1", () => {
  console.log(
    `Excellence • ${url}\nMantenha esta janela aberta enquanto trabalha. Ctrl+C para encerrar.`,
  );
  if (app.needsSetup())
    console.log(
      `\nToken de instalação (copie no formulário): ${app.setupToken}\n`,
    );
  open();
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
