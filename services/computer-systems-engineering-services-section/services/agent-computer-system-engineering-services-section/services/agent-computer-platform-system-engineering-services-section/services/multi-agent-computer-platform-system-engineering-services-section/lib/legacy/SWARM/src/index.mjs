// ── Refounded embodied-agent-OS surface (2026-06-05) ──────────────────────────────
// The swarm-sheaf read surface + the ten seam seeds: an LLM agent and a hardware device
// are one CGS character (handedness recv/send/actuate/observe) over the predication plane.
// See docs/dev/notes/2026-06-05-seam-*.md + 2026-06-05-refounding-verified-map-and-migration.md.
export { settledSection, readAsOf, witnessOf, columnRead, relationOf } from "./swarm-sheaf.mjs";
export { character, costate, sides, POLARITY } from "./character.mjs";
export { deviceCharacter, simulatedPrinterDriver, simulatedValveDriver } from "./device-character.mjs";
export { articulateUtterance, languageTurn, speak } from "./language-character.mjs";
export { dreamWindow, readWindow, latentTopics } from "./dreaming.mjs";
export { governPlural, RECOGNITION_REGIME, S_561_LIMBS } from "./plural-governance.mjs";
export { depositWork, senseOpen, claimWork, completeWork, claimGradient, readClaim } from "./stigmergic-work-board.mjs";
export { federateSections, federationConsensusKey } from "./swarm-federation.mjs";
export { aimFrontierRead, budgetAwareRoutingAdvice, consultationCost, substrateClosureCost, AIM_FRONTIER_RATIO } from "./token-economics.mjs";
export { interfaceWorld, projectSection } from "./seam-interface-world.mjs";

