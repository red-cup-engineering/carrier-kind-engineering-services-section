import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { articulate, mark, predicating, token, utterance } from "@red-cup-engineering/relating/articulating";
import { freeSettlementFiltration, induceRelation, settle } from "@red-cup-engineering/relating/settling";
import * as dynamics from "@red-cup-engineering/relating/dynamics";
import * as theoryOwner from "@lenticule-science/articulating/predicating/typed-theory/typed-theory";
import * as fibrationOwner from "@lenticule-science/articulating/predicating/fibration";

describe("material descent law", () => {
  it("induceRelation is settle after posit after predicate after articulate", () => {
    const admitted = utterance(mark("token"), mark("claim"));
    const expanded = settle(predicating.positing.posit(predicating.predicate(articulate(admitted))));
    assert.deepEqual(freeSettlementFiltration(induceRelation(admitted)), expanded);
  });

  it("retains seed-token admission and uses current modal-corner names", () => {
    const admitted = utterance(mark("sensor reading: [north, warm]"), mark("observed"));
    const site = predicating.predicate(articulate(admitted));
    assert.equal(site.cells.entities.entities[0], admitted.token);
    const posited = predicating.positing.posit(site);
    for (const fiber of posited.fiber.valuation.fibers) for (const assignment of fiber.assignments) {
      assert.equal(predicating.positing.valueOf(assignment.charge).name, "potential");
      assert.deepEqual(assignment.charge.evidence[0], [assignment.cell.subject.mark]);
    }
    assert.deepEqual(["neither", "dia", "box", "both"].map(predicating.positing.modalToCorner),
      ["absurd", "potential", "active", "stable"]);
  });

  it("derives a two-step specialization through the published theory owner", () => {
    const terms = ["specific", "middle", "general"].map(value => token(mark(value)));
    const theory = predicating.typedTheory.theoryOfData([
      predicating.specializationMorphism(terms[0], terms[1]),
      predicating.specializationMorphism(terms[1], terms[2]),
    ]);
    assert.equal(predicating.typedTheory.derive, theoryOwner.derive);
    assert.equal(predicating.reindexBilatticeHomomorphism, fibrationOwner.reindexBilatticeHomomorphism);
    const derived = predicating.typedTheory.derive(theory, terms[2], terms[0]);
    assert.equal(derived.kind, "typedTheory.derivationSearch:witness");
    assert.equal(derived.derivation.steps.length, 2);
    assert.equal(predicating.typedTheory.derive(theory, terms[0], terms[2]).kind,
      "typedTheory.derivationSearch-obstruction");
  });

  it("runs substitution closures and finite hull restrictions through the public dynamics boundary", () => {
    const [a, b] = ["A", "B"].map(value => dynamics.substitutionSymbol(mark(value)));
    const rule = dynamics.substitutionRule([
      dynamics.substitutionRuleEntry(a, [a, b]), dynamics.substitutionRuleEntry(b, [a]),
    ]);
    const closure = dynamics.fixedPointClosure(rule, [a]);
    assert.deepEqual(closure.phi([a]), [a, b]);
    assert.deepEqual(closure.phi(closure.phi([a])), [a, b, a]);
    assert.equal(closure.lattice.leq([a], [a, b, a]), true);
    const hull = dynamics.hull.odometerHull();
    assert.equal(hull.stage(3).length, 8);
    assert.equal(hull.restrict(1, 3, "101"), "1");
  });
});
