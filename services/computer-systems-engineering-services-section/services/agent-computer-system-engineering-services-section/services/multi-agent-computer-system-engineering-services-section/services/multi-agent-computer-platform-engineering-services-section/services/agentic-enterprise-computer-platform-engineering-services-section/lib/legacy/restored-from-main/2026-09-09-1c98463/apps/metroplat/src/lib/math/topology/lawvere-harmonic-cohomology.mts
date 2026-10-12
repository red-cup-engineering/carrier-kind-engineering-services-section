/** Metro valuation wire names over the shared finite Lawvere harmonic receipt. */
import * as canonical from "@lenticule-science/articulating/predicating/positing/settling/analysis/lawvere-harmonic-cohomology";
import type { FiniteValuation as CanonicalValuation } from "@lenticule-science/articulating/predicating/positing/settling/analysis/flow";
import { toArticulatingName, fromArticulatingName } from "../../values/index.mts";
import { truthSideClosureOperator, type FiniteValuation, type LaplacianizerWitness } from "./flow.mts";
import type { H1Class } from "../tilings/aperiodic-classification.mts";

export interface LawvereHarmonicCohomologyReceipt {
  readonly kind: "lawvereHarmonicCohomology.receipt:witness";
  readonly seed: FiniteValuation;
  readonly settled: FiniteValuation;
  readonly laplacianizer: LaplacianizerWitness;
  readonly classifyingInvariant: H1Class;
  readonly h0TruthFiringCount: number;
  readonly harmonic: true;
  readonly fixedPoint: true;
  readonly classifyingInvariantZero: true;
  readonly cocycle: true;
  readonly coboundary: true;
  readonly coboundaryUnique: true;
  readonly h0CountsTruthFirings: true;
  readonly strictScottRegimeGate: true;
  readonly transfiniteAperiodicBoundary: true;
  readonly frontier: readonly string[];
}


const toCanonical = (v: FiniteValuation): CanonicalValuation => Object.freeze({
  ...v, values: Object.freeze(Object.fromEntries(Object.entries(v.values).map(([cell, name]) => [cell, toArticulatingName(name)]))),
});
const fromCanonical = (v: CanonicalValuation): FiniteValuation => Object.freeze({
  ...v, values: Object.freeze(Object.fromEntries(Object.entries(v.values).map(([cell, name]) => [cell, fromArticulatingName(name)]))),
});
export const defaultSeed = fromCanonical(canonical.defaultSeed);
export const h0TruthFiringCount = (v: FiniteValuation): number => canonical.h0TruthFiringCount(toCanonical(v));
export function lawvereHarmonicCohomologyReceipt(seed: FiniteValuation = defaultSeed): LawvereHarmonicCohomologyReceipt {
  const r = canonical.receipt(toCanonical(seed));
  const settled = fromCanonical(r.settled);
  return Object.freeze({
    ...r, seed, settled,
    laplacianizer: Object.freeze({...r.laplacianizer, operator: truthSideClosureOperator, seed, settled}),
  });
}
