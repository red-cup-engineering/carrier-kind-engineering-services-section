import { projectContextSuit, type ContextSuit } from "../../contextualizing/suiting/library/context-control.mts";
import { boundedInteger, optionalText, stringList } from "../../../records.mts";
import {
  futureWorkTopology,
  type FutureWorkEdge,
  type FutureWorkGovernanceProposal,
  type FutureWorkNode,
  type FutureWorkPredicationCell,
  type FutureWorkPredicationValuation,
  type FutureWorkSpatiotemporalStep,
  type FutureWorkTemporalStratum,
  type FutureWorkTopology,
} from "../topologizing/future-work/library/future-work-topology.mts";

export type SelectWorkInterfaceParams = Readonly<{
  focus?: string | undefined;
  q?: string | undefined;
  intent?: string | undefined;
  limit?: string | number | undefined;
  budget?: string | number | undefined;
  detail?: string | undefined;
  office?: string | undefined;
  agent?: string | undefined;
  session?: string | undefined;
}>;

export type SelectWorkInterfaceReading = Readonly<{
  kind: "operations-manifold.select-work-interface";
  generatedAt: string;
  projection: Readonly<{
    detail: "decision" | "graph";
    graphOperation: "topologize-future-work";
  }>;
  intent: string;
  focus: string;
  selected: SelectedWorkInterfaceAction;
  decision: Readonly<{
    node: SelectedWorkInterfaceNode | null;
    processors: readonly SelectedWorkInterfaceNode[];
    interfaces: readonly SelectedWorkInterface[];
    rationale: readonly string[];
  }>;
  topology: Readonly<{
    summary: FutureWorkTopology["summary"];
    strata: FutureWorkTopology["strata"];
    selectedNodes: readonly SelectedWorkInterfaceNode[];
    incidentEdges: readonly FutureWorkEdge[];
    predication: Readonly<{
      claim: FutureWorkTopology["predication"]["claim"];
      cells: readonly SelectedPredicationCell[];
      valuations: readonly SelectedPredicationValuation[];
    }>;
    flow: Readonly<{
      claim: FutureWorkTopology["flow"]["claim"];
      steps: readonly SelectedSpatiotemporalStep[];
    }>;
    governance: Readonly<{
      claim: FutureWorkTopology["governance"]["claim"];
      invariants: readonly string[];
      proposals: readonly SelectedGovernanceProposal[];
    }>;
  }>;
  context: Readonly<{
    suit: string;
    office: string;
    agent: string;
    session: string | null;
    budget: number;
    tokenEstimate: number;
    constraints: readonly string[];
    perception: readonly string[];
    memory: readonly string[];
  }>;
  carriers: Readonly<{
    futureDocuments: readonly SelectedWorkInterfaceNode[];
    presentLogs: readonly SelectedWorkInterfaceNode[];
    pastStates: readonly SelectedWorkInterfaceNode[];
    guides: readonly Readonly<{ id: string; path: string; title: string; claim: string }>[];
  }>;
  workflow: readonly Readonly<{
    step: string;
    processor: string;
    input: string;
    output: string;
  }>[];
  stateless: Readonly<{
    claim: "Agent read-work selection is projected from topology, context suit, and JSON state during one package-bin function run";
    transport: "stdio-json";
  }>;
}>;

export type SelectedWorkInterfaceAction = Readonly<{
  node: SelectedWorkInterfaceNode | null;
  processor: SelectedWorkInterfaceNode | null;
  nextInterface: SelectedWorkInterface | null;
  action: string;
  rationale: readonly string[];
  evidence: readonly string[];
}>;

export type SelectedWorkInterfaceNode = Readonly<{
  id: string;
  kind: FutureWorkNode["kind"];
  temporal: FutureWorkNode["temporal"];
  layer: FutureWorkNode["layer"];
  title: string;
  priority: number;
  focus: string | null;
  status: string;
  workKind?: FutureWorkNode["workKind"];
  workStatus?: FutureWorkNode["workStatus"];
  success?: string;
  summary: string;
  evidence: readonly string[];
  interfaces: readonly string[];
  guideIds: readonly string[];
}>;

export type SelectedWorkInterface = Readonly<{
  bin: string;
  purpose: string;
  params: Readonly<Record<string, string>>;
  source: "topology" | "project-context-suit" | "selection";
}>;

export type SelectedPredicationCell = Readonly<Pick<FutureWorkPredicationCell, "id" | "subject" | "predicate" | "object" | "source"> & {
  evidence: readonly string[];
}>;

