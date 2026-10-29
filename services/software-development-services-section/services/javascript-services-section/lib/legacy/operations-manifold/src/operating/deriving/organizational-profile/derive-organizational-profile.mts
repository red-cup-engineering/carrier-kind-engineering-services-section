import { operationsManifoldGoals, type GoalRecord } from "../../../goals.mts";
import { futureWorkTopology } from "../../planning/topologizing/future-work/library/future-work-topology.mts";
import { operationsLedger, type OperationLedgerEntry } from "../../recording/operations/ledgering/library/operation-ledger.mts";
import { operationsManifoldWork, type ActiveWorkRecord, type WorkItemKind } from "../../../work-management.mts";
import { optionalText } from "../../../records.mts";

export type OrganizationalProfileParams = Readonly<{
  focus?: string | undefined;
  q?: string | undefined;
  intent?: string | undefined;
  limit?: string | number | undefined;
}>;

export type OrganizationalBilatticeReading = "affirmed" | "contested" | "overdetermined" | "unsettled";

export type OrganizationalProfileCell = Readonly<{
  id: string;
  subject: string;
  predicate: string;
  object: string;
  value: Readonly<{
    positive: readonly string[];
    negative: readonly string[];
    reading: OrganizationalBilatticeReading;
  }>;
  evidence: readonly string[];
}>;

export type OrganizationalProfile = Readonly<{
  kind: "operations-manifold.derive-organizational-profile";
  generatedAt: string;
  focus: string | null;
  intent: string;
  sources: Readonly<{
    goals: string;
    work: string;
    operations: string;
    topology: "topologize-future-work";
    researchLibrary: "content";
  }>;
  operationsBase: Readonly<{
    openGoals: number;
    activeWork: number;
    blockingWork: number;
    workKinds: readonly Readonly<{ kind: WorkItemKind; count: number; items: readonly string[] }>[];
    operationEvents: number;
    processors: number;
    predicationCells: number;
    governanceProposals: number;
  }>;
  witnessSheaf: Readonly<{
    claim: "Goals, work items, operation events, and topology processors are read as local witness sections over the same Operations Manifold base.";
    sections: readonly Readonly<{ id: string; carrier: string; events: number; state: string; evidence: readonly string[] }>[];
  }>;
  bilattice: Readonly<{
    claim: "This is a log-derived organizational reading: positive and negative witnesses are kept separate instead of collapsed into a boolean.";
    cells: readonly OrganizationalProfileCell[];
  }>;
  coordination: Readonly<{
    claim: "Future work is coordinated by work carriers, present witnesses, and past state rather than by hidden in-memory scheduling.";
    readyInterfaces: readonly string[];
    obstructions: readonly Readonly<{ id: string; title: string; reason: string; evidence: readonly string[] }>[];
    nextWork: readonly Readonly<{ id: string; title: string; workKind: WorkItemKind; status: string; interfaces: readonly string[]; evidence: readonly string[] }>[];
  }>;
  researchBasis: readonly Readonly<{ id: string; path: string; claim: string }>[];
}>;

