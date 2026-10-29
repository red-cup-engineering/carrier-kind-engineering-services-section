import { joinKnowledgeNames } from "@red-cup-engineering/animating";
import type { ChargeValueName } from "@emsenn/relating";

import { generatedAtRecord, numberField, recordOf, slug, stringField } from "./records.mts";
import { siteOperations, type SiteOperationsReading } from "./site-admin.mts";

export type SitePlayStep = Readonly<{
  kind: "operations-manifold.read-site-play.step";
  priority: number;
  subject: string;
  move: string;
  reason: string;
  endpoint: string;
  requiresReview: boolean;
}>;

export type SitePlayReading = Readonly<{
  kind: "operations-manifold.read-site-play";
  focus: string | null;
  createCheckpoint: Readonly<{
    focus: string | null;
    operations: readonly Readonly<{ endpoint: string; status: string; generatedAt?: string }>[];
  }>;
  settlement: JudgmentSettlement;
  judgments: readonly AdmissionJudgment[];
  steps: readonly SitePlayStep[];
  interrupts: readonly SitePlayStep[];
  workItems: readonly OperationsManifoldWorkItem[];
  operations: SiteOperationsReading;
}>;

export type AdmissionJudgment = Readonly<{
  name: string;
  value: ChargeValueName;
  reason: string;
  path: string;
}>;

export type JudgmentSettlement = Readonly<{
  kind: "animating.trace.judgment-settlement";
  value: ChargeValueName;
  judgments: readonly AdmissionJudgment[];
  stableJudgments: readonly AdmissionJudgment[];
}>;

export type OperationsManifoldWorkItem = Readonly<{
  kind: "operations-manifold.read-work-item";
  workId: string;
  fields: Readonly<{
    title: string;
    office: "operations-manifold";
    requiredSkill: "codex" | "fable";
    source: string;
    subject: string;
    priority: number;
    summary: string;
  }>;
}>;

function settleJudgments(judgments: readonly AdmissionJudgment[]): JudgmentSettlement {
  return Object.freeze({
    kind: "animating.trace.judgment-settlement" as const,
    value: joinKnowledgeNames(judgments.map((judgment) => judgment.value)),
    judgments,
    stableJudgments: Object.freeze(judgments.filter((judgment) => judgment.value === "stable")),
  });
}

export async function sitePlay(repoRoot: string, params: Readonly<{ focus?: string | undefined }> = {}): Promise<SitePlayReading> {
  const operations = await siteOperations(repoRoot, params);
  const judgments: AdmissionJudgment[] = [];
  const steps: SitePlayStep[] = [];

  for (const operation of operations.operations) {
    if (operation.status === "obstruction") {
      judgments.push(judgment(`${operation.endpoint}:reachable`, "stable", operation.reason, operation.url));
      steps.push(step(100, "restore-operation-surface", operation.reason, operation.endpoint, operation.url, false));
      continue;
    }

    judgments.push(judgment(`${operation.endpoint}:reachable`, "active", "operation surface returned a JSON witness", operation.url));
    const body = recordOf(operation.body);
    if (body === null) {
      judgments.push(judgment(`${operation.endpoint}:shape`, "stable", "operation witness is not an object", operation.url));
      steps.push(step(90, "repair-operation-witness-shape", "operation witness is not an object", operation.endpoint, operation.url, false));
      continue;
    }

    const kind = stringField(body, "kind");
    judgments.push(judgment(`${operation.endpoint}:kind`, kind === null ? "potential" : "active", kind ?? "operation kind is absent", operation.url));
    const publication = publicationGameProjection(body);
    if (publication !== null) {
      judgments.push(...publication.judgments.map((item) => ({ ...item, path: operation.url })));
      steps.push(...publication.steps.map((item) => ({ ...item, endpoint: operation.endpoint })));
      continue;
    }

    const operationsManifold = operationsManifoldOperationProjection(body);
    if (operationsManifold !== null) {
      judgments.push(...operationsManifold.judgments.map((item) => ({ ...item, path: operation.url })));
      steps.push(...operationsManifold.steps.map((item) => ({ ...item, endpoint: operation.endpoint })));
    }
  }

  const orderedSteps = Object.freeze([...steps].sort((left, right) => right.priority - left.priority || left.move.localeCompare(right.move)));
  return Object.freeze({
    kind: "operations-manifold.read-site-play" as const,
    focus: operations.focus,
    createCheckpoint: Object.freeze({
      focus: operations.focus,
      operations: Object.freeze(operations.operations.map((operation) => Object.freeze({
        endpoint: operation.endpoint,
        status: operation.status,
        ...(operation.status === "witness" ? generatedAtRecord(operation.body) : {}),
      }))),
    }),
    settlement: settleJudgments(judgments),
    judgments: Object.freeze(judgments),
    steps: orderedSteps,
    interrupts: Object.freeze(orderedSteps.filter((item) => item.requiresReview)),
    workItems: Object.freeze(orderedSteps.map(workItemFromStep)),
    operations,
  });
}