export type SelectedPredicationValuation = Readonly<Pick<FutureWorkPredicationValuation, "cell" | "value"> & {
  evidence: readonly string[];
}>;

export type SelectedSpatiotemporalStep = Readonly<Pick<FutureWorkSpatiotemporalStep, "id" | "from" | "to" | "predicate"> & {
  carriers: readonly string[];
  processors: readonly string[];
  interfaces: readonly string[];
}>;

export type SelectedGovernanceProposal = Readonly<Pick<FutureWorkGovernanceProposal, "id" | "action" | "target" | "scope" | "decisionRule"> & {
  requiredWitnesses: readonly string[];
  evidence: readonly string[];
}>;

export async function selectWorkInterface(repoRoot: string, params: SelectWorkInterfaceParams = {}): Promise<SelectWorkInterfaceReading> {
  const intent = optionalText(params.intent ?? params.q) ?? "select the next Operations Manifold read-work interface from the shared topology";
  const focus = optionalText(params.focus) ?? "sites/ops.561.group";
  const office = optionalText(params.office);
  const agent = optionalText(params.agent);
  const session = optionalText(params.session);
  const limit = boundedInteger(params.limit, { min: 1, max: 64, fallback: 12 });
  const graphDetail = isGraphDetail(params.detail);
  const [topology, suit] = await Promise.all([
    futureWorkTopology(repoRoot, { intent, focus, limit: Math.max(limit, 24) }),
    projectContextSuit(repoRoot, {
      intent,
      focus,
      budget: params.budget,
      ...(office === null ? {} : { office }),
      ...(agent === null ? {} : { agent }),
      ...(session === null ? {} : { session }),
    }),
  ]);
  const selectedNodes = selectNodes(topology, intent, focus, limit);
  const selectedIds = new Set(selectedNodes.map((node) => node.id));
  const incidentEdges = topology.edges
    .filter((edge) => selectedIds.has(edge.from) || selectedIds.has(edge.to))
    .slice(0, graphDetail ? 48 : Math.max(8, limit * 4));
  const processors = selectProcessors(topology, selectedNodes);
  const interfaces = selectInterfaces(topology, suit, selectedNodes, processors);
  const guideIds = new Set(selectedNodes.flatMap((node) => node.guideIds));
  const carrierLimit = graphDetail ? 6 : 2;
  const guideLimit = graphDetail ? 8 : 5;
  const topologyProjection = selectedTopologyProjection(topology, selectedIds, graphDetail);
  const decisionNode = selectedNodes.find((node) => node.kind !== "future-document" && node.kind !== "present-log" && node.kind !== "past-state") ?? selectedNodes[0] ?? null;
  const selected = selectedAction(decisionNode, processors, interfaces, topologyProjection, suit);
  return Object.freeze({
    kind: "operations-manifold.select-work-interface" as const,
    generatedAt: new Date().toISOString(),
    projection: Object.freeze({
      detail: graphDetail ? "graph" as const : "decision" as const,
      graphOperation: "topologize-future-work" as const,
    }),
    intent,
    focus,
    selected,
    decision: Object.freeze({
      node: decisionNode,
      processors,
      interfaces,
      rationale: rationaleFor(selectedNodes, processors, suit, topologyProjection),
    }),
    topology: Object.freeze({
      summary: topology.summary,
      strata: graphDetail ? topology.strata : selectedStrata(topology.strata, selectedIds),
      selectedNodes,
      incidentEdges: Object.freeze(incidentEdges),
      predication: topologyProjection.predication,
      flow: topologyProjection.flow,
      governance: topologyProjection.governance,
    }),
    context: Object.freeze({
      suit: suit.id,
      office: suit.office,
      agent: suit.agent,
      session: suit.session,
      budget: suit.budget,
      tokenEstimate: suit.tokenEstimate,
      constraints: Object.freeze(suit.constraints.slice(0, 5)),
      perception: Object.freeze(suit.perception.slice(0, 6).map((item) => item.uri)),
      memory: Object.freeze(suit.memory.slice(0, 5).map((item) => item.uri)),
    }),
    carriers: Object.freeze({
      futureDocuments: nodesOf(topology, "future-document", intent, focus, carrierLimit),
      presentLogs: nodesOf(topology, "present-log", intent, focus, carrierLimit),
      pastStates: nodesOf(topology, "past-state", intent, focus, carrierLimit),
      guides: Object.freeze(topology.guides
        .filter((guide) => guideIds.has(guide.id) || matches(searchable([intent, focus]), guide.appliesTo))
        .slice(0, guideLimit)
        .map((guide) => Object.freeze({ id: guide.id, path: guide.path, title: guide.title, claim: guide.claim }))),
    }),
    workflow: Object.freeze([
      workflow("read", "select-work-interface", "intent/focus JSON from stdin", "selected topology/context carriers"),
      workflow("suit", "project-context-suit", "selected node focus plus intent", "bounded context suit for the acting agent"),
      workflow("act", processors[0]?.title ?? "start-work", "selected read-work node and interface params", "durable read-work/log mutation or code action"),
      workflow("record", "record-operation", "action evidence and touched paths", "present operations JSONL witness"),
      workflow("fold", "read-operations-ledger", "present operations JSONL", "past operations state for future planning"),
    ]),
    stateless: Object.freeze({
      claim: "Agent read-work selection is projected from topology, context suit, and JSON state during one package-bin function run" as const,
      transport: "stdio-json" as const,
    }),
  });
}

