// agent-graph.mjs — a crew/swarm GRAPH executor: TOPOLOGY IS DATA, not code.
//
// A graph is a set of agent NODES and a set of conditional EDGES. Each node, when visited, is run as a
// GOVERNED child spawn (spawnSubagent, subagent.mjs:116) — so the swarm-y spine fires per node: the
// node's every tool passes its own tool-policy admission + Gov regime + held-⊤ safety gate inside
// runGovernedTool, and the delegation chain is meet-narrowed (least privilege) at each node. Authority
// moves to the node agent; ACCOUNTABILITY stays H⁰-invariant at the graph's captain (delegation.mjs:119,
// carried by spawnSubagent's witness). The graph executor adds NO new gate — it composes nodes, each of
// which is already a governed spawn.
//
// THE TERMINATOR IS DATA, NOT A MAGIC DEPTH. The natural terminator is the CONVERGENCE PREDICATE read
// off the work-form registry: WORK_FORMS[graph.workForm].convergence (workforms.mjs:72-101). The walk
// halts when that predicate settles to "potential" over the accumulated node sections, OR when a node folds
// back a HELD ⊤ (a contested child — agent-loop.mjs:147 mirror), which is surfaced and never collapsed.
// A FALLBACK visit bound exists only to stop a non-converging walk: options.maxVisits, a GOVERNED option
// whose documented default DERIVES from the graph's own structure — |nodes| (the node count). It is not a
// hidden literal; it is flagged here and surfaced on the result (term: "visit-bound").
//
// SUCCESSORS ARE DATA. followEdges reads the declared edges (data) whose guard predicate holds — there is
// no fan-out literal. A guard is a SERIALIZABLE token: 'final-answer', 'contested', 'on:<key>', or a key
// into options.guards. Routing BY RECOGNIZED AUTHORITY uses deriveLeader (recognition.mjs:111), never an
// installed office, when an edge's guard names a recognition decision ('recognized:<decision>').
//
// DISAGREEMENT IS HELD, NEVER LAST-WRITER. At every step and at termination the node sections fold through
// observerConsensus (consensus.mjs:30): the SHARED section (knowledge-meet, H⁰) is the composed result;
// the DISAGREEMENTS (knowledge-join, ⊤) are held top. A node whose spawn rode up a held ⊤ also contributes
// a contested verdict. A graph whose nodes disagree (either a contested node OR an observerConsensus
// disagreement) does NOT falsely converge: its value is "stable" and converged is false.



import { spawnSubagent } from "./subagent.mjs";
import {
  WORK_FORMS,
  workFormForChildren,
  DEFAULT_WORK_FORM,
} from "./workforms.mjs";
import { observerConsensus } from "./consensus.mjs";
import { deriveLeader } from "./recognition.mjs";
import { writeTrace } from "./events.mjs";
import { stableId } from "./cognition.mjs";
import { planCompositionKind } from "./tuplets.mjs";

// ── the DATA shape of a node and an edge ─────────────────────────────────────────────────────────
// A node is a serializable record: { id, agent, prompt|promptFrom, tools, scope, capability, dependsOn }.
// `agent` is the agent name spawnSubagent loads; `prompt` is the task, or `promptFrom` names an upstream
// node whose finalAnswer becomes this node's prompt (the handoff of work along an edge). `dependsOn` lets
// planCompositionKind derive the work form from the node dependency shape when none is declared.
export const agentGraphNodeSchema = Object.freeze({
  name: "agent-graph.node",
  description: "A graph node: an agent run as a governed child spawn. Topology data, not code.",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "unique node id within the graph" },
      agent: { type: "string", description: "name of the agent to spawn for this node (loadAgent)" },
      prompt: { type: "string", description: "the task handed to the node agent" },
      promptFrom: { type: "string", description: "id of an upstream node whose result becomes this prompt" },
      tools: { type: "array", items: { type: "string" }, description: "tool names this node may use" },
      scope: {
        oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
        description: "the scope delegated to this node; meet-narrowed against the graph chain",
      },
      capability: { type: "string", description: "the capability this node provides (for routing)" },
      dependsOn: { type: "array", items: { type: "string" }, description: "node ids this node depends on" },
    },
    required: ["id", "agent"],
  },
});

