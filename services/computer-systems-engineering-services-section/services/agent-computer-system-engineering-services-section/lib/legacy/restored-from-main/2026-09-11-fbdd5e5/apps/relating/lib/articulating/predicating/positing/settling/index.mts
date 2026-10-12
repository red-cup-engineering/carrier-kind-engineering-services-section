/**
 * settling — finite settlement outcomes.
 *
 *   potential-scott-continuous-posit-cell --settling--> finite-settlement-cell
 *
 * The settlement filtration, the ordinal closure engine, the knowledge closure
 * and `settle`, the composed descent `induceRelation`, the predication cohomology,
 * and the settlement-filtration reads.
 */
export { induceRelation, relateRelations } from "./topology.mjs";
export { settleUtterances, fixedPointReadingsOfUtterances } from "./utterance-reading.mjs";

export {
  knowledgeValuationClosure,
  knowledgeClosureTrace,
  knowledgeClosureSheaf,
  knowledgeClosureCells,
  truthValuationClosure,
  sameValuation,
  sameMeme,
  lastValuation,
  transportValuationAlongPredicationGenerators,
  possibilizeKnowledge,
  predicationValuationClosureFiniteStageJudgment,
  settlingStageOrdinalOfPredicationValuationClosureStage,
  valuationClosureLattice,
  knowledgeValuationClosureLattice,
  truthValuationClosureLattice,
} from "@lenticule-science/articulating/predicating/positing/settling/valuation-closure";
export type {
  PredicationValuationClosureTraceCarrier,
  PredicationValuationClosureCarrier,
  PredicationValuationClosureFiniteStageJudgment,
} from "@lenticule-science/articulating/predicating/positing/settling/valuation-closure";

export {
  zeroOrdinal, successorOrdinal, limitOrdinal, ordinalLabel, finiteOrdinal, ordinalPlusFinite,
  omegaOrdinal, omegaMultipleOrdinal, omegaSquaredOrdinal, isZeroOrdinal, isSuccessorOrdinal, isLimitOrdinal,
  finiteOrdinalJudgment, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, aperiodicClosureRegime,
  closureRegimeOfOrdinal, closureProcess, closeOrdinalProcess, closureOrbitOfProcess, closureSearchBlocks,
  closureStabilizationAt, closureStabilizationSearchHorizon, stabilizingSup,
} from "@lenticule-science/articulating/predicating/positing/settling/closure";
export type { Ordinal, Lattice, ClosureRegime, ClosureCarrier } from "@lenticule-science/articulating/predicating/positing/settling/closure";

export {
  settlingStageOrdinal, initialSettlingStageOrdinal, successorSettlingStageOrdinal, limitSettlingStageOrdinal,
  judgeFinitudeOfSettlingStage, countableSettlingCofinality, uncountableSettlingCofinality,
} from "@lenticule-science/articulating/predicating/positing/settling/ordinal";
export {
  initialSettlingStageInput, successorSettlingStageInput, limitSettlingStageInput, settlingStageInput,
  readShapeOfSettlingStageOrdinal, settlingStageDesignatedCellSet,
} from "@lenticule-science/articulating/predicating/positing/settling/stage";
export { readDesignatedCellsOfValuation } from "@lenticule-science/articulating/predicating/positing/settling/designation";
export { settlementFiltration } from "@lenticule-science/articulating/predicating/positing/settling/filtration";
export {
  cohomologyOfValuation, cohomology, cohomologyOfCells, cohomologyLaplacian, cohomologyLaplacianOfCells,
  rankVanishing, rankIdentity, rankComparison,
} from "@lenticule-science/articulating/predicating/positing/settling/cohomology";
export type { CohomologyCarrier, FirstCohomologyCarrier, RankVanishingJudgment } from "@lenticule-science/articulating/predicating/positing/settling/cohomology";

export { bigradedCohomology, bigradedCohomologyOfCharges, bigradedRow, bigradingCollapse } from "@lenticule-science/articulating/predicating/positing/settling/bigraded-cohomology";
export type { BigradedCohomologyCarrier, BigradingCollapseJudgment } from "@lenticule-science/articulating/predicating/positing/settling/bigraded-cohomology";
export type { FourCensus } from "@lenticule-science/articulating/predicating/positing/bilattice-charge";