function selectedAction(
  node: SelectedWorkInterfaceNode | null,
  processors: readonly SelectedWorkInterfaceNode[],
  interfaces: readonly SelectedWorkInterface[],
  topology: Pick<SelectWorkInterfaceReading["topology"], "predication" | "flow" | "governance">,
  suit: ContextSuit,
): SelectedWorkInterfaceAction {
  const nextInterface = node === null ? null : selectedNextInterface(node, interfaces);
  const processor = nextInterface === null
    ? processors[0] ?? null
    : processors.find((item) => item.interfaces.includes(nextInterface.bin) || item.title === nextInterface.bin) ?? processors[0] ?? null;
  const action = node === null
    ? "No work carrier selected; inspect the topology before acting."
    : nextInterface === null
      ? `Inspect ${node.id} before selecting a processor.`
      : `Run ${nextInterface.bin} for ${node.id}.`;
  return Object.freeze({
    node,
    processor,
    nextInterface,
    action,
    rationale: Object.freeze(rationaleFor(node === null ? [] : [node], processor === null ? [] : [processor], suit, topology)),
    evidence: Object.freeze([
      ...(node?.evidence ?? []),
      ...(processor?.evidence ?? []),
      ...(nextInterface === null ? [] : [`interface:${nextInterface.source}:${nextInterface.bin}`]),
    ].slice(0, 12)),
  });
}

function selectedNextInterface(node: SelectedWorkInterfaceNode, interfaces: readonly SelectedWorkInterface[]): SelectedWorkInterface | null {
  const wanted = new Set(node.interfaces);
  return interfaces.find((item) => wanted.has(item.bin))
    ?? interfaces.find((item) => item.params["target"] === node.id)
    ?? interfaces.find((item) => item.source === "selection")
    ?? interfaces[0]
    ?? null;
}

function isGraphDetail(value: string | undefined): boolean {
  const detail = optionalText(value);
  return detail === "graph" || detail === "full" || detail === "topology";
}

function selectedStrata(
  strata: FutureWorkTopology["strata"],
  selectedIds: ReadonlySet<string>,
): FutureWorkTopology["strata"] {
  const select = (input: FutureWorkTopology["strata"][FutureWorkTemporalStratum]) => Object.freeze({
    description: input.description,
    nodes: Object.freeze(input.nodes.filter((id) => selectedIds.has(id))),
  });
  return Object.freeze({
    future: select(strata.future),
    present: select(strata.present),
    past: select(strata.past),
    processor: select(strata.processor),
    guidance: select(strata.guidance),
  });
}

function selectNodes(topology: FutureWorkTopology, intent: string, focus: string, limit: number): readonly SelectedWorkInterfaceNode[] {
  const terms = searchable([intent, focus]);
  return Object.freeze(topology.nodes
    .filter((node) => node.kind !== "processor")
    .map((node) => Object.freeze({ node, score: nodeScore(node, terms, focus) }))
    .filter((entry) => entry.score > 0 || entry.node.kind === "planning-intent")
    .sort((left, right) => right.score - left.score || right.node.priority - left.node.priority)
    .map((entry) => compactNode(entry.node))
    .slice(0, limit));
}

function selectProcessors(topology: FutureWorkTopology, nodes: readonly SelectedWorkInterfaceNode[]): readonly SelectedWorkInterfaceNode[] {
  const wanted = new Set([
    "select-work-interface",
    "topologize-future-work",
    "project-context-suit",
    "record-operation",
    ...nodes.flatMap((node) => node.interfaces),
  ]);
  return Object.freeze(topology.nodes
    .filter((node) => node.kind === "processor")
    .filter((node) => node.interfaces.some((bin) => wanted.has(bin)) || wanted.has(node.title))
    .map(compactNode)
    .slice(0, 10));
}

