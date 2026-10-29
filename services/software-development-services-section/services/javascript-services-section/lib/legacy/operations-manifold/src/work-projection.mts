import { cell } from "@emsenn/relating";

import { operationsManifoldGoals, type GoalSnapshot } from "./goals.mts";
import { boundedInteger, optionalText } from "./records.mts";
import { sitePlay, type OperationsManifoldWorkItem, type SitePlayReading } from "./site-play.mts";
import { operationsManifoldWork, type ActiveWorkRecord, type WorkSnapshot } from "./work-management.mts";
import { assignWork, officeName, officeTerm, predicate, term, termKey, uniqueTerms, workItem, workPriority, workProject, workStatusName, workTask, workTitle, type WorkItem, type WorkProject } from "./work-carriers.mts";

export type OperationsManifoldWorkItemsReading = Readonly<{
  kind: "operations-manifold.read-work-items";
  generatedAt: string;
  focus: string | null;
  sources: WorkProjectionSources;
  workItems: readonly WorkItem[];
  project: WorkProject;
}>;

export type OperationsManifoldWorkItemsParams = Readonly<{
  focus?: string | number | undefined;
  detail?: string | number | undefined;
  limit?: string | number | undefined;
  offset?: string | number | undefined;
}>;

export type OperationsManifoldWorkItemsSummary = Readonly<{
  kind: "operations-manifold.read-work-items.summary";
  generatedAt: string;
  focus: string | null;
  sources: WorkProjectionSources;
  workItemCount: number;
  officeCount: number;
  assignmentCount: number;
  projectTerm: string;
}>;

export type OperationsManifoldWorkItemsPage = Readonly<{
  kind: "operations-manifold.read-work-items.page";
  summary: OperationsManifoldWorkItemsSummary;
  focus: string | null;
  offset: number;
  limit: number;
  workItemCount: number;
  returned: number;
  workItems: readonly OperationsManifoldWorkItemSummary[];
}>;

export type OperationsManifoldWorkItemsProjection =
  | OperationsManifoldWorkItemsSummary
  | OperationsManifoldWorkItemsPage
  | OperationsManifoldWorkItemsReading;

export type OperationsManifoldWorkItemSummary = Readonly<{
  kind: "operations-manifold.read-work-items.item-summary";
  term: string;
  taskTerm: string;
  title: string;
  status: string;
  priority: number;
  office: string | null;
  evidenceCount: number;
  taskEvidenceCount: number;
  goalCount: number;
  factCount: number;
}>;

export type WorkProjectionSources = Readonly<{
  goals: Readonly<{
    log: string;
    state: string;
    eventCount: number;
    open: number;
  }>;
  managedWork: Readonly<{
    log: string;
    state: string;
    eventCount: number;
    open: number;
    blocking: number;
  }>;
  sitePlay: Readonly<{
    focus: string | null;
    settlement: string;
    steps: number;
    workItems: number;
  }>;
}>;

export async function operationsManifoldWorkItems(
  repoRoot: string,
  params: OperationsManifoldWorkItemsParams = {},
): Promise<OperationsManifoldWorkItemsReading> {
  const generatedAt = new Date().toISOString();
  const [goals, managedWork, play] = await Promise.all([
    operationsManifoldGoals(repoRoot),
    operationsManifoldWork(repoRoot),
    sitePlay(repoRoot, { focus: optionalText(params.focus) ?? undefined }),
  ]);
  const workItems = projectOperationsManifoldWorkItems(goals, managedWork, play);
  const offices = uniqueTerms(workItems.map((item) => item.office ?? officeTerm("operations-manifold")));
  const project = workProject({
    term: term(["operations-manifold", "read-work-items"]),
    work: workItems,
    offices,
    assignments: Object.freeze(workItems.map((item) => assignWork({
      term: term(["operations-manifold", "assignment", termKey(item.term)]),
      work: item,
      office: item.office ?? officeTerm("operations-manifold"),
      duties: Object.freeze([item.task.term]),
      at: term(["generated-at", generatedAt]),
      evidence: Object.freeze([term(["source", "operations-manifold.read-work-projection"])]),
    }))),
    evidence: Object.freeze([
      term(["generated-at", generatedAt]),
      term(["focus", play.focus ?? "operations-manifold"]),
      term(["open-goals", goals.open.length]),
      term(["open-managed-read-work", managedWork.active.length]),
      term(["read-site-play-read-work", play.workItems.length]),
    ]),
  });
  return Object.freeze({
    kind: "operations-manifold.read-work-items" as const,
    generatedAt,
    focus: play.focus,
    sources: workProjectionSources(goals, managedWork, play),
    workItems,
    project,
  });
}

