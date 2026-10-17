import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";
const dir = mkdtempSync(join(tmpdir(), "excellence-browser-"));
const app = await createApp({ dataDir: dir, setupToken: "browser-test-token" });
app.server.listen(3219, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
    process.exit(0);
  });
