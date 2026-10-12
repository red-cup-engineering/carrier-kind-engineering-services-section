/**
 * @red-cup-engineering/computing — the effective topos Eff = Kl(!), computing OVER enriched agents.
 *
 * computing is the Cartesian-closed category of computable functions — the MULTI-AGENT
 * (scale-2 / off-diagonal) reading of knowing (knowing's comonad on one agent's meme,
 * the diagonal, lifted to work over AGENTS). It is multi-agent precisely because
 * `animating` supplies it a full agent to compute over — the same way `playing` is
 * multi-meme (it works over full memes); the lift comes from animating, NOT from the
 * sibling off-diagonal faculties (it depends on none of socializing/gaming/organizing).
 *
 * computing is to the AGENT carrier what communicating is to the meme carrier: every
 * operation admits a full @red-cup-engineering/animating agent (`animating/becoming/doing/working/
 * governing/agent`) — never bare data — and is a carrier→carrier morphism. The corpus's
 * "computation = settling" is literal: an agent IS a settled computation, so `compute`
 * reads its truth as one of FOUR. The faculties are real: playing supplies the !
 * exponential (`bang`); knowing IS the comonad (the ≤_k aggregate, `joinKnowledge`,
 * `relay`); communicating supplies the meme transport (`transport`); animating supplies
 * the agent carrier itself. The relating substrate carries marks and FOUR.
 *
 *   compute  : agent → computation   — the agent's settled truth (FOUR).
 *   compose  : agent → agent         — the Kleisli relay of two agents into one.
 *   relay    : agent → computation   — a society's collective ≤_k knowledge (multi-agent).
 *   transport: agent → communication — the agent's act as a meme (communicating edge).
 *   bang     : agent → !A            — the agent as the reusable ! exponential (playing edge).
 */