export function projectOperationsManifoldWorkItemsReading(
  reading: OperationsManifoldWorkItemsReading,
  params: OperationsManifoldWorkItemsParams = {},
): OperationsManifoldWorkItemsProjection {
  const detail = optionalText(params.detail) ?? "summary";
  if (detail === "full") return reading;
  if (detail === "items" || detail === "page" || params.limit !== undefined || params.offset !== undefined) {
    return pageOperationsManifoldWorkItems(reading, params);
  }
  return summarizeOperationsManifoldWorkItems(reading);
}

export function summarizeOperationsManifoldWorkItems(reading: OperationsManifoldWorkItemsReading): OperationsManifoldWorkItemsSummary {
  return Object.freeze({
    kind: "operations-manifold.read-work-items.summary" as const,
    generatedAt: reading.generatedAt,
    focus: reading.focus,
    sources: reading.sources,
    workItemCount: reading.workItems.length,
    officeCount: reading.project.offices.length,
    assignmentCount: reading.project.assignments.length,
    projectTerm: termKey(reading.project.term),
  });
}

function pageOperationsManifoldWorkItems(
  reading: OperationsManifoldWorkItemsReading,
  params: OperationsManifoldWorkItemsParams,
): OperationsManifoldWorkItemsPage {
  const focus = optionalText(params.focus);
  const offset = boundedInteger(params.offset, { min: 0, fallback: 0 });
  const limit = boundedInteger(params.limit, { min: 1, max: 100, fallback: 25 });
  const filtered = focus === null ? reading.workItems : reading.workItems.filter((item) => workCarrierMatchesFocus(item, focus));
  const workItems = Object.freeze(filtered.slice(offset, offset + limit).map(summarizeOperationsManifoldWorkItem));
  return Object.freeze({
    kind: "operations-manifold.read-work-items.page" as const,
    summary: summarizeOperationsManifoldWorkItems(reading),
    focus,
    offset,
    limit,
    workItemCount: filtered.length,
    returned: workItems.length,
    workItems,
  });
}

function summarizeOperationsManifoldWorkItem(item: WorkItem): OperationsManifoldWorkItemSummary {
  return Object.freeze({
    kind: "operations-manifold.read-work-items.item-summary" as const,
    term: termKey(item.term),
    taskTerm: termKey(item.task.term),
    title: workTitle(item),
    status: workStatusName(item.task),
    priority: workPriority(item.task),
    office: item.office === undefined ? null : officeName(item.office),
    evidenceCount: item.evidence?.length ?? 0,
    taskEvidenceCount: item.task.evidence?.length ?? 0,
    goalCount: item.task.goals.cells.length,
    factCount: item.facts.cells.length,
  });
}

function workCarrierMatchesFocus(item: WorkItem, focus: string): boolean {
  const needle = focus.toLowerCase();
  return [
    termKey(item.term),
    termKey(item.task.term),
    workTitle(item),
    workStatusName(item.task),
    item.office === undefined ? null : officeName(item.office),
    ...(item.evidence ?? []).map(evidenceText),
    ...(item.task.evidence ?? []).map(evidenceText),
  ].some((value) => value !== null && value.toLowerCase().includes(needle));
}