function operationsManifoldOperationProjection(body: Record<string, unknown>): Readonly<{
  judgments: readonly Omit<AdmissionJudgment, "path">[];
  steps: readonly Omit<SitePlayStep, "endpoint">[];
}> | null {
  const kind = stringField(body, "kind");
  if (kind === "operations-manifold.heartbeat") return heartbeatProjection(body);
  if (kind === "operations-manifold.goals.snapshot") return goalsProjection(body);
  if (kind === "operations-manifold.control-context.snapshot") return contextProjection(body);
  if (kind === "operations-manifold.read-operations-ledger.snapshot") return operationsLedgerProjection(body);
  if (stringField(body, "status") === "ok" && Array.isArray(body["scripts"])) return scriptHealthProjection(body);
  return kind?.startsWith("operations-manifold.") === true
    ? Object.freeze({
        judgments: Object.freeze([judgmentWithoutPath(kind, "active", `${kind} witness is reachable`)]),
        steps: Object.freeze([]),
      })
    : null;
}

function scriptHealthProjection(body: Record<string, unknown>): Readonly<{
  judgments: readonly Omit<AdmissionJudgment, "path">[];
  steps: readonly Omit<SitePlayStep, "endpoint">[];
}> {
  const scripts = stringSet(body["scripts"]);
  const required = ["record-hook-event", "read-heartbeat", "project-context-suit", "read-work-items", "start-work", "update-work", "complete-work", "set-work-stop-gate"];
  const missing = required.filter((script) => !scripts.has(script));
  return Object.freeze({
    judgments: Object.freeze([
      judgmentWithoutPath(
        "operations-manifold:scripts",
        missing.length === 0 ? "active" : "stable",
        missing.length === 0 ? "agent platform scripts are mounted" : `missing agent platform script(s): ${missing.join(", ")}`,
      ),
    ]),
    steps: Object.freeze(missing.length === 0 ? [] : [
      stepWithoutEndpoint(98, "restore-read-agent-platform-scripts", `missing agent platform script(s): ${missing.join(", ")}`, "operations-manifold:scripts", false),
    ]),
  });
}

function heartbeatProjection(body: Record<string, unknown>): Readonly<{
  judgments: readonly Omit<AdmissionJudgment, "path">[];
  steps: readonly Omit<SitePlayStep, "endpoint">[];
}> {
  const pressures = arrayLength(body, "pressures");
  const spacesuits = arrayLength(body, "spacesuits");
  const managedWork = recordOf(body["managedWork"]);
  const activeWork = arrayLength(managedWork, "active");
  const blockingWork = arrayLength(managedWork, "blocking");
  const goals = recordOf(body["goals"]);
  const openGoals = arrayLength(goals, "open");
  const judgments: Omit<AdmissionJudgment, "path">[] = [
    judgmentWithoutPath(
      "operations-manifold:heartbeat",
      pressures > 0 ? "potential" : "active",
      pressures > 0 ? `${pressures} heartbeat pressure(s) are present` : "heartbeat has no current pressures",
    ),
    judgmentWithoutPath(
      "operations-manifold:managed-read-work",
      blockingWork > 0 ? "stable" : activeWork > 0 ? "potential" : "active",
      blockingWork > 0
        ? `${blockingWork} stop-gated read-work item(s) block completion`
        : activeWork > 0
          ? `${activeWork} active read-work item(s) are open`
          : "no active managed read-work is open",
    ),
    judgmentWithoutPath(
      "operations-manifold:spacesuits",
      spacesuits > 0 ? "active" : "potential",
      spacesuits > 0 ? `${spacesuits} context spacesuit(s) are projected` : "no context spacesuit is projected",
    ),
  ];
  const steps: Omit<SitePlayStep, "endpoint">[] = [];
  if (blockingWork > 0) steps.push(stepWithoutEndpoint(96, "clear-stop-gated-read-work", `${blockingWork} stop-gated read-work item(s) block completion`, "operations-manifold:managed-read-work", false));
  if (activeWork > 0) steps.push(stepWithoutEndpoint(84, "advance-managed-read-work", `${activeWork} active read-work item(s) are open`, "operations-manifold:managed-read-work", false));
  if (openGoals > 0) steps.push(stepWithoutEndpoint(78, "fold-open-goals", `${openGoals} open goal(s) need read-work linkage`, "operations-manifold:goals", false));
  if (spacesuits === 0) steps.push(stepWithoutEndpoint(74, "project-context-spacesuit", "no context spacesuit is projected", "operations-manifold:spacesuits", false));
  return Object.freeze({ judgments: Object.freeze(judgments), steps: Object.freeze(steps) });
}

