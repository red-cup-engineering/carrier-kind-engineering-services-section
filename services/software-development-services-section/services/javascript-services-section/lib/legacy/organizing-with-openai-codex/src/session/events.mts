/**
 * Codex exec event projection.
 *
 * `codex exec --json` already gives the right transport shape for automation:
 * newline-delimited events. This module keeps that boundary and projects each
 * event into the shared trace carrier vocabulary so 561 Group Operations Manifold can later publish
 * the evidence without inventing another MCP route or DTO.
 */

import { createHash } from "node:crypto";

import { action, carrierFrom, cell, charge, chargeValue, claim, mark, predicateOfClaim, tm, token, utterance, type ChargeCarrier, type ChargeValueName, type Mark, type PredicationPredicate, type PredicationTerm, type UtteranceCarrier } from "@emsenn/relating";
import { canonical as canonicalJson, isJsonRecord, parseJsonlLines, requireJsonValue } from "@emsenn/relating/writing";
import type { CostEvent } from "@red-cup-engineering/organizing-with-openai-agents/run";
import { finding, type Finding } from "@red-cup-engineering/organizing-with-openai-agents/session";

export type CodexExecEvent = Readonly<Record<string, unknown> & {
  readonly type: string;
}>;

export const CodexExecEventSchema = { "$id": "organizing/openai/codex/session/events/event", "title": "CodexExecEvent", type: "object", required: ["type"], properties: { "type": { type: "string", "minLength": 1 } }, additionalProperties: {} } as const;

export interface CodexExecTraceCarrier {
  readonly kind: "codex.exec.trace";
  readonly run: string;
  readonly events: readonly CodexExecEvent[];
  readonly entries: readonly TraceEntry[];
  readonly utterances: readonly UtteranceCarrier[];
  readonly readings: readonly TraceCellReading[];
  readonly findings: readonly Finding[];
  readonly work: readonly WorkItem[];
  readonly reports: readonly WorkReport[];
}

const ChargeValueNameSchema = { anyOf: [{ const: "absurd" }, { const: "potential" }, { const: "active" }, { const: "stable" }] } as const;

export const TraceEntrySchema = { "$id": "organizing/openai/codex/session/events/trace-entry", "title": "CodexExecTraceEntry", "additionalProperties": false, type: "object", required: ["subject", "predicate", "object", "provenance"], properties: { "subject": { type: "string", "minLength": 1 }, "predicate": { type: "string", "minLength": 1 }, "object": {}, "provenance": {} } } as const;

export const TraceCellReadingSchema = { "$id": "organizing/openai/codex/session/events/trace-cell-reading", "title": "CodexExecTraceCellReading", "additionalProperties": false, type: "object", required: ["subject", "predicate", "object", "value", "provenance"], properties: { "subject": { type: "string", "minLength": 1 }, "predicate": { type: "string", "minLength": 1 }, "object": {}, "value": ChargeValueNameSchema, "provenance": {} } } as const;

export type TraceEntry = Readonly<{
  subject: string;
  predicate: string;
  object: string | Mark;
  provenance: unknown;
}>;

export type TraceCellReading = Readonly<{
  subject: string;
  predicate: string;
  object: string | Mark;
  value: ChargeValueName;
  provenance: unknown;
}>;

export type CodexWorkTask = Readonly<{
  kind: "codex.exec.work.task";
  term: PredicationTerm;
  goals: readonly unknown[];
  evidence: readonly PredicationTerm[];
}>;

export const CodexWorkTaskSchema = { "$id": "organizing/openai/codex/session/events/work-task", "title": "CodexExecWorkTask", "additionalProperties": false, type: "object", required: ["kind", "term", "goals", "evidence"], properties: { "kind": { const: "codex.exec.work.task" }, "term": {}, "goals": { type: "array", items: {} }, "evidence": { type: "array", items: {} } } } as const;