function selectInterfaces(
  topology: FutureWorkTopology,
  suit: ContextSuit,
  nodes: readonly SelectedWorkInterfaceNode[],
  processors: readonly SelectedWorkInterfaceNode[],
): readonly SelectedWorkInterface[] {
  const out: SelectedWorkInterface[] = [];
  for (const item of topology.nextInterfaces) out.push(iface(item.bin, item.purpose, item.params, "topology"));
  for (const item of suit.interfaces) out.push(iface(item.bin, item.purpose, item.params, "project-context-suit"));
  for (const node of nodes.slice(0, 4)) {
    for (const bin of node.interfaces) out.push(iface(bin, `apply ${bin} to ${node.id}`, { target: node.id, focus: node.focus ?? "" }, "selection"));
  }
  for (const processor of processors.slice(0, 4)) {
    for (const bin of processor.interfaces) out.push(iface(bin, `run selected processor ${processor.title}`, { focus: processor.focus ?? "" }, "selection"));
  }
  return Object.freeze(dedupeInterfaces(out).slice(0, 18));
}

function selectedTopologyProjection(
  topology: FutureWorkTopology,
  selectedIds: ReadonlySet<string>,
  graphDetail: boolean,
): Readonly<Pick<SelectWorkInterfaceReading["topology"], "predication" | "flow" | "governance">> {
  const cellLimit = graphDetail ? 72 : 18;
  const stepLimit = graphDetail ? 8 : 5;
  const proposalLimit = graphDetail ? 16 : 6;
  const cells = topology.predication.cells
    .filter((cell) => selectedIds.has(cell.subject) || selectedIds.has(cell.object) || selectedIds.has(cell.id))
    .slice(0, cellLimit)
    .map(compactPredicationCell);
  const cellIds = new Set(cells.map((cell) => cell.id));
  const valuations = topology.predication.valuations
    .filter((valuation) => cellIds.has(valuation.cell))
    .slice(0, cellLimit)
    .map(compactValuation);
  const steps = topology.flow.steps
    .filter((step) => step.carriers.some((carrier) => selectedIds.has(carrier)) || step.processors.some((processor) => selectedIds.has(processor)))
    .slice(0, stepLimit)
    .map(compactStep);
  const proposals = topology.governance.proposals
    .filter((proposal) => selectedIds.has(proposal.target) || proposal.requiredWitnesses.some((witness) => selectedIds.has(witness)))
    .slice(0, proposalLimit)
    .map(compactGovernanceProposal);
  return Object.freeze({
    predication: Object.freeze({
      claim: topology.predication.claim,
      cells: Object.freeze(cells),
      valuations: Object.freeze(valuations),
    }),
    flow: Object.freeze({
      claim: topology.flow.claim,
      steps: Object.freeze(steps),
    }),
    governance: Object.freeze({
      claim: topology.governance.claim,
      invariants: Object.freeze(topology.governance.invariants.slice(0, graphDetail ? 8 : 5)),
      proposals: Object.freeze(proposals),
    }),
  });
}

function nodesOf(topology: FutureWorkTopology, kind: FutureWorkNode["kind"], intent: string, focus: string, limit: number): readonly SelectedWorkInterfaceNode[] {
  const terms = searchable([intent, focus]);
  return Object.freeze(topology.nodes
    .filter((node) => node.kind === kind)
    .sort((left, right) => nodeScore(right, terms, focus) - nodeScore(left, terms, focus) || right.priority - left.priority)
    .map(compactNode)
    .slice(0, limit));
}

function compactPredicationCell(cell: FutureWorkPredicationCell): SelectedPredicationCell {
  return Object.freeze({
    id: cell.id,
    subject: cell.subject,
    predicate: cell.predicate,
    object: cell.object,
    source: cell.source,
    evidence: Object.freeze(cell.evidence.slice(0, 4)),
  });
}

function compactValuation(valuation: FutureWorkPredicationValuation): SelectedPredicationValuation {
  return Object.freeze({
    cell: valuation.cell,
    value: Object.freeze({
      positive: Object.freeze(valuation.value.positive.slice(0, 4)),
      negative: Object.freeze(valuation.value.negative.slice(0, 4)),
      reading: valuation.value.reading,
    }),
    evidence: Object.freeze(valuation.evidence.slice(0, 4)),
  });
}

