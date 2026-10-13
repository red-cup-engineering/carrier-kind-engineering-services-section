// Runtime action feed-readout folds journal selections into feed standing and promotion readouts.
// It owns no files: durable source rows stay in journal, and materialized artifacts are delegated to project/profile.
import { operation, type Operation } from "../rpc/index.mts";
import { parseArtifactStem } from "../lib/addressing/index.mts";
import { feedTokenFamilyMember } from "../agents/addressing/feed-token.mts";
import { pathExists } from "../lib/filesystem/index.mts";
import { openJournal, journal, type JournalFeed } from "./journal.mts";
import { claimSessionFeed, claimSessionStatementRows } from "../claims/session.mts";
import { obsticulationObservationsOfFeedEntropy } from "../work/obligations.mts";
import {
  projectRecordPathContent,
  statementLogInformationPath,
} from "../integrations/filesystem/services/journal-projections.mts";
import { commitClaudeSessionSuitLogRecord } from "../integrations/filesystem/services/agent-context.mts";
import type { FilesystemBinding } from "../integrations/filesystem/services/read-write.mts";
import type { JsonValue } from "../lib/codecs/json/core.mts";
import { feedEntropyCharge } from "../lib/records/persistence.mts";

const FEED_ENTROPY_BOUND_BYTES_PER_UNIT = 4096;

interface FeedEntropyEntry {
  readonly feed: string;
  readonly bytesOnDisk: number;
  readonly entropyUnits: number;
  readonly bytesPerEntropyUnit?: number;
  readonly charge: ReturnType<typeof feedEntropyCharge>;
}

function operationDate(binding: FilesystemBinding, input: unknown): string {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const date = (input as Readonly<Record<string, JsonValue>>)["date"];
    if (typeof date === "string" && date.length > 0) return date;
  }
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

function operationId(input: unknown): string | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const id = (input as Readonly<Record<string, JsonValue>>)["id"];
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export function feedEntropyLogFiles(root: string, date: string): readonly { readonly feed: string; readonly path: JournalFeed }[] {
  const feeds = journal.listFeeds(root, date).flatMap((log) => {
    const stem = log.name.slice(0, -".jsonl".length);
    const parsed = parseArtifactStem(stem);
    if (parsed === null || parsed.act !== "admit") return [];
    return [Object.freeze({ feed: parsed.token, path: log })];
  });
  return Object.freeze([...feeds].sort((left, right) => left.feed.localeCompare(right.feed)));
}

export function feedEntropyCensus(root: string, date: string): { readonly bound: number; readonly feeds: readonly FeedEntropyEntry[] } {
  const bound = FEED_ENTROPY_BOUND_BYTES_PER_UNIT;
  const feeds = feedEntropyLogFiles(root, date).map(({ feed, path: logPath }) => {
    const bytesOnDisk = journal.sourceStatus(logPath).bytes;
    const { entropyUnits } = statementLogInformationPath(logPath.artifact);
    const bytesPerEntropyUnit = entropyUnits === 0 ? undefined : bytesOnDisk / entropyUnits;
    const charge = feedEntropyCharge(bytesOnDisk, entropyUnits, bound);
    return Object.freeze({ feed, bytesOnDisk, entropyUnits, ...(bytesPerEntropyUnit === undefined ? {} : { bytesPerEntropyUnit }), charge });
  });
  return Object.freeze({ bound, feeds: Object.freeze(feeds) });
}

function feedEntropyOverBound(root: string, date: string): readonly { readonly feed: string; readonly bytesOnDisk: number; readonly entropyUnits: number; readonly bytesPerEntropyUnit: number; readonly bound: number }[] {
  const { bound, feeds } = feedEntropyCensus(root, date);
  return feeds
    .filter((feed) => feed.charge === "denied" && feed.bytesPerEntropyUnit !== undefined)
    .map((feed) => Object.freeze({
      feed: feed.feed,
      bytesOnDisk: feed.bytesOnDisk,
      entropyUnits: feed.entropyUnits,
      bytesPerEntropyUnit: feed.bytesPerEntropyUnit as number,
      bound,
    }));
}

export function readFeedProjection(root: string, date: string, feedName: string): JsonValue | undefined {
  const logPath = journal.feed(root, feedName, date, { subject: feedName });
  if (!journal.sourceStatus(logPath).exists) return undefined;
  return journal.readState(logPath.artifact) as unknown as JsonValue;
}

export function readFeedEntropyReadout(root: string, date: string): JsonValue {
  const { bound, feeds } = feedEntropyCensus(root, date);
  return Object.freeze({
    kind: "metroplat.holography.feed-entropy-settlement",
    root,
    date,
    bound,
    feeds,
    obstructedFeeds: feeds.filter((entry) => entry.charge === "denied").length,
  }) as unknown as JsonValue;
}

export function admitFeedEntropyObstructions(binding: FilesystemBinding, date: string): JsonValue {
  const overBound = feedEntropyOverBound(binding.dataRoot, date);
  if (overBound.length === 0) return Object.freeze({ kind: "metroplat.holography.feed-entropy-admit", appended: 0 }) as unknown as JsonValue;
  const observations = obsticulationObservationsOfFeedEntropy(overBound, {
    source: `${date}-settle-feed-entropy.json`,
    settlementToken: "feed-entropy",
  });
  const rows = observations.flatMap((observation) => claimSessionStatementRows(observation));
  const admission = openJournal(binding.dataRoot).appendRows(claimSessionFeed.name, rows, {
    at: date,
    ...(binding.rootName === undefined ? {} : { rootName: binding.rootName }),
    subject: "work-ledger",
    caller: Object.freeze({ transport: "feed-entropy-obsticulation", action: "feed-entropy-admit" }),
  });
  return Object.freeze({ kind: "metroplat.holography.feed-entropy-admit", appended: admission.appended }) as unknown as JsonValue;
}

