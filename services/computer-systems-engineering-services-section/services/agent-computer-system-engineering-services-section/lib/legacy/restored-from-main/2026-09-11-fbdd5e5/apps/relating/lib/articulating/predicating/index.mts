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
 * used by RelMath. This is the executable relation-carrier layer, not a graph
 * database adapter and not the full Lean Chu category runtime.
 *
 * @example
 * ```ts
 * import {
 *   chargeValue,
 *   relationFromMatrix,
 *   relationMatrix,
 *   stateExtension,
 * } from "@emsenn/relating";
 *
 * const same = (left: string, right: string) => left === right;
 * const matrix = relationMatrix(
 *   { kind: "predication.entitySet", entities: ["alpha", "beta"] },
 *   { kind: "predication.predicateSet", predicates: ["warm"] },
 *   [
 *     ["alpha", "warm", chargeValue("potential")],
 *     ["alpha", "warm", chargeValue("active")],
 *   ],
 *   { samePoint: same, sameState: same },
 * );
 *
 * const carrier = relationFromMatrix(matrix);
 * stateExtension(carrier, "warm").points.entities; // ["alpha"]
 * ```
 */
export {
  Predicate,
  predicateOfClaim,
  predicationSeed,
  predicatingCell,
  cell,
  converseCell,
  subjectProjectionCell,
  objectProjectionCell,
  specializePredicateCell,
  converseCellInvolution,
  converseSeed,
  converseCellDistinctWhenOriented,
  subjectProjectionCellIdempotent,
  objectProjectionCellIdempotent,
  specializePredicateCellIdentity,
  cellSet,
  entitySet,
  predicateSet,
  generatedPredicationCellSet,
  transfinitePredicationCategory,
  materializePredicationCategory,
  predicationSite,
  presentPredicationSite,
  freePredicationSite,
  specializationMorphism,
  isCell,
  isSpecializationMorphism,
  closeSpecialization,
  cohere,
  unrelatedPairs,
  termCoincides,
  predicateCoincides,
  cellCoincides,
  nodeCoincides,
  baseObjectCoincides,
  predicationTermIdentity,
  predicationPredicateIdentity,
  cellIdentity,
  predicationNodeIdentity,
} from "@lenticule-science/articulating/predicating/predication";
export type {
  PredicationTerm,
  PredicationPredicate,
  PredicationNode,
  PredicationBaseObject,
  PredicationDatum,
  Cell,
  Edge,
  SpecializationMorphism,
  EntitySet,
  PredicateSet,
  CellSet,
  GeneratedPredicationCellSet,
  BaseCategory,
  PredicationSite,
  PredicationSiteGenerators,
  PredicationFiberFunctorCarrier,
  TransfinitePredicationCategory,
  CoherenceCarrier,
  UnrelatedPairsCarrier,
  Judgment,
} from "@lenticule-science/articulating/predicating/predication";

export {
  relation,
  relationRead,
  relationReadAbsence,
  relationMatrix,
  matrixEntryReading,
  relationFromMatrix,
  isRelationCarrier,
  pointProfile,
  stateProfile,
  stateExtension,
  transpose,
  dual,
  settleStateProfile,
  settlePointProfile,
  checkRelationTransform,
  relationTransform,
  isRelationTransform,
  idTransform,
  composeTransforms,
  dualTransform,
} from "@lenticule-science/articulating/predicating/bilattice-relation";
export type {
  RelationSameness,
  RelationReadJudgment,
  RelationCarrier,
  RelationMatrixCarrier,
  RelationMatrixEntry,
  PointProfileCarrier,
  StateProfileCarrier,
  StateExtensionCarrier,
  RelationTransform,
  RelationTransformJudgment,
} from "@lenticule-science/articulating/predicating/bilattice-relation";

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
} from "@lenticule-science/articulating/predicating/fibration";
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
} from "@lenticule-science/articulating/predicating/fibration";

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
} from "@lenticule-science/articulating/predicating/equality";
export type {
  EqualityCell,
  PredicatingEqualityReceipt,
  FiniteFibrationCarrier,
  FibrationQuantifierReceipt,
} from "@lenticule-science/articulating/predicating/equality";

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
} from "@lenticule-science/articulating/predicating/quantifying";
export type {
  FiniteValuation,
  PredicatingFiniteFibration,
  PredicatingQuantifyingReceipt,
  PredicatingHyperdoctrineReceipt,
  PredicatingDualHyperdoctrineReceipt,
} from "@lenticule-science/articulating/predicating/quantifying";

export * as positing from "./positing/index.mjs";
export * as typedTheory from "@lenticule-science/articulating/predicating/typed-theory/index";
export * as geometry from "@lenticule-science/articulating/predicating/geometry/index";

export { generatePredicationCategory, predicate } from "@lenticule-science/articulating/predicating/predication";
