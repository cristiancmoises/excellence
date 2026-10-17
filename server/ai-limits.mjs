import { randomUUID } from "node:crypto";

function limited(status, message, retryAfter) {
  const error = new Error(message);
  Object.assign(error, { status, retryAfter });
  throw error;
}

// The same SQLite volume as the workbooks keeps budgets and the single lease
// across restarts. Admission is synchronous and atomic; there is no job queue.
export function createAiGuard(db, clock = Date.now) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_demo_usage(source TEXT NOT NULL, started INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS ai_inference_lease(id INTEGER PRIMARY KEY CHECK(id=1), token TEXT NOT NULL, expires INTEGER NOT NULL);
  `);
  return (source, demo = false) => {
    const now = clock(), token = randomUUID();
    db.exec("BEGIN IMMEDIATE");
    try {
      const lock = db.prepare("SELECT expires FROM ai_inference_lease WHERE id=1").get();
      if (lock?.expires > now)
        limited(503, "O assistente está ocupado. Aguarde a consulta atual terminar.", Math.ceil((lock.expires - now) / 1000));
      db.prepare("DELETE FROM ai_demo_usage WHERE started<=?").run(now - 3600000);
      if (demo) {
        const all = db.prepare("SELECT started FROM ai_demo_usage ORDER BY started").all();
        if (all.length >= 20)
          limited(429, "O limite global da demonstração foi atingido (20 consultas por hora).", Math.max(1, Math.ceil((all[0].started + 3600000 - now) / 1000)));
        const local = db.prepare("SELECT started FROM ai_demo_usage WHERE source=? AND started>? ORDER BY started").all(source, now - 1800000);
        if (local.length >= 3)
          limited(429, "Limite da demonstração compartilhada: 3 consultas a cada 30 minutos.", Math.max(1, Math.ceil((local[0].started + 1800000 - now) / 1000)));
        db.prepare("INSERT INTO ai_demo_usage(source,started)VALUES(?,?)").run(source, now);
      }
      // Longer than the longest adapter timeout (90 seconds). After a crash,
      // retain the lease until expiry so restarting cannot bypass concurrency.
      db.prepare("INSERT INTO ai_inference_lease VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token,expires=excluded.expires").run(token, now + 100000);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return () => db.prepare("DELETE FROM ai_inference_lease WHERE id=1 AND token=?").run(token);
  };
}
