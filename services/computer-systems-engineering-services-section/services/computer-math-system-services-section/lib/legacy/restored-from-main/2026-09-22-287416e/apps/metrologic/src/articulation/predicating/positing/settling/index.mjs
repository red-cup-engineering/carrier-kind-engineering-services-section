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
export { settleWith, settleKnowledge, settlementClosureProfile, closureOrderOfSettlementProfile, knowledgeValuationClosureOrder, truthValuationClosureOrder, freeSettlementFiltration, presentSettlementFiltration, knowledgeValuationClosure, knowledgeClosureTrace, knowledgeClosureSheaf, knowledgeClosureCells, truthValuationClosure, sameValuation, sameMeme, lastValuation, transportValuationAlongPredicationGenerators, possibilizeKnowledge, utteranceKnowledgeClosureCohomology, predicationValuationClosureFiniteStageJudgment, settlingStageOrdinalOfPredicationValuationClosureStage, valuationClosureLattice, knowledgeValuationClosureLattice, truthValuationClosureLattice, } from "./valuation-closure.mjs";
export { zeroOrdinal, successorOrdinal, limitOrdinal, ordinalLabel, finiteOrdinal, ordinalPlusFinite, omegaOrdinal, omegaMultipleOrdinal, omegaSquaredOrdinal, isZeroOrdinal, isSuccessorOrdinal, isLimitOrdinal, finiteOrdinalJudgment, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, aperiodicClosureRegime, closureRegimeOfOrdinal, closureProcess, closeOrdinalProcess, closureOrbitOfProcess, closureSearchBlocks, closureStabilizationAt, closureStabilizationSearchHorizon, stabilizingSup, } from "./closure.mjs";
export { settlingStageOrdinal, initialSettlingStageOrdinal, successorSettlingStageOrdinal, limitSettlingStageOrdinal, judgeFinitudeOfSettlingStage, settlingStageOrdinalCoincidenceHolds, countableSettlingCofinality, uncountableSettlingCofinality, } from "./ordinal.mjs";
export { initialSettlingStageInput, successorSettlingStageInput, limitSettlingStageInput, settlingStageInput, readShapeOfSettlingStageOrdinal, settlingStageDesignatedCellSet, isSettlingLimitStage, } from "./stage.mjs";
export { readDesignatedCellsOfValuation } from "./designation.mjs";
export { settlementFiltration } from "./filtration.mjs";
export { cohomologyOfValuation, cohomology, cohomologyOfCells, cohomologyLaplacian, cohomologyLaplacianOfCells, rankVanishing, rankIdentity, rankComparison, } from "./cohomology.mjs";
export { bigradedCohomology, bigradedCohomologyOfCharges, bigradedRow, bigradingCollapse } from "./bigraded-cohomology.mjs";
export { readIncrementsOfSettlementFiltration, readFiringsOfSettlementFiltration } from "./increment.mjs";
export { readLimitStagesOfSettlementFiltration, readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
export { readFirstCohomologyOfSettlementFiltration } from "./first-cohomology.mjs";
export { readClosureInvariantOfSettlementFiltration, readClosureEquivalenceOfSettlementFiltration } from "./invariant.mjs";
export { readGradedGapOfSettlementFiltration, readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration } from "./gap.mjs";
export { readClassificationOfSettlementFiltration, readDepthOfSettlementFiltration, readDepthFiniteStageJudgmentOfSettlementFiltration } from "./classification.mjs";
export { monotonicityCertificateOfFederatedCover, federatedCoverStatementSchema } from "./monotonicity-certificate.mjs";
export { fixedPoints } from "./fixed-point.mjs";
export { fixedPointGap, fixedPointGapInput } from "./fixed-point-gap.mjs";
export { fixedPointReading, fixedPointReadings, readCharge, informationOfSheaf } from "./fixed-point-reading.mjs";
export { documentAddressKey, documentOfFixedPoint, html_is_carrier_not_document } from "./graph/document.mjs";
export { valuationConsistency } from "./valuation-consistency.mjs";
export { sectionOf, predicationsFor, subjectsFor, chargeAtValues, partitionSection, topologyVitals } from "./graph/section.mjs";
export { classifyFiring, classifyFiringOrbit, firingGrade, firingGrades, firingGenerator, negateFiringGenerator, firingFirstCohomology, firingGradeShadow, firingGradeCohomology, firingIndependence, firingSelfDuality, firingTypeMultiplicities, valuedFiringsOfSettlementFiltration, } from "./firing.mjs";
export { commutate, presheaf, presheafFromValuation, sheafFromValuation } from "./sheaf.mjs";
export { valueCategory, partialOrderOver, vClosure, closureOver, settleOverValue, settleFixedPoint, settleLeast, closureRegimeData, classifyRegime, fourRegimeDichotomy, regimeOfValueSettling, fourRegimeValueIndependent, cohomologyVanishesInRegime, chargeValueCategory, chargeSample, chargeJoinVClosure, booleanValueCategory, booleanSample, booleanJoinVClosure, spineRecovery, support, divides, magnitudeWitness, countingDequantizationReceipt, magnitudeWitnessReceipt, } from "./value-category.mjs";
export { learningDepthNames, learningDepthOfRegime, learningDepthOfRegimeData } from "./learning-depth.mjs";
export { observedLearningAscent, observedLearningNontrivialReturn, learningCycleOfClosureCarrier, } from "./learning-cycle.mjs";
export { optimizationProblem, ofSettling, optimum, locallyOptimal, optimumReachable, optimumIsFixedPoint, settlingIsOptimization, settlingOptimizationReceipt, metricOptimumIsMinFixedPoint, } from "./optimization.mjs";
export { stochSemiring, natStochSemiring, ratStochSemiring, markovKernel, kernelSum, advance, stochClosure, isStationary, rowsSumToOne, detailedBalance, detailedBalanceImpliesStationary, markovStationaryIsClosureFixpoint, stochVC, stochVClosure, witnessKernel, uniformWitness, uniformWitnessStationary, poissonKernel, poissonPi, poissonDetailedBalance, poissonSettlingReceipt, stochasticIsValueSettling, } from "./stochastic.mjs";
export { sampleSpace, emptyEvent, univEvent, interEvent, unionEvent, complEvent, subsetEvent, disjointEvent, measure, total, expectation, expectationAdditive, expectationHomogeneous, expectationIndicator, expectationLaws, measureEmpty, measureUniv, additivityOnDisjoint, monotonicity, complementLaw, measureIsValuation, condMeasure, reindexEvent, conditioningIsReindex, conditionalViaFiberAdjoint, realUnitIntervalValueCategory, } from "./probability.mjs";
export * as analysis from "./analysis/index.mjs";
export * as geometry from "./graph/geometry/index.mjs";
export * as dynamics from "../../../../models/dynamics/index.mjs";
export { readFiringEventsOfSettlementFiltration, readCausalOrderOfSettlementFiltration, causalSeparation, causalCone, orderingFraction, } from "./graph/geometry/temporal.mjs";
