// Characterization test: the settling substrate does NOT guard admission.
//
// The original design doc (§0.1) claimed `fiberCarrier()` enforces at
// runtime that a valuation cannot admit a cell or predicate foreign to
// its site. The 2026-08-21 panel audit found no such guard in
// fiber.mts, and the live probe below confirms it: a site knowing only
// `metabolizes` accepts a meme predicated on `teleports`, and
// `composeFibers` mints a fresh fiber for the foreign predicate.
//
// This test asserts the substrate's CURRENT behavior, so that the day
// the membrane service exists, its own suite can assert the opposite
// verdict at the membrane while this one keeps the substrate's
// permissiveness on the record. If relating ever grows its own site
// guard, this test fails loudly and the membrane's division of labor
// gets re-derived rather than silently doubled.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mark } from "@red-cup-engineering/signcell/mark";
import { token, claim } from "@red-cup-engineering/signcell/utterance";
import { cell, predicationSite, Predicate } from "@red-cup-engineering/signcell/predication";
import { meme, composeFibers } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/fiber";
import { witnessedPotential } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";

test("composeFibers admits a meme whose predicate is foreign to the site", () => {
  const pKnown = new Predicate(claim(mark("metabolizes")));
  const pForeign = new Predicate(claim(mark("teleports")));
  const knownCell = cell(
    token(mark("cell-alpha")),
    pKnown,
    token(mark("glucose")),
  );
  const site = predicationSite([knownCell]);

  const sitePredicates = site.cells.predicates.predicates.map(
    (p) => p.claim.mark.value,
  );
  assert.deepEqual(sitePredicates, ["metabolizes"]);

  const foreignCell = cell(
    token(mark("cell-alpha")),
    pForeign,
    token(mark("elsewhere")),
  );
  const chargeCarrier = witnessedPotential(mark("claimed-by-test"));

  const valuation = composeFibers(
    [meme(knownCell, chargeCarrier), meme(foreignCell, chargeCarrier)],
    site.base,
  );
  const fiberPredicates = valuation.fibers.map(
    (f) => f.predicate.claim.mark.value,
  );

  // The substrate accepted the foreign predicate: admission control is
  // wholly the membrane service's obligation.
  assert.deepEqual(fiberPredicates, ["metabolizes", "teleports"]);
});
