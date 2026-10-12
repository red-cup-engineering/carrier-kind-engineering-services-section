/**
 * The complete Inducing process.
 *
 * One pass is the composition
 *
 *   articulate → predicate → posit → settle
 *
 * from an admitted Utterance to a Settlement. Settling is only the terminal
 * `PositPresheaf → Settlement` morphism. Inducing is the standing loop at the
 * territory scale: priced residue from an outcome re-enters through canonical
 * admission as a new Utterance; a retained Settlement is audit material and
 * never flows backward as if Settling had an inverse.
 */
import { articulate, mark, utterance } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { freePredicationSite, predicate, presentPredicationSite } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { posit, valuationOfCharge } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/fiber";
import { cohomology } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/cohomology";
import { fixedPoints } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/fixed-point";
import { fixedPointReadings as fixedPointExtremaProfile } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/fixed-point-reading";

import {
  freeSettlementFiltration,
  knowledgeClosureSheaf,
  settling,

} from "./settling.mjs";

/** Present one Inducing pass by the generators its terminal Settlement freely closes. */
export function presentInducing(utteranceObject) {
  if (typeof utteranceObject !== "object" || utteranceObject === null || utteranceObject.kind !== "utterance.carrier") {
    throw new TypeError("presentInducing: expected an utterance object");
  }
  const generators = presentPredicationSite(predicate(articulate(utteranceObject)));
  return Object.freeze({
    kind: "predication.settlement.filtration",
    cells: generators.cells,
    specializations: generators.specializations,
  });
}

/** Combine the generator presentations of two Inducing passes. */
export function combineInductionGenerators(
  left,
  right,
) {
  if (typeof left !== "object" || left === null || left.kind !== "predication.settlement.filtration") {
    throw new TypeError("combineInductionGenerators: expected left Settlement generators");
  }
  if (typeof right !== "object" || right === null || right.kind !== "predication.settlement.filtration") {
    throw new TypeError("combineInductionGenerators: expected right Settlement generators");
  }
  return Object.freeze({
    kind: "predication.settlement.filtration",
    cells: Object.freeze([...left.cells, ...right.cells]),
    specializations: Object.freeze([...left.specializations, ...right.specializations]),
  });
}

/** Run one complete Inducing pass over an admitted Utterance. */
export function inducing(utteranceObject) {
  const predication = predicate(articulate(utteranceObject));
  return settling(posit(predication, valuationOfCharge(predication, witnessedPotential(mark(utteranceObject)))));
}

/** Run Inducing over a non-empty admitted collection and close their combined generators. */
export function inducingAll(utterances) {
  if (utterances.length === 0) throw new TypeError("inducingAll: expected at least one utterance");
  const generators = utterances
    .map(presentInducing)
    .reduce((left, right) => combineInductionGenerators(left, right));
  return freeSettlementFiltration(generators);
}

/** Read the knowledge-closure cohomology of one induced utterance. */
export function inductionKnowledgeClosureCohomology(left, right) {
  const admitted = utterance(left, right);
  const predication = predicate(articulate(admitted));
  const positPresheaf = posit(predication, valuationOfCharge(predication, witnessedPotential(mark(admitted))));
  return cohomology(knowledgeClosureSheaf(positPresheaf));
}

/** Read the four fixed-point extrema of a non-empty collection's Inducing pass. */
export function inductionFixedPointExtremaProfile(
  utterances,
) {
  if (utterances.length === 0) throw new TypeError("inductionFixedPointExtremaProfile: expected at least one utterance");
  const generators = utterances
    .map(presentInducing)
    .reduce((left, right) => combineInductionGenerators(left, right));
  const site = freePredicationSite({
    kind: "predication.site",
    cells: generators.cells,
    specializations: generators.specializations,
  });
  return fixedPointExtremaProfile(fixedPoints(posit(site, valuationOfCharge(site, witnessedPotential(mark(utterances))))));
}
