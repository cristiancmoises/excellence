import { test, expect } from "@playwright/test";
test.describe.configure({ mode: "serial" });
test("planilha real: cálculo, persistência, temas, arquivos, gráfico e IA", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("BROWSER", m.text());
  });
  await page.goto("/");
  await page.getByLabel("Setup token").fill("browser-test-token");
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser-Test-Password-42");
  await page.getByRole("button", { name: "Create administrator" }).click();
  await expect(
    page.getByText("Excellence", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Cell address").fill("D2");
  await page.getByRole("button", { name: "Go to cell" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("1200");
  await page.getByLabel("Cell address").fill("A1");
  await page.getByLabel("Value or formula").fill("10");
  await page
    .getByRole("button", { name: "Apply cell", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText("10");
  await page.getByLabel("Cell address").fill("B1");
  await page.getByLabel("Value or formula").fill("=A1*2");
  await page
    .getByRole("button", { name: "Apply cell", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText("20");
  await page.getByLabel("Cell address").fill("B1");
  await page.getByRole("button", { name: "Go to cell" }).click();
  const clipboardGrid = await page.locator(".fortune-sheet-canvas").boundingBox();
  await page.mouse.click(clipboardGrid.x + 70, clipboardGrid.y + 35, { button: "right" });
  await page.getByText("Copy", { exact: true }).click();
  await page.getByLabel("Cell address").fill("C1");
  await page.getByRole("button", { name: "Go to cell" }).click();
  await page.mouse.click(clipboardGrid.x + 70, clipboardGrid.y + 35, { button: "right" });
  await page.getByText("Paste", { exact: true }).click();
  await page.getByRole("button", { name: "Go to cell" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("20");
  await page.getByRole("button", { name: "Save now" }).click();
  await expect(page.getByTestId("save-status")).toContainText("Saved");
  await page.getByRole("button", { name: "Themes", exact: true }).click();
  await page.getByRole("button", { name: "Amethyst", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "amethyst");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Save now" }),
  ).toBeVisible();
  await page.getByLabel("Cell address").fill("B1");
  await page
    .getByRole("button", { name: "Go to cell", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText("20");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Excel (.xlsx)", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
  await page.getByRole("button", { name: "Charts", exact: true }).click();
  await page.getByLabel("Chart range").fill("A1:B4");
  await page
    .getByRole("button", { name: "Create chart", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Spreadsheet chart" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "AI assistant", exact: true })
    .click();
  await expect(page.getByText("No provider configured.")).toBeVisible();
  expect(errors).toEqual([]);
});
async function login(page) {
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser-Test-Password-42");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Cell address")).toBeEnabled();
}
async function enter(page, cell, value, result) {
  await page.getByLabel("Cell address").fill(cell);
  await page.getByLabel("Value or formula").fill(value);
  await page
    .getByRole("button", { name: "Apply cell", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText(String(result));
}
test("fórmulas comuns, alteração de dependências e referências entre abas", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page
    .getByRole("button", { name: "Budget Revenue, expenses and balance." })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const [f, v] of [
    ["=SUM(B3:B7)", 9550],
    ["=AVERAGE(C3:C7)", 1808],
    ["=COUNT(B3:B7)", 5],
    ['=IF(B3>5000,"Sim","Não")', "Sim"],
    ['=SUMIF(A3:A7,"Team",B3:B7)', 6500],
    ['=VLOOKUP("Team",A3:C7,3,FALSE)', 6200],
    ["=IFERROR(1/0,0)", 0],
    ["=ROUND(1.235,2)", 1.24],
  ])
    await enter(page, "F1", f, v);
  await enter(page, "F2", "=B3*2", 13000);
  await enter(page, "B3", "7000", 7000);
  await page.getByLabel("Cell address").fill("F2");
  await page
    .getByRole("button", { name: "Go to cell", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText("14000");
  const native = {
    format: "excellence",
    formatVersion: 1,
    title: "Duas abas",
    sheets: [
      {
        id: "dados-test",
        name: "Dados teste",
        status: 1,
        row: 100,
        column: 26,
        celldata: [{ r: 0, c: 0, v: { v: 7 } }],
      },
      {
        id: "resumo-test",
        name: "Resumo teste",
        row: 100,
        column: 26,
        celldata: [{ r: 0, c: 0, v: { f: "='Dados teste'!A1*3" } }],
      },
    ],
    meta: { charts: [] },
  };
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "Duas-abas.excellence.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(native)),
    });
  await page
    .getByRole("button", { name: "Import as a new spreadsheet" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Dados teste", { exact: true }).first(),
  ).toBeVisible();
  await enter(page, "A1", "8", 8);
  await page.getByText("Resumo teste", { exact: true }).first().click();
  await page.getByLabel("Cell address").fill("A1");
  await page
    .getByRole("button", { name: "Go to cell", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText("24");
});
test("resposta atrasada de salvar preserva título editado durante a requisição", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Account settings" }).click();
  await page.getByLabel("Auto-save").uncheck();
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByLabel("File name").fill("Título capturado");
  let release,
    intercepted = false;
  let signal;
  const waiting = new Promise((r) => (signal = r));
  await page.route("**/api/workbooks/*", async (route) => {
    if (route.request().method() === "PUT" && !intercepted) {
      intercepted = true;
      signal();
      await new Promise((r) => (release = r));
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Save now" }).click();
  await waiting;
  await page.getByLabel("File name").fill("Título mais novo");
  release();
  await expect(page.getByTestId("save-status")).toContainText(
    "Unsaved changes",
  );
  await expect(page.getByLabel("File name")).toHaveValue(
    "Título mais novo",
  );
  await page.getByRole("button", { name: "Save now" }).click();
  await expect(page.getByTestId("save-status")).toContainText("Saved");
  await page.reload();
  await expect(page.getByLabel("File name")).toHaveValue(
    "Título mais novo",
  );
});
test("falha de salvar mantém edição recente; falta de espaço local mantém aviso de saída", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Account settings" }).click();
  await page.getByLabel("Auto-save").uncheck();
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByLabel("File name").fill("Falha capturada");
  let release,
    signal,
    used = false;
  const waiting = new Promise((r) => (signal = r));
  await page.route("**/api/workbooks/*", async (route) => {
    if (route.request().method() === "PUT" && !used) {
      used = true;
      signal();
      await new Promise((r) => (release = r));
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save now" }).click();
  await waiting;
  await page.getByLabel("File name").fill("Edição recente preservada");
  await enter(page, "B2", "913", 913);
  release();
  await expect(page.getByTestId("save-status")).toContainText(
    "Save failed",
  );
  const recovery = await page.evaluate(() =>
    JSON.parse(
      Object.entries(localStorage).find(([k]) =>
        k.startsWith("excellence-recovery"),
      )[1],
    ),
  );
  expect(recovery.title).toBe("Edição recente preservada");
  expect(
    recovery.sheets.some((s) =>
      s.celldata.some((c) => c.r === 1 && c.c === 1 && c.v.v === 913),
    ),
  ).toBeTruthy();
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("excellence-recovery")) localStorage.removeItem(k);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k.startsWith("excellence-recovery"))
        throw new DOMException("Quota", "QuotaExceededError");
      return original.call(this, k, v);
    };
  });
  await enter(page, "B3", "814", 814);
  await expect(
    page.getByText(
      "Local recovery storage is full. Save to the server or export a copy before closing.",
    ),
  ).toBeVisible();
  const dialogPromise = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  const d = await dialogPromise;
  expect(d.type()).toBe("beforeunload");
  await d.dismiss();
});

test("interface compacta mantém comandos, menus e painéis acessíveis em telas pequenas", async ({
  page,
}, testInfo) => {
  await login(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 1024, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const rect = (selector) => {
        const { x, y, width, height } = document
          .querySelector(selector)
          .getBoundingClientRect();
        return { x, y, width, height };
      };
      return {
        pageWidth: document.documentElement.scrollWidth,
        header: rect(".app-header"),
        formula: rect(".formula-bar"),
        grid: rect(".sheet-surface"),
        actions: [...document.querySelectorAll(".menu-bar button")].map(
          (element) => {
            const { left, right } = element.getBoundingClientRect();
            return { left, right };
          },
        ),
      };
    });
    expect(geometry.pageWidth).toBe(width);
    expect(geometry.header.height).toBeLessThanOrEqual(56);
    expect(geometry.grid.height).toBeGreaterThan(400);
    expect(geometry.formula.y + geometry.formula.height).toBeLessThanOrEqual(
      geometry.grid.y,
    );
    for (const action of geometry.actions) {
      expect(action.left).toBeGreaterThanOrEqual(0);
      expect(action.right).toBeLessThanOrEqual(width);
    }
    await page.getByRole("button", { name: "Export", exact: true }).click();
    const menu = page.locator("#export-options");
    await expect(menu).toBeVisible();
    const bounds = await menu.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(page.locator("#export-trigger")).toBeFocused();
    await page.getByRole("button", { name: "AI assistant", exact: true }).click();
    const panel = await page.locator(".side-panel").boundingBox();
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Close panel" }).click();
    await page.screenshot({ path: testInfo.outputPath(`workspace-${width}.png`) });
  }
  await enter(page, "C2", "=SUM(4,5)", 9);
  await page.getByRole("button", { name: "Save now" }).click();
  await expect(page.getByTestId("save-status")).toContainText("Saved");
  expect(errors).toEqual([]);
});
