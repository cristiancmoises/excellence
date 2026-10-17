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
  await page.getByLabel("Token de instalação").fill("browser-test-token");
  await page.getByLabel("Usuário", { exact: true }).fill("admin");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("Browser-Test-Password-42");
  await page.getByRole("button", { name: "Criar administrador" }).click();
  await expect(
    page.getByText("Excellence", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Endereço da célula").fill("A1");
  await page.getByLabel("Valor ou fórmula").fill("10");
  await page
    .getByRole("button", { name: "Aplicar célula", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText("10");
  await page.getByLabel("Endereço da célula").fill("B1");
  await page.getByLabel("Valor ou fórmula").fill("=A1*2");
  await page
    .getByRole("button", { name: "Aplicar célula", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText("20");
  await page.getByRole("button", { name: "Salvar agora" }).click();
  await expect(page.getByTestId("save-status")).toContainText("Salvo");
  await page.getByRole("button", { name: "Temas", exact: true }).click();
  await page.getByRole("button", { name: "Ametista", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "amethyst");
  await page.getByRole("button", { name: "Fechar diálogo" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Salvar agora" }),
  ).toBeVisible();
  await page.getByLabel("Endereço da célula").fill("B1");
  await page
    .getByRole("button", { name: "Ir para célula", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText("20");
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Excel (.xlsx)", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
  await page.getByRole("button", { name: "Gráficos", exact: true }).click();
  await page.getByLabel("Intervalo do gráfico").fill("A1:B4");
  await page
    .getByRole("button", { name: "Criar gráfico", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Gráfico da planilha" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Assistente IA", exact: true })
    .click();
  await expect(page.getByText("Nenhum provedor configurado.")).toBeVisible();
  expect(errors).toEqual([]);
});
async function login(page) {
  await page.goto("/");
  await page.getByLabel("Usuário", { exact: true }).fill("admin");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("Browser-Test-Password-42");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Endereço da célula")).toBeEnabled();
}
async function enter(page, cell, value, result) {
  await page.getByLabel("Endereço da célula").fill(cell);
  await page.getByLabel("Valor ou fórmula").fill(value);
  await page
    .getByRole("button", { name: "Aplicar célula", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText(String(result));
}
test("fórmulas comuns, alteração de dependências e referências entre abas", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Novo", exact: true }).click();
  await page
    .getByRole("button", { name: "Orçamento Receitas, despesas e saldo." })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const [f, v] of [
    ["=SUM(B3:B7)", 9550],
    ["=AVERAGE(C3:C7)", 1808],
    ["=COUNT(B3:B7)", 5],
    ['=IF(B3>5000,"Sim","Não")', "Sim"],
    ['=SUMIF(A3:A7,"Equipe",B3:B7)', 6500],
    ['=VLOOKUP("Equipe",A3:C7,3,FALSE)', 6200],
    ["=IFERROR(1/0,0)", 0],
    ["=ROUND(1.235,2)", 1.24],
  ])
    await enter(page, "F1", f, v);
  await enter(page, "F2", "=B3*2", 13000);
  await enter(page, "B3", "7000", 7000);
  await page.getByLabel("Endereço da célula").fill("F2");
  await page
    .getByRole("button", { name: "Ir para célula", exact: true })
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
    .getByRole("button", { name: "Importar como nova planilha" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Dados teste", { exact: true }).first(),
  ).toBeVisible();
  await enter(page, "A1", "8", 8);
  await page.getByText("Resumo teste", { exact: true }).first().click();
  await page.getByLabel("Endereço da célula").fill("A1");
  await page
    .getByRole("button", { name: "Ir para célula", exact: true })
    .click();
  await expect(page.getByTestId("cell-result")).toHaveText("24");
});
test("resposta atrasada de salvar preserva título editado durante a requisição", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Configurações da conta" }).click();
  await page.getByLabel("Salvamento automático").uncheck();
  await page.getByRole("button", { name: "Fechar painel" }).click();
  await page.getByLabel("Nome do arquivo").fill("Título capturado");
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
  await page.getByRole("button", { name: "Salvar agora" }).click();
  await waiting;
  await page.getByLabel("Nome do arquivo").fill("Título mais novo");
  release();
  await expect(page.getByTestId("save-status")).toContainText(
    "Alterações pendentes",
  );
  await expect(page.getByLabel("Nome do arquivo")).toHaveValue(
    "Título mais novo",
  );
  await page.getByRole("button", { name: "Salvar agora" }).click();
  await expect(page.getByTestId("save-status")).toContainText("Salvo");
  await page.reload();
  await expect(page.getByLabel("Nome do arquivo")).toHaveValue(
    "Título mais novo",
  );
});
test("falha de salvar mantém edição recente; falta de espaço local mantém aviso de saída", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Configurações da conta" }).click();
  await page.getByLabel("Salvamento automático").uncheck();
  await page.getByRole("button", { name: "Fechar painel" }).click();
  await page.getByLabel("Nome do arquivo").fill("Falha capturada");
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
  await page.getByRole("button", { name: "Salvar agora" }).click();
  await waiting;
  await page.getByLabel("Nome do arquivo").fill("Edição recente preservada");
  await enter(page, "B2", "913", 913);
  release();
  await expect(page.getByTestId("save-status")).toContainText(
    "Falha ao salvar",
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
      "A recuperação local está sem espaço. Salve no servidor ou exporte uma cópia antes de fechar.",
    ),
  ).toBeVisible();
  const dialogPromise = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  const d = await dialogPromise;
  expect(d.type()).toBe("beforeunload");
  await d.dismiss();
});
