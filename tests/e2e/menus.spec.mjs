import { test, expect } from "@playwright/test";

async function openNativeMenu(page) {
  const canvas = await page.locator(".fortune-sheet-canvas").boundingBox();
  await page.mouse.click(canvas.x + 70, canvas.y + 35, { button: "right" });
  const menu = page.locator(".fortune-context-menu");
  await expect(menu).toBeVisible();
  return menu;
}

async function expectInsideViewport(page, menu) {
  await expect.poll(async () => {
    const box = await menu.boundingBox();
    const viewport = page.viewportSize();
    return box && box.x >= 0 && box.y >= 0 &&
      box.x + box.width <= viewport.width && box.y + box.height <= viewport.height;
  }).toBe(true);
}

for (const width of [320, 390, 780, 1280]) {
  test(`native context menu stays inside ${width}px viewport and after resize`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/demo");
    await expect(page.getByLabel("Cell address")).toBeEnabled();
    const menu = await openNativeMenu(page);
    await expectInsideViewport(page, menu);
    await page.setViewportSize({ width: width === 320 ? 1280 : 320, height: 600 });
    // A resize may dismiss the transient menu; if retained, it must still fit.
    if (await menu.isVisible()) await expectInsideViewport(page, menu);
    await page.mouse.click(20, 190);
    await expectInsideViewport(page, await openNativeMenu(page));
    await page.screenshot({ path: test.info().outputPath("native-menu.png") });
  });
}

test("Escape closes the native context menu without changing the selected cell", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByLabel("Cell address")).toBeEnabled();
  const menu = await openNativeMenu(page);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(page.getByLabel("Cell address")).toHaveValue("A1");
  await expect(page.getByTestId("cell-result")).toHaveText("Category");
});

test("Portuguese native menu fits 320px and Escape works from its editable input", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/demo?lang=pt-BR");
  await expect(page.getByLabel("Endereço da célula")).toBeEnabled();
  const menu = await openNativeMenu(page);
  await expectInsideViewport(page, menu);
  await expect(menu.getByText("Copiar", { exact: true })).toBeVisible();
  await menu.locator("input").first().fill("2");
  await expect(menu).toBeVisible();
  await expect(menu.locator("input").first()).toHaveValue("2");
  await page.screenshot({ path: test.info().outputPath("native-menu-pt-input.png") });
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(page.getByLabel("Endereço da célula")).toHaveValue("A1");
  await expect(page.getByTestId("cell-result")).toHaveText("Categoria");
});

test("app panels dismiss native menus and native commands still edit the selected cell", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await expect(page.getByLabel("Cell address")).toBeEnabled();
  const menu = await openNativeMenu(page);
  await page.getByRole("button", { name: "Charts", exact: true }).click();
  await expect(menu).toHaveCount(0);
  await page.getByRole("button", { name: "Create chart", exact: true }).click();
  await expect(page.getByRole("img", { name: "Spreadsheet chart" })).toBeVisible();
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await openNativeMenu(page);
  await page.getByText("Clear content", { exact: true }).click();
  await expect(menu).toHaveCount(0);
  await page.getByRole("button", { name: "Go to cell", exact: true }).click();
  await expect(page.getByTestId("cell-result")).toHaveText("");
});
