import { createApp } from "./app.mjs";
const app = await createApp();
const host = process.env.EXCELLENCE_HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3210);
app.server.on("error", (e) => {
  console.error("Could not start:", e.code || e.message);
  process.exit(1);
});
app.server.listen(port, host, () => {
  console.log(`Excellence 0.1.0-rc.1 • http://${host}:${port}`);
  if (app.needsSetup())
    console.log(`Setup token (one-time use): ${app.setupToken}`);
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