// An edge is a serializable record: { from, to, when }. `when` is a guard TOKEN (serializable), never a
// closure: 'final-answer' (the from-node settled an answer), 'contested' (the from-node rode up a held ⊤),
// 'on:<key>' / a bare key into options.guards (a caller-supplied predicate), or 'recognized:<decision>'
// (route only if the to-node is the recognized leader for <decision>). The default guard is 'final-answer'.
export const agentGraphEdgeSchema = Object.freeze({
  name: "agent-graph.edge",
  description: "A conditional edge: follow `to` when guard `when` holds over the from-node result. Data.",
  parameters: {
    type: "object",
    properties: {
      from: { type: "string", description: "source node id (must be a declared node)" },
      to: { type: "string", description: "target node id (must be a declared node)" },
      when: {
        type: "string",
        description: "serializable guard token: 'final-answer' | 'contested' | 'on:<key>' | 'recognized:<decision>' | <guards-key>",
      },
    },
    required: ["from", "to"],
  },
});

// ── buildAgentGraph — validate the topology data and freeze it ───────────────────────────────────
// Validates: every edge references DECLARED nodes; node ids are unique; entry is a declared node. The
// work form is DATA on the graph (workForm), or DERIVED from the node dependency shape via
// planCompositionKind/workFormForChildren (tuplets.mjs:137, workforms.mjs:124) when none is declared. The
// acyclicity-vs-bound question is settled by the governed visit bound at run time (runAgentGraph's
// maxVisits), so a graph with a back-edge (an audit-fix-loop) is LEGAL — it terminates on its convergence
// predicate, bounded below by the governed visit cap, not rejected as "cyclic".
export function buildAgentGraph({ nodes = [], edges = [], workForm, entry } = {}) {
  if (!Array.isArray(nodes) || !nodes.length) {
    throw new Error("buildAgentGraph: at least one node is required");
  }
  const nodeIds = new Set();
  for (const node of nodes) {
    if (!node || typeof node.id !== "string" || !node.id) {
      throw new Error("buildAgentGraph: every node needs a string id");
    }
    if (nodeIds.has(node.id)) {
      throw new Error(`buildAgentGraph: duplicate node id ${node.id}`);
    }
    nodeIds.add(node.id);
  }
  for (const edge of edges) {
    if (!edge || typeof edge.from !== "string" || typeof edge.to !== "string") {
      throw new Error("buildAgentGraph: every edge needs string from/to");
    }
    if (!nodeIds.has(edge.from)) {
      throw new Error(`buildAgentGraph: edge from undeclared node ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      throw new Error(`buildAgentGraph: edge to undeclared node ${edge.to}`);
    }
  }
  const resolvedEntry = entry ?? nodes[0].id;
  if (!nodeIds.has(resolvedEntry)) {
    throw new Error(`buildAgentGraph: entry ${resolvedEntry} is not a declared node`);
  }

  // the work form: DATA on the graph if named & known; else DERIVED from the node dependency shape. The
  // derivation treats each node as a child work record (id + dependsOn) so planCompositionKind reads the
  // monoidal cobordism shape (sequential / tensor / frobenius / poset) straight off the topology.
  const childRecords = nodes.map((n) => ({ id: n.id, dependsOn: n.dependsOn ?? [] }));
  const resolvedWorkForm =
    (workForm && WORK_FORMS[workForm] && workForm) ||
    workFormForChildren(childRecords) ||
    DEFAULT_WORK_FORM;

  return Object.freeze({
    kind: "swarm.agent.graph",
    nodes: Object.freeze(nodes.map((n) => Object.freeze({ ...n }))),
    edges: Object.freeze(edges.map((e) => Object.freeze({ ...e }))),
    entry: resolvedEntry,
    workForm: resolvedWorkForm,
    nodeIndex: Object.freeze(Object.fromEntries(nodes.map((n) => [n.id, Object.freeze({ ...n })]))),
    // the derived plan-composition shape, surfaced for the caller (data, not behavior).
    planComposition: planCompositionKind(childRecords),
  });
}

// ── convergencePredicateFor — the terminator, READ from the work-form registry ───────────────────
// Returns (graphState) => FOUR-style { value, reason }. The predicate is evaluated over the ACCUMULATED
// node sections (graphState.consensus = observerConsensus over the visited node terms; graphState.sections
// = the per-node recorded docs; graphState.contested = nodes that rode up a held ⊤). Because the consensus
// carries the disagreement loci, a graph whose nodes DISAGREE never reports T here — it reports ⊤ (held).
//
// The structural reading of each form's `convergence` prose (workforms.mjs:72-101):
//   • development-cycle  — converges when a RESULT node answers the driving question (a node section names
//                          an answer/result), workforms.mjs:76.
//   • audit-fix-loop     — converges when the LATEST review is approved and no rejected review stands
//                          without a later repair, workforms.mjs:81.
//   • exploratory-search — converges when the findings NAME the next step, workforms.mjs:87.
//   • plan-composition forms — converge when every node has been visited (all child work reaches done)
//                          with no standing held ⊤, workforms.mjs:24-68.
// In every case a standing contested node or a consensus disagreement holds the verdict at ⊤.
export function convergencePredicateFor(workFormName) {
  const form = WORK_FORMS[workFormName] ?? WORK_FORMS[DEFAULT_WORK_FORM];
  const name = form.name;

  return function predicate(graphState = {}) {
    const sections = graphState.sections ?? [];
    const contested = graphState.contested ?? [];
    const consensus = graphState.consensus ?? { disagreements: [], shared: [] };

    // DISAGREEMENT FIRST: a held ⊤ anywhere — a contested node OR a consensus disagreement — holds the
    // whole verdict at ⊤. This is what stops a disagreeing graph from falsely converging.
    if (contested.length || (consensus.disagreements ?? []).length) {
      return {
        value: "stable",
        reason:
          `${name}: ${contested.length} contested node(s) and ${(consensus.disagreements ?? []).length} ` +
          `consensus disagreement(s) stand held ⊤; convergence is contradicted, not collapsed.`,
      };
    }
    if (!sections.length) {
      return { value: "absurd", reason: `${name}: no node sections yet; convergence undecided.` };
    }

    const docs = sections.map((s) => s.doc ?? s);
    const text = (s) => String(s ?? "").toLowerCase();
    const answeredText = docs.map((d) => text(d.finalAnswer)).join("  ");

    if (name === "development-cycle") {
      // a result node answers the driving question: a node whose recorded section names an answer/result.
      const answered = docs.some((d) => d.role === "result" || /\b(answer|result|because|therefore)\b/.test(text(d.finalAnswer)));
      return answered
        ? { value: "potential", reason: "development-cycle: a result node answered the driving question." }
        : { value: "absurd", reason: "development-cycle: no result node has answered the driving question yet." };
    }
    if (name === "audit-fix-loop") {
      // converges when the LATEST review is approved with no un-repaired rejection. The latest review is
      // the last visited node that recorded a review verdict; a rejection must be followed by a repair.
      let latestApproved = null;
      let openRejection = false;
      for (const d of docs) {
        const t = text(d.finalAnswer);
        const isReview = d.role === "review" || /\b(approve|approved|reject|rejected)\b/.test(t);
        const isRepair = d.role === "repair" || /\b(repair|fixed|patched|repaired)\b/.test(t);
        if (isReview) {
          if (/\b(reject|rejected)\b/.test(t)) { openRejection = true; latestApproved = false; }
          else if (/\b(approve|approved)\b/.test(t)) { latestApproved = true; }
        }
        if (isRepair) openRejection = false; // a later repair clears the standing rejection
      }
      return latestApproved && !openRejection
        ? { value: "potential", reason: "audit-fix-loop: latest review approved with no un-repaired rejection." }
        : { value: "absurd", reason: "audit-fix-loop: an open rejection or no approving review stands; loop continues." };
    }
    if (name === "exploratory-search") {
      const namesNext = docs.some((d) => d.role === "findings" || /\bnext\b/.test(text(d.finalAnswer)));
      return namesNext
        ? { value: "potential", reason: "exploratory-search: the findings name the next step." }
        : { value: "absurd", reason: "exploratory-search: no findings name the next step yet." };
    }

    // plan-composition (and any other) form: converge when every declared node has a recorded section
    // (all child work reached done) with no standing held ⊤. The node-count comes from graphState.nodeCount
    // (the graph's own structure), never a literal.
    const nodeCount = graphState.nodeCount ?? sections.length;
    const visitedDistinct = new Set(docs.map((d) => d.nodeId)).size;
    return visitedDistinct >= nodeCount
      ? { value: "potential", reason: `${name}: every node (${nodeCount}) reached done with no held ⊤.` }
      : { value: "absurd", reason: `${name}: ${visitedDistinct}/${nodeCount} nodes done; composition incomplete.` };
  };
}

// ── followEdges — the successors are DATA: edges whose guard holds ───────────────────────────────
// Reads the declared edges out of `from`, evaluates each edge's serializable guard against the node
// result, and returns the target ids of those whose guard holds. No fan-out literal — the successor set
// is exactly the data. Guard tokens:
//   • 'final-answer'        — the node settled a (non-contested) final answer (the default).
//   • 'contested'           — the node rode up a held ⊤ (route to a repair node).
//   • 'recognized:<dec>'    — route only if the TO-node holds recognized authority for <dec> (deriveLeader).
//   • 'on:<key>' / <key>    — call options.guards[key](nodeResult, ctx) (a caller predicate; boolean).
export function followEdges(graph, fromNodeId, nodeResult = {}, options = {}) {
  const guards = options.guards ?? {};
  const out = [];
  for (const edge of graph.edges) {
    if (edge.from !== fromNodeId) continue;
    if (guardHolds(edge.when, nodeResult, edge, graph, guards, options)) out.push(edge.to);
  }
  return out;
}

function guardHolds(when, nodeResult, edge, graph, guards, options) {
  const token = when ?? "final-answer";
  const contested = nodeResult?.value === "stable" || (nodeResult?.contested ?? []).length > 0;

  if (token === "final-answer") return !contested && nodeResult?.value === "potential";
  if (token === "contested") return contested;

  if (token.startsWith("recognized:")) {
    const decision = token.slice("recognized:".length);
    const root = options.root;
    if (!root) return false;
    const derived = deriveLeader(root, decision, options);
    return derived.hasLeader && derived.leader === graph.nodeIndex[edge.to]?.agent;
  }

  // a caller-supplied predicate: 'on:<key>' or a bare key into options.guards.
  const key = token.startsWith("on:") ? token.slice("on:".length) : token;
  const fn = guards[key];
  if (typeof fn === "function") return !!fn(nodeResult, { edge, graph, options });

  // an unrecognized token never routes (data the executor doesn't understand is inert, not a throw).
  return false;
}

// ── runAgentGraph — walk the graph, fold node sections, terminate on the convergence predicate ───
// ASYNC. Starts at graph.entry. Each visit runs the node via spawnSubagent (the spine gate fires inside),
// records its finalAnswer + verdict as an OBSERVER cell at graph/<runId>/nodes/<nodeId> (writeTrace), then
// evaluates followEdges to get successors. The walk loops until convergencePredicateFor(graph.workForm)
// settles to "potential" over the accumulated sections, OR a node rides up a held ⊤ (contested-break, mirroring
// agent-loop.mjs:147), OR the GOVERNED visit bound is hit. Disagreeing nodes fold to held ⊤ at termination.
export async function runAgentGraph(root, graph, input = {}, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const runId = options.runId ?? stableId([graph.entry, graph.workForm, now, JSON.stringify(input)], "graph");

  // the GOVERNED visit bound: a fallback to stop a non-converging walk. Its documented DEFAULT DERIVES
  // from the graph's own structure — |nodes|, with one re-entry pass for loop forms (audit-fix-loop), so a
  // cyclic form may revisit a node bounded by 2·|nodes|, not a magic depth. options.maxVisits overrides.
  const loopForm = WORK_FORMS[graph.workForm]?.kind === "coordination" || WORK_FORMS[graph.workForm]?.kind === "operations";
  const derivedVisitBound = graph.nodes.length * (loopForm ? 2 : 1);
  const maxVisits = Number.isFinite(options.maxVisits) ? options.maxVisits : derivedVisitBound;

  const predicate = convergencePredicateFor(graph.workForm);

  const visited = [];          // ordered node ids as visited
  const sections = [];         // recorded node docs (the observer sections)
  const nodeTerms = [];        // the observer-cell terms (for observerConsensus)
  const contested = [];        // nodes that rode up a held ⊤
  const traceLog = [];         // the trace-log paths written
  const lastResultByNode = {}; // node id -> spawn result (for promptFrom handoff)
  const cost = { providerCalls: 0, promptTokens: 0, completionTokens: 0 };

  let converged = false;
  let convergenceReason = "not evaluated";
  let value = "absurd";
  let term = "max-visits";

  const frontier = [graph.entry];

  while (frontier.length && visited.length < maxVisits) {
    const nodeId = frontier.shift();
    const node = graph.nodeIndex[nodeId];
    if (!node) continue;

    // the node's prompt: declared, or handed from an upstream node's finalAnswer (work along an edge).
    const promptFrom = node.promptFrom ? lastResultByNode[node.promptFrom]?.finalAnswer : undefined;
    const prompt = node.prompt ?? promptFrom ?? input.prompt ?? "";

    // RUN the node as a GOVERNED child spawn — the spine fires inside (admission + Gov + held-⊤ safety),
    // the chain is meet-narrowed (least privilege), accountability H⁰-invariant at the graph captain.
    const spawn = await spawnSubagent(
      root,
      { name: options.captain ?? graph.nodeIndex[graph.entry]?.agent ?? "graph-captain" },
      { child: node.agent, prompt, tools: node.tools ?? [], scope: node.scope ?? "*" },
      { ...options, now, runId: undefined },
    );

    visited.push(nodeId);
    cost.providerCalls += spawn.cost?.providerCalls ?? 0;
    cost.promptTokens += spawn.cost?.promptTokens ?? 0;
    cost.completionTokens += spawn.cost?.completionTokens ?? 0;
    lastResultByNode[nodeId] = spawn;

    // RECORD the node's result as an observer cell at graph/<runId>/nodes/<nodeId>. The cell's doc fields
    // become EAVT propositions observerConsensus folds: `finalAnswer`, `verdict`, `role` (the section).
    const nodeTerm = `graph/${runId}/nodes/${nodeId}`;
    const sectionDoc = {
      kind: "swarm.agent.graph.node",
      nodeId,
      agent: node.agent,
      role: node.capability ?? node.role ?? "",
      finalAnswer: spawn.finalAnswer ?? "",
      verdict: spawn.value,
      contested: (spawn.contested ?? []).length,
    };
    const written = writeTrace(root, nodeTerm, sectionDoc, { t: `${runId}:${nodeId}` });
    traceLog.push(written.log);
    nodeTerms.push(nodeTerm);
    sections.push({ term: nodeTerm, doc: sectionDoc });

    // a node that rode up a held ⊤ is contested — surfaced, NEVER collapsed (mirrors agent-loop.mjs:147).
    if (spawn.value === "stable") {
      contested.push({ nodeId, value: spawn.value, reason: spawn.reason });
    }

    // FOLD the node sections so far through observerConsensus (knowledge-meet shared / knowledge-join
    // disagreements). The convergence predicate reads this — a disagreeing graph cannot falsely converge.
    const consensus = observerConsensus(root, nodeTerms, options);
    const verdict = predicate({ sections, contested, consensus, nodeCount: graph.nodes.length });
    converged = verdict.value === "potential";
    convergenceReason = verdict.reason;
    value = verdict.value;

    // CONTESTED-BREAK: a held ⊤ halts the walk, surfaced. (Mirrors agent-loop.mjs:147 / dispatchGate.)
    if (spawn.value === "stable") {
      term = "contested-node";
      break;
    }
    if (converged) {
      term = "converged";
      break;
    }

    // SUCCESSORS ARE DATA: the edges whose guard holds. No fan-out literal.
    const successors = followEdges(graph, nodeId, spawn, { ...options, root });
    for (const s of successors) frontier.push(s);
  }

  if (visited.length >= maxVisits && !converged && term !== "contested-node") {
    term = "visit-bound";
  }

  // COMPOSITION at termination: observerConsensus over every visited node term. SHARED = composed (H⁰),
  // DISAGREEMENTS = held ⊤. If any disagreement OR any contested node stands, the graph value is "stable"
  // and converged is false — the contradiction is HELD, never resolved to a last-writer.
  const composedConsensus = observerConsensus(root, nodeTerms, options);
  const disagreements = composedConsensus.disagreements ?? [];
  const heldTop = contested.length > 0 || disagreements.length > 0;
  if (heldTop) {
    value = "stable";
    converged = false;
    convergenceReason =
      `${contested.length} contested node(s) and ${disagreements.length} consensus disagreement(s) ` +
      `stand held ⊤; the graph holds the contradiction, never a last-writer.`;
  }

  // the composed section: the shared (consensus = t) propositions across all node sections.
  const composed = composedConsensus.shared ?? [];

  // one EAVT cell recording the whole graph run (append-only, auditable).
  const runTerm = `graph/${runId}/run`;
  const runWritten = writeTrace(root, runTerm, {
    kind: "swarm.agent.graph.run",
    runId,
    workForm: graph.workForm,
    entry: graph.entry,
    visited,
    converged,
    convergenceReason,
    value,
    contested: contested.length,
    disagreements: disagreements.length,
    maxVisits,
    visitBoundDerivedFrom: Number.isFinite(options.maxVisits) ? "governed-option" : `node-count×${loopForm ? 2 : 1}`,
    term,
    created: now,
  }, { t: runId });
  traceLog.push(runWritten.log);

  return Object.freeze({
    value,
    visited,
    sections,
    composed,
    contested,
    converged,
    convergenceReason,
    consensus: composedConsensus,
    runId,
    cost,
    term,
    maxVisits,
    workForm: graph.workForm,
    traceLog,
  });
}
