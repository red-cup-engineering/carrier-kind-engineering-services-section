import { address } from "@561-group/computer/typed-filepath-addressing-system/addressing";
import read from "@561-group/computer/typed-term-memory-system/reading";
import write from "@561-group/computer/typed-term-memory-system/writing";

// the term's EAVT log path: TFAS addressing pinned to the jsonl/EAVT type (formerly TTMS's logPath).
const logPath = (root, term) => address(root, term, "jsonl");

import { stableId } from "./cognition.mjs";
import { costGraphSummary } from "./cost.mjs";
import { memoryRootOf } from "./memory.mjs";
import { can, officeNameFor } from "./offices.mjs";

import { admitUnder, DEFAULT_REGIME } from "./regimes.mjs";
import { selectGovernanceRegime } from "./structuration.mjs";
import { authorityFour, leaderJudgment } from "./recognition.mjs";

// RECOGNITION_REGIME — the recognition-derived authority pole, selectable alongside (NOT replacing) the
// OS regime registry. It is NOT in the @561-group/computer/distribution REGIMES map (admitUnder would
// fall an unknown name back to kyriarchical); it lives here because admission reads the recognition
// CELLS off SWARM's own trace (root), which the pure OS governance layer never touches. A caller
// selects it explicitly (options.regime === RECOGNITION_REGIME or options.recognition is supplied);
// every caller that passes neither still defaults to kyriarchical and governs exactly as before.
export const RECOGNITION_REGIME = "recognition";

// admitByRecognition(root, agent, action, options) — settle a governance decision over the recognition
// cells instead of office capability. The participant is the acting agent; the decision the recognition
// is read under is options.recognition.decision (default: the action). The actor is admitted ("potential")
// iff it is the derived leader for the decision (recognition ≥ quorum); below quorum is ⊥ (undecided);
// recognized by no one is f; and when recognition names MORE THAN ONE leader the actor's own authority
// is held ⊤ (the contradiction leaderJudgment surfaces is carried through, never collapsed). This is
// the authority POLE — it does not consult offices.can; it folds the aggregate of recognition.
function admitByRecognition(root, agent, action, options = {}) {
  const r = options.recognition ?? {};
  const decision = r.decision ?? action;
  const participant = r.participant ?? agent?.name;
  const leader = leaderJudgment(root, decision, r);
  // a contradicted leadership (two participants at quorum) is held ⊤ for whoever acts under it.
  if (leader.value === "stable") {
    return { value: "stable", jural: "power", binding: true, policy: "recognition-authority", reason: leader.reason, derived: leader.derived };
  }
  const verdict = authorityFour(root, decision, participant, r);
  return { value: verdict.value, jural: "power", binding: true, policy: "recognition-authority", reason: verdict.reason, derived: verdict.derived };
}

function buildCostWitness(root) {
  const cost = costGraphSummary(root);
  return {
    kind: "swarm.governance.cost_witness",
    dimensions: {
      providerCalls: cost.dimensions.providerCalls,
      totalTokens: cost.dimensions.totalTokens,
      unknownTokenRows: cost.dimensions.unknownTokenRows,
      messages: cost.dimensions.messages,
      officeActions: cost.dimensions.officeActions,
      governanceDecisions: cost.dimensions.governanceDecisions,
      toolCalls: cost.dimensions.toolCalls,
      writeToolCalls: cost.dimensions.writeToolCalls,
      failedToolCalls: cost.dimensions.failedToolCalls,
      traceEvents: cost.dimensions.traceEvents,
      readinessWitnesses: cost.dimensions.readinessWitnesses,
      workRecords: cost.dimensions.workRecords,
      dependencyHeld: cost.dimensions.dependencyHeld,
      blockedWork: cost.dimensions.blockedWork,
      coordinationWarnings: cost.dimensions.coordinationWarnings,
    },
    bilattice: cost.bilattice,
    graph: {
      vertexCount: cost.graph.vertexCount,
      edgeCount: cost.graph.edgeCount,
      componentCount: cost.graph.componentCount,
      centralVertices: cost.graph.centralVertices.slice(0, 5),
      cutVertices: cost.graph.cutVertices.slice(0, 5),
      bridgeEdges: cost.graph.bridgeEdges.slice(0, 5),
    },
    bottlenecks: cost.bottlenecks.slice(0, 8),
    evidence: "governance decision cost witness: decisions inspect the ledger-derived cost graph before admitting review/audit actions",
  };
}

