import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as analysis from "@red-cup-engineering/relating/analysis";
import * as upstream from "@lenticule-science/articulating/predicating/positing/settling/analysis";
import * as closure from "@lenticule-science/articulating/predicating/positing/settling/analysis/closure-rule-system";
import { readValuationFiber } from "@lenticule-science/articulating/predicating/positing/valuation-fiber-algebra";

describe("published analysis boundary", () => {
  it("uses the published functions and namespaces across the received analysis family", () => {
    assert.deepEqual(Object.keys(analysis), Object.keys(upstream));
    for (const name of Object.keys(analysis)) {
      if (name !== "closureRule") assert.equal(analysis[name], upstream[name], name);
    }
  });

  it("preserves finite causal and ordered port graph computations", () => {
    assert.deepEqual(analysis.causal.causalMobiusReceipt().mobiusProfileAtTop, { a: 1, b: -1, c: -1 });
    const duplicate = { kind: "lorentzian.causalSet", events: ["x", "x"], links: [] };
    assert.equal(analysis.causal.causalMobius(duplicate, "x", "x").reason, "duplicate-event");
    assert.deepEqual(analysis.portGraph.portGrowthTimeReceipt([0, 2, 4]).timeSection, { 0: 0, 2: 1, 4: 2 });
    for (const path of [[false, false], [true, false], [false, true]]) {
      const receipt = analysis.portGraph.portVershikReceipt(path);
      assert.equal(receipt.successorIndex, receipt.serialIndex + 1);
    }
    assert.equal(analysis.weaveDraft.noFloat([true, false, true]), true);
    assert.equal(analysis.weaveDraft.noFloat([true, true]), false);
  });

  it("keeps relating clS as eventual closure when three steps are insufficient", () => {
    const local = analysis.closureRule;
    const cells = ["a", "b", "c", "d"];
    const system = local.closureRuleSystem(cells, [
      local.alwaysRule("a", "potential"),
      ...cells.slice(1).map((cell, index) => local.closureRule(cell,
        [{ cell: cells[index], atLeast: "potential" }], { cell, charge: "potential" })),
    ]);
    const seed = local.knowledgeLeastValuation(cells);
    assert.equal(readValuationFiber(closure.clS(system, seed), "d"), "absurd");
    assert.equal(local.clS, closure.eventualClosure);
    assert.equal(readValuationFiber(local.clS(system, seed), "d"), "potential");
    const receipt = local.closureRuleReceipt(system, seed);
    assert.deepEqual(receipt.closed, local.clS(system, seed));
    assert.ok(receipt.orbit.length > 4);
    assert.equal(receipt.lfp, true);
    assert.equal(Object.hasOwn(receipt, "eventualFixedPoint"), false);
    assert.equal(Object.isFrozen(receipt), true);
  });

  it("preserves the default and explicit always-rule receipt contract", () => {
    for (const args of [[], ["coordinate", "active"]]) {
      const { eventualFixedPoint, firedAtSeed, ...receipt } = closure.alwaysRuleReceipt(...args);
      assert.deepEqual(analysis.closureRule.alwaysRuleReceipt(...args), {
        ...receipt, lfp: eventualFixedPoint, firedAtSeed,
      });
    }
  });
});
