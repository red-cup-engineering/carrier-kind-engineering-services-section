import { capabilityCoverage, capabilitySearch } from "./capability-index.mts";
import { contextControl, projectContextSuit, type ContextSourceCandidate } from "./operating/contextualizing/suiting/library/context-control.mts";
import { agenticReadiness, type AgenticReadinessCriterion } from "./agentic-readiness.mts";
import { operationsManifoldGoals } from "./goals.mts";
import { operationsLedger } from "./operating/recording/operations/ledgering/library/operation-ledger.mts";
import { operationsManifoldWork } from "./work-management.mts";
import { workspaceGraphProjection, workspaceGraphView } from "./workspace-view.mts";

export type CognitionParams = Readonly<{
  q?: string | undefined;
  query?: string | undefined;
  intent?: string | undefined;
  focus?: string | undefined;
  premise?: string | undefined;
  limit?: string | number | undefined;
}>;

export type CognitiveEvidence = Readonly<{
  source: string;
  tier: "sense" | "rememberContexted-sense" | "learning" | "deriveContextd";
  weight: number;
  text: string;
}>;

export type CognitiveReading = Readonly<{
  kind: `operations-manifold.cognition.${string}`;
  verb: string;
  generatedAt: string;
  query: string;
  focus: string | null;
  network: false;
  evidence: readonly CognitiveEvidence[];
  result: unknown;
}>;

type SnapshotBundle = Readonly<{
  query: string;
  focus: string | null;
  limit: number;
  readiness: ReturnType<typeof agenticReadiness>;
  context: Awaited<ReturnType<typeof contextControl>>;
  suit: Awaited<ReturnType<typeof projectContextSuit>>;
  goals: Awaited<ReturnType<typeof operationsManifoldGoals>>;
  work: Awaited<ReturnType<typeof operationsManifoldWork>>;
  operations: Awaited<ReturnType<typeof operationsLedger>>;
}>;

export async function rememberContext(repoRoot: string, params: CognitionParams = {}): Promise<CognitiveReading> {
  const bundle = await snapshots(repoRoot, params);
  const evidence = memoryEvidence(bundle);
  return reading("rememberContext", bundle, evidence, {
    recalled: evidence.slice(0, bundle.limit),
    omitted: Math.max(0, evidence.length - bundle.limit),
  });
}

export async function wonderContext(repoRoot: string, params: CognitionParams = {}): Promise<CognitiveReading> {
  const bundle = await snapshots(repoRoot, params);
  const gaps = readinessGaps(bundle.readiness);
  const blocked = bundle.work.items.filter((item) => item.status === "blocked" || item.blockedBy !== null);
  const drift = bundle.context.assessments.filter((item) => item.drift);
  const evidence = [
    ...gaps.map((criterion) => evidenceItem("assess-agentic-readiness", "deriveContextd", 90 - criterion.score, `${criterion.id}: ${criterion.missing.join(", ")}`)),
    ...blocked.map((item) => evidenceItem(item.id, "sense", 82, `blocked work: ${item.title}`)),
    ...drift.map((item) => evidenceItem(item.id, "sense", 78, `drift: ${item.action}`)),
  ].sort(byWeight);
  return reading("wonderContext", bundle, evidence, {
    questions: evidence.slice(0, bundle.limit).map((item) => `What settles ${item.text}?`),
    gapCount: gaps.length,
    blockedWork: blocked.length,
    driftAssessments: drift.length,
  });
}

export async function imagineContext(repoRoot: string, params: CognitionParams = {}): Promise<CognitiveReading> {
  const bundle = await snapshots(repoRoot, params);
  const premise = clean(params.premise) ?? bundle.query;
  const gaps = readinessGaps(bundle.readiness);
  const target = gaps.find((criterion) => terms(premise).some((term) => searchable(criterion.id, criterion.title).includes(term))) ?? gaps[0];
  const evidence = [
    evidenceItem("assess-agentic-readiness", "learning", 54, `counterfactual premise: ${premise}`),
    ...(target === undefined ? [] : [
      evidenceItem(`readiness:${target.id}`, "deriveContextd", 72, `adding ${target.missing.join(", ")} would improve ${target.title}`),
    ]),
  ];
  return reading("imagineContext", bundle, evidence, {
    premise,
    target: target?.id ?? null,
    hypotheticalOperations: target?.missing ?? [],
    expectedEffect: target === undefined ? "no readiness gap matched the premise" : `moves ${target.id} toward present`,
  });
}