export function readPlatePromotionReadout(binding: FilesystemBinding, date: string): JsonValue | undefined {
  const dateStatus = journal.dateStatus(binding.dataRoot, date);
  if (!dateStatus.exists) return undefined;
  const identitySidecars = dateStatus.legacyIdentitySidecars;

  const feeds = journal.listFeeds(binding.dataRoot, date).flatMap((log) => {
    const stem = log.name.slice(0, -".jsonl".length);
    const parsed = parseArtifactStem(stem);
    return parsed === null || parsed.act !== "admit" ? [] : [Object.freeze({ feed: parsed.token, logPath: log, sourceName: log.name })];
  });

  const perFeed: Record<string, JsonValue> = {};
  let totalLogRows = 0;
  let statePresent = 0;
  let stateAbsent = 0;
  let recordRows = 0;
  let recordAbsent = 0;
  let contentDocuments = 0;
  let contentAbsent = 0;
  let obstructed = 0;

  for (const { feed, logPath, sourceName } of feeds) {
    const obstructions: string[] = [];
    const logBytes = journal.sourceStatus(logPath).bytes;
    let logRows: number | null = null;
    let parsed = false;
    let malformedRows = 0;

    try {
      const folded = journal.scan(logPath, undefined, (_accum, _row) => undefined);
      parsed = true;
      logRows = folded.rows;
      malformedRows = folded.malformed;
      totalLogRows += folded.rows;
      if (folded.malformed > 0) obstructions.push(`log: ${folded.malformed} malformed source row${folded.malformed === 1 ? "" : "s"}`);
    } catch (error) {
      obstructions.push(`log: ${error instanceof Error ? error.message : String(error)}`);
    }

    const statePath = journal.projectPath(logPath, "state", "json");
    const state = pathExists(statePath) ? "present" : "absent";
    if (state === "present") statePresent += 1;
    else stateAbsent += 1;

    let record: number | "absent" = "absent";
    if (parsed && feedTokenFamilyMember(feed)?.family === "claude-session") {
      try {
        record = commitClaudeSessionSuitLogRecord(logPath.artifact, feed, sourceName);
        recordRows += record;
      } catch (error) {
        recordAbsent += 1;
        obstructions.push(`commit: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (parsed) {
      try {
        record = journal.projectRecord(logPath.artifact).datoms;
        recordRows += record;
      } catch (error) {
        recordAbsent += 1;
        obstructions.push(`commit: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      recordAbsent += 1;
    }

    let content: number | "absent" = "absent";
    if (record === "absent") {
      contentAbsent += 1;
    } else {
      try {
        const recordPath = journal.projectPath(logPath, "record", "jsonl");
        content = projectRecordPathContent(recordPath).documents;
        contentDocuments += content;
      } catch (error) {
        contentAbsent += 1;
        obstructions.push(`realize: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (obstructions.length > 0) obstructed += 1;
    perFeed[feed] = Object.freeze({
      feed,
      logBytes,
      logRows,
      malformedRows,
      state,
      record,
      content,
      ...(obstructions.length === 0 ? {} : { obstruction: obstructions.join("; ") }),
    }) as unknown as JsonValue;
  }

  return Object.freeze({
    kind: "metroplat.holography.plate-promotion-settlement",
    date,
    feeds: Object.freeze(perFeed),
    totals: Object.freeze({
      feeds: feeds.length,
      identitySidecars,
      logRows: totalLogRows,
      statePresent,
      stateAbsent,
      recordRows,
      recordAbsent,
      contentDocuments,
      contentAbsent,
      obstructed,
    }),
  }) as unknown as JsonValue;
}

export function feedReadoutOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "feed-settlement",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Settle one recorded feed log.",
      description: "Domain: { date?, id }. id names the feed token after the date-admit- prefix.",
      run: (input: unknown): unknown => {
        const id = operationId(input);
        return id === undefined ? null : readFeedProjection(binding.dataRoot, operationDate(binding, input), id) ?? null;
      },
    }),
    operation({
      verb: "feed-entropy",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read recorded feed entropy for a date.",
      description: "Domain: { date? }. Folds every recorded admit-feed source for the date into entropy and obstruction charge readings.",
      run: (input: unknown): unknown => readFeedEntropyReadout(binding.dataRoot, operationDate(binding, input)),
    }),
    operation({
      verb: "feed-entropy-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit over-bound feed entropy obstructions.",
      description: "Domain: { date? }. Writes work-ledger observations for feed entropy readings charged stable.",
      run: (input: unknown): unknown => admitFeedEntropyObstructions(binding, operationDate(binding, input)),
    }),
    operation({
      verb: "plate-promotion",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Promote recorded source feeds through plate tiers.",
      description: "Domain: { date? }. Runs log-to-record and record-to-content projections for every admitted source feed on a date.",
      run: (input: unknown): unknown => readPlatePromotionReadout(binding, operationDate(binding, input)) ?? null,
    }),
  ]);
}
