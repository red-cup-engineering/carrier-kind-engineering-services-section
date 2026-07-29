import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { canonical, type EAVT, type JsonValue } from "@emsenn/relating/writing";

import { agenticReadiness } from "./agentic-readiness.mts";
import { contextControl } from "./operating/contextualizing/suiting/library/context-control.mts";
import { operationsManifoldGoals } from "./goals.mts";
import {
  appendEavtLog,
  ensureEavtLogStateDirs,
  operationsManifoldEavtLogState,
  readEavtLog,
  writeJsonState,
  type EavtLogStatePaths,
} from "./operating/recording/events/stating/library/eavt-log-state.mts";
import { operationsLedger } from "./operating/recording/operations/ledgering/library/operation-ledger.mts";
import { hash, isRecord, optionalText, slug, stringOf } from "./records.mts";
import { operationsManifoldWork } from "./work-management.mts";

const CHECKPOINT_LOG_STATE: EavtLogStatePaths = operationsManifoldEavtLogState("createCheckpoints");
const CHECKPOINT_LOG_RELATIVE = CHECKPOINT_LOG_STATE.log;
const CHECKPOINT_STATE_RELATIVE = CHECKPOINT_LOG_STATE.state;

export type CheckpointParams = Readonly<{
  detail?: string | undefined;
  id?: string | undefined;
  label?: string | undefined;
  q?: string | undefined;
  reason?: string | undefined;
  source?: string | undefined;
}>;

export type CheckpointFileWitness = Readonly<{
  path: string;
  exists: boolean;
  bytes: number;
  sha256: string | null;
}>;

export type CheckpointRecord = Readonly<{
  kind: "operations-manifold.createCheckpoint.record";
  id: string;
  eventId: string;
  at: string;
  label: string;
  reason: string;
  source: string;
  flow: readonly ["data/logs", "function-run", "data/state", "stdout-json"];
  counts: Readonly<{
    goals: number;
    work: number;
    context: number;
    operations: number;
    readinessScore: number;
  }>;
  files: readonly CheckpointFileWitness[];
}>;

export type CheckpointFileSummary = Readonly<{
  path: string;
  exists: boolean;
  bytes: number;
  sha256Prefix: string | null;
}>;

export type CheckpointRecordSummary = Readonly<{
  kind: "operations-manifold.createCheckpoint.record-summary";
  id: string;
  eventId: string;
  at: string;
  label: string;
  reason: string;
  source: string;
  counts: CheckpointRecord["counts"];
  files: readonly CheckpointFileSummary[];
  fileSummary: Readonly<{
    total: number;
    existing: number;
    missing: number;
    bytes: number;
  }>;
}>;

export type CheckpointSnapshot = Readonly<{
  kind: "operations-manifold.createCheckpoints.snapshot";
  generatedAt: string;
  log: string;
  state: string;
  eventCount: number;
  latest: string | null;
  createCheckpoints: readonly CheckpointRecord[];
}>;

export type CheckpointResult = Readonly<{
  kind: "operations-manifold.createCheckpoint";
  accepted: true;
  createCheckpoint: CheckpointRecord;
  eavtJsonl: string;
  snapshot: CheckpointSnapshot;
}>;

type ReplayReadingCommon = Readonly<{
  kind: "operations-manifold.replayCheckpoint";
  generatedAt: string;
  log: string;
  state: string;
  createCheckpointCount: number;
  stateless: Readonly<{
    claim: "state is externalized through JSONL logs and JSON state files";
    memoryScope: "one function run";
    transport: "package-bin-json";
  }>;
}>;

export type ReplayReadingSummary = ReplayReadingCommon & Readonly<{
  detail: "summary";
  selected: CheckpointRecordSummary | null;
  current: CheckpointRecordSummary;
  deltas: readonly ReplayDeltaSummary[];
}>;

export type ReplayReadingFull = ReplayReadingCommon & Readonly<{
  detail: "full";
  selected: CheckpointRecord | null;
  current: CheckpointRecord;
  deltas: readonly ReplayDelta[];
}>;

export type ReplayReading = ReplayReadingSummary | ReplayReadingFull;

export type ReplayDelta = Readonly<{
  path: string;
  status: "unchanged" | "changed" | "new" | "missing";
  before: string | null;
  after: string | null;
}>;

export type ReplayDeltaSummary = Readonly<{
  path: string;
  status: ReplayDelta["status"];
  beforeSha256Prefix: string | null;
  afterSha256Prefix: string | null;
}>;

