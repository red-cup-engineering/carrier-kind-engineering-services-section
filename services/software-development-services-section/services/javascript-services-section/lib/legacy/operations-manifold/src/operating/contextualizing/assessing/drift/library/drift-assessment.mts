import type { EAVT, JsonValue } from "@emsenn/relating/writing";
import type { RunRegime } from "@red-cup-engineering/organizing-with-llm-agents/running";

import { clamp, hash, isRecord, isString, optionalText, requireText, slug as sharedSlug, stringList } from "../../../../../records.mts";
import type { ContextControlSnapshot } from "../../../suiting/library/context-control.mts";
import { contextControl, projectContextSuit, refreshContextControl, selectAdmission } from "../../../suiting/library/context-control.mts";
import type { ContextSuit } from "../../../suiting/library/context-suit.mts";
import { appendContextEvent, contextLogEvent } from "../../../recording/library/context-recording.mts";

export type DriftAssessmentParams = Readonly<{
  admission?: string | undefined;
  intent?: string | undefined;
  q?: string | undefined;
  focus?: string | undefined;
  action?: string | undefined;
  tool?: string | undefined;
  paths?: string | readonly string[] | undefined;
  outcome?: string | undefined;
  evidence?: string | readonly string[] | undefined;
  authority?: string | undefined;
  budget?: string | number | undefined;
  source?: string | undefined;
}>;

export type DriftMetricName =
  | "goal-alignment"
  | "context-support"
  | "authority-fit"
  | "scope-fit"
  | "memory-pollution"
  | "contradiction-pressure"
  | "compression-loss"
  | "obstruction-honesty";

export type DriftMetric = Readonly<{
  name: DriftMetricName;
  value: "aligned" | "watch" | "drift";
  score: number;
  reason: string;
}>;

export type DriftAssessmentRecord = Readonly<{
  kind: "operations-manifold.context.assess-driftment";
  id: string;
  eventId: string;
  at: string;
  admissionId: string | null;
  focus: string | null;
  intent: string;
  action: string;
  tool: string | null;
  paths: readonly string[];
  outcome: string | null;
  metrics: readonly DriftMetric[];
  score: number;
  drift: boolean;
  regime: RunRegime | null;
  evidence: readonly string[];
}>;

export type DriftAssessmentResult = Readonly<{
  kind: "operations-manifold.context.assess-drift";
  accepted: true;
  event: EAVT;
  eavtJsonl: string;
  assessment: DriftAssessmentRecord;
  suit: ContextSuit;
  snapshot: ContextControlSnapshot;
}>;

export async function assessDrift(repoRoot: string, params: DriftAssessmentParams): Promise<DriftAssessmentResult> {
  const now = new Date().toISOString();
  const snapshot = await contextControl(repoRoot);
  const admission = selectAdmission(snapshot, params);
  const suit = await projectContextSuit(repoRoot, {
    admission: params.admission ?? admission?.id,
    intent: params.intent ?? params.q,
    focus: params.focus,
    budget: params.budget,
  });
  const intent = requireText(params.intent ?? params.q ?? admission?.intent ?? suit.intent, "assessment intent");
  const action = requireText(params.action, "assessment action");
  const focus = optionalText(params.focus) ?? admission?.focus ?? suit.focus;
  const paths = stringList(params.paths);
  const evidence = stringList(params.evidence);
  const metrics = driftMetrics({
    intent,
    action,
    tool: optionalText(params.tool),
    paths,
    outcome: optionalText(params.outcome),
    focus,
    suit,
    authority: optionalText(params.authority) ?? admission?.authority ?? "user",
  });
  const score = Math.round(metrics.reduce((sum, item) => sum + item.score, 0) / metrics.length);
  const drift = metrics.some((item) => item.value === "drift") || score < 70;
  const seed = { at: now, intent, action, focus, metrics };
  const eventId = `context-event:${hash(seed).slice(0, 24)}`;
  const assessmentId = `drift:${slug(action)}:${hash({ action, intent, at: now }).slice(0, 12)}`;
  const event = contextLogEvent(
    assessmentId,
    "operations-manifold.context.assess-drifted",
    {
      kind: "operations-manifold.context.event",
      event: "assess-drifted",
      eventId,
      at: now,
      intent,
      ...(focus === null ? {} : { focus }),
      action,
      ...(optionalText(params.tool) === null ? {} : { tool: optionalText(params.tool)! }),
      paths,
      ...(optionalText(params.outcome) === null ? {} : { outcome: optionalText(params.outcome)! }),
      metrics,
      score,
      drift,
      ...(admission === null ? {} : { admissionId: admission.id }),
      evidence,
      source: optionalText(params.source) ?? "operations-manifold.assess-drift",
    },
    now,
    eventId,
  );

  const eavtJsonl = await appendContextEvent(repoRoot, event);
  const refreshed = await refreshContextControl(repoRoot);
  const assessment = refreshed.assessments.find((item) => item.id === assessmentId);
  if (assessment === undefined) throw new Error(`drift assessment was not projected: ${assessmentId}`);
  return Object.freeze({ kind: "operations-manifold.context.assess-drift" as const, accepted: true as const, event, eavtJsonl, assessment, suit, snapshot: refreshed });
}