export { readIncrementsOfSettlementFiltration, readFiringsOfSettlementFiltration } from "@lenticule-science/articulating/predicating/positing/settling/increment";
export { readLimitStagesOfSettlementFiltration, readNonScottFiringsOfSettlementFiltration } from "@lenticule-science/articulating/predicating/positing/settling/limit";
export { readFirstCohomologyOfSettlementFiltration } from "@lenticule-science/articulating/predicating/positing/settling/first-cohomology";
export { readClosureInvariantOfSettlementFiltration, readClosureEquivalenceOfSettlementFiltration } from "@lenticule-science/articulating/predicating/positing/settling/invariant";
export { readGradedGapOfSettlementFiltration, readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration } from "@lenticule-science/articulating/predicating/positing/settling/gap";
export { readClassificationOfSettlementFiltration, readDepthOfSettlementFiltration, readDepthFiniteStageJudgmentOfSettlementFiltration } from "@lenticule-science/articulating/predicating/positing/settling/classification";
export { monotonicityCertificateOfFederatedCover, federatedCoverStatementSchema } from "@lenticule-science/articulating/predicating/positing/settling/monotonicity-certificate";
export type { FederatedCoverStatement, MonotonicityCertificate, CoordinationObstructionClass } from "@lenticule-science/articulating/predicating/positing/settling/monotonicity-certificate";

export { fixedPoints } from "@lenticule-science/articulating/predicating/positing/settling/fixed-point";
export type { FixedPointCarrier, FixedPointExtremum, FixedPointJudgment, BoundName } from "@lenticule-science/articulating/predicating/positing/settling/fixed-point";
export { fixedPointGap, fixedPointGapInput } from "@lenticule-science/articulating/predicating/positing/settling/fixed-point-gap";
export { fixedPointReading, fixedPointReadings, readCharge, informationOfSheaf } from "@lenticule-science/articulating/predicating/positing/settling/fixed-point-reading";
export type { MemeTopologyFixedPointReading, MemeTopologyFixedPointReadings, MemeTopologyInformation } from "@lenticule-science/articulating/predicating/positing/settling/fixed-point-reading";
export { documentAddressKey, documentOfFixedPoint, html_is_carrier_not_document } from "@lenticule-science/articulating/predicating/positing/settling/document";
export type {
  Document,
  DocumentAddress,
  DocumentFixedPointObstruction,
  DocumentJudgment,
  DocumentOrder,
  DocumentReference,
  DocumentValuationSite,
  HtmlIsCarrierNotDocumentWitness,
} from "@lenticule-science/articulating/predicating/positing/settling/document";
export { valuationConsistency } from "@lenticule-science/articulating/predicating/positing/settling/valuation-consistency";
export type { PredicationValuationConsistencyCarrier } from "@lenticule-science/articulating/predicating/positing/settling/valuation-consistency";
export { sectionOf, predicationsFor, subjectsFor, chargeAtValues, partitionSection, topologyVitals } from "@lenticule-science/articulating/predicating/positing/settling/section";
export type { SectionCarrier, SectionEntry, SectionPartitionCarrier, TopologyVitalsCarrier } from "@lenticule-science/articulating/predicating/positing/settling/section";

export {
  classifyFiring, classifyFiringOrbit, firingGrade, firingGrades, firingGenerator, negateFiringGenerator,
  firingFirstCohomology, firingGradeShadow, firingGradeCohomology, firingIndependence, firingSelfDuality,
  firingTypeMultiplicities, valuedFiringsOfSettlementFiltration,
} from "@lenticule-science/articulating/predicating/positing/settling/firing";
export type { FiringGrade, FiringGenerator, FiringFirstCohomology, FiringOrbitClassification, FiringSelfDuality, ValuedFiring } from "@lenticule-science/articulating/predicating/positing/settling/firing";

export { commutate, presheaf, presheafFromValuation, sheafFromValuation } from "@lenticule-science/articulating/predicating/positing/settling/sheaf";
export type { PositPresheaf, PresheafTrace, SheafCarrier, CommutationCarrier } from "@lenticule-science/articulating/predicating/positing/settling/sheaf";
export type { SettlementFiltrationGenerators } from "./topology.mjs";

export type {
  SettlementFiltration, SettlingStage, SettlingStageOrdinalCarrier, SettlingIncrement,
  SettlingClassification, SettlingFirstCohomology, GradedGapCarrier, SettlingClosureInvariant,
  SettlingCofinalityCarrier, SettlingFiniteStageJudgment, SettlingClosureEquivalenceJudgment,
} from "@lenticule-science/articulating/predicating/positing/settling/object";

export {
  valueCategory,
  partialOrderOver,
  vClosure,
  closureOver,
  settleOverValue,
  settleFixedPoint,
  settleLeast,
  closureRegimeData,
  classifyRegime,
  fourRegimeDichotomy,
  regimeOfValueSettling,
  fourRegimeValueIndependent,
  cohomologyVanishesInRegime,
  chargeValueCategory,
  chargeSample,
  chargeJoinVClosure,
  booleanValueCategory,
  booleanSample,
  booleanJoinVClosure,
  spineRecovery,
  support,
  divides,
  magnitudeWitness,
  countingDequantizationReceipt,
  magnitudeWitnessReceipt,
} from "@lenticule-science/articulating/predicating/positing/settling/value-category";
export type {
  ValueCategory,
  PartialOrderJudgment,
  VClosure,
  ClosureLawJudgment,
  SettleFixedPointJudgment,
  SettleLeastJudgment,
  ClosureRegimeData,
  ClosureRegimeDataJudgment,
  FourRegimeDichotomy,
  ValueIndependentRegimeWitness,
  SpineRecoveryWitness,
  CountingDequantizationReceipt,
  MagnitudeWitnessReceipt,
} from "@lenticule-science/articulating/predicating/positing/settling/value-category";

