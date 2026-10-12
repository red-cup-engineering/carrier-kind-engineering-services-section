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
 * } from "@lenticule-science/metrologic/articulation";
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
export { Predicate, PredicateSchema, CellSchema, predicate, predicateOfClaim, predicationSeed, predicatingCell, cell, converseCell, subjectProjectionCell, objectProjectionCell, specializePredicateCell, converseCellInvolution, converseSeed, converseCellDistinctWhenOriented, subjectProjectionCellIdempotent, objectProjectionCellIdempotent, specializePredicateCellIdentity, cellSet, entitySet, predicateSet, generatedPredicationCellSet, generatePredicationCategory, transfinitePredicationCategory, materializePredicationCategory, predicationSite, presentPredicationSite, freePredicationSite, specializationMorphism, isCell, isSpecializationMorphism, closeSpecialization, cohere, unrelatedPairs, termCoincides, predicateCoincides, cellCoincides, nodeCoincides, baseObjectCoincides, predicationTermIdentity, predicationPredicateIdentity, cellIdentity, predicationNodeIdentity, } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/predication.mjs";
export { relation, relationRead, relationReadAbsence, relationMatrix, matrixEntryReading, relationFromMatrix, isRelationCarrier, pointProfile, stateProfile, stateExtension, transpose, dual, settleStateProfile, settlePointProfile, checkRelationTransform, relationTransform, isRelationTransform, idTransform, composeTransforms, dualTransform, } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-relation.mjs";
export { signatureOfCell, cellSignatureKey, predicationCategoryShadow, incomingArrows, yonedaRecovery, finitePredicationValuation, finiteValuationFromCells, embedding, reindexValuation, reindexWitness, reindexBilatticeHomomorphism, grothendieckTranspose, temporalZeroCell, temporalOneCell, temporalTwoCategory, relativeIdeal, yonedaArrowsFirstReceipt, predicationFibrationReceipt, theoryRelativeIdealReceipt, } from "./fibration.mjs";
export { truthJoinList, truthMeetList, knowledgeJoinList, diagonalFiber, classicalEq, paraconsistentEq, equalityCell, predicatingEqualityReceipt, finiteFibration, truthQuantifierReceipt, } from "./equality.mjs";
export { finitePredicatingFibration, chargeListJoin, chargeListMeet, existsF, forallF, reindexF, swapValuation, predicatingQuantifyingReceipt, finiteConverseFibration, predicatingHyperdoctrineReceipt, predicatingDualHyperdoctrineReceipt, } from "./quantifying.mjs";
export * as positing from "./positing/index.mjs";
export * as typedTheory from "./typed-theory/index.mjs";
export * as geometry from "./geometry/index.mjs";
// independent-evidence — the reseated predication-charge machinery (EAVT rows,
// independent evidence-for/evidence-against, the settled section as a Chu
// space). It moved to computer-data-engine (an evidence-row primitive every
// layer shares, not Sign-specific); this re-export exists only because
// ops-gateway-service/src/control-plane.mjs (Codex's area) still imports it
// from here. New code should import
// @red-cup-engineering/computer-data-engine/independent-evidence directly.
export { REIFIED_PREFIX, reify, isReified, INDEPENDENT_EVIDENCE_WITNESS_KIND, rowId, independentEvidenceRow, independentEvidenceSide, foldIndependentEvidence, sectionSpace, } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/independent-evidence.mjs";
export { eavtToCell, cellToEavt } from "./eavt.mjs";
