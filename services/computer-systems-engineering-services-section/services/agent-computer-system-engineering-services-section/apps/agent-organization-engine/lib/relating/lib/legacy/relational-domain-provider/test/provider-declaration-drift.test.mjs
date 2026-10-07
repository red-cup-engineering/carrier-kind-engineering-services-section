import test from "node:test";
import assert from "node:assert/strict";

test("signature-only ambient declarations name real provider exports", async () => {
  const [sen, evaluation, bridge] = await Promise.all([
    import("@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation"),
    import("@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval"),
    import("@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec"),
  ]);
  assert.equal(typeof sen.tm, "object");
  for (const name of ["var", "lam", "app", "field", "append", "coincide", "cond", "fold"]) assert.equal(typeof sen.tm[name], "function", name);
  assert.equal(typeof evaluation.evaluateRunTerm, "function");
  for (const name of ["arrayTerm", "objectTerm", "stringTerm", "jsonToTerm"]) assert.equal(typeof bridge[name], "function", name);
});