export async function inquireContext(repoRoot: string, params: CognitionParams = {}): Promise<CognitiveReading> {
  const bundle = await snapshots(repoRoot, params);
  const [search, coverage] = await Promise.all([
    capabilitySearch(repoRoot, bundle.query),
    capabilityCoverage(repoRoot, bundle.query),
  ]);
  const evidence = [
    ...search.packages.slice(0, bundle.limit).map((item) => evidenceItem(item.name, "sense", 84, `${item.field}: ${item.description}`)),
    ...search.functions.slice(0, bundle.limit).map((item) => evidenceItem(`${item.pkg}:${item.name}`, "sense", 80, `${item.name}(${item.domain.join(", ")})`)),
    ...coverage.gaps.map((gap) => evidenceItem("capability-gap", "deriveContextd", 68, gap)),
  ].sort(byWeight);
  return reading("inquireContext", bundle, evidence, {
    search,
    coverage,
  });
}

export async function deriveContext(repoRoot: string, params: CognitionParams = {}): Promise<CognitiveReading> {
  const bundle = await snapshots(repoRoot, params);
  const next = bundle.readiness.nextWork.slice(0, bundle.limit);
  const active = bundle.work.items.filter((item) => item.status === "active").slice(0, bundle.limit);
  const evidence = [
    ...next.map((item, index) => evidenceItem("assess-agentic-readiness", "deriveContextd", 95 - index, item)),
    ...active.map((item) => evidenceItem(item.id, "sense", 76, `active work: ${item.title}`)),
  ].sort(byWeight);
  return reading("deriveContext", bundle, evidence, {
    plan: next.map((item, index) => ({ step: index + 1, work: item })),
    activeWork: active.map((item) => item.id),
  });
}

export async function exploreContext(repoRoot: string, params: CognitionParams = {}): Promise<CognitiveReading> {
  const bundle = await snapshots(repoRoot, params);
  const graph = await workspaceGraphView(repoRoot, { focus: params.focus ?? "sites/ops.561.group", up: "1", down: "2" });
  const projection = workspaceGraphProjection(graph);
  const evidence = [
    ...projection.nodes.slice(0, bundle.limit).map((node) => evidenceItem(node.name, "sense", 82, `${node.layer}/${node.lifecycle}: ${node.dependencies.join(", ")}`)),
    ...projection.edges.slice(0, bundle.limit).map((edge) => evidenceItem(`${edge.from}->${edge.to}`, "sense", 70, `${edge.from} depends on ${edge.to}`)),
  ].sort(byWeight);
  return reading("exploreContext", bundle, evidence, {
    graph: projection,
  });
}

export async function dreamContext(repoRoot: string, params: CognitionParams = {}): Promise<CognitiveReading> {
  const bundle = await snapshots(repoRoot, params);
  const gaps = readinessGaps(bundle.readiness);
  const pressures = [
    ...gaps.map((criterion) => `${criterion.id} remains ${criterion.status}: ${criterion.next}`),
    `${bundle.operations.totals.entries} operation ledger entries`,
    `${bundle.work.active.length} active managed read-work item(s)`,
    `${bundle.context.admissions.length} context admission(s)`,
  ];
  const evidence = pressures.map((item, index) => evidenceItem("deterministic-dreamContext", "deriveContextd", 88 - index, item));
  return reading("dreamContext", bundle, evidence, {
    regime: "finite-local",
    network: false,
    deriveContextdClaims: pressures.slice(0, bundle.limit),
    consolidationDemand: gaps.slice(0, bundle.limit).map((criterion) => criterion.id),
  });
}

