/**
 * @red-cup-engineering/organizing - social-scale governing: settling a plurality of agents
 * into one collective.
 *
 * Organizing is the Gen-2 inter-agent lift of @red-cup-engineering/animating along the agency
 * spiral. Animating glues three faculty faces into one agent; organizing glues a
 * sheaf of agents into one organization.
 *
 * Carriers should move toward Relating's TypeBox carrier kernel directly. The
 * remaining `*.schema.types.mts` modules are legacy checked-in type surfaces, not
 * a build-time codegen contract. Each verb is one Relating action.
 */

export {
  organize,
  assemble,
  adjudicate,
  adjudicationOf,
  socialBecoming,
  socialBecomingOf,
  relate,
  relatingOf,
  community,
  communityOf,
  institute,
  instituteOf,
  socialSymmetry,
  socialSymmetryOf,
  socialStance,
  cohesion,
  governance,

  socialFactor,
  socialUnion,
  face,
  faceOf,
  faceOfMembrane,
  project,
  reseed,
  federate,
  crossArena,
  collectiveRobustness,
  buildTelos,

} from "./organizing.mjs";




import { OrganizingPerformingInboxEventSchema, OrganizingPerformingInboxPerceptionSignalSchema, OrganizingPerformingSessionCharacterLaneSchema, OrganizingPerformingSessionEventSchema, organizingPerformingInboxEventCarrier, organizingPerformingInboxPerceptionSignalCarrier, organizingPerformingSessionCharacterLaneCarrier, organizingPerformingSessionEventCarrier } from "./performing/carriers.mjs";


export const performing = Object.freeze({ OrganizingPerformingInboxEventSchema, OrganizingPerformingInboxPerceptionSignalSchema, OrganizingPerformingSessionCharacterLaneSchema, OrganizingPerformingSessionEventSchema, organizingPerformingInboxEventCarrier, organizingPerformingInboxPerceptionSignalCarrier, organizingPerformingSessionCharacterLaneCarrier, organizingPerformingSessionEventCarrier });

export {
  SituationSceneSchema,
  SituationSchema,
  situationCarrier,
  situation,

} from "./situation/index.mjs";

export {
  TroupeSchema,
  WorkLocusClaimSchema,
  WorkLocusGovernanceSchema,
  troupeCarrier,
  workLocusClaimCarrier,
  workLocusGovernanceCarrier,
  cast,
  stageTroupeMember,
  claimWorkLocus,
  governWorkLocusClaims,

} from "./casting/index.mjs";

export { organizationSymmetryCarrier, organizationStanceCarrier, governanceCarrier, cohesionCarrier,                                                                                                } from "./carriers.mjs";
export {
  WorkspaceCarrierSchema,
  DependencyGraphSchema,
  CoverSchema,
  ResolutionSchema,
  workspaceCarrier,
  dependencyGraphCarrier,
  coverCarrier,
  coverOf,
  resolutionCarrier,

} from "./host-neutral-carriers.mjs";
export {
  decodePnpmLock,
  decodePnpmWorkspace,
  dependencyGraphFromManifests,
  dependencyGraphH1,
  encodePnpmLockResolution,
  encodePnpmWorkspace,
  topologicalSortDependencyGraph,

} from "./js-mark.mjs";

export {
  ACCOUNTING_PREDICATES,
  accountingInputUtterances,
  accountingUtterances,
  amountUtterances,
  directiveUtterances,
  journalUtterances,
  malformedUtterances,
  postingUtterances,
  transactionUtterances,

} from "./accounting.mjs";

export {
  accountingBalance,
  admitAccountingTransaction,
} from "./accounting-balance.mjs";

export { posting, transaction, open, close, commodity, price, pad, balance, option, include, malformed, isTransaction, isDirective, isMalformed, makeRegistry, declareCommodity, observe, postingHolding, inferElided, balances, txnId, runningBalances, balanceAt } from "./accounting/ledger.mjs";

export * from "./accounting/report.mjs";

export * as accountingInstitution from "./accounting/institution.mjs";
export * as accountingCapital from "./accounting/capital.mjs";
export * as accountingCommodity from "./accounting/commodity.mjs";
export * as accountingExchange from "./accounting/exchange.mjs";
export * as accountingMarketAdmission from "./accounting/market-admission.mjs";
export * as accountingStrategy from "./accounting/strategy.mjs";
export * as accountingValue from "./accounting/value.mjs";