export function driftMetrics(input: Readonly<{
  intent: string;
  action: string;
  tool: string | null;
  paths: readonly string[];
  outcome: string | null;
  focus: string | null;
  suit: ContextSuit;
  authority: string;
}>): readonly DriftMetric[] {
  const haystack = searchable([input.action, input.tool, input.outcome, ...input.paths]);
  const intentTerms = terms(input.intent).filter((term) => term.length > 3);
  const suitTerms = terms([input.suit.intent, input.suit.mission, input.suit.focus ?? ""].join(" ")).filter((term) => term.length > 3);
  const focus = input.focus ?? input.suit.focus;
  const scopePaths = input.paths.filter((item) => item !== "");
  const contextHits = [...intentTerms, ...suitTerms].filter((term) => haystack.includes(term)).length;
  const touchesMemory = /\b(memory|memories|rememberContext|learning|consolidat)/iu.test(haystack);
  const isConsolidation = /\b(consolidat|settle|study|accepted truth)\b/iu.test(haystack);
  const isCompaction = /\b(compact|summary|summarize)\b/iu.test(haystack);
  const mentionsGoal = /\bgoal|read-workitem|intent|constraint|evidence\b/iu.test(haystack);
  const claimsDone = doneText(haystack);
  const boundHit = boundText(haystack);
  const honestBound = honestText(haystack);
  const substituted = boundHit && claimsDone && !honestBound;
  return Object.freeze([
    metric("goal-alignment", contextHits > 0 ? "aligned" : "watch", contextHits > 0 ? 90 : 55, contextHits > 0 ? "action shares terms with filed intent or suit mission" : "action does not visibly cite filed intent or mission"),
    metric("context-support", contextHits > 1 ? "aligned" : "watch", contextHits > 1 ? 88 : 60, contextHits > 1 ? "action is supported by admitted context terms" : "context support is weak and should be backed by evidence"),
    metric("authority-fit", /^(user|hook|mcp|automation|heartbeat|operations-manifold)/iu.test(input.authority) ? "aligned" : "watch", 80, `authority ${input.authority} is recorded for later governance`),
    metric("scope-fit", scopeFits(scopePaths, focus) ? "aligned" : "drift", scopeFits(scopePaths, focus) ? 92 : 25, scopeFits(scopePaths, focus) ? "touched paths fit admitted focus or no paths were supplied" : "touched paths escape admitted focus"),
    metric("memory-pollution", touchesMemory && !isConsolidation ? "drift" : "aligned", touchesMemory && !isConsolidation ? 30 : 92, touchesMemory && !isConsolidation ? "action appears to write memory outside a consolidation/study path" : "no direct memory pollution signal"),
    metric("contradiction-pressure", /\b(conflict|contradict|top|absurd|gap|unsettled)\b/iu.test(haystack) ? "watch" : "aligned", 76, "contradiction language is preserved as pressure rather than silently resolved"),
    metric("compression-loss", isCompaction && !mentionsGoal ? "drift" : "aligned", isCompaction && !mentionsGoal ? 35 : 90, isCompaction && !mentionsGoal ? "compaction lacks visible goal/constraint/evidence anchors" : "no compaction-loss signal"),
    metric(
      "obstruction-honesty",
      substituted ? "drift" : boundHit && claimsDone ? "watch" : "aligned",
      substituted ? 20 : boundHit && claimsDone ? 60 : boundHit ? 85 : 90,
      substituted
        ? "outcome claims completion while evidence shows a bound was hit - an obstruction reported as a settled claim"
        : boundHit && claimsDone
          ? "outcome claims completion but also names a bound; report the obstruction explicitly, do not present the proxy as settled"
          : boundHit
            ? "a bound is present and is not dressed up as completion"
            : "no obstruction-substitution signal",
    ),
  ]);
}

