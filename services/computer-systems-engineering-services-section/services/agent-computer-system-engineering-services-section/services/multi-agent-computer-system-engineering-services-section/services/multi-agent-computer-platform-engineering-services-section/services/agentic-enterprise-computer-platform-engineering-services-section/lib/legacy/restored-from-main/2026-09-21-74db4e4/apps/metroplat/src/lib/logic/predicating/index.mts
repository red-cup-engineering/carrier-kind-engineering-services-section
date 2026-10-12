/**
 * @packageDocumentation
 *
 * predicating — the predication category over the articulation base.
 *
 * `predicate` consumes an articulation cell and materializes the predication site
 * Φ = E × Π × E that positing consumes. Cells, sets, the base category, coherence,
 * and specialization closure live here. Coincidence is structural (boundary-first).
 *
 * The same surface also exposes finite FOUR-valued relation matrices: sparse
 * point×state cells whose duplicate coordinates join in the knowledge order,
 * whose rows and columns can be read as point/state profiles, and whose
 * `transpose`, `dual`, and checked transforms mirror the Chu-space vocabulary
 * database adapter and not the full Lean Chu category runtime.
 *
 * @example
 * ```ts
 * import {
 *   chargeValue,
 *   relationFromMatrix,
 *   relationMatrix,
 *   stateExtension,
 * } from "@red-cup-engineering/metroplat";
 *
 * const same = (left: string, right: string) => left === right;
 * const matrix = relationMatrix(
 *   { kind: "predication.entitySet", entities: ["alpha", "beta"] },
 *   { kind: "predication.predicateSet", predicates: ["warm"] },
 *   [
 *     ["alpha", "warm", chargeValue("unknown")],
 *     ["alpha", "warm", chargeValue("held")],
 *   ],
 *   { samePoint: same, sameState: same },
 * );
 *
 * const relationValue = relationFromMatrix(matrix);
 * stateExtension(relationValue, "warm").points.entities; // ["alpha"]
 * ```
 */
export { Predicate, predicate, predicateOfClaim, predicationSeed, predicatingCell, cell, converseCell, subjectProjectionCell, objectProjectionCell, specializePredicateCell, converseCellInvolution, converseSeed, converseCellDistinctWhenOriented, subjectProjectionCellIdempotent, objectProjectionCellIdempotent, specializePredicateCellIdentity, cellSet, entitySet, predicateSet, generatedPredicationCellSet, generatePredicationCategory, transfinitePredicationCategory, materializePredicationCategory, predicationSite, presentPredicationSite, freePredicationSite, specializationMorphism, isCell, isSpecializationMorphism, closeSpecialization, cohere, unrelatedPairs, termCoincides, predicateCoincides, cellCoincides, nodeCoincides, baseObjectCoincides, predicationTermIdentity, predicationPredicateIdentity, cellIdentity, predicationNodeIdentity } from "@red-cup-engineering/computer-data-engine/predication";
export { utteredClaimIdentity } from "@lenticule-science/metrologic/settling/records/utterance/claim-identity";
export type { PredicationTerm, PredicationPredicate, PredicationNode, PredicationBaseObject, PredicationDatum, Cell, Edge, SpecializationMorphism, EntitySet, PredicateSet, CellSet, GeneratedPredicationCellSet, BaseCategory, PredicationSite, PredicationSiteGenerators, PredicationFiberFunctorCarrier as PredicationFiberFunctor, TransfinitePredicationCategory, CoherenceCarrier as CoherenceResult, UnrelatedPairsCarrier as UnrelatedPairsResult, Judgment } from "@red-cup-engineering/computer-data-engine/predication";
export type { UtteredClaimIdentity } from "@lenticule-science/metrologic/settling/records/utterance/claim-identity";

export {
  relation,
  relationRead,
  relationReadAbsence,
  relationMatrix,
  matrixEntryReading,
  relationFromMatrix,
  isBilatticeRelation,
  pointProfile,
  stateProfile,
  stateExtension,
  transpose,
  dual,
  settleStateProfile,
  settlePointProfile,
  checkPointTruthDominance,
  truthDominanceFrontier,
  checkRelationTransform,
  relationTransform,
  isRelationTransform,
  idTransform,
  composeTransforms,
  dualTransform,
} from "./bilattice-relation.mts";
export type {
  RelationSameness,
  RelationReadJudgment,
  BilatticeRelation,
  RelationMatrix,
  RelationMatrixEntry,
  PointProfile,
  StateProfile,
  StateExtension,
  PointTruthDominanceCell,
  PointTruthDominanceJudgment,
  PointTruthDominanceWitness,
  PointTruthDominanceObstruction,
  TruthDominanceFrontier,
  RelationTransform,
  RelationTransformJudgment,
} from "./bilattice-relation.mts";

export {
  signatureOfCell,
  cellSignatureKey,
  predicationCategoryShadow,
  incomingArrows,
  yonedaRecovery,
  finitePredicationValuation,
  finiteValuationFromCells,
  embedding,
  reindexValuation,
  reindexWitness,
  reindexBilatticeHomomorphism,
  grothendieckTranspose,
  temporalZeroCell,
  temporalOneCell,
  temporalTwoCategory,
  relativeIdeal,
  yonedaArrowsFirstReceipt,
  predicationFibrationReceipt,
  theoryRelativeIdealReceipt,
} from "./fibration.mts";
export type {
  PredicationObjectKind,
  PredicationCellSignature,
  PredicationObjectSignature,
  PredicationArrowSignature,
  PredicationCategoryShadow,
  YonedaRecoveryWitness,
  FinitePredicationValuation,
  PredicationEmbeddingEntry,
  PredicationEmbedding,
  ReindexWitness,
  BilatticeHomomorphismWitness,
  GrothendieckTransposeWitness,
  TemporalZeroCell,
  TemporalOneCell,
  TemporalTwoCategoryWitness,
  RelativeIdealWitness,
  YonedaArrowsFirstReceipt,
  PredicationFibrationReceipt,
  TheoryRelativeIdealReceipt,
} from "./fibration.mts";

export {
  truthJoinList,
  truthMeetList,
  knowledgeJoinList,
  diagonalFiber,
  classicalEq,
  paraconsistentEq,
  equalityCell,
  predicatingEqualityReceipt,
  finiteFibration,
  truthQuantifierReceipt,
} from "./equality.mts";
export type {
  EqualityCell,
  PredicatingEqualityReceipt,
  FiniteFibration,
  FibrationQuantifierReceipt,
} from "./equality.mts";

export {
  finitePredicatingFibration,
  chargeListJoin,
  chargeListMeet,
  existsF,
  forallF,
  reindexF,
  swapValuation,
  predicatingQuantifyingReceipt,
  finiteConverseFibration,
  predicatingHyperdoctrineReceipt,
  predicatingDualHyperdoctrineReceipt,
} from "./quantifying.mts";
export type {
  FiniteValuation,
  PredicatingFiniteFibration,
  PredicatingQuantifyingReceipt,
  PredicatingHyperdoctrineReceipt,
  PredicatingDualHyperdoctrineReceipt,
} from "./quantifying.mts";

// The work-item/jural-relation/office/governance apparatus formerly here
// (`./office.mjs`) has moved to `src/work/model.mts` — it is work and governance
// material over agents holding capabilities, not free-standing predicating
// math, and its real consumers (the capability domain module itself, the
// work-item cut derivers, `services/filesystem`'s governance-<feed> cut)
// now import it from there.

export * as positing from "./evidence/index.mts";
export * as typedTheory from "./typed-theory/index.mts";
export * as geometry from "./geometry/index.mts";