function goalsProjection(body: Record<string, unknown>): Readonly<{
  judgments: readonly Omit<AdmissionJudgment, "path">[];
  steps: readonly Omit<SitePlayStep, "endpoint">[];
}> {
  const openGoals = arrayLength(body, "open");
  return Object.freeze({
    judgments: Object.freeze([
      judgmentWithoutPath("operations-manifold:goals", openGoals > 0 ? "potential" : "active", openGoals > 0 ? `${openGoals} open goal(s) are filed` : "no open goals are filed"),
    ]),
    steps: Object.freeze(openGoals === 0 ? [] : [
      stepWithoutEndpoint(78, "fold-open-goals", `${openGoals} open goal(s) need read-work linkage`, "operations-manifold:goals", false),
    ]),
  });
}

function contextProjection(body: Record<string, unknown>): Readonly<{
  judgments: readonly Omit<AdmissionJudgment, "path">[];
  steps: readonly Omit<SitePlayStep, "endpoint">[];
}> {
  const admissions = arrayLength(body, "admissions");
  const assessments = arrayLength(body, "assessments");
  const latestSuit = recordOf(body["latestSuit"]);
  const hasSuit = latestSuit !== null;
  const judgments: Omit<AdmissionJudgment, "path">[] = [
    judgmentWithoutPath(
      "operations-manifold:context-admission",
      admissions > 0 ? "active" : "potential",
      admissions > 0 ? `${admissions} context admission(s) are filed` : "no context admission has been filed",
    ),
    judgmentWithoutPath(
      "operations-manifold:context-drift",
      assessments > 0 ? "active" : "potential",
      assessments > 0 ? `${assessments} drift assessment(s) are filed` : "no drift assessment has been filed",
    ),
  ];
  const steps: Omit<SitePlayStep, "endpoint">[] = [];
  if (admissions === 0) steps.push(stepWithoutEndpoint(96, "admit-operational-context", "no context admission has been filed", "operations-manifold:context-admission", false));
  if (!hasSuit) steps.push(stepWithoutEndpoint(74, "project-context-spacesuit", "no context spacesuit is projected", "operations-manifold:project-context-suit", false));
  return Object.freeze({ judgments: Object.freeze(judgments), steps: Object.freeze(steps) });
}

function operationsLedgerProjection(body: Record<string, unknown>): Readonly<{
  judgments: readonly Omit<AdmissionJudgment, "path">[];
  steps: readonly Omit<SitePlayStep, "endpoint">[];
}> {
  const totals = recordOf(body["totals"]);
  const entries = numberField(totals, "entries") ?? 0;
  const hookEvents = numberField(totals, "hookEvents") ?? 0;
  const judgments: Omit<AdmissionJudgment, "path">[] = [
    judgmentWithoutPath(
      "operations-manifold:read-operations-ledger",
      entries > 0 ? "active" : "potential",
      entries > 0 ? `${entries} operation ledger entr${entries === 1 ? "y is" : "ies are"} booked` : "no operation ledger entries are booked",
    ),
    judgmentWithoutPath(
      "operations-manifold:codex-hooks",
      hookEvents > 0 ? "active" : "stable",
      hookEvents > 0 ? `${hookEvents} Codex hook event(s) are booked` : "no Codex hook events are booked",
    ),
  ];
  const steps: Omit<SitePlayStep, "endpoint">[] = [];
  if (entries === 0) steps.push(stepWithoutEndpoint(98, "restore-operation-ledger-ingress", "no operation ledger entries are booked", "operations-manifold:read-operations-ledger", false));
  if (hookEvents === 0) steps.push(stepWithoutEndpoint(96, "verify-codex-hooks", "no Codex hook events are booked", "operations-manifold:codex-hooks", false));
  return Object.freeze({ judgments: Object.freeze(judgments), steps: Object.freeze(steps) });
}

