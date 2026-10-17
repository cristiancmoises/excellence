import { DatabaseSync, backup } from "node:sqlite";
import { resolve, join } from "node:path";
import { mkdirSync, chmodSync, existsSync } from "node:fs";
const source = resolve(
  process.env.EXCELLENCE_DATA_DIR || "data",
  "excellence.sqlite",
);
if (!existsSync(source)) {
  console.error("Database not found. Set EXCELLENCE_DATA_DIR.");
  process.exit(1);
}
const directory = resolve(process.env.EXCELLENCE_BACKUP_DIR || "backups");
mkdirSync(directory, { recursive: true, mode: 0o700 });
const path = join(
  directory,
  "excellence-" + new Date().toISOString().replaceAll(":", "-") + ".sqlite",
);
const db = new DatabaseSync(source, { readOnly: true });
await backup(db, path);
db.close();
try {
  chmodSync(path, 0o600);
} catch {}
const verify = new DatabaseSync(path);
verify.exec("PRAGMA journal_mode=DELETE");
const check = verify.prepare("PRAGMA integrity_check").get();
verify.close();
if (Object.values(check)[0] !== "ok")
  throw Error("Backup integrity check failed.");
console.log(path);