export { loadAgent } from "./agents.mjs";
export {
  buildCognition,
  derivePlan,
  dream,
  learnFromMessage,
  recall,
  renderCognitiveContext,
  runTools,
} from "./cognition.mjs";
export { claimPhaseSummary, costDescentClaimPhaseTuplet } from "./claim-phases.mjs";
export { analyzeCoordinationPatterns } from "./coordination.mjs";
export { costDescentSummary, costGraphSummary } from "./cost.mjs";
export { descendUtterance, traceSummary, descendProse, proseTraceSummary } from "./descent.mjs";
export {
  proseToSection, sectionToCells, realizeFromCells, proseToCells,
  cellsToEavtRows, converseMapOf, invertConverse, CONVERSE_PREFIX,
} from "./prose.mjs";
export {
  closeAgentFiber, openPotential, readPotential, governContested,
  DEFAULT_GOVERNANCE_REGIME, DEFAULT_TOP_RATE, DEFAULT_TOP_BUDGET,
} from "./ontology.mjs";
export {
  proposeImprovements, diagnose, promoteProposal, PROPOSAL_PREDICATE,
} from "./self-improve.mjs";
// SURFACE MODULES: the MUD carrier (wheatstone localWorld) and the web face (node:http + SSE). Both
// take message() INJECTED by the caller (bin/TUI) to avoid an import cycle through this barrel — the
// carrier/server source imports nothing from swarm src. The bins lazy-import message() only at their
// live edge.
export { swarmWorld, deriveState } from "./mud.mjs";
export { createSwarmServer } from "./web.mjs";
export { dispatchNextWork, selectNextWork } from "./dispatch.mjs";
export {
  workProcess, settleWork, advanceWorkBoard, workOrder,
  allocateWork, dispatchWorkProcess, executeWorkProcess, deriveProcessState,
} from "./process.mjs";
export { assignWork, auditEvent, executionEvent, failureEvent, latestAssignmentFor, listEvents, reviewEvent, writeEvent, writeTrace } from "./events.mjs";
export { SWARM_EVENT_SCHEMA, SWARM_EVENT_TOPICS, projectSwarmEvents, swarmEventTopicOf } from "./events.mjs";
export { ask } from "./ask.mjs";
export { arxivQueryUrl, fetchArxiv, fetchSource, recordSourceFetch } from "./fetch-tool.mjs";
export { infer, packPrompt } from "./infer.mjs";
// Phase-1 agentic core: the real tool-loop + native actuators, gated by the swarm-y governance spine.
// inferWithTools wraps infer with the OpenAI tools/tool_calls round-trip; runGovernedTool is the single
// chokepoint (tool-policy admission -> Gov regime -> held-⊤ safety -> actuator); runAgentLoop is the loop.
export { inferWithTools, parseToolCalls, toolResultMessage, toolSchemasFor } from "./tool-call.mjs";
export { ACTUATORS, runActuator, ACTUATOR_SCHEMAS } from "./actuators.mjs";
export { runGovernedTool } from "./governed-tool-runner.mjs";
export { runAgentLoop } from "./agent-loop.mjs";
// Wave-1: governed delegation/federation/actuator primitives (every real effect via runGovernedTool).
export { agentSpawnSchema, spawnSubagent, runHandoff } from "./subagent.mjs";
export { connectMcp, mcpToolSchemas, recordMcpCall, runMcpTool, DEFAULT_MCP_TIMEOUT_MS } from "./mcp-client.mjs";
export { createIngest, ingestReceive, drainIngest } from "./ingest.mjs";
export { listLoopRuns, listGovernedToolRuns, loopLedgerSummary } from "./loop-ledger.mjs";
export { SUBPROCESS_ACTUATORS, SUBPROCESS_SCHEMAS, runSubprocess, DEFAULT_SUBPROCESS_TIMEOUT_MS } from "./subprocess-actuator.mjs";
export { PATCH_ACTUATORS, PATCH_SCHEMAS, applyPatch, parseUnifiedDiff } from "./patch-actuator.mjs";
// Wave-2: orchestration topologies — recognition-routed, held-⊤-preserving coordination.
export { runSupervisor, pickWorker, decomposeGoal, foldWorkerSections, supervisorRouteSchema } from "./supervisor.mjs";
export { runAgentGraph, buildAgentGraph, convergencePredicateFor, followEdges, agentGraphNodeSchema, agentGraphEdgeSchema } from "./agent-graph.mjs";
export { deliver, sendOutbox, drainInbox, peekInbox, ackDelivery, inboxGradient, inboxTermOf, outboxTermOf } from "./agent-mailbox.mjs";
// repo-as-memory: the fact-manifold (posix-holography -> EAVT) + governed context-assembly (the reframe substrate).
export { ingestRepo, repoMemoryRootOf, DEFAULT_INGEST, gitignoreSet } from "./repo-memory.mjs";
export { selectRepoContext, renderRepoContext, DEFAULT_CONTEXT } from "./repo-context.mjs";
// Wave-3: the conversation gets a mind — persistent sessions, semantic recall, governed compaction.
export { openSession, appendTurn, resumeSession, sessionContext, renderSessionContext, listSessions, SESSION_DEFAULTS, sessionTermOf, turnTermOf } from "./session.mjs";
export { semanticRecall, selectRepoContextSemantic, embedText, cachedEmbedding, cosine, embeddingsEndpoint, SEMANTIC_DEFAULTS, DEFAULT_EMBED_PROVIDER } from "./semantic-recall.mjs";
export { deriveContextBudget, needsCompaction, compactContext, compactionTermOf, CONTEXT_WINDOWS, COMPACTION_DEFAULTS } from "./context-compaction.mjs";
export { buildWorkIntakeReport, listWorkIntakeReports, writeWorkIntakeReport } from "./intake.mjs";
export {
  foldGovernanceDecisionLedgerEntries,
  foldMessageLedgerEntries,
  foldOfficeActionLedgerEntries,
  foldProviderLedgerEntries,
  foldToolLedgerEntries,
  foldTraceLedgerEntries,
  governanceDecisionLedgerSummary,
  ledgerFoldSummary,
  listLedgerEntries,
  messageLedgerSummary,
  normalizeProviderUsage,
  officeActionLedgerSummary,
  providerLedgerSummary,
  toolLedgerSummary,
  traceLedgerSummary,
  writeGovernanceDecisionLedgerEntries,
  writeMessageLedgerEntry,
  writeOfficeActionLedgerEntries,
  writeProviderLedgerEntry,
  writeToolLedgerEntries,
  writeTraceLedgerEntries,
} from "./ledger.mjs";
export { recordMessage, memoryRootOf } from "./memory.mjs";
export { agentCapabilities, can, officeCapabilityChu, officeDefinitions, officeFor, officeForSkill, officeNameFor, officesWithCapability, holdsCapability } from "./offices.mjs";
export {
  ABSURD, propositionKey, memoryChu,
  entityProfile, propositionColumn, propositionExtension,
  transpose as transposeMemory, dual as dualMemory,
  settleProposition, settleEntity, surfaceContradiction,
} from "./eavt-chu.mjs";
export { routeOfficeMessage } from "./office-actions.mjs";
export { operationsBoard, replayOperations } from "./operations.mjs";
export { buildPlayerTuple, defaultHandedness, playerIdFor, writePlayerTuple } from "./players.mjs";
export { buildLeaderActionRequestReport, listLeaderActionRequestReports, writeLeaderActionRequestReport } from "./requests.mjs";
export { buildSafetyEnvelopeReport, listSafetyEnvelopeReports, writeSafetyEnvelopeReport } from "./safety.mjs";
export { computeReadiness, writeReadiness } from "./readiness.mjs";
export {
  readinessChu, readinessProfile, compositeFor, readyWorks,
  checkColumn, worksFailingCheck, settleCheck, obstructionBoard,
} from "./readiness-chu.mjs";
export { resolveSwarmRoot } from "./root.mjs";
export { deriveWorkStatus, listWorkStatuses, summarizeWorkStatuses } from "./status.mjs";
export { listToolPolicies, toolAdmissionFor, toolPolicyFor } from "./tool-policy.mjs";
export { claim, planCompositionKind, planCompositionTuplet, tuplet, tupletElement, workTuplet } from "./tuplets.mjs";
export { coordinationWorkspace } from "./workspace.mjs";
export { createWorkObject, latestWorkObject, listWorkObjects, replayRunbooks, workTerm } from "./work.mjs";
export { buildWorkObjectReport, commitWorkObjectReport } from "./work.mjs";
export { governAction } from "./governance.mjs";
// the FOUR-valued judgment alphabet + admissibility fold: swarm rides the OS process-runtime's