function costWitnessFrom(root, options = {}) {
  if (!options.costWitness) return null;
  if (options.costWitness === true) return buildCostWitness(root);
  if (typeof options.costWitness === "object") return options.costWitness;
  return null;
}

export function governAction(root, agent, action, target = {}, options = {}) {
  const now = options.now ?? new Date().toISOString();
  // Select the regime: an explicit one wins; else fold a supplied structuration; else default to
  // kyriarchical so a caller that passes neither governs exactly as before (admitted iff can()).
  // recognition is selected explicitly (options.regime === RECOGNITION_REGIME) or by supplying an
  // options.recognition block; otherwise the OS regime registry runs exactly as before.
  const recognitionSelected = options.regime === RECOGNITION_REGIME || (!options.regime && options.recognition);
  const regimeName = recognitionSelected
    ? RECOGNITION_REGIME
    : (options.regime
      ?? (options.structuration ? selectGovernanceRegime(options.structuration) : DEFAULT_REGIME));
  const decision = recognitionSelected
    ? { regime: RECOGNITION_REGIME, title: "Recognition-derived authority", ...admitByRecognition(root, agent, action, options) }
    : admitUnder(regimeName, {
      agent,
      action,
      target,
      options,
      officeName: officeNameFor(agent),
      can,
    });
  // four-valued settling: T affirmed, F denied, BOT not-yet-settled, TOP contradicted.
  const admitted = (decision.value === "potential");
  const costWitness = costWitnessFrom(root, options);
  const reason = decision.reason;
  const id = stableId([agent.name, action, target.kind, target.title, now], "decision");
  const term = `governance/decisions/${id}`;
  const doc = {
    kind: "swarm.governance.decision",
    id,
    actor: agent.name,
    office: officeNameFor(agent),
    action,
    targetKind: target.kind ?? "",
    targetTitle: target.title ?? "",
    admitted,
    regime: decision.regime,
    value: decision.value,
    jural: decision.jural ?? "",
    binding: decision.binding ?? true,
    reason,
    policy: decision.policy,
    costWitness: costWitness ?? {},
    costWitnessKind: costWitness?.kind ?? "",
    costWitnessSummary: costWitness
      ? [
        `vertices=${costWitness.graph?.vertexCount ?? 0}`,
        `edges=${costWitness.graph?.edgeCount ?? 0}`,
        `tokenCost=${costWitness.bilattice?.tokenCostStatus ?? ""}`,
        `unknownTokenRows=${costWitness.dimensions?.unknownTokenRows ?? 0}`,
        `toolCalls=${costWitness.dimensions?.toolCalls ?? 0}`,
        `bottlenecks=${costWitness.bottlenecks?.length ?? 0}`,
      ].join("; ")
      : "",
    created: now,
  };
  const written = write(memoryRootOf(root), term, doc, { t: id });
  return {
    id,
    actor: agent.name,
    office: officeNameFor(agent),
    action,
    target,
    term,
    log: logPath(memoryRootOf(root), term),
    admitted,
    regime: decision.regime,
    value: decision.value,
    jural: decision.jural ?? "",
    binding: decision.binding ?? true,
    policy: decision.policy,
    reason,
    costWitness: costWitness ?? {},
    costWitnessKind: costWitness?.kind ?? "",
    costWitnessSummary: doc.costWitnessSummary,
    count: written.count,
    read: read(memoryRootOf(root), term),
  };
}