export function metric(name: DriftMetricName, value: DriftMetric["value"], score: number, reason: string): DriftMetric {
  return Object.freeze({ name, value, score, reason });
}

const DONE_RE = /\b(done|complete|completed|finished|fixed|read-works?|read-working|passing|green|stabiliz\w*|succe\w+|shipped|resolved|ready)\b/iu;
const BOUND_RE = /\b(block\w*|den\w+|refus\w+|cannot|can['']?t|could\s?n['']?t|could not|unable|missing|not\s+(?:found|exported|defined)|undefined|crash\w*|fail\w*|50[023]|timed?\s?out|timeout|gave up|dead|down|unavailable|instead|proxy|substitut\w*|stuck|halt\w*)\b/iu;
const HONEST_RE = /\b(obstruct\w*|bound|halted|blocked by|out of scope|not done|incomplete|deferred|awaiting|needs?\s+(?:approval|authorization|sign-?off))\b/iu;
const NOT_DONE_RE = /\b(?:not|isn['']?t|aren['']?t|wasn['']?t|never|no)\s+(?:yet\s+)?(?:done|complete\w*|finish\w*|fix\w*|ready|read-working|resolved|shipped|passing|green)\b|\b(?:incomplete|unfinished|unresolved)\b/iu;

function doneText(value: string): boolean {
  return DONE_RE.test(value) && !NOT_DONE_RE.test(value);
}

function boundText(value: string): boolean {
  return BOUND_RE.test(value);
}

function honestText(value: string): boolean {
  return HONEST_RE.test(value);
}

export function assessmentRegime(action: string, outcome: string | null, metrics: readonly DriftMetric[]): RunRegime | null {
  const contradiction = metrics.find((item) => item.name === "contradiction-pressure");
  if (contradiction !== undefined && contradiction.value !== "aligned") return "contested";
  const text = `${action} ${outcome ?? ""}`;
  if (boundText(text)) return "obstructed";
  if (doneText(text)) return "stabilized";
  return null;
}

function scopeFits(paths: readonly string[], focus: string | null): boolean {
  if (paths.length === 0 || focus === null || focus.trim() === "") return true;
  if (!focus.includes("/")) return true;
  const normalizedFocus = focus.replace(/\/+$/u, "");
  return paths.every((item) => item === normalizedFocus || item.startsWith(`${normalizedFocus}/`));
}

export function driftMetric(value: JsonValue): DriftMetric | null {
  if (!isRecord(value) || typeof value["name"] !== "string" || typeof value["reason"] !== "string") return null;
  if (!isMetricName(value["name"])) return null;
  const metricValue = value["value"];
  if (metricValue !== "aligned" && metricValue !== "watch" && metricValue !== "drift") return null;
  return metric(value["name"], metricValue, typeof value["score"] === "number" ? clamp(value["score"], 0, 100, 0) : 0, value["reason"]);
}

function isMetricName(value: string): value is DriftMetricName {
  return value === "goal-alignment"
    || value === "context-support"
    || value === "authority-fit"
    || value === "scope-fit"
    || value === "memory-pollution"
    || value === "contradiction-pressure"
    || value === "compression-loss"
    || value === "obstruction-honesty";
}

function terms(value: string): readonly string[] {
  return Object.freeze(value.toLowerCase().split(/[^a-z0-9]+/u).filter((term) => term !== ""));
}

function searchable(values: readonly (string | null)[]): string {
  return values.filter(isString).join(" ").toLowerCase();
}

function slug(value: string): string {
  return sharedSlug(value, "context", 56);
}
