import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3219",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--no-zygote",
            "--use-gl=angle",
            "--use-angle=swiftshader",
          ],
        }
      : {},
  },
  webServer: {
    command: "node tests/serve.mjs",
    url: "http://127.0.0.1:3219/health",
    reuseExistingServer: false,
  },
  reporter: "list",
});
