import assert from "node:assert/strict";
import test from "node:test";
import { articulate, mark, utterance } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { presentPredicationSite, predicate } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { evaluateRunTerm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";
import { articulateTerm, predicateTerm, positTerm, settleTerm, induceRelationTerm, relateRelationsTerm } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/descent-term";
import { induceRelation, relateRelations } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/topology";
import { presentSettlementFiltration, freeSettlementFiltration, settlementClosureProfile, closureOrderOfSettlementProfile } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/valuation-closure";
import { posit, valuationOfCharge, presentPositPresheaf } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/fiber";
import { charge, chargeValue } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";

const wire = value => JSON.parse(JSON.stringify(value));

test("portable descent preserves the scientific seed and opaque JSON marks", () => {
  for (const value of [null, false, 0, "held", { nested: ["unknown", true] }]) {
    const admitted = wire(utterance(mark(value), mark({ relation: value })));
    const opened = evaluateRunTerm(articulateTerm, admitted);
    assert.deepEqual(opened, wire(articulate(admitted)));
    assert.deepEqual(opened.potentialAperiodicArticulationCell[1], [[admitted.token], []]);
    assert.deepEqual(evaluateRunTerm(predicateTerm, opened), wire(presentPredicationSite(predicate(articulate(admitted)))));
    for (const name of ["absurd", "potential", "active", "stable"]) for (const order of ["knowledge", "truth"]) {
      const admittedCharge = charge(chargeValue(name), [[mark(value)], [mark({ relation: value })]]);
      const closureProfile = settlementClosureProfile(order);
      const site = predicate(articulate(admitted));
      const posited = posit(site, valuationOfCharge(site, admittedCharge));
      const input = { utterance: admitted, admittedCharge, closureProfile };
      const presentation = evaluateRunTerm(induceRelationTerm, wire(input));
      assert.deepEqual(evaluateRunTerm(positTerm, wire({ predication: presentPredicationSite(site), admittedCharge })), wire(presentPositPresheaf(posited)));
      assert.deepEqual(evaluateRunTerm(settleTerm, wire({ posit: presentPositPresheaf(posited), closureProfile })), wire(presentSettlementFiltration(posited, closureProfile)));
      assert.deepEqual(presentation, wire(presentSettlementFiltration(posited, closureProfile)));
      assert.deepEqual(wire(freeSettlementFiltration(presentation)), wire(induceRelation(admitted, admittedCharge, closureOrderOfSettlementProfile(closureProfile))));
      assert.deepEqual(evaluateRunTerm(relateRelationsTerm, { left: presentation, right: presentation }), wire(relateRelations(presentation, presentation)));
    }
  }
});