function evidenceText(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function projectOperationsManifoldWorkItems(
  goals: GoalSnapshot,
  managedWork: WorkSnapshot,
  play: SitePlayReading,
): readonly WorkItem[] {
  return dedupeWork([
    ...goals.goals.filter((item) => goals.open.includes(item.id)).map((goal) => goal.workItem),
    ...managedWork.items.filter((candidate) => candidate.status !== "complete").map((item) => workItemForManagedWork(item, managedWork)),
    ...play.workItems.map(workItemForSitePlay),
  ]);
}

function workProjectionSources(
  goals: GoalSnapshot,
  managedWork: WorkSnapshot,
  play: SitePlayReading,
): WorkProjectionSources {
  return Object.freeze({
    goals: Object.freeze({
      log: goals.log,
      state: goals.state,
      eventCount: goals.eventCount,
      open: goals.open.length,
    }),
    managedWork: Object.freeze({
      log: managedWork.log,
      state: managedWork.state,
      eventCount: managedWork.eventCount,
      open: managedWork.active.length,
      blocking: managedWork.blocking.length,
    }),
    sitePlay: Object.freeze({
      focus: play.focus,
      settlement: play.settlement.value,
      steps: play.steps.length,
      workItems: play.workItems.length,
    }),
  });
}

export function workItemForManagedWork(item: ActiveWorkRecord, snapshot: WorkSnapshot): WorkItem {
  const unmet = unmetDependencies(item, snapshot);
  const status = unmet.length > 0
    ? "blocked"
    : item.gate === "stop"
      ? "active"
      : item.workKind === "project" || item.workKind === "plan"
        ? "proposed"
        : "assigned";
  const subject = term(["operations-manifold", "read-work", item.id]);
  const object = term(item.contributesTo.length === 0 ? ["focus", item.focus ?? "operations-manifold"] : ["contributes-to", ...item.contributesTo]);
  const task = workTask({
    term: term(["operations-manifold", "read-work", item.id, "task"]),
    goals: Object.freeze([
      cell(subject, predicate(["operations-manifold", "read-work", "advance"]), object),
    ]),
    evidence: Object.freeze([
      term(["title", item.title]),
      term(["intent", item.intent]),
      term(["success", item.success]),
      term(["kind", item.workKind]),
      term(["gate", item.gate]),
      term(["status", status]),
      term(["read-work-status", item.workStatus]),
      term(["priority", managedWorkPriority(item)]),
      ...(item.dependsOn.length === 0 ? [] : [term(["depends-on", ...item.dependsOn])]),
      ...(unmet.length === 0 ? [] : [term(["unmet-dependencies", ...unmet])]),
      ...item.evidence.map((entry) => term(["evidence", entry])),
    ]),
  });
  return workItem({
    term: subject,
    task,
    office: officeTerm(item.owner === "operations-manifold" ? "operations-manifold" : item.owner),
    evidence: Object.freeze([
      term(["source", "operations-manifold.read-work-management"]),
      term(["owner", item.owner]),
      term(["assigned-to", item.assignedTo ?? "unassigned"]),
      term(["focus", item.focus ?? "operations-manifold"]),
      term(["created-at", item.createdAt]),
      term(["updated-at", item.updatedAt]),
    ]),
  });
}

function workItemForSitePlay(item: OperationsManifoldWorkItem): WorkItem {
  const subject = term(["operations-manifold", "read-site-play", item.fields.subject]);
  const task = workTask({
    term: term(["operations-manifold", "read-site-play", item.workId, "task"]),
    goals: Object.freeze([
      cell(subject, predicate(["operations-manifold", "read-site-play", "advance"]), term(["source", item.fields.source])),
    ]),
    evidence: Object.freeze([
      term(["title", item.fields.title]),
      term(["summary", item.fields.summary]),
      term(["required-skill", item.fields.requiredSkill]),
      term(["priority", item.fields.priority]),
      term(["source", item.fields.source]),
    ]),
  });
  return workItem({
    term: term(["operations-manifold", "read-site-play", item.workId]),
    task,
    office: officeTerm(item.fields.requiredSkill === "fable" ? "koios.newsroom" : "operations-manifold.engineering"),
    evidence: Object.freeze([
      term(["source", "operations-manifold.read-site-play"]),
      term(["subject", item.fields.subject]),
    ]),
  });
}

export function unmetDependencies(item: ActiveWorkRecord, snapshot: WorkSnapshot): readonly string[] {
  const byId = new Map(snapshot.items.map((candidate) => [candidate.id, candidate]));
  return Object.freeze(item.dependsOn.filter((id) => byId.get(id)?.status !== "complete"));
}

export function managedWorkPriority(item: ActiveWorkRecord): number {
  if (item.priority !== null) {
    const numeric = Number(item.priority);
    if (Number.isFinite(numeric)) return Math.max(0, Math.min(100, numeric));
    if (item.priority === "critical") return 100;
    if (item.priority === "high") return 92;
    if (item.priority === "normal") return 72;
    if (item.priority === "low") return 48;
  }
  if (item.gate === "stop") return 95;
  if (item.workKind === "project") return 68;
  if (item.workKind === "plan") return 74;
  return 70;
}

function dedupeWork(work: readonly WorkItem[]): readonly WorkItem[] {
  const seen = new Set<string>();
  const out: WorkItem[] = [];
  for (const item of work) {
    const key = termKey(item.term);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return Object.freeze(out.sort((left, right) => termKey(left.term).localeCompare(termKey(right.term))));
}
