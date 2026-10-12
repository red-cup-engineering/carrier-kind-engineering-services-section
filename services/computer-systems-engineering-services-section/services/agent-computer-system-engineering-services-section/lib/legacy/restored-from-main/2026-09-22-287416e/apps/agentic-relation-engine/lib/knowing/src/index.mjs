/**
 * @red-cup-engineering/knowing — the Curry-Howard-Lambek correspondence, epistemically.
 *
 * Knowing owns the epistemic structures: proof search, concept formation, memory,
 * research carriers, and the cognizing comonad over the knowledge order. Concrete
 * filepath memorystore admission is downstream in @emsenn/organizing-a-knowledge-vault.
 */

export {
  research,
  certified,
  knowing,
  introducing,
  studying,
  explaining,
  learning,
  teaching,
  tutoring,
  researchAction,
  learningAction,
  curriculumAction,
  researchActions,

} from "./researching/index.mjs";

export {
  projectResearch,
  projectKnowledge,
  projectCell,
  projectSite,
  projectExplanation,
  projectLearning,
  projectCurriculum,
  projectNextStep,
} from "./projecting/index.mjs";

export {
  admitDocument,
  admitMemory,
  settleMemory,
  settleMemoryFiltration,
  observeMemory,
  inspectMemoryHealth,
  inspectMemoryTopic,
  measureMemoryGap,
  conceptMapMemory,
  markdownSemanticLinefeedText,
  normalizeMarkdownLinefeeds,
  memoryActions,
  normalizeMarkdownLinefeedsAction,

} from "./memory/index.mjs";

export {
  cognizingActions,
  cognizeAction,
  absorbAction,
  reflectAction,
  ruminateAction,
  doubtAction,
  forgetAction,
  assessAction,
  gaugeAction,
  discernAction,
  recollectAction,
  inferAction,
  attendAction,
  consolidateAction,
  attractAction,
  attractorOf,
  spectralAction,
  spectralBindingOf,
  hodgeAction,
  hodgeBindingOf,
  contextualSpectrumAction,
  contextualSpectrumOf,
  contextualDreamFrontierAction,
  contextualDreamFrontierOf,
  contextualityAction,
  contextualityOf,
  samePatternAction,
  knowNecessarilyAction,
  knowPossiblyAction,
  cognizingTerms,
  cognizerCognize,
  cognizerDoubt,
  cognizerForget,
  cognizerReflect,
  cognizerRuminate,
  standingOf,
  joinK,
  meetK,

} from "./cognizing/index.mjs";

export {
  actionResearchCycleAction,
  actionResearchSequenceAction,
  aperiodicActionResearchCycle,
  aperiodicActionResearchCycles,
  aperiodicActionResearchSequence,
  aperiodicDream,
  aperiodicDreamAction,
  aperiodicDreamConjectures,
  aperiodicDiscoveryLedger,
  aperiodicConjuncturalPraxis,
  aperiodicFrontierAgenda,
  aperiodicHologram,
  aperiodicHologramAction,
  aperiodicHolographicPraxis,
  aperiodicMetastableTrajectory,
  aperiodicPraxisFeedback,
  aperiodicPraxisProbes,
  aperiodicResearchProgramAudit,
  aperiodicResidue,
  aperiodicWorldMethodBraid,
  aperiodicWorldMethodConstellation,
  aperiodicWorldMethodEcology,
  aperiodicWorldMethodFeedback,
  aperiodicWorldMethodInterventionPlan,
  aperiodicWorldMethodRepertoire,
  aperiodicWorldMethodWayfinding,
  aperiodicResidueAction,
  admitAperiodicDreamInput,
  admitAperiodicHologramInput,
  admitActionResearchCycleInput,
  admitActionResearchSequenceInput,
  admitPraxisFeedbackInput,
  aperiodicPraxisFrontier,
  dreaming,
  conjuncturalPraxisAction,
  discoveryLedgerAction,
  dreamResult,
  frontierAgendaAction,
  frontierAgendaReason,
  holographicPraxisAction,
  metastableTrajectoryAction,
  praxisFeedbackAction,
  praxisFeedbackInterpretation,
  praxisFrontierAction,
  praxisProbesAction,
  researchProgramAuditAction,
  worldMethodBraidAction,
  worldMethodConstellationAction,
  worldMethodEcologyAction,
  worldMethodFeedbackAction,
  worldMethodInterventionPlanAction,
  worldMethodRepertoireAction,
  worldMethodWayfindingAction,
  strictFiniteDream,
  scottContinuousDream,
  observation,
  task,
  transfiniteDream,

} from "./dreaming/index.mjs";

export {
  knowingFace,

} from "./face.mjs";

export {
  actions,
} from "./actions.mjs";

export {
  find,
  inhabit,
  findAction,
  identityProposition,

} from "./proving/index.mjs";

export {
  formalContext,
  intentOf,
  extentOf,
  closeExtent,
  conceptOfExtent,
  conceptsOf,
  closureLaws,
  conceptualizeAction,

} from "./closing/index.mjs";

export {
  EAVT_RELATION,
  datalogVariableCarrier,
  datalogAtomCarrier,
  datalogRuleCarrier,
  datalogQueryCarrier,
  datalogRelationCarrier,
  datalogEvaluationCarrier,
  variable,
  isVariable,
  evaluateDatalog,

} from "./writing/datalog/index.mjs";

export {
  sparqlVariableCarrier,
  sparqlTriplePatternCarrier,
  sparqlQueryCarrier,
  sparqlResultCarrier,
  chronicleLedgerQueryCarrier,
  HUB_ASSIGNMENT_PREDICATE,
  HUB_SESSION_MASK_PREDICATE,
  sparqlVariable,
  isSparqlVariable,
  triplePattern,
  evaluateSparql,
  // evaluateSparqlFromWitnessLog quarantined: see src/writing/sparql/index.mts (WitnessStore/readWitnessLog not on relating's public surface).
  evaluateChronicleLedgerQuery,
  sessionsAssignedToQuery,
  masksOfSessionQuery,
  triplesToTurtle,
  triplesFromEavt,

} from "./writing/sparql/index.mjs";