function publicationGameProjection(body: Record<string, unknown>): Readonly<{
  judgments: readonly Omit<AdmissionJudgment, "path">[];
  steps: readonly Omit<SitePlayStep, "endpoint">[];
}> | null {
  if (typeof body["kind"] !== "string" || !body["kind"].endsWith(".publication-game")) return null;
  const judgments: Omit<AdmissionJudgment, "path">[] = [];
  const steps: Omit<SitePlayStep, "endpoint">[] = [];

  const demand = recordOf(body["demand"]);
  const next = recordOf(demand?.["next"]);
  const nextTerm = stringField(next, "term");
  judgments.push(judgmentWithoutPath(
    "publication-game:demand",
    nextTerm === null ? "potential" : "active",
    nextTerm === null ? "no next assignment is currently selected" : `next assignment is ${nextTerm}`,
  ));
  if (nextTerm !== null) {
    steps.push(stepWithoutEndpoint(30, "prepare-next-assignment", `next assignment is ${nextTerm}`, "publication-game:demand", false));
  }

  const desk = recordOf(body["desk"]);
  const openCandidateCount = numberField(desk, "openCandidateCount") ?? 0;
  judgments.push(judgmentWithoutPath(
    "publication-game:desk",
    openCandidateCount > 0 ? "potential" : "active",
    openCandidateCount > 0 ? `${openCandidateCount} editorial candidate(s) await review` : "no editorial candidates await review",
  ));
  if (openCandidateCount > 0) {
    steps.push(stepWithoutEndpoint(80, "review-editorial-read-work", `${openCandidateCount} editorial candidate(s) await review`, "publication-game:desk", true));
  }

  const runs = recordOf(body["runs"]);
  const obstructed = numberField(runs, "obstructed") ?? 0;
  const withheld = numberField(runs, "withheld") ?? 0;
  judgments.push(judgmentWithoutPath(
    "publication-game:runs",
    obstructed > 0 ? "stable" : "active",
    obstructed > 0 ? `${obstructed} run obstruction(s) are present` : "no run obstructions are present",
  ));
  if (obstructed > 0) {
    steps.push(stepWithoutEndpoint(95, "restore-obstructed-intake", `${obstructed} run obstruction(s) are present`, "publication-game:runs", false));
  }
  if (withheld > 0) {
    steps.push(stepWithoutEndpoint(75, "repair-withheld-runs", `${withheld} withheld run(s) need gate repair`, "publication-game:runs", true));
  }

  const compost = recordOf(body["compost"]);
  const compostCount = numberField(compost, "count") ?? 0;
  judgments.push(judgmentWithoutPath(
    "publication-game:compost",
    compostCount > 0 ? "stable" : "active",
    compostCount > 0 ? `${compostCount} compost entr${compostCount === 1 ? "y" : "ies"} carry repair evidence` : "no compost repair evidence is present",
  ));
  if (compostCount > 0) {
    steps.push(stepWithoutEndpoint(85, "use-compost-repair-evidence", `${compostCount} compost entr${compostCount === 1 ? "y" : "ies"} carry repair evidence`, "publication-game:compost", false));
  }

  return Object.freeze({ judgments: Object.freeze(judgments), steps: Object.freeze(steps) });
}

function judgment(name: string, value: AdmissionJudgment["value"], reason: string, path: string): AdmissionJudgment {
  return Object.freeze({ name, value, reason, path });
}

function judgmentWithoutPath(name: string, value: AdmissionJudgment["value"], reason: string): Omit<AdmissionJudgment, "path"> {
  return Object.freeze({ name, value, reason });
}

function step(priority: number, move: string, reason: string, endpoint: string, subject: string, requiresReview: boolean): SitePlayStep {
  return Object.freeze({ kind: "operations-manifold.read-site-play.step" as const, priority, subject, move, reason, endpoint, requiresReview });
}

function stepWithoutEndpoint(priority: number, move: string, reason: string, subject: string, requiresReview: boolean): Omit<SitePlayStep, "endpoint"> {
  return Object.freeze({ kind: "operations-manifold.read-site-play.step" as const, priority, subject, move, reason, requiresReview });
}

function workItemFromStep(step: SitePlayStep): OperationsManifoldWorkItem {
  const source = `${step.endpoint}:${step.subject}`;
  return Object.freeze({
    kind: "operations-manifold.read-work-item" as const,
    workId: `-${slug(`${step.endpoint} ${step.move} ${step.subject}`, "read-work", 96)}`,
    fields: Object.freeze({
      title: titleForMove(step.move),
      office: "operations-manifold" as const,
      requiredSkill: step.move === "review-editorial-read-work" || step.move === "repair-withheld-runs" ? "fable" as const : "codex" as const,
      source,
      subject: step.subject,
      priority: step.priority,
      summary: step.reason.slice(0, 280),
    }),
  });
}

function titleForMove(move: string): string {
  return move.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function arrayLength(record: Readonly<Record<string, unknown>> | null, key: string): number {
  const value = record?.[key];
  return Array.isArray(value) ? value.length : 0;
}

function stringSet(input: unknown): ReadonlySet<string> {
  if (!Array.isArray(input)) return new Set();
  return new Set(input.flatMap((item): string[] => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const name = (item as Record<string, unknown>)["name"];
      if (typeof name === "string") return [name];
    }
    return [];
  }));
}