function compactStep(step: FutureWorkSpatiotemporalStep): SelectedSpatiotemporalStep {
  return Object.freeze({
    id: step.id,
    from: step.from,
    to: step.to,
    predicate: step.predicate,
    carriers: Object.freeze(step.carriers.slice(0, 10)),
    processors: Object.freeze(step.processors.slice(0, 8)),
    interfaces: Object.freeze(step.interfaces.slice(0, 8)),
  });
}

function compactGovernanceProposal(proposal: FutureWorkGovernanceProposal): SelectedGovernanceProposal {
  return Object.freeze({
    id: proposal.id,
    action: proposal.action,
    target: proposal.target,
    scope: proposal.scope,
    decisionRule: proposal.decisionRule,
    requiredWitnesses: Object.freeze(proposal.requiredWitnesses.slice(0, 6)),
    evidence: Object.freeze(proposal.evidence.slice(0, 6)),
  });
}

function nodeScore(node: FutureWorkNode, terms: string, focus: string): number {
  const text = searchable([node.id, node.title, node.summary, node.workKind ?? "", node.workStatus ?? "", node.focus ?? "", ...node.evidence, ...node.interfaces, ...node.guideIds]);
  let score = 0;
  if (node.focus?.includes(focus) === true) score += 40;
  if (text.includes(focus.toLowerCase())) score += 25;
  if (matches(terms, text.split(/\s+/u))) score += 20;
  if (node.kind === "planning-intent") score += 35;
  if (node.kind === "read-work" || node.kind === "goal" || node.kind === "capability-gap") score += 22;
  if (node.kind === "documentation-request") score += 12;
  if (node.temporal === "future") score += 10;
  return score + Math.round(node.priority / 10);
}

function rationaleFor(
  nodes: readonly SelectedWorkInterfaceNode[],
  processors: readonly SelectedWorkInterfaceNode[],
  suit: ContextSuit,
  topology: Pick<SelectWorkInterfaceReading["topology"], "predication" | "flow" | "governance">,
): readonly string[] {
  const out = [
    `${nodes.length} topology node(s) selected from the current future/present/past operation graph.`,
    `${processors.length} processor node(s) can act on or inspect the selected carriers.`,
    `${topology.predication.cells.length} predication cell(s), ${topology.flow.steps.length} flow step(s), and ${topology.governance.proposals.length} governance proposal(s) are incident to this selection.`,
    `Context suit ${suit.id} estimates ${suit.tokenEstimate}/${suit.budget} tokens.`,
  ];
  if (nodes.some((node) => node.kind === "documentation-request")) out.push("Documentation read-work is part of the selection, so agent handoff should include research guide paths.");
  if (nodes.some((node) => node.kind === "capability-gap")) out.push("Capability gaps are selected, so new read-work should be filed through start-work before code changes drift into implementation.");
  return Object.freeze(out);
}

function compactNode(node: FutureWorkNode): SelectedWorkInterfaceNode {
  return Object.freeze({
    id: node.id,
    kind: node.kind,
    temporal: node.temporal,
    layer: node.layer,
    title: clip(node.title, 180),
    priority: node.priority,
    focus: node.focus,
    status: node.status,
    ...(node.workKind === undefined ? {} : { workKind: node.workKind }),
    ...(node.workStatus === undefined ? {} : { workStatus: node.workStatus }),
    ...(node.success === undefined ? {} : { success: clip(node.success, 320) }),
    summary: clip(node.summary, 320),
    evidence: Object.freeze(node.evidence.slice(0, 6)),
    interfaces: Object.freeze(node.interfaces.slice(0, 6)),
    guideIds: Object.freeze(node.guideIds.slice(0, 6)),
  });
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>, source: SelectedWorkInterface["source"]): SelectedWorkInterface {
  return Object.freeze({ bin, purpose, params: Object.freeze({ ...params }), source });
}

function workflow(step: string, processor: string, input: string, output: string): Readonly<{ step: string; processor: string; input: string; output: string }> {
  return Object.freeze({ step, processor, input, output });
}

function dedupeInterfaces(items: readonly SelectedWorkInterface[]): readonly SelectedWorkInterface[] {
  const seen = new Set<string>();
  const out: SelectedWorkInterface[] = [];
  for (const item of items) {
    const key = `${item.bin}\u0000${JSON.stringify(item.params)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return Object.freeze(out);
}

function searchable(values: readonly string[]): string {
  return stringList(values.join(" ")).join(" ").toLowerCase();
}

function matches(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => term.length >= 4 && text.includes(term.toLowerCase()));
}

function clip(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1))}...`;
}