export async function consolidateMemory(repoRoot: string, params: CognitionParams = {}): Promise<CognitiveReading> {
  const bundle = await snapshots(repoRoot, params);
  const evidence = [
    evidenceItem(bundle.goals.log, "sense", 92, `${bundle.goals.eventCount} goal event(s), ${bundle.goals.open.length} open goal(s)`),
    evidenceItem(bundle.work.log, "sense", 90, `${bundle.work.eventCount} read-work event(s), ${bundle.work.active.length} active item(s)`),
    evidenceItem(bundle.context.log, "sense", 88, `${bundle.context.eventCount} context event(s), ${bundle.context.assessments.length} drift assessment(s)`),
    evidenceItem(bundle.operations.log, "sense", 86, `${bundle.operations.eventCount} operation event(s), ${bundle.operations.totals.tokens} token(s)`),
    evidenceItem("assess-agentic-readiness", "deriveContextd", 84, `readiness score ${bundle.readiness.summary.score}`),
  ];
  return reading("consolidateMemory", bundle, evidence, {
    network: false,
    snapshots: {
      goals: bundle.goals.state,
      work: bundle.work.state,
      context: bundle.context.state,
      operations: bundle.operations.state,
    },
    counts: {
      goals: bundle.goals.eventCount,
      work: bundle.work.eventCount,
      context: bundle.context.eventCount,
      operations: bundle.operations.eventCount,
      readinessScore: bundle.readiness.summary.score,
    },
  });
}

async function snapshots(repoRoot: string, params: CognitionParams): Promise<SnapshotBundle> {
  const query = clean(params.q ?? params.query ?? params.intent ?? params.premise) ?? "561 Group Operations Manifold agentic platform readiness";
  const focus = clean(params.focus) ?? "sites/ops.561.group";
  const limit = boundedLimit(params.limit);
  const [readiness, context, suit, goals, work, operations] = await Promise.all([
    Promise.resolve(agenticReadiness(repoRoot)),
    contextControl(repoRoot),
    projectContextSuit(repoRoot, { intent: query, focus }),
    operationsManifoldGoals(repoRoot),
    operationsManifoldWork(repoRoot),
    operationsLedger(repoRoot),
  ]);
  return Object.freeze({ query, focus, limit, readiness, context, suit, goals, work, operations });
}

function reading(verb: string, bundle: SnapshotBundle, evidence: readonly CognitiveEvidence[], result: unknown): CognitiveReading {
  return Object.freeze({
    kind: `operations-manifold.cognition.${verb}` as const,
    verb,
    generatedAt: new Date().toISOString(),
    query: bundle.query,
    focus: bundle.focus,
    network: false as const,
    evidence: Object.freeze(evidence.slice(0, bundle.limit)),
    result,
  });
}

function memoryEvidence(bundle: SnapshotBundle): readonly CognitiveEvidence[] {
  const queryTerms = terms(bundle.query);
  return [
    ...bundle.suit.perception.map((item) => sourceEvidence(item, "perception")),
    ...bundle.suit.memory.map((item) => sourceEvidence(item, "memory")),
    ...bundle.goals.goals.map((goal) => evidenceItem(goal.id, "sense", 84, `${goal.title}: ${goal.text}`)),
    ...bundle.work.items.map((item) => evidenceItem(item.id, "sense", 82, `${item.title}: ${item.intent}`)),
    ...bundle.operations.byPredicate.map((item) => evidenceItem(`predicate:${item.key}`, "deriveContextd", 60 + Math.min(20, item.count), `${item.count} operation(s) for ${item.key}`)),
  ]
    .filter((item) => queryTerms.length === 0 || queryTerms.some((term) => searchable(item.source, item.text).includes(term)))
    .sort(byWeight);
}

function sourceEvidence(item: ContextSourceCandidate, role: string): CognitiveEvidence {
  return evidenceItem(item.uri, item.tier, item.weight, `${role}: ${item.uri}`);
}

function readinessGaps(readiness: ReturnType<typeof agenticReadiness>): readonly AgenticReadinessCriterion[] {
  return readiness.criteria
    .filter((criterion) => criterion.status !== "present")
    .sort((left, right) => left.score - right.score || left.id.localeCompare(right.id));
}

function evidenceItem(source: string, tier: CognitiveEvidence["tier"], weight: number, text: string): CognitiveEvidence {
  return Object.freeze({ source, tier, weight: Math.max(0, Math.min(100, Math.round(weight))), text });
}

function byWeight(left: CognitiveEvidence, right: CognitiveEvidence): number {
  return right.weight - left.weight || left.source.localeCompare(right.source);
}

function clean(value: string | number | undefined): string | null {
  if (value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text.slice(0, 1000);
}

function boundedLimit(value: string | number | undefined): number {
  const parsed = value === undefined ? Number.NaN : typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 40) : 12;
}

function terms(value: string): readonly string[] {
  return Object.freeze(value.toLowerCase().split(/[^a-z0-9]+/u).filter((term) => term.length > 2));
}

function searchable(...values: readonly string[]): string {
  return values.join(" ").toLowerCase();
}