export type CodexWorkItem = Readonly<{
  kind: "codex.exec.work.item";
  term: PredicationTerm;
  task: CodexWorkTask;
  office: PredicationTerm;
  evidence: readonly PredicationTerm[];
}>;

export const CodexWorkItemSchema = { "$id": "organizing/openai/codex/session/events/work-item", "title": "CodexExecWorkItem", "additionalProperties": false, type: "object", required: ["kind", "term", "task", "office", "evidence"], properties: { "kind": { const: "codex.exec.work.item" }, "term": {}, "task": CodexWorkTaskSchema, "office": {}, "evidence": { type: "array", items: {} } } } as const;

export type CodexWorkReport = Readonly<{
  kind: "codex.exec.work.report";
  term: PredicationTerm;
  work: CodexWorkItem;
  office: PredicationTerm;
  charge: ChargeCarrier;
  at?: PredicationTerm;
  evidence: readonly PredicationTerm[];
}>;

export const CodexWorkReportSchema = { "$id": "organizing/openai/codex/session/events/work-report", "title": "CodexExecWorkReport", "additionalProperties": false, type: "object", required: ["kind", "term", "work", "office", "charge", "evidence"], properties: { "kind": { const: "codex.exec.work.report" }, "term": {}, "work": CodexWorkItemSchema, "office": {}, "charge": {}, "at": {}, "evidence": { type: "array", items: {} } } } as const;

export const CodexExecTraceCarrierSchema = { "$id": "organizing/openai/codex/session/events/trace", "title": "CodexExecTraceCarrier", "additionalProperties": false, type: "object", required: ["kind", "run", "events", "entries", "utterances", "readings", "findings", "work", "reports"], properties: { "kind": { const: "codex.exec.trace" }, "run": { type: "string", "minLength": 1 }, "events": { type: "array", items: CodexExecEventSchema }, "entries": { type: "array", items: TraceEntrySchema }, "utterances": { type: "array", items: {} }, "readings": { type: "array", items: TraceCellReadingSchema }, "findings": { type: "array", items: {} }, "work": { type: "array", items: CodexWorkItemSchema }, "reports": { type: "array", items: CodexWorkReportSchema } } } as const;

export const traceEntryCarrier = carrierFrom(TraceEntrySchema);

export const traceCellReadingCarrier = carrierFrom(TraceCellReadingSchema);

export const codexWorkTaskCarrier = carrierFrom(CodexWorkTaskSchema);

export const codexWorkItemCarrier = carrierFrom(CodexWorkItemSchema);

export const codexWorkReportCarrier = carrierFrom(CodexWorkReportSchema);

export const codexExecTraceCarrier = carrierFrom(CodexExecTraceCarrierSchema);

