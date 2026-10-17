import { test, expect } from "@playwright/test";

test("demo is temporary, blocks file uploads and never accesses account APIs or storage", async ({ page }) => {
  const apiRequests = [];
  const errors = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      apiRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.demoStorageAccess = [];
    window.demoClipboardReads = 0;
    for (const method of ["getItem", "setItem", "removeItem", "clear"]) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        window.demoStorageAccess.push(method);
        return original.apply(this, args);
      };
    }
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { readText: async () => { window.demoClipboardReads++; throw new Error("Clipboard denied for fallback test"); } },
    });
  });
  await page.goto("/demo");
  await expect(page.getByText("DEMO", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Endereço da célula")).toBeEnabled();
  await expect(page.getByRole("button", { name: "Importar", exact: true })).toHaveCount(0);
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Configurações da conta" })).toHaveCount(0);
  await page.getByLabel("Endereço da célula").fill("B8");
  await page.getByRole("button", { name: "Ir para célula" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("9550");
  await page.getByLabel("Endereço da célula").fill("A1");
  await page.getByRole("button", { name: "Ir para célula" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("Categoria");
  const grid = await page.locator(".fortune-sheet-canvas").boundingBox();
  await page.mouse.click(grid.x + 70, grid.y + 35, { button: "right" });
  await page.getByText("Copy", { exact: true }).click();
  await expect(page.locator("#fortune-copy-content")).toHaveText("Categoria");
  // FortuneSheet restores focus asynchronously after its hidden copy element.
  await expect.poll(() => page.evaluate(() => document.activeElement?.id))
    .not.toBe("fortune-copy-content");
  await page.getByLabel("Endereço da célula").fill("F10");
  await page.getByRole("button", { name: "Ir para célula" }).click();
  // Coordinate-based canvas input needs the scroll and selection paint to settle.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByRole("alert").filter({ hasText: "F. 10" })).toHaveCount(1);
  const selectedCell = await page.locator(".luckysheet-cell-selected-focus").boundingBox();
  await page.mouse.click(selectedCell.x + selectedCell.width / 2, selectedCell.y + selectedCell.height / 2, { button: "right" });
  await page.getByText("Paste", { exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.demoClipboardReads)).toBe(1);
  // Native paste awaits clipboard permission and then commits grid state.
  await expect(page.getByText("Paste", { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.id))
    .not.toBe("fortune-copy-content");
  await page.getByLabel("Endereço da célula").fill("F10");
  await expect.poll(async () => {
    await page.getByRole("button", { name: "Ir para célula" }).click();
    return page.getByTestId("cell-result").textContent();
  }).toBe("Categoria");
  await page.getByLabel("Endereço da célula").fill("F1");
  await page.getByLabel("Valor ou fórmula").fill("=SUM(B3:B7)");
  await page.getByRole("button", { name: "Aplicar célula" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("9550");
  await page.keyboard.press("Control+s");
  await page.getByRole("button", { name: "Gráficos", exact: true }).click();
  await page.getByRole("button", { name: "Criar gráfico", exact: true }).click();
  await expect(page.getByRole("img", { name: "Gráfico da planilha" })).toBeVisible();
  await page.getByRole("button", { name: "Assistente IA", exact: true }).click();
  await expect(page.getByText(/Demonstração compartilhada: até 3 consultas/)).toBeVisible();
  await page.getByRole("button", { name: "Fechar painel" }).click();
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(["name,value\nexample,10"], "example.csv", { type: "text/csv" }));
    return data;
  });
  await page.locator(".workspace").dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.getByText("Uploads não estão disponíveis na demonstração.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => window.demoStorageAccess)).toEqual([]);
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
  await page.reload();
  await page.getByLabel("Endereço da célula").fill("F1");
  await page.getByRole("button", { name: "Ir para célula" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("");
  expect(apiRequests).toEqual([]);
  expect(await page.evaluate(() => window.demoStorageAccess)).toEqual([]);
});

test("demo AI sends only an explicit limited selection and applies a reviewed proposal", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      requests.push(new URL(request.url()).pathname);
  });
  let release;
  let payload;
  await page.route("**/api/demo/ai/assist", async (route) => {
    payload = route.request().postDataJSON();
    await new Promise((resolve) => { release = resolve; });
    await route.fulfill({
      json: { message: "Revise o novo cabeçalho.", proposal: [{ cell: "A1", value: "Categoria demo" }] },
    });
  });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Assistente IA", exact: true }).click();
  await page.getByLabel("Intervalo enviado").fill("A1");
  await page.getByLabel("O que você quer fazer?").fill("Proponha um título para a categoria.");
  await page.getByRole("button", { name: "Enviar seleção ao modelo" }).click();
  await expect(page.getByRole("button", { name: "Consultando…" })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBe(true);
  release();
  await expect(page.getByText("Revise o novo cabeçalho.")).toBeVisible();
  expect(Object.keys(payload).sort()).toEqual(["cells", "prompt", "selection"]);
  expect(payload.cells).toEqual([{ cell: "A1", value: "Categoria" }]);
  await expect(page.getByTestId("cell-result")).toHaveText("Categoria");
  await page.getByRole("button", { name: "Aplicar proposta revisada" }).click();
  await page.getByRole("button", { name: "Ir para célula" }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("Categoria demo");
  await page.unroute("**/api/demo/ai/assist");
  await page.route("**/api/demo/ai/assist", (route) => route.fulfill({
    status: 429,
    json: { error: "Limite da demonstração atingido. Tente novamente mais tarde." },
  }));
  await page.getByRole("button", { name: "Enviar seleção ao modelo" }).click();
  await expect(page.getByText("Limite da demonstração atingido. Tente novamente mais tarde.")).toBeVisible();
  expect(requests).toEqual(["/api/demo/ai/assist", "/api/demo/ai/assist"]);
});
