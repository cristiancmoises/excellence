import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAiGuard } from "../server/ai-limits.mjs";

test("demo budgets persist across connections and expire in sliding windows", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "excellence-ai-budget-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let now = 10000000;
  const path = join(dir, "budget.sqlite");
  const first = new DatabaseSync(path);
  const guard = createAiGuard(first, () => now);
  for (let i = 0; i < 3; i++) guard("same-source", true)();
  first.close();
  const reopened = new DatabaseSync(path);
  t.after(() => reopened.close());
  const again = createAiGuard(reopened, () => now);
  assert.throws(() => again("same-source", true), (e) => e.status === 429 && e.retryAfter === 1800);
  now += 1800001;
  again("same-source", true)();
});

test("global demo cap survives source rotation and does not block authenticated allowance", (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  let now = 10000000;
  const guard = createAiGuard(db, () => now);
  for (let i = 0; i < 20; i++) guard("source-" + i, true)();
  assert.throws(() => guard("new-source", true), (e) => e.status === 429 && /global/.test(e.message));
  guard("account", false)();
  assert.equal(db.prepare("SELECT count(*) AS n FROM ai_demo_usage").get().n, 20);
  now += 3600001;
  guard("new-source", true)();
  assert.equal(db.prepare("SELECT count(*) AS n FROM ai_demo_usage").get().n, 1);
});

test("one persistent inference lease covers demo, accounts and new guard instances", (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  let now = 10000000;
  const guard = createAiGuard(db, () => now);
  const release = guard("demo", true);
  const restarted = createAiGuard(db, () => now);
  for (const demo of [false, true]) assert.throws(() => restarted("other", demo), (e) => e.status === 503);
  assert.equal(db.prepare("SELECT count(*) AS n FROM ai_demo_usage").get().n, 1);
  release();
  const second = restarted("account", false);
  release(); // An old release cannot clear another request's lease.
  assert.throws(() => guard("demo", true), (e) => e.status === 503);
  now += 100001; // A crashed process leaves a bounded lease, not a permanent lock.
  guard("demo", true)();
  second();
});