export { JURAL_POSITIONS, juralRelation, isJuralPosition } from "./jural.mjs";
export {
  delegationMorphism, delegationChain, extend,
  accountabilityHolder, authorityHolder, chainScope,
  accountabilityInvariantUnderExtension, revoke, isLive,
  dispatchAdmissible, scopeCovers, meetScope,
} from "./delegation.mjs";
export { REGIMES, GOV_AXES, KNOWN_REGIME_FAMILIES, DEFAULT_REGIME, regimeNames, selectRegime, admitUnder } from "./regimes.mjs";
export { readStructuration, selectGovernanceRegime, regimeForWork } from "./structuration.mjs";
export { WORK_FORMS, DEFAULT_WORK_FORM, workFormNames, selectWorkForm, workFormForChildren } from "./workforms.mjs";
// JOB 2 — swarm orchestration capability grounded in the drone-swarm research notes:
export { deposit, sense, gradient } from "./stigmergy.mjs";
export { observerConsensus, consensusReady } from "./consensus.mjs";
export { recognize, recognitionFor, deriveLeader, recognizedAuthority } from "./recognition.mjs";
export { SAFETY_SECTORS, h1Sectors, dispatchGate } from "./safety-cohomology.mjs";
export { SATURATION_THRESHOLD, agentSaturation, orchestratedCost, stigmergicCost } from "./saturation.mjs";

import { loadAgent } from "./agents.mjs";
import { buildCognition, dream, learnFromMessage } from "./cognition.mjs";
import { assembleContext } from "./conversation-context.mjs";
import { descendUtterance, descendProse, proseTraceSummary, carrierFaces } from "./descent.mjs";
import { proposeImprovements } from "./self-improve.mjs";
import { failureEvent } from "./events.mjs";
import { infer } from "./infer.mjs";
import {
  writeGovernanceDecisionLedgerEntries,
  writeMessageLedgerEntry,
  writeOfficeActionLedgerEntries,
  writeProviderLedgerEntry,
  writeToolLedgerEntries,
  writeTraceLedgerEntries,
} from "./ledger.mjs";
import { recordMessage } from "./memory.mjs";
import { routeOfficeMessage } from "./office-actions.mjs";
import { writePlayerTuple, playerIdFor } from "./players.mjs";
import { openSession, appendTurn } from "./session.mjs";
import { resolveSwarmRoot } from "./root.mjs";

