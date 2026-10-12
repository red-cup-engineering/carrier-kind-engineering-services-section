/**
 * fixpoint is the monotone closure engine: ordinal stages, valuation closure, fixed-point extrema, gaps, firing, sheaf transport, and value-category settling.
 * It may import values, schema, records, and logic, but it must not import codecs, capability, rendering, search, integrations, or services.
 */
export * from "./bigraded-cohomology.mts";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cell-set";
export * from "./classification.mts";
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
export type { Ordinal, Lattice, ClosureRegime, ClosureCarrier } from "@lenticule-science/metrologic/articulation/predicating/positing/settling";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cohomology";
export * from "./designation.mts";
export * from "./firing.mts";
export * from "./first-cohomology.mts";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point-gap";
export {
  fixedPointGapCellReadings as fixedPointGapCellJudgments,
  type FixedPointGapCellReading as FixedPointGapCellJudgment,
  type FixedPointGapCellReadingsCarrier as FixedPointGapCellJudgments,
  type FixedPointGapCellClosuresCarrier as FixedPointGapCellClosures,
  type FixedPointGapCellOpeningsCarrier as FixedPointGapCellOpenings,
  type FixedPointGapMissingGreatestCellsCarrier as FixedPointGapMissingGreatestCells,
  type FixedPointGapCellObstructionsCarrier as FixedPointGapCellObstructions,
  type FixedPointGapCarrier as FixedPointGapReport,
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point-gap";
export { type BoundName, type FixedPointOrderObject, type FixedPointBoundObject, type FixedPointSeedCarrier, type FixedPointExtremum, type FixedPointWitness, type FixedPointObstruction, type FixedPointJudgment, type FixedPointOrderCarrier, type FixedPointCarrier, fixedPoints, type FixedPointSeedCarrier as FixedPointSeed, type FixedPointOrderCarrier as FixedPointOrder, type FixedPointCarrier as FixedPointStructure } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point";
export { type MemeTopologyFixedPointReading, type MemeTopologyFixedPointReadings, type MemeTopologyInformation, type MemeTopologyInformationEntry, type MemeTopologyInformationEntriesCarrier, fixedPointReading, fixedPointReadings, readCharge, memeTopologyInformationEntry, memeTopologyInformationEntries, memeTopologyInformationPoints, memeTopologyInformationStates, memeTopologyInformationRelationMatrix, informationOfSheaf, fixedPointReading as fixedPointExtremumProfile, fixedPointReadings as fixedPointExtremaProfile, type MemeTopologyFixedPointReading as FixedPointExtremumProfile, type MemeTopologyFixedPointReadings as FixedPointExtremaProfile, type MemeTopologyInformationEntriesCarrier as MemeTopologyInformationEntries } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/fixed-point-reading";
export { type ValuationAssignmentConsistencyWitness, type ValuationAssignmentContradictionWitness, type ValuationConsistencyJudgment, type ValuationConsistencyReadingsCarrier, type ValuationConsistentAssignmentsCarrier, type ValuationContradictoryAssignmentsCarrier, type ValuationConsistencyVanishingWitness, type ValuationConsistencyVanishingObstruction, type ValuationConsistencyVanishingJudgment, type ConsistentValuationSubcarrier, type ContradictoryValuationSubcarrier, type PredicationValuationConsistencyCarrier, valuationConsistencyReadings, valuationConsistentAssignments, valuationContradictoryAssignments, consistentValuationSubcarrier, contradictoryValuationSubcarrier, valuationConsistencyVanishing, valuationConsistency, valuationConsistencyReadings as valuationConsistencyJudgments, type ValuationConsistencyReadingsCarrier as ValuationConsistencyJudgments, type ValuationConsistentAssignmentsCarrier as ValuationConsistentAssignments, type ValuationContradictoryAssignmentsCarrier as ValuationContradictoryAssignments, type ConsistentValuationSubcarrier as ConsistentValuationSubvaluation, type ContradictoryValuationSubcarrier as ContradictoryValuationSubvaluation, type PredicationValuationConsistencyCarrier as PredicationValuationConsistencyReport, consistentValuationSubcarrier as consistentValuationSubvaluation, contradictoryValuationSubcarrier as contradictoryValuationSubvaluation } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/valuation-consistency";
export { type DocumentAddress, type DocumentOrder, type DocumentReference, type DocumentValuationSite, type Document, type DocumentFixedPointObstruction, type HtmlIsCarrierNotDocumentWitness, type DocumentJudgment, documentAddressKey, documentOfFixedPoint, html_is_carrier_not_document } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/document";
export { type SectionEntry, type SectionCarrier, type SectionPartitionCarrier, type TopologyVitalsCarrier, sectionOf, predicationsFor, subjectsFor, chargeAtValues, partitionSection, topologyVitals, type SectionCarrier as Section, type TopologyVitalsCarrier as TopologyVitals } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/section";
export { documentOrderSchema, type DocumentOrder, documentFixedPointObstructionSchema, type DocumentFixedPointObstruction, type HtmlPresentationNotDocumentWitness, html_presentation_is_not_document } from "@lenticule-science/metrologic/settling/fixpoint/fixed-point";
export * from "./gap.mts";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/increment";
export * from "./invariant.mts";
export * from "./learning-cycle.mts";
export * from "./learning-depth.mts";
export * from "./limit.mts";
export * from "./monotonicity-certificate.mts";
export * from "./optimization.mts";
export * from "./probability.mts";
export * from "./ranked-judgments.mts";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/sheaf";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/stochastic";
export * from "@lenticule-science/metrologic/articulation/predicating/positing/settling/value-category";
export * from "./state-fold.mts";