export {
  WORK_PREDICATES,
  assignWork,
  deriveWorkType,
  fiber,
  fiberCoordinate,
  fiberOf,
  officeName,
  officeTerm,
  predicate,
  term,
  termKey,
  termValue,
  uniqueTerms,
  workReadingStatus,
  workEvidenceValue,
  workAgent,
  workItem,
  workPriority,
  workProject,
  workPrompt,
  workReport,
  reportSkillResult,
  skillResultRouting,

  workStatusName,
  workSubject,
  workTask,
  workTitle,

} from "./work.mjs";

export {
  admitOfficeEligibilityRequest,
  officeEligibility,
  officeEligibilityTerm,

} from "./authority.mjs";
export { evaluateCorporateAuthority, corporateAuthorityAction } from "./corporate-authority.mjs";

export { actions, organizeAction, assembleAction, adjudicateAction, socialBecomingAction, relatingAction, communityAction, instituteAction, symmetrizeAction, stanceAction, cohesionAction, governAction, verificationTournamentAction, socialFactorAction, faceAction, projectAction, reseedAction, federateAction, officeEligibilityAction, accountingUtterancesAction, accountingBalanceAction, jupyterNotebookAction, jupyterRunCellsAction, capitalActions, commodityActions, exchangeActions, strategyActions, valueActions } from "./actions.mjs";

// -- contradiction-aware federation: witnessed evidence and admission boundary --


// ── the across-face standards codec: ActivityPub Server-to-Server (federation) ──
// scale-2: delivering animating's Activities between agent-camps (the ‖ fan-out).


// ── the across-face standards codec: Matrix — state-resolution over a signed event-DAG ──
// scale-2 / real-time: a ROOM (events over a camp) whose shared state is settled by the
// consensus reading over the event DAG (REUSES converge/federate — not last-writer-wins).


// ── the CALM theorem reading: coordination-free iff monotone ──
// external theorem over federate/federateActivities: agreement-only and no H1 obstruction.
export {
  calmReadingCarrier,
  readCalmFederation,
  readCalmCovers,

} from "./writing/calm/index.mjs";

// ── the coordinated consensus frontier: Raft as the fallback where CALM fails ──
// monotone operations lift with no Raft round; non-monotone operations enter the
// leader-elected, totally ordered RWIL log with one command per index.
export {
  raftLeadershipCarrier,
  raftLogEntryCarrier,
  raftLogCarrier,
  raftAppendResultCarrier,
  calmRaftFrontierCarrier,
  emptyRaftLog,
  raftEntry,
  raftEntryRows,
  raftLogRows,
  projectRaftState,
  oneValuePerIndex,
  appendRaftProposals,
  readCalmRaftFrontier,
  coordinateByCalmOrRaft,

} from "./writing/raft/index.mjs";

// ── the IN-face standards codec: Jupyter — kernel messaging + notebook-as-witness-ledger ──
// scale-2 / shared-compute (computing): the OFFICE OF EXECUTION (kernel) settling
// execute_request → execute_reply, broadcasting iopub outputs, and accumulating a NOTEBOOK
// whose code cells ARE the append-only LOG. cellsToRecords/recordsToCells is the witness-
// ledger projection (log ⇄ records) that round-trips. REUSES jupyter.mts's notebook carriers.
export {
  executeRequestCarrier,
  iopubMessageCarrier,
  executeReplyCarrier,
  echoKernel,
  execute,
  runCells,
  cellsToRecords,
  recordsToCells,
  notebookFromRecords,
  streamOutput,
  resultOutput,

} from "./writing/jupyter/index.mjs";

// -- default Jupyter/data-science views over organizing instance carriers --



// -- cockpit dogfoods the moat: held capability = accountable claim; peer disagreement = contradiction-aware federation --


// -- accountable agentic transaction: authority, invocation, settlement, provenance --


export { NIX_NO_REAL_BINARY_ASSUMPTION, NixWitnessSchema, NixDerivationSchema, NixStorePathSchema, NixClosureSchema, nixWitnessCarrier, nixDerivationCarrier, nixStorePathCarrier, nixClosureCarrier, nixDerivation, settleDerivation, evaluateDerivation, termContentId, storePathFromTerm, closureOf,                                                                                                                          } from "./nix.mjs";

export {
  REPRODUCIBLE_REASONING_SPIKE_ASSUMPTION,
  ReproducibleReasoningBuildSchema,
  ReproducibleReasoningRebuildSchema,
  reproducibleReasoningBuildCarrier,
  reproducibleReasoningRebuildCarrier,
  reproducibleReasoning,
  rebuild,

} from "./reproducible-reasoning.mjs";

export { default as loadAccountingLedger } from "./accounting/ledger.mjs";
export { default as accountingBalanceReport } from "./accounting/report.mjs";
