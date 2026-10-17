import { test, expect } from "@playwright/test";

test("English is default and switching to Portuguese preserves temporary workbook edits", async ({ page }) => {
  const requests = [], errors = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.localeStorageAccess = [];
    for (const method of ["getItem", "setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        window.localeStorageAccess.push(method);
        return original.apply(this, args);
      };
    }
  });
  await page.goto("/demo");
  await expect(page.getByRole("button", { name: "New", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByLabel("Cell address", { exact: true }).fill("F1");
  await page.getByLabel("Value or formula").fill("=SUM(B3:B7)");
  await page.getByRole("button", { name: "Apply cell" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("9550");
  await page.getByRole("button", { name: "Charts", exact: true }).click();
  await page.getByRole("button", { name: "Create chart", exact: true }).click();
  await expect(page.getByRole("img", { name: "Spreadsheet chart" })).toBeVisible();
  await expect(page.getByRole("button", { name: /A1:B8 · Columns/ })).toBeVisible();
  await page.getByLabel("Language / Idioma").selectOption("pt-BR");
  await expect(page).toHaveURL(/lang=pt-BR/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("button", { name: "Novo", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Gráfico da planilha" })).toBeVisible();
  await expect(page.getByRole("button", { name: /A1:B8 · Colunas/ })).toBeVisible();
  await page.getByText("Dados do gráfico", { exact: true }).click();
  await expect(page.locator(".side-panel table")).toContainText("Category");
  await page.getByRole("button", { name: "Fechar painel" }).click();
  await page.getByLabel("Endereço da célula").fill("F1");
  await page.getByRole("button", { name: "Ir para célula" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("9550");
  await expect(page.getByRole("button", { name: "Desfazer", exact: true })).toBeVisible();
  await page.getByLabel("Language / Idioma").selectOption("en");
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Border: Border", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Go to cell" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("9550");
  expect(await page.evaluate(() => window.localeStorageAccess)).toEqual([]);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("explicit Portuguese and default English remain usable at phone, tablet and desktop widths", async ({ page }) => {
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const language of ["en", "pt-BR"]) {
      await page.goto(language === "en" ? "/demo" : "/demo?lang=pt-BR");
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.getByLabel("Language / Idioma")).toBeVisible();
      const address = page.getByLabel(language === "en" ? "Cell address" : "Endereço da célula", { exact: true });
      await address.fill("A1");
      await page.getByRole("button", { name: language === "en" ? "Go to cell" : "Ir para célula" }).click();
      await expect(page.getByTestId("cell-result")).toHaveText(language === "en" ? "Category" : "Categoria");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(page.locator("input[type=file]")).toHaveCount(0);
    }
  }
});

test("account session requests follow explicit UI language without creating an account", async ({ page }) => {
  for (const language of ["en", "pt-BR"]) {
    const session = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/session");
    await page.goto("/?lang=" + language);
    expect((await session).headers()["accept-language"]).toBe(language);
    await expect(page.getByLabel(language === "en" ? "Username" : "Usuário", { exact: true })).toBeVisible();
  }
});