export { learningDepthNames, learningDepthOfRegime, learningDepthOfRegimeData } from "@lenticule-science/articulating/predicating/positing/settling/learning-depth";
export type { LearningDepthName, LearningDepth } from "@lenticule-science/articulating/predicating/positing/settling/learning-depth";
export {
  observedLearningAscent,
  observedLearningNontrivialReturn,
  learningCycleOfClosureCarrier,
} from "@lenticule-science/articulating/predicating/positing/settling/learning-cycle";
export type {
  ObservedLearningAscentStep,
  ObservedLearningAscentWitness,
  ObservedLearningAscentObstruction,
  ObservedLearningAscentJudgment,
  ObservedLearningReturn,
  ObservedLearningNoNontrivialReturnWitness,
  ObservedLearningNontrivialReturnObstruction,
  ObservedLearningNontrivialReturnJudgment,
  ObservedLearningCycleRead,
} from "@lenticule-science/articulating/predicating/positing/settling/learning-cycle";

export {
  optimizationProblem,
  ofSettling,
  optimum,
  locallyOptimal,
  optimumReachable,
  optimumIsFixedPoint,
  settlingIsOptimization,
  settlingOptimizationReceipt,
  metricOptimumIsMinFixedPoint,
} from "@lenticule-science/articulating/predicating/positing/settling/optimization";
export type { OptimizationProblem, SettlingIsOptimizationWitness, SettlingOptimizationReceipt } from "@lenticule-science/articulating/predicating/positing/settling/optimization";

export {
  stochSemiring,
  natStochSemiring,
  ratStochSemiring,
  markovKernel,
  kernelSum,
  advance,
  stochClosure,
  isStationary,
  rowsSumToOne,
  detailedBalance,
  detailedBalanceImpliesStationary,
  markovStationaryIsClosureFixpoint,
  stochVC,
  stochVClosure,
  witnessKernel,
  uniformWitness,
  uniformWitnessStationary,
  poissonKernel,
  poissonPi,
  poissonDetailedBalance,
  poissonSettlingReceipt,
  stochasticIsValueSettling,
} from "@lenticule-science/articulating/predicating/positing/settling/stochastic";
export type {
  StochSemiring,
  MarkovKernel,
  DetailedBalanceStationaryWitness,
  PoissonSettlingWitness,
  StationaryFixpointWitness,
  StochasticIsValueSettlingWitness,
} from "@lenticule-science/articulating/predicating/positing/settling/stochastic";

export {
  sampleSpace,
  emptyEvent,
  univEvent,
  interEvent,
  unionEvent,
  complEvent,
  subsetEvent,
  disjointEvent,
  measure,
  total,
  expectation,
  expectationAdditive,
  expectationHomogeneous,
  expectationIndicator,
  expectationLaws,
  measureEmpty,
  measureUniv,
  additivityOnDisjoint,
  monotonicity,
  complementLaw,
  measureIsValuation,
  condMeasure,
  reindexEvent,
  conditioningIsReindex,
  conditionalViaFiberAdjoint,
  realUnitIntervalValueCategory,
} from "@lenticule-science/articulating/predicating/positing/settling/probability";
export type {
  ProbabilityEvent,
  SampleSpace,
  ExpectationLawsWitness,
  MeasureIsValuationWitness,
  ConditionalWitness,
  RealUnitIntervalValueCategoryReceipt,
} from "@lenticule-science/articulating/predicating/positing/settling/probability";

export * as analysis from "./analysis/index.mjs";
export * as geometry from "@lenticule-science/articulating/predicating/positing/settling/geometry/index";
export * as dynamics from "./dynamics/index.mjs";
export {
  readFiringEventsOfSettlementFiltration,
  readCausalOrderOfSettlementFiltration,
  causalSeparation,
  causalCone,
  orderingFraction,
} from "@lenticule-science/articulating/predicating/positing/settling/geometry/temporal";
export type {
  FiringEvent,
  CausalOrderCarrier,
  TimelikeSeparation,
  SpacelikeSeparation,
  CausalSeparationObstruction,
  CausalSeparation,
  CausalConeCarrier,
  CausalConeObstruction,
  CausalConeJudgment,
  OrderingFractionCarrier,
  OrderingFractionObstruction,
  OrderingFractionJudgment,
} from "@lenticule-science/articulating/predicating/positing/settling/geometry/temporal";

export { settle, freeSettlementFiltration, utteranceKnowledgeClosureCohomology } from "./topology.mjs";
