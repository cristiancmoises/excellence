import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
test("backup online inclui commits WAL e passa integridade ao reabrir", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "excellence-backup-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const db = new DatabaseSync(join(dir, "excellence.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL;CREATE TABLE demo(value TEXT);INSERT INTO demo VALUES('dados confirmados');",
  );
  const result = spawnSync(process.execPath, [resolve("scripts/backup.mjs")], {
    encoding: "utf8",
    env: {
      ...process.env,
      EXCELLENCE_DATA_DIR: dir,
      EXCELLENCE_BACKUP_DIR: join(dir, "copies"),
    },
  });
  assert.equal(result.status, 0, result.stderr);
  db.close();
  const files = readdirSync(join(dir, "copies"));
  assert.equal(files.length, 1);
  const restored = new DatabaseSync(join(dir, "copies", files[0]));
  assert.equal(
    restored.prepare("SELECT value FROM demo").get().value,
    "dados confirmados",
  );
  assert.equal(
    Object.values(restored.prepare("PRAGMA integrity_check").get())[0],
    "ok",
  );
  restored.close();
});
