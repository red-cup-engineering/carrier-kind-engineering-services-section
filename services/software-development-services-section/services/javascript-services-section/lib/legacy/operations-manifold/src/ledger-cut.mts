/**
 * Ledger cut — the record tier (log → state → record), non-destructive.
 *
 * relating-experimental's three-tier discipline: the append-only EAVT log is the
 * boundary, the JSON state is the current view folded from it, and the record is
 * the settled, compacted tier. The manifold already keeps log + state; this adds
 * the record as a *compact projection at rest*: each state entry stripped of its
 * bulky payload (raw notes, value blobs) down to the structural facts a reader or
 * statusLine actually needs. It is the same "push over-budget operations toward a
 * compact projection" pressure the budget-guard applies live, realized at rest.
 *
 * It is deliberately NON-destructive: it writes data/record/<feed>.jsonl and
 * never rewrites the append-only log. Pruning the log to its kept rows is a
 * separate operation that must pause the live service first, since the systemd
 * deployment appends to the same log and a concurrent rewrite would lose events.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { writeFileAtomic } from "@emsenn/relating/ledger";

import { operationsManifoldLogPath, operationsManifoldRecordPath, operationsManifoldStatePath } from "./package-surface.mts";
import { isRecord, optionalText } from "./records.mts";
import type { JsonValue } from "@emsenn/relating/writing";

export type LedgerCutParams = Readonly<{ feed?: string | undefined; q?: string | undefined }>;

export type LedgerCutResult = Readonly<{
  kind: "operations-manifold.ledger.cut";
  feed: string;
  record: string;
  entries: number;
  logBytes: number;
  stateBytes: number;
  recordBytes: number;
  shrinkVsState: number;
  note: string;
}>;

const KNOWN_FEEDS = Object.freeze(["operations", "work", "messages", "codex-findings", "recognition"]);

/** Per-feed: where the array of entries lives in the snapshot, and the compactor. */
const COMPACTORS: Readonly<Record<string, Readonly<{ array: string; compact: (entry: Readonly<Record<string, JsonValue>>) => JsonValue }>>> = Object.freeze({
  operations: { array: "entries", compact: (e) => pick(e, ["id", "at", "event", "trace", "tool", "paths", "tokens", "estimatedTokens", "budgetBand", "score"]) },
  work: { array: "items", compact: (e) => pick(e, ["id", "title", "status", "workKind", "workStatus", "gate", "session", "owner", "updatedAt", "completedAt", "outcome"]) },
  "codex-findings": { array: "findings", compact: (e) => pick(e, ["id", "at", "session", "subjectKey", "predicate", "charge", "focus"]) },
  messages: { array: "messages", compact: (e) => pick(e, ["messageId", "at", "channel", "role", "speaker", "status", "session", "estimatedTokens"]) },
});

export async function cutLedger(repoRoot: string, params: LedgerCutParams = {}): Promise<LedgerCutResult> {
  const feed = optionalText(params.feed ?? params.q) ?? "operations";
  if (!KNOWN_FEEDS.includes(feed) && COMPACTORS[feed] === undefined) {
    throw new TypeError(`unknown ledger feed for cut: ${feed} (known: ${Object.keys(COMPACTORS).join(", ")})`);
  }
  const statePath = path.join(repoRoot, operationsManifoldStatePath(feed));
  const logPath = path.join(repoRoot, operationsManifoldLogPath(feed));
  const recordRel = operationsManifoldRecordPath(feed);
  const recordPath = path.join(repoRoot, recordRel);

  const stateRaw = await readFile(statePath, "utf8");
  const snapshot = JSON.parse(stateRaw) as JsonValue;
  const compactor = COMPACTORS[feed] ?? { array: "entries", compact: (e: Readonly<Record<string, JsonValue>>) => e as JsonValue };
  const arrayValue = isRecord(snapshot) ? snapshot[compactor.array] : undefined;
  const entries: readonly JsonValue[] = Array.isArray(arrayValue) ? arrayValue : [];
  const compactLines = entries
    .filter(isRecord)
    .map((entry) => JSON.stringify(compactor.compact(entry)))
    .join("\n");
  const recordText = compactLines === "" ? "" : `${compactLines}\n`;
  writeFileAtomic(recordPath, recordText);

  const logBytes = await byteSizeOf(logPath);
  const stateBytes = Buffer.byteLength(stateRaw, "utf8");
  const recordBytes = Buffer.byteLength(recordText, "utf8");
  return Object.freeze({
    kind: "operations-manifold.ledger.cut" as const,
    feed,
    record: recordRel,
    entries: entries.length,
    logBytes,
    stateBytes,
    recordBytes,
    shrinkVsState: stateBytes === 0 ? 0 : Math.round((1 - recordBytes / stateBytes) * 1000) / 1000,
    note: "non-destructive: record written, append-only log untouched (prune requires pausing the live service)",
  });
}

function pick(entry: Readonly<Record<string, JsonValue>>, keys: readonly string[]): JsonValue {
  const out: Record<string, JsonValue> = {};
  for (const key of keys) {
    if (entry[key] !== undefined) out[key] = entry[key];
  }
  return out;
}

async function byteSizeOf(file: string): Promise<number> {
  try {
    return Buffer.byteLength(await readFile(file, "utf8"), "utf8");
  } catch {
    return 0;
  }
}
