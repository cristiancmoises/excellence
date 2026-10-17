import { createApp } from "../server/app.mjs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Excellence requires Node.js 24 LTS.");
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
  child.on("error", () => console.log("Open in your browser: " + url));
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
  console.error("Could not start:", e.code || e.message);
  await app.close();
  process.exit(1);
});
app.server.listen(port, "127.0.0.1", () => {
  console.log(
    `Excellence • ${url}\nKeep this window open while working. Press Ctrl+C to stop.`,
  );
  if (app.needsSetup())
    console.log(
      `\nSetup token (copy into the form): ${app.setupToken}\n`,
    );
  open();
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
