/**
 * fixpoint is the monotone closure engine: ordinal stages, valuation closure, fixed-point extrema, gaps, firing, sheaf transport, and value-category settling.
 * It may import values, schema, records, and logic, but it must not import codecs, capability, rendering, search, integrations, or services.
 */
export * from "./bigraded-cohomology.mjs";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cell-set";
export {
  readClassificationOfSettlementFiltration,
  readDepthOfSettlementFiltration,
  readDepthFiniteStageJudgmentOfSettlementFiltration,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling";
export {
  zeroOrdinal, successorOrdinal, limitOrdinal, ordinalLabel, finiteOrdinal, ordinalPlusFinite,
  omegaOrdinal, omegaMultipleOrdinal, omegaSquaredOrdinal, isZeroOrdinal, isSuccessorOrdinal, isLimitOrdinal,
  finiteOrdinalJudgment, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, aperiodicClosureRegime,
  closureRegimeOfOrdinal, closureProcess, closeOrdinalProcess, closureOrbitOfProcess, closureSearchBlocks,
  closureStabilizationAt, closureStabilizationSearchHorizon, stabilizingSup,
  settlingStageOrdinal, initialSettlingStageOrdinal, successorSettlingStageOrdinal, limitSettlingStageOrdinal,
  judgeFinitudeOfSettlingStage, countableSettlingCofinality, uncountableSettlingCofinality,
  initialSettlingStageInput, successorSettlingStageInput, limitSettlingStageInput, settlingStageInput,
  readShapeOfSettlingStageOrdinal, settlingStageDesignatedCellSet,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling";

export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cohomology";
export * from "./designation.mjs";
export * from "./firing.mjs";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point-gap";
export {
  fixedPointGapCellReadings as fixedPointGapCellJudgments,

} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point-gap";
export { fixedPoints } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point";
export { fixedPointReading, fixedPointReadings, readCharge, memeTopologyInformationEntry, memeTopologyInformationEntries, memeTopologyInformationPoints, memeTopologyInformationStates, memeTopologyInformationRelationMatrix, informationOfSheaf, fixedPointReading as fixedPointExtremumProfile, fixedPointReadings as fixedPointExtremaProfile } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point-reading";
export { valuationConsistencyReadings, valuationConsistentAssignments, valuationContradictoryAssignments, consistentValuationSubcarrier, contradictoryValuationSubcarrier, valuationConsistencyVanishing, valuationConsistency, valuationConsistencyReadings as valuationConsistencyJudgments, consistentValuationSubcarrier as consistentValuationSubvaluation, contradictoryValuationSubcarrier as contradictoryValuationSubvaluation } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/valuation-consistency";
export { documentAddressKey, documentOfFixedPoint, html_is_carrier_not_document } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/document";
export { sectionOf, predicationsFor, subjectsFor, chargeAtValues, partitionSection, topologyVitals } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/section";
export { documentOrderSchema, documentFixedPointObstructionSchema } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/document";
export * from "./gap.mjs";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/increment";
export * from "./invariant.mjs";
export * from "./learning-cycle.mjs";
export * from "./learning-depth.mjs";
export * from "./limit.mjs";
export * from "./monotonicity-certificate.mjs";
export { monotonicityCertificateOfFederatedCover } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/monotonicity-certificate";
export * from "./optimization.mjs";
export * from "./probability.mjs";
export * from "./ranked-judgments.mjs";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/sheaf";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/stochastic";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/value-category";
export * from "./state-fold.mjs";