export async function createCheckpoint(repoRoot: string, params: CheckpointParams = {}): Promise<CheckpointResult> {
  await ensureCheckpointDirs(repoRoot);
  const record = await createCheckpointRecord(repoRoot, params);
  const event: EAVT = Object.freeze([
    record.id,
    "operations-manifold.createCheckpoint.recorded",
    record as unknown as JsonValue,
    Object.freeze({ at: record.at, eventId: record.eventId }) as JsonValue,
  ]);
  const eavtJsonl = await appendEavtLog(repoRoot, CHECKPOINT_LOG_STATE, [event]);
  const snapshot = await refreshCheckpoints(repoRoot);
  return Object.freeze({
    kind: "operations-manifold.createCheckpoint" as const,
    accepted: true as const,
    createCheckpoint: record,
    eavtJsonl,
    snapshot,
  });
}

export async function replayCheckpoint(repoRoot: string, params: CheckpointParams = {}): Promise<ReplayReading> {
  const [snapshot, current] = await Promise.all([
    createCheckpoints(repoRoot),
    createCheckpointRecord(repoRoot, { ...params, label: optionalText(params.label ?? params.q) ?? "replayCheckpoint-current", source: "operations-manifold.replayCheckpoint" }),
  ]);
  const selected = selectedCheckpoint(snapshot, optionalText(params.id));
  const deltas = Object.freeze(deltasFor(selected, current));
  const common = Object.freeze({
    kind: "operations-manifold.replayCheckpoint" as const,
    generatedAt: new Date().toISOString(),
    log: snapshot.log,
    state: snapshot.state,
    createCheckpointCount: snapshot.createCheckpoints.length,
    stateless: Object.freeze({
      claim: "state is externalized through JSONL logs and JSON state files" as const,
      memoryScope: "one function run" as const,
      transport: "package-bin-json" as const,
    }),
  });
  if (checkpointDetail(params.detail) === "full") {
    return Object.freeze({
      ...common,
      detail: "full" as const,
      selected,
      current,
      deltas,
    });
  }
  return Object.freeze({
    ...common,
    detail: "summary" as const,
    selected: selected === null ? null : summarizeCheckpointRecord(selected),
    current: summarizeCheckpointRecord(current),
    deltas: summarizeReplayDeltas(deltas),
  });
}

export async function createCheckpoints(repoRoot: string): Promise<CheckpointSnapshot> {
  await ensureCheckpointDirs(repoRoot);
  return refreshCheckpoints(repoRoot);
}

export async function refreshCheckpoints(repoRoot: string): Promise<CheckpointSnapshot> {
  const events = await readCheckpointLog(repoRoot);
  const snapshot = foldCheckpointEvents(events);
  await writeJsonState(repoRoot, CHECKPOINT_LOG_STATE, snapshot, canonicalJsonState);
  return snapshot;
}

async function createCheckpointRecord(repoRoot: string, params: CheckpointParams): Promise<CheckpointRecord> {
  const at = new Date().toISOString();
  const label = optionalText(params.label ?? params.q) ?? "createCheckpoint";
  const reason = optionalText(params.reason) ?? "stateless package-bin JSON createCheckpoint";
  const source = optionalText(params.source) ?? "operations-manifold.createCheckpoint";
  const [goals, work, context, operations, readiness] = await Promise.all([
    operationsManifoldGoals(repoRoot),
    operationsManifoldWork(repoRoot),
    contextControl(repoRoot),
    operationsLedger(repoRoot),
    Promise.resolve(agenticReadiness(repoRoot)),
  ]);
  const files = await fileWitnesses(repoRoot, [
    goals.log,
    goals.state,
    work.log,
    work.state,
    context.log,
    context.state,
    operations.log,
    operations.state,
    CHECKPOINT_LOG_RELATIVE,
    CHECKPOINT_STATE_RELATIVE,
  ]);
  const seed = { at, label, reason, source, files: files.map((file) => [file.path, file.sha256]) };
  return Object.freeze({
    kind: "operations-manifold.createCheckpoint.record" as const,
    id: `createCheckpoint:${slug(label)}:${hash(seed).slice(0, 16)}`,
    eventId: `createCheckpoint-event:${hash({ seed, label }).slice(0, 24)}`,
    at,
    label,
    reason,
    source,
    flow: Object.freeze(["data/logs", "function-run", "data/state", "stdout-json"] as const),
    counts: Object.freeze({
      goals: goals.eventCount,
      work: work.eventCount,
      context: context.eventCount,
      operations: operations.eventCount,
      readinessScore: readiness.summary.score,
    }),
    files,
  });
}

async function fileWitnesses(repoRoot: string, relativePaths: readonly string[]): Promise<readonly CheckpointFileWitness[]> {
  const unique = [...new Set(relativePaths)].sort();
  return Object.freeze(await Promise.all(unique.map((relativePath) => fileWitness(repoRoot, relativePath))));
}