export { four, VERIFIED, REFUTED, UNDECIDABLE, CONTRADICTORY } from "./four.mjs";
export {
  admitAgent,
  standingOfAgent,
  compute,
  compose,
  relay,
  spectralSociety,
  diffusedSociety,
  joinKnowledge,
  transport,
  bang,
  AGENT_CARRIER_ID,

} from "./computing.mjs";
export {
  actions,
  computeAction,
  composeAction,
  relayAction,
  bangAction,
  classifyWorkAction,
  decideCapabilitiesAction,
  decideAction,
  reconstructFromHashesAction,
  diffFromBoundaryHashesAction,
  foldTraceAction,
  deriveProvenanceAction,
  projectObservationGameAction,
  coordinateHolographicComputeAction,
  ecosystemInfoTilingAction,
  regulateEcosystemCausalWidthAction,
  stabilizeEcosystemCausalWidthAction,
  ecosystemRecursiveControlAction,
  ecosystemRecursiveUnitAction,
  reconstructEcosystemConeAction,
  diffEcosystemConesAction,
  aperiodicPatchAction,
  aperiodicSelfOrganizeAction,
  aperiodicTheoryAtlasAction,
  aperiodicBridgePlanAction,
  lspAction,
  dapAction,
  eventualConsistencyAction,
  eventualConsistency,
  stochasticConvergenceReceipt,

} from "./actions.mjs";
export {
  computingFace,

} from "./face.mjs";
export {
  observeLabels,
  WORK_TYPES,
  meaningSettled,
  executionSettled,
  workTypeOf,
  classifyWork,
  classifyWorkTerm,
  decideCapabilities,
  decideCapabilitiesTerm,
  settlementLeq,
  admitCapabilityRequest,
  admitWorkClosure,

} from "./operating.mjs";
export {
  buildDerivationCarrier,
  settledBuildTermCarrier,
  lightObservationCarrier,
  buildReconstructionRequestCarrier,
  buildReconstructionCarrier,
  buildDiffRequestCarrier,
  buildDiffCarrier,
  stableJson,
  contentHash,
  nixStoreHash,
  settleBuildDerivation,
  lightObservation,
  reconstructFromHashes,
  diffFromBoundaryHashes,

} from "./holographic-compute.mjs";
export {
  traceEventInputCarrier,
  traceTileCarrier,
  traceFoldRequestCarrier,
  traceTilingCarrier,
  traceTile,
  traceTileFromBuildTerm,
  traceTileFromDapStop,
  traceTileFromLspDocument,
  traceTileFromAction,
  foldTraceTiles,
  foldTraceEvents,

} from "./trace-holography.mjs";
export {
  derivationProvenanceInputCarrier,
  derivationStageCarrier,
  derivationProvenanceReceiptCarrier,
  deriveProvenance,
  provenanceFromBuildTerm,
  provenanceTrace,

} from "./derivation-provenance.mjs";
export {
  observationGameRequestCarrier,
  observationGameProjectionCarrier,
  projectObservationGame,

} from "./game-projection.mjs";
export {
  coordinationSpectrumRequestCarrier,
  coordinationSpectrumCarrier,
  coordinateHolographicCompute,

} from "./coordination-spectrum.mjs";
export {
  ecosystemPackageCarrier,
  ecosystemGraphCarrier,
  ecosystemInfoTilingCarrier,
  ecosystemCausalRegulationRequestCarrier,
  ecosystemCausalRegulationCarrier,
  ecosystemCausalStabilizationRequestCarrier,
  ecosystemCausalStabilizationCarrier,
  ecosystemRecursiveControlRequestCarrier,
  ecosystemRecursiveControlCarrier,
  ecosystemRecursiveUnitRequestCarrier,
  ecosystemRecursiveUnitCarrier,
  ecosystemConeRequestCarrier,
  ecosystemConeReconstructionCarrier,
  ecosystemConeDiffRequestCarrier,
  ecosystemConeDiffCarrier,
  ecosystemInfoTiling,
  regulateEcosystemCausalWidth,
  stabilizeEcosystemCausalWidth,
  readEcosystemRecursiveControl,
  openEcosystemRecursiveUnit,
  reconstructEcosystemCone,
  diffEcosystemCones,

} from "./ecosystem-infotiling.mjs";
export {
  aperiodicTileCarrier,
  aperiodicPatchRequestCarrier,
  aperiodicPatchCarrier,
  aperiodicSelfOrganizationRequestCarrier,
  aperiodicSelfOrganizationCarrier,
  aperiodicTheoryAtlasRequestCarrier,
  aperiodicTheoryAtlasCarrier,
  aperiodicBridgePlanRequestCarrier,
  aperiodicBridgePlanCarrier,
  aperiodicTilesFromTrace,
  aperiodicTilesFromEcosystem,
  readAperiodicPatch,
  selfOrganizeAperiodicPatch,
  readAperiodicTheoryAtlas,
  planAperiodicBridges,

} from "./aperiodic-tiling.mjs";
export {
  ManifestCarrierSchema,
  ModuleGraphSchema,
  BinSurfaceSchema,
  ExportSurfaceSchema,
  TsConfigSchema,
  TypeGraphSchema,
  manifestCarrier,
  moduleGraphCarrier,
  binSurfaceCarrier,
  exportSurfaceCarrier,
  tsConfigCarrier,
  typeGraphCarrier,

} from "./host-neutral-carriers.mjs";
export {
  decodePackageJsonManifest,
  decodeTsConfigJson,
  encodePackageJsonManifest,
  encodeTsConfigJson,
  binsAsStrategies,
  manifestBinNames,
  manifestBinSurface,
  manifestExportSpecifiers,
  manifestExportSurface,
  reflectModuleGraph,
  typeFlowReflection,

} from "./js-mark.mjs";
export {
  encodeObservation,
  encodeProvenance,

} from "./encoding.mjs";
export {
  actedOf,
  actionsOf,
  admitDecisionRequest,
  decide,

} from "./decision.mjs";
export {
  canAccess,
  declarationFilesFromFs,
  directoryEntries,
  defaultLeanExec,
  defaultGitExec,
  fileExists,
  leanConformanceFilesFromFs,
  leanModuleFilesFromFs,
  packageJsonFilesFromFs,
  readGitAdmission,
  readGitStdout,
  readJsnodeAdmission,
  readLeanAdmission,
  readLeanCommand,
  readOptionalTextFile,
  readSourceModuleFiles,
  readTextFile,
  readTextFileSync,
  sourceModuleFilesFromFs,
  writeTextFile,
  writeTextFileSync,

} from "./admission.mjs";
export {
  LakefileSchema,
  LeanBuildOracleSchema,
  LeanDeclarationSchema,
  LeanDeclarationIndexSchema,
  LeanEnvironmentSchema,
  LeanModuleSchema,
  LeanToolchainSchema,
  decodeBlueprintLeanDecls,
  decodeLakefileToml,
  decodeLeanBuildOracle,
  decodeLeanModule,
  decodeLeanToolchain,
  lakefileCarrier,
  leanBuildOracleCarrier,
  leanDeclarationCarrier,
  leanDeclarationIndexCarrier,
  leanEnvironment,
  leanEnvironmentFromAdmission,
  leanEnvironmentCarrier,
  leanModuleCarrier,
  leanToolchainCarrier,
  reflectLeanModuleGraph,

} from "./lean-mark.mjs";
export {
  GitCommitEntrySchema,
  GitRefEntrySchema,
  GitRemoteEntrySchema,
  GitStatusEntrySchema,
  GIT_COMPUTER_ACTIONS,
  LOG_FIELD_SEP,
  LOG_PRETTY_FORMAT,
  LOG_RECORD_SEP,
  branches,
  commitGraphCarrier,
  commitGraphLightObservation,
  computeGit,
  computeWithGit,
  dirtinessReading,
  gitCommitEntryCarrier,
  gitFact,
  gitLog,
  gitObservation,
  gitRefEntryCarrier,
  gitRefs,
  gitRemoteEntryCarrier,
  gitRemotes,
  gitStatus,
  gitStatusEntryCarrier,
  gitStatusReading,
  isMerge,
  isUntracked,
  mergeCommits,
  normalizeRelativePath,
  parseLog,
  parseLogRecord,
  parseRefLine,
  parseRefs,
  parseRemotes,
  parseStatus,
  parseStatusLine,
  refCarrier,
  refKind,
  refShorthand,
  refsOfKind,
  remoteCarrier,
  remoteNamed,
  rootCommits,
  stagedCode,
  stagedEntries,
  tags,
  tipCommit,
  untrackedEntries,
  unstagedEntries,
  worktreeCarrier,
  worktreeCode,

} from "./git-mark.mjs";
export {
  loadEnvironmentalConfiguration,

} from "./codecs.mjs";
export {
  LSP_JSONRPC_VERSION,
  LSP_METHODS,
  computingLspProjection,
  lspRequestEnvelopeCarrier,
  lspResponseEnvelopeCarrier,
  projectLsp,

} from "./lsp.mjs";
export {
  DAP_JSONRPC_VERSION,
  DAP_METHODS,
  dapDebugSessionCarrier,
  dapRequestEnvelopeCarrier,
  dapResponseEnvelopeCarrier,
  projectDap,

} from "./dap.mjs";