export const canonicalizeTraceEntryAction = action({
  verb: "organizing.openai.codex.session.events.canonicalize-trace-entry",
  description: "Canonicalize a Codex exec trace entry.",
  domain: traceEntryCarrier,
  codomain: traceEntryCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeTraceCellReadingAction = action({
  verb: "organizing.openai.codex.session.events.canonicalize-trace-cell-reading",
  description: "Canonicalize a Codex exec trace cell reading.",
  domain: traceCellReadingCarrier,
  codomain: traceCellReadingCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeCodexWorkTaskAction = action({
  verb: "organizing.openai.codex.session.events.canonicalize-work-task",
  description: "Canonicalize a Codex exec work task.",
  domain: codexWorkTaskCarrier,
  codomain: codexWorkTaskCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeCodexWorkItemAction = action({
  verb: "organizing.openai.codex.session.events.canonicalize-work-item",
  description: "Canonicalize a Codex exec work item.",
  domain: codexWorkItemCarrier,
  codomain: codexWorkItemCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeCodexWorkReportAction = action({
  verb: "organizing.openai.codex.session.events.canonicalize-work-report",
  description: "Canonicalize a Codex exec work report.",
  domain: codexWorkReportCarrier,
  codomain: codexWorkReportCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeCodexExecTraceAction = action({
  verb: "organizing.openai.codex.session.events.canonicalize-trace",
  description: "Canonicalize a Codex exec trace carrier.",
  domain: codexExecTraceCarrier,
  codomain: codexExecTraceCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const eventActions = Object.freeze([
  canonicalizeTraceEntryAction,
  canonicalizeTraceCellReadingAction,
  canonicalizeCodexWorkTaskAction,
  canonicalizeCodexWorkItemAction,
  canonicalizeCodexWorkReportAction,
  canonicalizeCodexExecTraceAction,
]);

type WorkItem = CodexWorkItem;
type WorkReport = CodexWorkReport;
type WorkStatus = ChargeCarrier;

export function parseCodexExecJsonl(input: string): readonly CodexExecEvent[] {
  const events: CodexExecEvent[] = [];
  for (const [index, parsed] of parseJsonlLines(input).entries()) {
    if (!isJsonRecord(parsed)) {
      throw new TypeError(`codex exec event line ${index + 1}: expected object`);
    }
    if (typeof parsed["type"] !== "string" || parsed["type"].length === 0) {
      throw new TypeError(`codex exec event line ${index + 1}: expected string type`);
    }
    events.push(Object.freeze({ ...parsed, type: parsed["type"] }));
  }
  return Object.freeze(events);
}

function stableJson(value: unknown): string {
  return canonicalJson(requireJsonValue(value, "codex exec event value"));
}

function shortHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex").slice(0, 16);
}

function eventRun(events: readonly CodexExecEvent[], explicit: string | undefined): string {
  if (explicit !== undefined && explicit.length > 0) return explicit;
  for (const event of events) {
    const threadId = event["thread_id"] ?? event["threadId"];
    if (typeof threadId === "string" && threadId.length > 0) return `thread.${threadId}`;
  }
  return `run.${shortHash(events)}`;
}

function eventId(event: CodexExecEvent, ordinal: number): string {
  const item = event["item"];
  if (typeof item === "object" && item !== null && !Array.isArray(item)) {
    const id = (item as Record<string, unknown>)["id"];
    if (typeof id === "string" && id.length > 0) return `item.${id}.${ordinal}`;
  }
  const threadId = event["thread_id"] ?? event["threadId"];
  const turnId = event["turn_id"] ?? event["turnId"];
  if (typeof turnId === "string" && turnId.length > 0) return `turn.${turnId}.${ordinal}`;
  if (typeof threadId === "string" && threadId.length > 0) return `thread.${threadId}.${ordinal}`;
  return `event.${shortHash({ ordinal, event })}`;
}

function valueMark(value: unknown): Mark {
  return mark(value);
}

type TraceTerm = TraceCellReading["subject"] | TraceCellReading["predicate"] | TraceCellReading["object"];

function traceTermValue(input: Exclude<TraceTerm, string | undefined>): unknown {
  return input.value;
}

function termValue(input: TraceTerm): unknown {
  if (input === undefined) return undefined;
  return typeof input === "string" ? input : traceTermValue(input);
}

function termPath(input: Exclude<TraceTerm, undefined>): readonly string[] {
  if (typeof input === "string") return Object.freeze(input.split(".").filter((part) => part.length > 0));
  return Object.freeze(["mark", shortHash(traceTermValue(input))]);
}

function predicateText(input: Exclude<TraceTerm, undefined>): string {
  return typeof input === "string" ? input : stableJson(traceTermValue(input));
}

function provenance(run: string, ordinal: number, event: CodexExecEvent): Readonly<Record<string, unknown>> {
  return Object.freeze({ source: "codex.exec.json", run, ordinal, type: event.type });
}

function entry(
  subject: string,
  predicate: string,
  object: string | Mark,
  provenanceValue: unknown,
): TraceEntry {
  return Object.freeze({ subject, predicate, object, provenance: provenanceValue });
}

function traceObjectValue(object: string | Mark): unknown {
  return typeof object === "string" ? object : object.value;
}

function utterTrace(entries: readonly TraceEntry[]): readonly UtteranceCarrier[] {
  return Object.freeze(entries.map((item) => utterance(
    mark(Object.freeze({
      subject: item.subject,
      object: traceObjectValue(item.object),
    })),
    mark(item.predicate),
  )));
}

function foldTrace(entries: readonly TraceEntry[]): readonly TraceCellReading[] {
  return Object.freeze(entries.map((item) => Object.freeze({
    subject: item.subject,
    predicate: item.predicate,
    object: item.object,
    value: "potential" as const,
    provenance: item.provenance,
  })));
}

function maybeStringEntry(
  entries: TraceEntry[],
  subject: string,
  predicate: string,
  object: unknown,
  provenanceValue: unknown,
): void {
  if (typeof object === "string" && object.length > 0) {
    entries.push(entry(subject, predicate, object, provenanceValue));
  }
}

function itemEntries(
  entries: TraceEntry[],
  eventTerm: string,
  item: Record<string, unknown>,
  provenanceValue: unknown,
): void {
  const term = itemTerm(item);
  entries.push(entry(eventTerm, "codex.exec.event.has-item", term, provenanceValue));
  maybeStringEntry(entries, term, "codex.item.has-type", item["type"], provenanceValue);
  maybeStringEntry(entries, term, "codex.item.has-status", item["status"], provenanceValue);
  maybeStringEntry(entries, term, "codex.item.ran-command", item["command"], provenanceValue);
  maybeStringEntry(entries, term, "codex.item.has-text", item["text"], provenanceValue);
  const raw = Object.freeze({ ...item });
  entries.push(entry(term, "codex.item.has-raw", valueMark(raw), provenanceValue));
}

function itemId(item: Record<string, unknown>): string {
  const id = item["id"];
  return typeof id === "string" && id.length > 0 ? id : shortHash(item);
}

function itemTerm(item: Record<string, unknown>): string {
  return `codex.item.${itemId(item)}`;
}

function codexWorkStatus(status: unknown, eventType: string): WorkStatus {
  const value = typeof status === "string" ? status.toLowerCase() : "";
  if (value === "completed" || value === "succeeded" || eventType.endsWith(".completed")) return charge(chargeValue("potential"));
  if (value === "failed" || value === "errored" || value === "error" || eventType.endsWith(".failed")) return charge(chargeValue("stable"));
  if (value === "cancelled" || value === "canceled") return charge(chargeValue("absurd"));
  if (value === "queued" || value === "pending") return charge(chargeValue("active"));
  if (value === "in_progress" || value === "running" || eventType.endsWith(".started")) return charge(chargeValue("active"));
  return charge(chargeValue("active"));
}

function eventStamp(event: CodexExecEvent): string | undefined {
  const stamp = event["timestamp"] ?? event["created_at"] ?? event["createdAt"] ?? event["at"];
  return typeof stamp === "string" && stamp.length > 0 ? stamp : undefined;
}

function isCommandItem(item: Record<string, unknown>): boolean {
  return item["type"] === "command_execution" || typeof item["command"] === "string";
}

export function codexExecTraceEntries(
  events: readonly CodexExecEvent[],
  options: { readonly run?: string } = {},
): readonly TraceEntry[] {
  const run = eventRun(events, options.run);
  const runTerm = `codex.exec.${run}`;
  const entries: TraceEntry[] = [];
  for (const [ordinal, event] of events.entries()) {
    const eventTerm = `${runTerm}.${eventId(event, ordinal)}`;
    const p = provenance(run, ordinal, event);
    entries.push(entry(runTerm, "codex.exec.has-event", eventTerm, p));
    entries.push(entry(eventTerm, "codex.exec.event.has-type", event.type, p));
    maybeStringEntry(entries, eventTerm, "codex.exec.event.in-thread", event["thread_id"] ?? event["threadId"], p);
    maybeStringEntry(entries, eventTerm, "codex.exec.event.in-turn", event["turn_id"] ?? event["turnId"], p);
    const item = event["item"];
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      itemEntries(entries, eventTerm, item as Record<string, unknown>, p);
    }
    const usage = event["usage"];
    if (typeof usage === "object" && usage !== null && !Array.isArray(usage)) {
      entries.push(entry(eventTerm, "codex.exec.event.has-usage", valueMark(Object.freeze({ ...(usage as Record<string, unknown>) })), p));
    }
  }
  return Object.freeze(entries);
}

export function codexExecFindings(
  trace: Pick<CodexExecTraceCarrier, "run" | "readings">,
  options: { readonly session?: string } = {},
): readonly Finding[] {
  const session = options.session ?? `codex.exec.${trace.run}`;
  return Object.freeze(trace.readings.map((reading) =>
    finding({
      session,
      subject: termPath(reading.subject),
      predicate: predicateText(reading.predicate),
      charge: charge(chargeValue(reading.value)),
      ...(reading.object === undefined ? {} : { object: termValue(reading.object) }),
      note: Object.freeze({
        source: "codex.exec.trace",
        run: trace.run,
        provenance: reading.provenance,
      }),
    })
  ));
}

export function codexExecWorkItems(
  events: readonly CodexExecEvent[],
  options: { readonly run?: string; readonly office?: string } = {},
): readonly WorkItem[] {
  const run = eventRun(events, options.run);
  const office = options.office ?? "codex";
  const latest = new Map<string, { item: Record<string, unknown>; event: CodexExecEvent; ordinal: number }>();
  for (const [ordinal, event] of events.entries()) {
    const item = event["item"];
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (!isCommandItem(record)) continue;
    latest.set(itemId(record), { item: record, event, ordinal });
  }
  return Object.freeze([...latest.entries()].map(([id, record]) => {
    return commandWorkItem(run, office, id, record.item, record.event, record.ordinal);
  }));
}

export function codexExecWorkReports(
  events: readonly CodexExecEvent[],
  options: { readonly run?: string; readonly office?: string } = {},
): readonly WorkReport[] {
  const run = eventRun(events, options.run);
  const office = options.office ?? "codex";
  const reports: WorkReport[] = [];
  for (const [ordinal, event] of events.entries()) {
    const item = event["item"];
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (!isCommandItem(record)) continue;
    const id = itemId(record);
    const status = codexWorkStatus(record["status"], event.type);
    const at = eventStamp(event);
    reports.push(workReport({
      term: term(["codex", "report", run, id, ordinal]),
      work: commandWorkItem(run, office, id, record, event, ordinal),
      office: officeTerm(office),
      charge: status,
      ...(at === undefined ? {} : { at: term(["at", at]) }),
      evidence: Object.freeze([
        term(itemTerm(record)),
        term(["codex", "exec", "event", event.type]),
        term(["codex", "exec", "ordinal", ordinal]),
      ]),
    }));
  }
  return Object.freeze(reports);
}

export function codexExecUsageCostEvents(
  events: readonly CodexExecEvent[],
  options: { readonly run?: string; readonly transactionTime: string } ,
): readonly CostEvent[] {
  const run = eventRun(events, options.run);
  const costs: CostEvent[] = [];
  for (const [ordinal, event] of events.entries()) {
    const usage = recordValue(event["usage"]);
    if (usage === null) continue;
    const input = usageTokenCount(usage, ["input_tokens", "prompt_tokens", "inputTokens", "promptTokens"]) ?? 0;
    const output = usageTokenCount(usage, ["output_tokens", "completion_tokens", "outputTokens", "completionTokens"]) ?? 0;
    const total = usageTokenCount(usage, ["total_tokens", "totalTokens"]);
    const tokens = total === undefined || input + output > 0
      ? { input, output }
      : { input: total, output: 0 };
    if (tokens.input + tokens.output <= 0) continue;
    costs.push(Object.freeze({
      id: `cost:codex-exec:${run}:${ordinal}`,
      operation: "codex-exec",
      endpoint: "openai",
      ...(stringValue(usage["model"]) === undefined ? {} : { model: stringValue(usage["model"])! }),
      settlementFuel: 0,
      dollars: moneyValue(usage["costUsd"] ?? usage["cost_usd"] ?? usage["usd"]),
      tokens,
      transactionTime: eventStamp(event) ?? options.transactionTime,
      evidence: Object.freeze([
        `codex.exec.${run}.event.${ordinal}`,
        `codex.exec.event.${event.type}`,
      ]),
    }));
  }
  return Object.freeze(costs);
}

function commandWorkItem(
  run: string,
  office: string,
  id: string,
  item: Record<string, unknown>,
  event: CodexExecEvent,
  ordinal: number,
): WorkItem {
  const command = typeof item["command"] === "string" ? item["command"] : undefined;
  const task = workTask({
    term: term(["codex", "task", run, id]),
    goals: Object.freeze([
      cell(
        term(["codex", "exec", run, "item", id]),
        predicate(["codex", "item", "execute"]),
        term(command === undefined ? itemTerm(item) : ["shell-command", command]),
      ),
    ]),
    evidence: Object.freeze([
      term(itemTerm(item)),
      term(["codex", "exec", "source", "json"]),
      ...(command === undefined ? [] : [term(["shell-command", command])]),
      ...(typeof item["type"] === "string" ? [term(["codex", "item", "type", item["type"]])] : []),
    ]),
  });
  return workItem({
    term: term(["codex", "work", run, id]),
    task,
    office: officeTerm(office),
    evidence: Object.freeze([
      term(itemTerm(item)),
      term(["codex", "exec", "event", event.type]),
      term(["codex", "exec", "ordinal", ordinal]),
    ]),
  });
}

function term(value: unknown): PredicationTerm {
  return token(mark(value));
}

function predicate(value: unknown): PredicationPredicate {
  return predicateOfClaim(claim(mark(value)));
}

function officeTerm(office: string): PredicationTerm {
  return term(["office", office]);
}

function workTask(input: Omit<CodexWorkTask, "kind">): CodexWorkTask {
  return Object.freeze({ kind: "codex.exec.work.task" as const, ...input });
}

function workItem(input: Omit<CodexWorkItem, "kind">): CodexWorkItem {
  return Object.freeze({ kind: "codex.exec.work.item" as const, ...input });
}

function workReport(input: Omit<CodexWorkReport, "kind">): CodexWorkReport {
  return Object.freeze({ kind: "codex.exec.work.report" as const, ...input });
}

export function codexExecTrace(
  events: readonly CodexExecEvent[],
  options: { readonly run?: string } = {},
): CodexExecTraceCarrier {
  const run = eventRun(events, options.run);
  const entries = codexExecTraceEntries(events, { run });
  const utterances = utterTrace(entries);
  const readings = foldTrace(entries);
  return Object.freeze({
    kind: "codex.exec.trace" as const,
    run,
    events: Object.freeze([...events]),
    entries,
    utterances,
    readings,
    findings: codexExecFindings({ run, readings }),
    work: codexExecWorkItems(events, { run }),
    reports: codexExecWorkReports(events, { run }),
  });
}

function recordValue(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function usageTokenCount(usage: Readonly<Record<string, unknown>>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = usage[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  }
  return undefined;
}

function moneyValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value * 1_000_000) / 1_000_000
    : 0;
}

export function parseCodexExecTraceJsonl(
  input: string,
  options: { readonly run?: string } = {},
): CodexExecTraceCarrier {
  return codexExecTrace(parseCodexExecJsonl(input), options);
}
