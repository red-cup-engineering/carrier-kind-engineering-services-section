import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  codexExecUsageCostEvents,
  parseCodexExecTraceJsonl,
  type CodexExecTraceCarrier,
} from "@emsenn/organizing-with-openai-codex/session/events";
import type { CostEvent } from "@emsenn/organizing-with-llm-agents/algebra";
import { isJsonRecord, parseJson } from "@emsenn/relating/writing";
import { chargeValueName, valueOf } from "@emsenn/relating";

import { boundedInteger } from "../../records.mts";
import { workStatusName } from "../../work-carriers.mts";

type SourceKind = "jsonl" | "file" | "body";

export type CodexExecTraceProjection = Readonly<{
  kind: "operations-manifold.trace-codex-exec";
  generatedAt: string;
  run: string;
  focus?: string;
  source: Readonly<{
    kind: SourceKind;
    file?: string;
  }>;
  summary: Readonly<{
    events: number;
    entries: number;
    utterances: number;
    readings: number;
    findings: number;
    work: number;
    reports: number;
    costs: number;
    statuses: Readonly<Record<string, number>>;
    eventTypes: Readonly<Record<string, number>>;
    truncated: boolean;
  }>;
  trace: Readonly<{
    run: string;
    events: readonly CodexExecTraceCarrier["events"][number][];
    entries: readonly CodexExecTraceCarrier["entries"][number][];
    readings: readonly CodexExecTraceCarrier["readings"][number][];
  }>;
  findings: CodexExecTraceCarrier["findings"];
  work: CodexExecTraceCarrier["work"];
  reports: CodexExecTraceCarrier["reports"];
  costs: readonly CostEvent[];
}>;

export async function codexExecTraceProjectionFromParams(
  repoRoot: string,
  params: Readonly<Record<string, string | undefined>>,
): Promise<CodexExecTraceProjection> {
  const file = params["file"];
  if (file !== undefined && file.length > 0) {
    return codexExecTraceProjection({
      jsonl: await readRepoFile(repoRoot, file),
      source: { kind: "file", file },
      params,
    });
  }
  const jsonl = params["jsonl"];
  if (jsonl === undefined || jsonl.trim().length === 0) {
    throw new TypeError("trace-codex-exec requires either jsonl or file");
  }
  return codexExecTraceProjection({ jsonl, source: { kind: "jsonl" }, params });
}

export function codexExecTraceProjectionFromBody(
  body: string,
  params: Readonly<Record<string, string | undefined>>,
): CodexExecTraceProjection {
  const parsed = parseBody(body);
  const jsonl = typeof parsed === "string" ? parsed : stringField(parsed, "jsonl");
  if (jsonl.trim().length === 0) throw new TypeError("trace-codex-exec body is empty");
  return codexExecTraceProjection({
    jsonl,
    source: { kind: "body" },
    params: {
      ...params,
      ...recordStringFields(parsed),
    },
  });
}

function codexExecTraceProjection(input: {
  readonly jsonl: string;
  readonly source: Readonly<{ kind: SourceKind; file?: string }>;
  readonly params: Readonly<Record<string, string | undefined>>;
}): CodexExecTraceProjection {
  const run = input.params["run"];
  const generatedAt = new Date().toISOString();
  const trace = parseCodexExecTraceJsonl(input.jsonl, run === undefined ? {} : { run });
  const costs = codexExecUsageCostEvents(trace.events, { run: trace.run, transactionTime: generatedAt });
  const limit = boundedInteger(input.params["limit"], { min: 1, max: 500, fallback: 80 });
  const truncated = trace.events.length > limit || trace.entries.length > limit || trace.readings.length > limit;
  return Object.freeze({
    kind: "operations-manifold.trace-codex-exec" as const,
    generatedAt,
    run: trace.run,
    ...(input.params["focus"] === undefined ? {} : { focus: input.params["focus"] }),
    source: Object.freeze({ ...input.source }),
    summary: Object.freeze({
      events: trace.events.length,
      entries: trace.entries.length,
      utterances: trace.utterances.length,
      readings: trace.readings.length,
      findings: trace.findings.length,
      work: trace.work.length,
      reports: trace.reports.length,
      costs: costs.length,
      statuses: statusCounts(trace),
      eventTypes: eventTypeCounts(trace),
      truncated,
    }),
    trace: Object.freeze({
      run: trace.run,
      events: Object.freeze(trace.events.slice(0, limit)),
      entries: Object.freeze(trace.entries.slice(0, limit)),
      readings: Object.freeze(trace.readings.slice(0, limit)),
    }),
    findings: trace.findings,
    work: trace.work,
    reports: trace.reports,
    costs,
  });
}

async function readRepoFile(repoRoot: string, requested: string): Promise<string> {
  const root = path.resolve(repoRoot);
  const full = path.resolve(root, requested);
  if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
    throw new TypeError(`trace-codex-exec file escapes repo root: ${requested}`);
  }
  return readFile(full, "utf8");
}

function parseBody(body: string): string | Record<string, unknown> {
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = parseJson(trimmed);
      if (isJsonRecord(parsed)) return parsed;
    } catch {
      return body;
    }
  }
  return body;
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new TypeError(`trace-codex-exec body requires string ${key}`);
  return value;
}

function recordStringFields(input: string | Record<string, unknown>): Record<string, string> {
  if (typeof input === "string") return {};
  const out: Record<string, string> = {};
  for (const key of ["run", "focus", "limit"]) {
    const value = input[key];
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function statusCounts(trace: CodexExecTraceCarrier): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const item of trace.work) {
    const status = workStatusName(item);
    counts[status] = (counts[status] ?? 0) + 1;
  }
  for (const report of trace.reports) {
    const status = chargeValueName(valueOf(report.charge));
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function eventTypeCounts(trace: CodexExecTraceCarrier): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const event of trace.events) counts[event.type] = (counts[event.type] ?? 0) + 1;
  return Object.freeze(counts);
}
