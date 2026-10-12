// Runtime action feed-readout folds journal selections into feed standing and promotion readouts.
// It owns no files: durable source rows stay in journal, and materialized artifacts are delegated to project/profile.
import { operation } from "../rpc/operation.mjs";
import { parseArtifactStem } from "@red-cup-engineering/computer-system-engine/addressing/data-artifact-address";
import { feedTokenFamilyMember } from "../agents/addressing/feed-token.mjs";
import { openJournal, journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { claimSessionFeed, claimSessionStatementRows } from "@red-cup-engineering/relating/running/session";
import { obsticulationObservationsOfFeedEntropy } from "@red-cup-engineering/organizing/work/obligations";
import {
  projectRecordPathContent,
  statementLogInformationPath,
} from "../integrations/filesystem/services/journal-projections.mjs";
import { commitClaudeSessionSuitLogRecord } from "../integrations/filesystem/services/agent-context.mjs";

import { feedEntropyCharge } from "@lenticule-science/metrologic/settling/records/persistence";

const FEED_ENTROPY_BOUND_BYTES_PER_UNIT = 4096;

function operationDate(binding, input) {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const date = (input)["date"];
    if (typeof date === "string" && date.length > 0) return date;
  }
  return binding.now().slice(0, 10);
}

function operationId(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const id = (input)["id"];
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export function feedEntropyLogFiles(root, date) {
  const feeds = journal.listFeeds(root, date).flatMap((log) => {
    const stem = log.name.slice(0, -".jsonl".length);
    const parsed = parseArtifactStem(stem);
    if (parsed === null || parsed.act !== "admit") return [];
    return [Object.freeze({ feed: parsed.token, path: log })];
  });
  return Object.freeze([...feeds].sort((left, right) => left.feed.localeCompare(right.feed)));
}

export function feedEntropyCensus(root, date) {
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

function feedEntropyOverBound(root, date) {
  const { bound, feeds } = feedEntropyCensus(root, date);
  return feeds
    .filter((feed) => feed.charge === "denied" && feed.bytesPerEntropyUnit !== undefined)
    .map((feed) => Object.freeze({
      feed: feed.feed,
      bytesOnDisk: feed.bytesOnDisk,
      entropyUnits: feed.entropyUnits,
      bytesPerEntropyUnit: feed.bytesPerEntropyUnit,
      bound,
    }));
}

export function readFeedProjection(root, date, feedName) {
  const logPath = journal.feed(root, feedName, date, { subject: feedName });
  if (!journal.sourceStatus(logPath).exists) return undefined;
  return journal.readState(logPath.artifact);
}

export function readFeedEntropyReadout(root, date) {
  const { bound, feeds } = feedEntropyCensus(root, date);
  return Object.freeze({
    kind: "metroplat.holography.feed-entropy-settlement",
    root,
    date,
    bound,
    feeds,
    obstructedFeeds: feeds.filter((entry) => entry.charge === "denied").length,
  });
}

export function admitFeedEntropyObstructions(binding, date) {
  const overBound = feedEntropyOverBound(binding.dataRoot, date);
  if (overBound.length === 0) return Object.freeze({ kind: "metroplat.holography.feed-entropy-admit", appended: 0 });
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
  return Object.freeze({ kind: "metroplat.holography.feed-entropy-admit", appended: admission.appended });
}

export function readPlatePromotionReadout(binding, date) {
  const dateStatus = journal.dateStatus(binding.dataRoot, date);
  if (!dateStatus.exists) return undefined;
  const identitySidecars = dateStatus.legacyIdentitySidecars;

  const feeds = journal.listFeeds(binding.dataRoot, date).flatMap((log) => {
    const stem = log.name.slice(0, -".jsonl".length);
    const parsed = parseArtifactStem(stem);
    return parsed === null || parsed.act !== "admit" ? [] : [Object.freeze({ feed: parsed.token, logPath: log, sourceName: log.name })];
  });

  const perFeed = {};
  let totalLogRows = 0;
  let statePresent = 0;
  let stateAbsent = 0;
  let recordRows = 0;
  let recordAbsent = 0;
  let contentDocuments = 0;
  let contentAbsent = 0;
  let obstructed = 0;

  for (const { feed, logPath, sourceName } of feeds) {
    const obstructions = [];
    const logBytes = journal.sourceStatus(logPath).bytes;
    let logRows = null;
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
    const state = binding.pathExists(statePath) ? "present" : "absent";
    if (state === "present") statePresent += 1;
    else stateAbsent += 1;

    let record = "absent";
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

    let content = "absent";
    if (record === "absent") {
      contentAbsent += 1;
    } else {
      try {
        const recordPath = journal.projectPath(logPath, "record", "jsonl");
        content = projectRecordPathContent(recordPath, binding).documents;
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
    });
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
  });
}

export function feedReadoutOperations(binding) {
  return Object.freeze([
    operation({
      verb: "feed-settlement",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Settle one recorded feed log.",
      description: "Domain: { date?, id }. id names the feed token after the date-admit- prefix.",
      run: (input) => {
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
      run: (input) => readFeedEntropyReadout(binding.dataRoot, operationDate(binding, input)),
    }),
    operation({
      verb: "feed-entropy-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit over-bound feed entropy obstructions.",
      description: "Domain: { date? }. Writes work-ledger observations for feed entropy readings charged stable.",
      run: (input) => admitFeedEntropyObstructions(binding, operationDate(binding, input)),
    }),
    operation({
      verb: "plate-promotion",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Promote recorded source feeds through plate tiers.",
      description: "Domain: { date? }. Runs log-to-record and record-to-content projections for every admitted source feed on a date.",
      run: (input) => readPlatePromotionReadout(binding, operationDate(binding, input)) ?? null,
    }),
  ]);
}
