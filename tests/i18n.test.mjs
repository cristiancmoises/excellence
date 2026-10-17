import test from "node:test";
import assert from "node:assert/strict";
import { resolveLanguage, translate, languageUrl } from "../src/i18n.mjs";
import { portugueseGridLocale } from "../src/fortune-locale.mjs";
import { templates } from "../src/templates.mjs";

test("language defaults to English and only accepts supported explicit URL choices", () => {
  assert.equal(resolveLanguage(""), "en");
  assert.equal(resolveLanguage("?lang=pt-BR"), "pt-BR");
  assert.equal(resolveLanguage("?lang=en"), "en");
  assert.equal(resolveLanguage("?lang=unknown"), "en");
});

test("known UI text translates without changing unknown user content", () => {
  assert.equal(translate("Salvar", "en"), "Save");
  assert.equal(translate("Salvar", "pt-BR"), "Salvar");
  assert.equal(translate("Budget prepared by Ana", "en"), "Budget prepared by Ana");
  assert.equal(translate("Selecione até {count} células.", "en", { count: 20 }), "Select up to 20 cells.");
});

test("language URLs preserve path, unrelated parameters and fragment", () => {
  assert.equal(languageUrl("https://example.test/demo?view=grid#sheet", "pt-BR"), "/demo?view=grid&lang=pt-BR#sheet");
  assert.equal(languageUrl("https://example.test/?lang=pt-BR", "en"), "/?lang=en");
});

test("new templates use selected language while formulas keep Excel syntax", () => {
  const en = templates.budget.create()[0], pt = templates.budget.create("pt-BR")[0];
  assert.equal(en.name, "Budget");
  assert.equal(en.celldata[0].v.v, "Category");
  assert.equal(pt.name, "Orçamento");
  assert.equal(pt.celldata[0].v.v, "Categoria");
  assert.equal(en.celldata.find((c) => c.r === 7 && c.c === 1).v.f, "=SUM(B3:B7)");
});

test("native Portuguese locale preserves base reference functions and does not mutate English", () => {
  const base = { toolbar: { undo: "Undo", unknownFutureControl: "Future" }, defaultFmt: (currency) => [{ text: "Currency", value: currency + "0.00", example: "123.45" }], functionlist: [{ n: "SUM" }] };
  const pt = portugueseGridLocale(base);
  assert.equal(pt.toolbar.undo, "Desfazer");
  assert.equal(pt.toolbar.unknownFutureControl, "Future");
  assert.equal(base.toolbar.undo, "Undo");
  assert.deepEqual(pt.defaultFmt("R$"), [{ text: "Moeda", value: "R$0.00", example: "123.45" }]);
  assert.equal(base.defaultFmt("$")[0].text, "Currency");
  assert.equal(pt.functionlist, base.functionlist);
});
