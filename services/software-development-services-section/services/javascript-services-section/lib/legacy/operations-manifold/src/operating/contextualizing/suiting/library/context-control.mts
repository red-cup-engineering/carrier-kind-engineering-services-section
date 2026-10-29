import type { EAVT, JsonValue } from "@emsenn/relating/writing";

import { operationsManifoldGoals, type GoalSnapshot } from "../../../../goals.mts";
import { isRecord, isString, optionalText, stringOf } from "../../../../records.mts";
import { operationsManifoldWork, type WorkSnapshot } from "../../../../work-management.mts";
import {
  CONTEXT_LOG_RELATIVE,
  CONTEXT_STATE_RELATIVE,
  ensureContextDirs,
  readContextLog,
  writeContextSnapshot,
} from "../../recording/library/context-recording.mts";
import { sourceCandidate, type ContextAdmissionRecord, type ContextSourceCandidate } from "../../admitting/library/context-admission.mts";
import { suitFor, type ContextSuit, type ContextSuitParams } from "./context-suit.mts";
import { assessmentRegime, driftMetric, type DriftAssessmentParams, type DriftAssessmentRecord, type DriftMetric } from "../../assessing/drift/library/drift-assessment.mts";

export { admitContext } from "../../admitting/library/context-admission.mts";
export type { ContextAdmissionParams, ContextAdmissionRecord, ContextAdmissionResult, ContextSourceCandidate } from "../../admitting/library/context-admission.mts";
export type { ContextSuit, ContextSuitInterface, ContextSuitParams, ContextSuitWork } from "./context-suit.mts";
export { assessDrift } from "../../assessing/drift/library/drift-assessment.mts";
export type { DriftAssessmentParams, DriftAssessmentRecord, DriftAssessmentResult, DriftMetric, DriftMetricName } from "../../assessing/drift/library/drift-assessment.mts";

export type ContextControlSnapshot = Readonly<{
  kind: "operations-manifold.control-context.snapshot";
  generatedAt: string;
  log: string;
  state: string;
  cycle: readonly ["form", "eavt", "sensor", "eavt", "actuator", "eavt", "form"];
  eventCount: number;
  admissions: readonly ContextAdmissionRecord[];
  latestSuit: ContextSuit | null;
  assessments: readonly DriftAssessmentRecord[];
}>;

type ContextEventValue = Readonly<{
  kind: "operations-manifold.context.event";
  event: "admitted" | "assess-drifted";
  eventId: string;
  at: string;
  intent?: string;
  focus?: string;
  authority?: string;
  budget?: number;
  candidates?: readonly ContextSourceCandidate[];
  action?: string;
  tool?: string;
  paths?: readonly string[];
  outcome?: string;
  metrics?: readonly DriftMetric[];
  score?: number;
  drift?: boolean;
  admissionId?: string;
  evidence?: readonly string[];
  source?: string;
}>;

export async function contextControl(repoRoot: string): Promise<ContextControlSnapshot> {
  await ensureContextDirs(repoRoot);
  return refreshContextControl(repoRoot);
}

export async function refreshContextControl(repoRoot: string): Promise<ContextControlSnapshot> {
  const [events, goals, work] = await Promise.all([readContextLog(repoRoot), operationsManifoldGoals(repoRoot), operationsManifoldWork(repoRoot)]);
  const snapshot = foldContextEvents(events, goals, work);
  await writeContextSnapshot(repoRoot, snapshot);
  return snapshot;
}

export async function projectContextSuit(repoRoot: string, params: ContextSuitParams = {}): Promise<ContextSuit> {
  const [snapshot, goals, work] = await Promise.all([contextControl(repoRoot), operationsManifoldGoals(repoRoot), operationsManifoldWork(repoRoot)]);
  const admission = selectAdmission(snapshot, params);
  return suitFor(admission, params, goals, work);
}

export function selectAdmission(snapshot: ContextControlSnapshot, params: ContextSuitParams | DriftAssessmentParams): ContextAdmissionRecord | null {
  const requested = optionalText(params.admission);
  if (requested !== null) return snapshot.admissions.find((item) => item.id === requested) ?? null;
  const focus = optionalText(params.focus);
  if (focus !== null) return snapshot.admissions.find((item) => item.focus === focus) ?? snapshot.admissions[0] ?? null;
  return snapshot.admissions[0] ?? null;
}

