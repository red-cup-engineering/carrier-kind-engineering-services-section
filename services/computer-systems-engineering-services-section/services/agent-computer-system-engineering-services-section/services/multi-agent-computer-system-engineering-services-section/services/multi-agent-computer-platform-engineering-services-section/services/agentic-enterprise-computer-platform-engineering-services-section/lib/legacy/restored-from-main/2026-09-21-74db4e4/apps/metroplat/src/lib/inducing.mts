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
import { articulate, utterance, type Mark, type UtteranceCarrier as UtteranceObject } from "@red-cup-engineering/computer-data-engine/utterance";
import { freePredicationSite, predicate, presentPredicationSite } from "@red-cup-engineering/computer-data-engine/predication";
import { posit } from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";
import { cohomology, type CohomologyCarrier as Cohomology } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cohomology";
import { fixedPoints } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point";
import { fixedPointReadings as fixedPointExtremaProfile, type MemeTopologyFixedPointReadings as FixedPointExtremaProfile } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point-reading";
import type { Settlement } from "@lenticule-science/metrologic/settling/settlement";
import {
  freeSettlementFiltration,
  knowledgeClosureSheaf,
  settling,
  type SettlementFiltrationGenerators,
} from "./settling.mts";

/** Present one Inducing pass by the generators its terminal Settlement freely closes. */
export function presentInducing(utteranceObject: UtteranceObject): SettlementFiltrationGenerators {
  if (typeof utteranceObject !== "object" || utteranceObject === null || utteranceObject.kind !== "utterance.carrier") {
    throw new TypeError("presentInducing: expected an utterance object");
  }
  const generators = presentPredicationSite(predicate(articulate(utteranceObject)));
  return Object.freeze({
    kind: "predication.settlement.filtration" as const,
    cells: generators.cells,
    specializations: generators.specializations,
  });
}

/** Combine the generator presentations of two Inducing passes. */
export function combineInductionGenerators(
  left: SettlementFiltrationGenerators,
  right: SettlementFiltrationGenerators,
): SettlementFiltrationGenerators {
  if (typeof left !== "object" || left === null || left.kind !== "predication.settlement.filtration") {
    throw new TypeError("combineInductionGenerators: expected left Settlement generators");
  }
  if (typeof right !== "object" || right === null || right.kind !== "predication.settlement.filtration") {
    throw new TypeError("combineInductionGenerators: expected right Settlement generators");
  }
  return Object.freeze({
    kind: "predication.settlement.filtration" as const,
    cells: Object.freeze([...left.cells, ...right.cells]),
    specializations: Object.freeze([...left.specializations, ...right.specializations]),
  });
}

/** Run one complete Inducing pass over an admitted Utterance. */
export function inducing(utteranceObject: UtteranceObject): Settlement {
  return settling(posit(predicate(articulate(utteranceObject))));
}

/** Run Inducing over a non-empty admitted collection and close their combined generators. */
export function inducingAll(utterances: readonly UtteranceObject[]): Settlement {
  if (utterances.length === 0) throw new TypeError("inducingAll: expected at least one utterance");
  const generators = utterances
    .map(presentInducing)
    .reduce((left, right) => combineInductionGenerators(left, right));
  return freeSettlementFiltration(generators);
}

/** Read the knowledge-closure cohomology of one induced utterance. */
export function inductionKnowledgeClosureCohomology(left: Mark, right: Mark): Cohomology {
  const positPresheaf = posit(predicate(articulate(utterance(left, right))));
  return cohomology(knowledgeClosureSheaf(positPresheaf));
}

/** Read the four fixed-point extrema of a non-empty collection's Inducing pass. */
export function inductionFixedPointExtremaProfile(
  utterances: readonly UtteranceObject[],
): FixedPointExtremaProfile {
  if (utterances.length === 0) throw new TypeError("inductionFixedPointExtremaProfile: expected at least one utterance");
  const generators = utterances
    .map(presentInducing)
    .reduce((left, right) => combineInductionGenerators(left, right));
  const site = freePredicationSite({
    kind: "predication.site",
    cells: generators.cells,
    specializations: generators.specializations,
  });
  return fixedPointExtremaProfile(fixedPoints(posit(site)));
}
