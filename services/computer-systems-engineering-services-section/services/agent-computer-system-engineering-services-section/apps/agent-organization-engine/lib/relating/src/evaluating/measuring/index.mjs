/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relating/evaluating/measuring` exports Lean-grounded closure-regime
 * invariants as SEN terms.
 *
 * These reproduce abstract RelMath theorems and are golden-vectored against Lean
 * via test/fixtures/lean-measurement-golden.jsonl. Domain: `ClosureRegimeData`
 * `{ scottContinuous, finiteBase, countableCofinality }` / `ClosureRegime`.
 *
 * Product reading: measurement facts that are small enough to compute in Node
 * can still live as portable term bodies, with Lean-emitted vectors acting as
 * the oracle for the finite law surface this package actually claims.
 */
import { tm, } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation";
import { jsonToTerm, objectTerm, stringTerm } from "@red-cup-engineering/computer-data-services-section/semiotic-expression-notation/json-codec";
import {
  aperiodicClosureRegime,
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,

} from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { classifyRegime, cohomologyVanishesInRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/value-category";

export {
  scalarCancellationTerm,
  logStepBoundTerm,
  logMonotoneTerm,
  goldenConvergentLogGapTerm,
  metallicConvergentGapTerm,
  edgeColouringEntropyTerm,
  triangleColouringEntropyTerm,
} from "./internal-real.mjs";
export {
  settleCausalSetTerm,
  geometryIndependentOfTopologyTerm,
} from "./causal.mjs";
export {
  measureIsValuationTerm,
  conditionalViaFiberAdjointTerm,
  markovStationaryIsClosureFixpointTerm,
  stochasticIsValueSettlingTerm,
  expectationLawsTerm,
  detailedBalanceImpliesStationaryTerm,
} from "./probability.mjs";
export {
  properColoringTerm,
  coloringFactorMapTerm,
  completeGraphChromaticTerm,
  handshakeDegreeParityTerm,
  oddClosedWalkBipartiteObstructionTerm,
} from "./coloring.mjs";
export {
  affineTraceParityWordTerm,
  firstPassageTerm,
  parentBarrierTerm,
  twoAdicFactorTerm,
  shortcutOddPartTerm,
  reachedQuiescenceTerm,
  residueCharacterizationTerm,
  padovanLeFibSeqTerm,
} from "./collatz.mjs";
export {
  firingBlowupTerm,
  nscFiringTerm,
  scottClosureNoNscTerm,
  closureFlowDynamicsTerm,
  curvatureRegimeTerm,
  freeEnergyLyapunovTerm,
  laplacianizerTerm,
  lawvereKernelH0Term,
  transfiniteOmegaContinuityTerm,
} from "./flow.mjs";
export {
  yonedaRecoveryTerm,
  reindexTerm,
  reindexBilatticeHomomorphismTerm,
  grothendieckTransposeTerm,
  temporalTwoCategoryTerm,
  relativeIdealTerm,
} from "./predicating.mjs";
export {
  rankVanishingTerm,
  rankIdentityTerm,
  rankComparisonTerm,
  cohomologyCarrierTerm,
  cohomologyLaplacianTerm,
  bigradedCohomologyTerm,
  settlingFirstCohomologyTerm,
} from "./cohomology.mjs";
export {
  relationGraphTerm as laplacianRelationGraphTerm,
  harmonicTerm as laplacianHarmonicTerm,
  hodgeDecompositionTerm as laplacianHodgeDecompositionTerm,
  graphSpectrumTerm as laplacianGraphSpectrumTerm,
  signedBalanceTerm as laplacianSignedBalanceTerm,
} from "./laplacian.mjs";
export {
  matrixShapeTerm as linearAlgebraMatrixShapeTerm,
  squareMatrixInvariantsTerm as linearAlgebraSquareMatrixInvariantsTerm,
  rankNullityTerm as linearAlgebraRankNullityTerm,
} from "./linear-algebra.mjs";

import { CLOSURE_REGIMES, classifyRegimeTerm } from "./regime.mjs";
export { classifyRegimeTerm };

/**
 * `cohomologyVanishesInRegime` — `RelMath.ClosureOrdinalRegime.cohomologyVanishes` as an IR cond-chain.
 * H¹ vanishes in strict/Scott regimes, is non-trivial in transfinite/aperiodic.
 *
 * @example
 * ```ts
 * import { evaluateRunTerm, measurement } from "@red-cup-engineering/relating";
 *
 * const vanishes = evaluateRunTerm(measurement.cohomologyVanishesInRegime, {
 *   kind: "ordinal.closure.regime.finite",
 * });
 * // vanishes === true
 * ```
 */
export const cohomologyVanishesInRegimeTerm = tm.lam(
  CLOSURE_REGIMES.reduceRight(
    (elseBranch, regime) => tm.cond(
      tm.coincide(tm.field("kind", tm.var(0)), stringTerm(regime.kind)),
      jsonToTerm(cohomologyVanishesInRegime(regime)),
      elseBranch,
    ),
    tm.bool(false),
  ),
);

export { absoluteContinuityTerm } from "./absolute-continuity.mjs";