export async function deriveOrganizationalProfile(
  repoRoot: string,
  params: OrganizationalProfileParams = {},
): Promise<OrganizationalProfile> {
  const focus = optionalText(params.focus);
  const intent = optionalText(params.intent ?? params.q) ?? "derive the Operations Manifold organizational profile from logs";
  const [goals, work, operations, topology] = await Promise.all([
    operationsManifoldGoals(repoRoot),
    operationsManifoldWork(repoRoot),
    operationsLedger(repoRoot),
    futureWorkTopology(repoRoot, { focus: focus ?? undefined, intent, limit: params.limit }),
  ]);
  const openGoals = goals.goals.filter((goal) => goals.open.includes(goal.id));
  const activeWork = work.items.filter((item) => item.status !== "complete");
  const blockingWork = activeWork.filter((item) => item.gate === "stop" || item.status === "blocked" || item.blockedBy !== null);
  const recentOperationEvidence = operations.entries.slice(0, 12).flatMap((entry) => entry.evidence).slice(0, 12);

  return Object.freeze({
    kind: "operations-manifold.derive-organizational-profile" as const,
    generatedAt: new Date().toISOString(),
    focus,
    intent,
    sources: Object.freeze({
      goals: goals.state,
      work: work.state,
      operations: operations.state,
      topology: "topologize-future-work" as const,
      researchLibrary: "content" as const,
    }),
    operationsBase: Object.freeze({
      openGoals: openGoals.length,
      activeWork: activeWork.length,
      blockingWork: blockingWork.length,
      workKinds: Object.freeze(workKinds(activeWork)),
      operationEvents: operations.eventCount,
      processors: topology.summary.processors,
      predicationCells: topology.summary.predicationCells,
      governanceProposals: topology.summary.governanceProposals,
    }),
    witnessSheaf: Object.freeze({
      claim: "Goals, work items, operation events, and topology processors are read as local witness sections over the same Operations Manifold base." as const,
      sections: Object.freeze([
        section("goals", "goal", goals.eventCount, goals.state, [goals.log, goals.state, ...openGoals.slice(0, 5).flatMap((goal) => goal.evidence)]),
        section("work", "work", work.eventCount, work.state, [work.log, work.state, ...activeWork.slice(0, 5).flatMap((item) => item.evidence)]),
        section("operations", "operation", operations.eventCount, operations.state, [operations.log, operations.state, ...recentOperationEvidence]),
        section("topology", "future-work-topology", topology.summary.predicationCells, "topologize-future-work", ["topologize-future-work", ...topology.guides.slice(0, 5).map((guide) => guide.path)]),
      ]),
    }),
    bilattice: Object.freeze({
      claim: "This is a log-derived organizational reading: positive and negative witnesses are kept separate instead of collapsed into a boolean." as const,
      cells: Object.freeze([
        cell("operations-manifold", "has-open-goal-count", String(openGoals.length), openGoals.flatMap(goalEvidence), [], openGoals.length > 0 ? "affirmed" : "unsettled"),
        cell("operations-manifold", "has-active-work-count", String(activeWork.length), activeWork.flatMap(workEvidence), [], activeWork.length > 0 ? "affirmed" : "unsettled"),
        cell("operations-manifold", "has-blocking-work-count", String(blockingWork.length), blockingWork.flatMap(workEvidence), activeWork.filter((item) => item.gate !== "stop" && item.status !== "blocked").flatMap(workEvidence), blockingWork.length > 0 ? "contested" : "affirmed"),
        cell("operations-manifold", "has-processor-count", String(topology.summary.processors), ["package.json#bin", "topologize-future-work"], [], topology.summary.processors > 0 ? "affirmed" : "unsettled"),
        cell("operations-manifold", "has-governance-proposal-count", String(topology.summary.governanceProposals), topology.governance.proposals.flatMap((proposal) => proposal.evidence), [], topology.summary.governanceProposals > 0 ? "affirmed" : "unsettled"),
        cell("operations-manifold", "has-recent-operation-events", String(operations.eventCount), recentOperationEvidence, [], operations.eventCount > 0 ? "affirmed" : "unsettled"),
        cell("operations-manifold", "uses-future-present-past-flow", String(topology.flow.steps.length), topology.flow.steps.flatMap((step) => step.evidence), [], topology.flow.steps.length > 0 ? "affirmed" : "unsettled"),
      ]),
    }),
    coordination: Object.freeze({
      claim: "Future work is coordinated by work carriers, present witnesses, and past state rather than by hidden in-memory scheduling." as const,
      readyInterfaces: Object.freeze([...new Set(topology.nextInterfaces.map((item) => item.bin).concat(["derive-organizational-profile"]))].sort()),
      obstructions: Object.freeze(blockingWork.map((item) => Object.freeze({
        id: item.id,
        title: item.title,
        reason: item.blockedBy ?? (item.gate === "stop" ? "stop-gated active work" : item.status),
        evidence: Object.freeze(workEvidence(item)),
      }))),
      nextWork: Object.freeze(activeWork.slice(0, 12).map((item) => Object.freeze({
        id: item.id,
        title: item.title,
        workKind: item.workKind,
        status: item.workStatus,
        interfaces: Object.freeze(["select-work-interface", "project-context-suit", "update-work", "handoff-agent"]),
        evidence: Object.freeze(workEvidence(item)),
      }))),
    }),
    researchBasis: Object.freeze(topology.guides.slice(0, 10).map((guide) => Object.freeze({
      id: guide.id,
      path: guide.path,
      claim: guide.claim,
    }))),
  });
}

function section(id: string, carrier: string, events: number, state: string, evidence: readonly string[]) {
  return Object.freeze({
    id,
    carrier,
    events,
    state,
    evidence: Object.freeze([...new Set(evidence)].slice(0, 12)),
  });
}

function cell(
  subject: string,
  predicate: string,
  object: string,
  positive: readonly string[],
  negative: readonly string[],
  reading: OrganizationalBilatticeReading,
): OrganizationalProfileCell {
  return Object.freeze({
    id: `organizational-profile:${slug(subject)}:${slug(predicate)}:${slug(object)}`,
    subject,
    predicate,
    object,
    value: Object.freeze({
      positive: Object.freeze([...new Set(positive)].slice(0, 12)),
      negative: Object.freeze([...new Set(negative)].slice(0, 12)),
      reading,
    }),
    evidence: Object.freeze([...new Set([...positive, ...negative])].slice(0, 12)),
  });
}

function workKinds(items: readonly ActiveWorkRecord[]): readonly Readonly<{ kind: WorkItemKind; count: number; items: readonly string[] }>[] {
  const grouped = new Map<WorkItemKind, string[]>();
  for (const item of items) {
    const bucket = grouped.get(item.workKind) ?? [];
    bucket.push(item.id);
    grouped.set(item.workKind, bucket);
  }
  return Object.freeze([...grouped.entries()]
    .map(([kind, ids]) => Object.freeze({ kind, count: ids.length, items: Object.freeze(ids) }))
    .sort((left, right) => right.count - left.count || left.kind.localeCompare(right.kind)));
}

function goalEvidence(goal: GoalRecord): readonly string[] {
  return goal.evidence.length === 0 ? [goal.id] : goal.evidence;
}

function workEvidence(item: ActiveWorkRecord): readonly string[] {
  return item.evidence.length === 0 ? [item.id] : item.evidence;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 56) || "value";
}
