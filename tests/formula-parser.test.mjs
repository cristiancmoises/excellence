import test from "node:test";
import assert from "node:assert/strict";
import f from "@fortune-sheet/formula-parser";
test("literais lógicos Excel funcionam sem parênteses, inclusive em VLOOKUP", () => {
  const p = new f.Parser();
  assert.deepEqual(p.parse("IF(TRUE,1,2)", { sheetId: "s" }), {
    error: null,
    result: 1,
  });
  assert.deepEqual(p.parse("FALSE", { sheetId: "s" }), {
    error: null,
    result: false,
  });
  p.on("callRangeValue", (start, end, options, done) =>
    done([
      ["Equipe", 6500, 6200],
      ["Outro", 1, 2],
    ]),
  );
  assert.equal(
    p.parse('VLOOKUP("Equipe",A1:C2,3,FALSE)', { sheetId: "s" }).result,
    6200,
  );
  assert.equal(
    p.parse('"FALSE and TRUE"', { sheetId: "s" }).result,
    "FALSE and TRUE",
  );
});
test("divisão por zero é erro tipado para IFERROR e resultado Excel", () => {
  const p = new f.Parser();
  assert.deepEqual(p.parse("IFERROR(1/0,0)", { sheetId: "s" }), {
    error: null,
    result: 0,
  });
  assert.deepEqual(p.parse("1/0", { sheetId: "s" }), {
    error: "#DIV/0!",
    result: null,
  });
});