export async function message(agentName, prompt, options = {}) {
  const root = resolveSwarmRoot(options);
  const agent = loadAgent(agentName, { ...options, root });
  const cognition = buildCognition(root, agent, prompt, options);
  // SESSION-CENTRIC (the rewire): a turn is a SESSION turn. Resume the caller's session (options.sessionId)
  // or open an ephemeral one — every conversation is a persistent world object (session.mjs) the turn grounds
  // FROM and appends TO. The seed of the MUD's sessions-as-worlds; persistent, resumable by folding its trace.
  const sessionId = options.sessionId ?? openSession(root, {
    participants: [playerIdFor(agent.name)],
    title: String(prompt).slice(0, 60),
    now: options.now,
  }).id;
  // GROUNDING: one governed context-assembler composes the turn's LLM context from the agent's cognition +
  // THIS session's history + the repo-as-memory fact-manifold (semantic when an embedder is supplied, else
  // lexical), held-⊤ surfaced. See conversation-context.mjs. Opt out of repo grounding with groundInRepo: false.
  const assembled = await assembleContext(root, agent, prompt, cognition, { ...options, sessionId });
  const groundedContext = assembled.context;
  let phase = "office.route";
  let office = null;
  let memory = null;
  let messageLedger = null;
  let providerLedger = null;
  let officeLedger = [];
  let toolLedger = [];
  let traceLedger = [];
  let governanceLedger = [];
  try {
    office = routeOfficeMessage(root, agent, prompt, cognition, options);
    phase = office.handled ? "office.action" : "provider.infer";
    const utterance = office.handled
      ? office.utterance
      : await infer(agent, prompt, { ...options, context: groundedContext });
    const reply = utterance[1].const;
    phase = "descent";
    const descent = descendUtterance(utterance);
    // EPISTEMIC SPINE: structure the model reply (the raw text) INTO charged predication cells via the
    // real language stack, then close the agent's fiber to its LFP (against ⊤) and govern the contested
    // ⊤ cells at the cautious lazy rate. Held ALONGSIDE the raw text (raw stays the witness), append-only,
    // PURE (in-memory). A spine failure never aborts the turn — the cells are an additive witness, not a
    // gate; a ⊥ (unparseable span) is a named gap, never hallucinated into an assertion.
    let prose = null;
    // carrier — the LIVE-face projection of the spine's settled fiber: mud's `fiber` and web's
    // `standing`, attached ADDITIVELY to the return so an agent's held ⊤ surfaces in the audit channel.
    // Built PURELY from the spine; a spine failure leaves it null (the faces simply carry no fiber).
    let carrier = null;
    try {
      const spine = descendProse(agent.name, reply, {
        governance: options.governance ?? undefined,
        ...(options.priorRows ? { priorRows: options.priorRows } : {}),
      });
      carrier = carrierFaces(spine, options.priorRows ? { priorRows: options.priorRows } : {});
      const proposals = proposeImprovements({ subject: agent.name, rows: spine.closed.rows ?? [], converse: spine.converse });
      prose = {
        summary: proseTraceSummary(spine),
        cells: spine.cells,
        eavtRows: spine.eavtRows,
        contested: spine.closed.contested,
        fired: spine.closed.fired,
        governed: { processed: spine.governed.processed, deferred: spine.governed.deferred, regime: spine.governed.regime },
        // PROPOSE-ONLY: closure-rule additions diagnosed from this turn's audit, as append-only DATA
        // (predicate "closure-rule-proposal" — inert to the closure engine). Never auto-applied.
        proposals,
      };
    } catch (proseError) {
      prose = { error: String(proseError?.message ?? proseError) };
    }
    const trace = {
      id: utterance[0].id,
      articulated: !!descent.articulated,
      predicated: !!descent.predicated,
      settled: !!descent.settled?.sheaf,
      witnessed: false,
      prose,
    };
    phase = "memory.write";
    memory = recordMessage(root, agent, prompt, utterance, trace);
    trace.witnessed = true;
    trace.log = memory.log;
    phase = "ledger.tool-call";
    toolLedger = writeToolLedgerEntries(root, agent, cognition, {
      utterance,
      messageLog: memory.log,
      descentStage: trace.settled ? "settled" : "predicated",
      descentWitness: trace,
    }, options);
    phase = office.handled ? "ledger.office-action" : "ledger.provider-call";
    providerLedger = office.handled ? null : writeProviderLedgerEntry(root, agent, utterance, {
      tracePaths: [memory.log, ...toolLedger.map((entry) => entry.path)],
      descentStage: trace.settled ? "settled" : "predicated",
      descentWitness: trace,
    }, options);
    officeLedger = office.handled ? writeOfficeActionLedgerEntries(root, agent, office, {
      utterance,
      messageLog: memory.log,
      descentStage: trace.settled ? "settled" : "predicated",
      descentWitness: trace,
    }, options) : [];
    governanceLedger = office.handled ? writeGovernanceDecisionLedgerEntries(root, agent, office, {
      utterance,
      messageLog: memory.log,
      descentStage: trace.settled ? "settled" : "predicated",
      descentWitness: trace,
    }, options) : [];
    phase = "ledger.message";
    messageLedger = writeMessageLedgerEntry(root, agent, utterance, memory, {
      actions: office.handled ? office.actions ?? [] : [],
      tracePaths: [
        ...(providerLedger ? [providerLedger.path] : []),
        ...toolLedger.map((entry) => entry.path),
        ...officeLedger.map((entry) => entry.path),
        ...traceLedger.map((entry) => entry.path),
        ...governanceLedger.map((entry) => entry.path),
        ...(office.handled ? (office.governance ?? []).map((decision) => decision.log) : []),
      ],
      descentStage: trace.settled ? "settled" : "predicated",
      descentWitness: trace,
    }, options);
    traceLedger = office.handled ? writeTraceLedgerEntries(root, agent, office, {
      utterance,
      messageLog: memory.log,
      descentStage: trace.settled ? "settled" : "predicated",
      descentWitness: trace,
    }, options) : [];
    phase = "learning";
    const learning = learnFromMessage(root, agent, prompt, reply, cognition.recalled, {
      ...options,
      messageId: utterance[0].id,
    });
    const dreaming = dream(root, agent, options);
    phase = "session.turn";
    // SESSION TURN: append this exchange to the session log. The conversation persists and resumes by
    // folding this trace (settledSection); a held-⊤ on a turn predicate is surfaced, never last-writer.
    const sessionTurn = appendTurn(root, sessionId, {
      role: "assistant", speaker: agent.name, prompt, reply,
      injectedContext: groundedContext, now: options.now,
    });
    phase = "player.write";
    const player = writePlayerTuple(root, agent, prompt, {
      ...options,
      tracePaths: [
        memory.log,
        ...(messageLedger ? [messageLedger.path] : []),
        ...(providerLedger ? [providerLedger.path] : []),
        ...toolLedger.map((entry) => entry.path),
        ...officeLedger.map((entry) => entry.path),
        ...traceLedger.map((entry) => entry.path),
        ...governanceLedger.map((entry) => entry.path),
        ...(office.handled ? (office.traces ?? []) : []),
        ...(office.handled ? (office.governance ?? []).map((decision) => decision.log) : []),
      ],
    });
    return {
      reply,
      agent,
      // SESSION-CENTRIC: the turn returns its session (a persistent world object). A caller threads
      // session.id back as options.sessionId to continue the conversation; it resumes by folding the log.
      session: { id: sessionId, turn: sessionTurn },
      trace,
      prose,
      // LIVE-FACE enrichment (append-only): the settled fiber + standing in the shapes the carriers read,
      // so a held ⊤ surfaces in mud's gmcp.contested / web's audit[]. `reply` and `prose` are UNCHANGED.
      // null when the spine could not run — the faces then carry no fiber rather than a fabricated one.
      ...(carrier ? { fiber: carrier.fiber, standing: carrier.standing } : {}),
      memory,
      messageLedger,
      player,
      cognition: { ...cognition, learning, dreaming },
      ledger: providerLedger ? [providerLedger] : officeLedger,
      toolLedger,
      governanceLedger,
      office: office.handled ? {
        actions: office.actions,
        governance: office.governance ?? [],
        work: office.work ?? [],
        reports: office.reports ?? [],
        events: office.events ?? [],
        ledger: office.ledger ?? [],
        toolLedger,
        traceLedger,
        governanceLedger,
        readiness: office.readiness ?? [],
        status: office.status ?? [],
        coordination: office.coordination ?? null,
        costGraph: office.costGraph ?? null,
        costDescent: office.costDescent ?? null,
        ledgerFold: office.ledgerFold ?? null,
        operations: office.operations ?? null,
        traces: office.traces ?? [],
        dispatch: office.dispatch ?? null,
      } : null,
    };
  } catch (error) {
    failureEvent(root, agent, error, {
      phase,
      prompt,
      actions: office?.actions ?? [],
      tracePaths: [
        ...(memory ? [memory.log] : []),
        ...(messageLedger ? [messageLedger.path] : []),
        ...(providerLedger ? [providerLedger.path] : []),
        ...toolLedger.map((entry) => entry.path),
        ...officeLedger.map((entry) => entry.path),
        ...traceLedger.map((entry) => entry.path),
        ...governanceLedger.map((entry) => entry.path),
        ...(office?.traces ?? []),
        ...(office?.governance ?? []).map((decision) => decision.log),
      ],
    }, options);
    throw error;
  }
}