async function fileWitness(repoRoot: string, relativePath: string): Promise<CheckpointFileWitness> {
  try {
    const bytes = await readFile(path.join(repoRoot, relativePath));
    return Object.freeze({
      path: relativePath,
      exists: true,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return Object.freeze({ path: relativePath, exists: false, bytes: 0, sha256: null });
    }
    throw error;
  }
}

async function readCheckpointLog(repoRoot: string): Promise<readonly EAVT[]> {
  return readEavtLog(repoRoot, CHECKPOINT_LOG_STATE);
}

function foldCheckpointEvents(events: readonly EAVT[]): CheckpointSnapshot {
  const createCheckpoints = events
    .filter((event) => stringOf(event[1]) === "operations-manifold.createCheckpoint.recorded")
    .map((event) => createCheckpointValue(event[2]))
    .filter((record): record is CheckpointRecord => record !== null)
    .sort((left, right) => right.at.localeCompare(left.at));
  return Object.freeze({
    kind: "operations-manifold.createCheckpoints.snapshot" as const,
    generatedAt: new Date().toISOString(),
    log: CHECKPOINT_LOG_RELATIVE,
    state: CHECKPOINT_STATE_RELATIVE,
    eventCount: events.length,
    latest: createCheckpoints[0]?.id ?? null,
    createCheckpoints: Object.freeze(createCheckpoints),
  });
}

function createCheckpointValue(value: JsonValue): CheckpointRecord | null {
  if (!isRecord(value)) return null;
  if (value["kind"] !== "operations-manifold.createCheckpoint.record" || typeof value["id"] !== "string") return null;
  return value as unknown as CheckpointRecord;
}

function selectedCheckpoint(snapshot: CheckpointSnapshot, id: string | null): CheckpointRecord | null {
  if (id === null) return snapshot.createCheckpoints[0] ?? null;
  return snapshot.createCheckpoints.find((item) => item.id === id || item.id.includes(id) || item.label === id) ?? null;
}

function deltasFor(selected: CheckpointRecord | null, current: CheckpointRecord): readonly ReplayDelta[] {
  if (selected === null) {
    return Object.freeze(current.files.map((file) => Object.freeze({
      path: file.path,
      status: file.exists ? "new" as const : "missing" as const,
      before: null,
      after: file.sha256,
    })));
  }
  const before = new Map(selected.files.map((file) => [file.path, file]));
  return Object.freeze(current.files.map((after) => {
    const prior = before.get(after.path);
    const status = prior === undefined
      ? "new"
      : prior.sha256 === after.sha256
        ? "unchanged"
        : after.exists
          ? "changed"
          : "missing";
    return Object.freeze({
      path: after.path,
      status,
      before: prior?.sha256 ?? null,
      after: after.sha256,
    });
  }));
}

function checkpointDetail(value: string | undefined): "summary" | "full" {
  return optionalText(value)?.toLowerCase() === "full" ? "full" : "summary";
}

function summarizeCheckpointRecord(record: CheckpointRecord): CheckpointRecordSummary {
  const existing = record.files.filter((file) => file.exists);
  const missing = record.files.filter((file) => !file.exists);
  return Object.freeze({
    kind: "operations-manifold.createCheckpoint.record-summary" as const,
    id: record.id,
    eventId: record.eventId,
    at: record.at,
    label: record.label,
    reason: record.reason,
    source: record.source,
    counts: record.counts,
    files: Object.freeze(record.files.map(summarizeCheckpointFile)),
    fileSummary: Object.freeze({
      total: record.files.length,
      existing: existing.length,
      missing: missing.length,
      bytes: existing.reduce((sum, file) => sum + file.bytes, 0),
    }),
  });
}

function summarizeCheckpointFile(file: CheckpointFileWitness): CheckpointFileSummary {
  return Object.freeze({
    path: file.path,
    exists: file.exists,
    bytes: file.bytes,
    sha256Prefix: file.sha256?.slice(0, 16) ?? null,
  });
}

function summarizeReplayDeltas(deltas: readonly ReplayDelta[]): readonly ReplayDeltaSummary[] {
  return Object.freeze(deltas.map((delta) => Object.freeze({
    path: delta.path,
    status: delta.status,
    beforeSha256Prefix: delta.before?.slice(0, 16) ?? null,
    afterSha256Prefix: delta.after?.slice(0, 16) ?? null,
  })));
}

function canonicalJsonState(snapshot: unknown): string {
  return canonical(snapshot as JsonValue);
}

async function ensureCheckpointDirs(repoRoot: string): Promise<void> {
  return ensureEavtLogStateDirs(repoRoot, CHECKPOINT_LOG_STATE);
}