function foldContextEvents(events: readonly EAVT[], goals: GoalSnapshot, work: WorkSnapshot): ContextControlSnapshot {
  const admissions: ContextAdmissionRecord[] = [];
  const assessments: DriftAssessmentRecord[] = [];
  for (const event of events) {
    const entity = stringOf(event[0]);
    const attr = stringOf(event[1]);
    const value = contextEventValue(event[2]);
    if (entity === null || value === null) continue;
    const at = value.at ?? timeOf(event[3]) ?? new Date(0).toISOString();
    if (attr === "operations-manifold.context.admitted" && value.event === "admitted" && value.intent !== undefined) {
      admissions.push(Object.freeze({
        kind: "operations-manifold.context.admission" as const,
        id: entity,
        eventId: value.eventId,
        at,
        intent: value.intent,
        focus: value.focus ?? null,
        authority: value.authority ?? "user",
        budget: value.budget ?? 1600,
        candidates: Object.freeze([...(value.candidates ?? [])]),
        evidence: Object.freeze([`${CONTEXT_LOG_RELATIVE}#${value.eventId}`]),
      }));
    }
    if (attr === "operations-manifold.context.assess-drifted" && value.event === "assess-drifted" && value.intent !== undefined && value.action !== undefined) {
      assessments.push(Object.freeze({
        kind: "operations-manifold.context.assess-driftment" as const,
        id: entity,
        eventId: value.eventId,
        at,
        admissionId: value.admissionId ?? null,
        focus: value.focus ?? null,
        intent: value.intent,
        action: value.action,
        tool: value.tool ?? null,
        paths: Object.freeze([...(value.paths ?? [])]),
        outcome: value.outcome ?? null,
        metrics: Object.freeze([...(value.metrics ?? [])]),
        score: value.score ?? 0,
        drift: value.drift ?? false,
        regime: assessmentRegime(value.action, value.outcome ?? null, value.metrics ?? []),
        evidence: Object.freeze([`${CONTEXT_LOG_RELATIVE}#${value.eventId}`, ...(value.evidence ?? [])]),
      }));
    }
  }
  const orderedAdmissions = admissions.sort((left, right) => right.at.localeCompare(left.at));
  const orderedAssessments = assessments.sort((left, right) => right.at.localeCompare(left.at));
  const latestSuit = orderedAdmissions[0] === undefined ? null : suitFor(orderedAdmissions[0], {}, goals, work);
  return Object.freeze({
    kind: "operations-manifold.control-context.snapshot" as const,
    generatedAt: new Date().toISOString(),
    log: CONTEXT_LOG_RELATIVE,
    state: CONTEXT_STATE_RELATIVE,
    cycle: Object.freeze(["form", "eavt", "sensor", "eavt", "actuator", "eavt", "form"] as const),
    eventCount: events.length,
    admissions: Object.freeze(orderedAdmissions),
    latestSuit,
    assessments: Object.freeze(orderedAssessments),
  });
}

function contextEventValue(value: JsonValue): ContextEventValue | null {
  if (!isRecord(value) || value["kind"] !== "operations-manifold.context.event") return null;
  const event = value["event"];
  const eventId = value["eventId"];
  const at = value["at"];
  if ((event !== "admitted" && event !== "assess-drifted") || typeof eventId !== "string" || typeof at !== "string") return null;
  return Object.freeze({
    kind: "operations-manifold.context.event" as const,
    event,
    eventId,
    at,
    ...(typeof value["intent"] === "string" ? { intent: value["intent"] } : {}),
    ...(typeof value["focus"] === "string" ? { focus: value["focus"] } : {}),
    ...(typeof value["authority"] === "string" ? { authority: value["authority"] } : {}),
    ...(typeof value["budget"] === "number" ? { budget: value["budget"] } : {}),
    ...(Array.isArray(value["candidates"]) ? { candidates: Object.freeze(value["candidates"].map(sourceCandidate).filter(notNull)) } : {}),
    ...(typeof value["action"] === "string" ? { action: value["action"] } : {}),
    ...(typeof value["tool"] === "string" ? { tool: value["tool"] } : {}),
    ...(Array.isArray(value["paths"]) ? { paths: Object.freeze(value["paths"].filter(isString)) } : {}),
    ...(typeof value["outcome"] === "string" ? { outcome: value["outcome"] } : {}),
    ...(Array.isArray(value["metrics"]) ? { metrics: Object.freeze(value["metrics"].map(driftMetric).filter(notNull)) } : {}),
    ...(typeof value["score"] === "number" ? { score: value["score"] } : {}),
    ...(typeof value["drift"] === "boolean" ? { drift: value["drift"] } : {}),
    ...(typeof value["admissionId"] === "string" ? { admissionId: value["admissionId"] } : {}),
    ...(Array.isArray(value["evidence"]) ? { evidence: Object.freeze(value["evidence"].filter(isString)) } : {}),
    ...(typeof value["source"] === "string" ? { source: value["source"] } : {}),
  });
}

function timeOf(value: JsonValue): string | null {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value["at"] === "string") return value["at"];
  return null;
}

function notNull<T>(value: T | null): value is T {
  return value !== null;
}
