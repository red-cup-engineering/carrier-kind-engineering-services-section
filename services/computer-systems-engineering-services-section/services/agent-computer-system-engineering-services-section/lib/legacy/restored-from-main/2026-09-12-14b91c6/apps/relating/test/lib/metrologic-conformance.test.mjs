import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  chargeValue,
  chargeValueNames,
  chargeValueName,
  joinKnowledgeValue,
  meetKnowledgeValue,
  joinTruthValue,
  meetTruthValue,
  negateValue,
  conflateValue,
  sameChargeValue,
} from "../../dist/src/index.mjs";

import * as metrologic from "@lenticule-science/metrologic/bilattice/charge";
import { place } from "@lenticule-science/metrologic/readout";

// Bridge: relating's [truth, falsity] side coordinates are metrologic's
// [pos, neg] value bits. Both floors already name the same four points
// absurd / potential / active / stable, so conformance is checked on names.
const coordinatesByName = {
  absurd: [false, false],
  potential: [true, false],
  active: [false, true],
  stable: [true, true],
};
const metroCharge = (name) =>
  Object.freeze({ value: coordinatesByName[name], evidence: [[], []] });

const binaryOps = [
  ["joinKnowledge", joinKnowledgeValue, metrologic.joinKnowledge],
  ["meetKnowledge", meetKnowledgeValue, metrologic.meetKnowledge],
  ["joinTruth", joinTruthValue, metrologic.joinTruth],
  ["meetTruth", meetTruthValue, metrologic.meetTruth],
];

const unaryOps = [
  ["negate", negateValue, metrologic.negate],
  ["conflate", conflateValue, metrologic.conflate],
];

describe("metrologic conformance", () => {
  it("names the same four points", () => {
    for (const name of chargeValueNames) {
      assert.equal(place(metroCharge(name)), name);
    }
  });

  it("agrees on every binary operation over all sixteen pairs", () => {
    for (const [opName, relatingOp, metroOp] of binaryOps) {
      for (const left of chargeValueNames) {
        for (const right of chargeValueNames) {
          const relatingResult = chargeValueName(
            relatingOp(chargeValue(left), chargeValue(right)),
          );
          const metroResult = place(
            metroOp({ left: metroCharge(left), right: metroCharge(right) }),
          );
          assert.equal(
            relatingResult,
            metroResult,
            `${opName}(${left}, ${right})`,
          );
        }
      }
    }
  });

  it("agrees on both involutions", () => {
    for (const [opName, relatingOp, metroOp] of unaryOps) {
      for (const name of chargeValueNames) {
        assert.equal(
          chargeValueName(relatingOp(chargeValue(name))),
          place(metroOp(metroCharge(name))),
          `${opName}(${name})`,
        );
      }
    }
  });

  it("agrees on the knowledge order", () => {
    for (const left of chargeValueNames) {
      for (const right of chargeValueNames) {
        const relatingLeq = sameChargeValue(
          joinKnowledgeValue(chargeValue(left), chargeValue(right)),
          chargeValue(right),
        );
        const metroLeq = metrologic.leqKnowledge(
          metroCharge(left),
          metroCharge(right),
        );
        assert.equal(relatingLeq, metroLeq, `leqKnowledge(${left}, ${right})`);
      }
    }
  });
});

import * as received from '@lenticule-science/articulating/predicating/positing/fiber';
import * as receivedCharge from '@lenticule-science/articulating/predicating/positing/bilattice-charge';
import * as predicating from '../../dist/lib/articulating/predicating/index.mjs';
import * as positing from '../../dist/lib/articulating/predicating/positing/index.mjs';
import * as articulation from '../../dist/lib/articulating/index.mjs';

describe('received finite algebra with Relating admission policy', () => {
  it('uses the owner implementations for shared generators and charge laws', () => {
    for (const name of ['composeFibers', 'converse', 'subjectProjection', 'objectProjection', 'specialization']) {
      assert.equal(positing[name], received[name], name);
    }
    assert.equal(positing.chargeBilatticeLawReceipt, receivedCharge.chargeBilatticeLawReceipt);
  });

  it('preserves automatic witnesses and presentation with current articulation and modal labels', () => {
    const utterance = articulation.utterance(articulation.mark('subject'), articulation.mark('predicate'));
    const opened = articulation.articulate(utterance);
    assert.deepEqual(opened.potentialAperiodicArticulationCell[1], [[utterance.token], []]);
    const site = predicating.predicate(opened);
    const posit = positing.posit(site);
    const assignment = posit.fiber.valuation.fibers[0].assignments[0];
    assert.equal(positing.valueOf(assignment.charge).name, 'potential');
    assert.deepEqual(assignment.charge.evidence, [[assignment.cell.subject.mark], []]);
    const presentation = positing.presentPositPresheaf(posit);
    assert.deepEqual(Object.keys(presentation), ['kind', 'cells', 'specializations']);
    assert.deepEqual(positing.freePositPresheaf(presentation), posit);
    assert.deepEqual(Object.keys(positing.fourCensusOfNames([])), ['absurd', 'potential', 'active', 'stable']);
    assert.deepEqual(['neither', 'dia', 'box', 'both'].map(positing.modalToCorner), ['absurd', 'potential', 'active', 'stable']);
  });
});

it("classifies all articulation statuses by current Obsmetrologia Cell.lean", () => {
  // Articulation/Articulating/Cell.lean, authoritative evidence-reading table.
  for (const [token, claim, corner, alias] of [[false, false, "absurd", "kBot"], [true, false, "potential", "tTop"], [false, true, "active", "tBot"], [true, true, "stable", "kTop"]]) {
    const reading = articulation.readFourCorner(token, claim);
    assert.equal(reading.corner, corner);
    assert.equal(reading.chargeName, corner);
    assert.equal(reading.chargeAlias, alias);
  }
  const opened = articulation.articulate(articulation.utterance(articulation.mark("s"), articulation.mark("p")));
  const receipt = articulation.fourCornerCellReceipt(opened);
  assert.equal(receipt.initialAbsurdIsKnowledgeBottom, false);
  assert.equal(Object.hasOwn(receipt, "initialPotentialIsKnowledgeBottom"), false);
});
