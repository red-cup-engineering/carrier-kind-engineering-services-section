/**
 * Read demand: the files the fleet's sessions read, observed from the harness's own hook events.
 *
 * Every harness admits its PreToolUse events to the day's arrival feed, so which files agents read,
 * and in how many distinct sessions, is measured rather than guessed. Each session that reads a file
 * learned it from scratch; the count of those sessions is the demand anchored knowledge answers.
 *
 * A day's feed only grows, so each call resumes from a checkpointed cursor instead of re-scanning
 * the whole day: a catch-up subscription, not a rescan. The cursor and that day's counts so far are
 * kept at `<dataRoot>/data/state/knowledge/read-demand/YYYY-MM-DD.json`, written atomically so a
 * crash mid-write never leaves a torn checkpoint for the next call to trust.
 */
import path from "node:path";
import { readJsonFile, writeFileAtomic } from "@red-cup-engineering/computer-system-engine/filesystem";
import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { arrivalLogPath, hookEnvelopeOfArrivalRow } from "../run-causal-set.mjs";

/** The harness tools whose use is reading one file into the context. */
const READ_TOOLS = new Set(["Read"]);

/** Where one day's read-demand checkpoint lives under a data root. */
const checkpointPath = (root, date) => path.join(root, "data", "state", "knowledge", "read-demand", `${date}.json`);

/** A day's checkpoint as held on disk, or a fresh one at cursor `0` when there is none yet, or it
 *  does not parse as one -- the same starting point as a first-ever scan of that day. */
function readCheckpoint(root, date) {
  const held = readJsonFile(checkpointPath(root, date));
  const cursor = Number.isSafeInteger(held?.cursor) && held.cursor >= 0 ? held.cursor : 0;
  const files = held?.files !== null && typeof held?.files === "object" && !Array.isArray(held?.files) ? held.files : {};
  return {
    cursor,
    files: new Map(Object.entries(files).map(([target, entry]) => [target, {
      reads: Number.isSafeInteger(entry?.reads) && entry.reads >= 0 ? entry.reads : 0,
      sessions: new Set(Array.isArray(entry?.sessions) ? entry.sessions.filter((id) => typeof id === "string") : []),
    }])),
  };
}

function writeCheckpoint(root, date, cursor, files) {
  writeFileAtomic(checkpointPath(root, date), JSON.stringify({
    cursor,
    files: Object.fromEntries([...files].map(([target, { reads, sessions }]) => [target, { reads, sessions: [...sessions] }])),
  }));
}

/**
 * One day's read demand, folded from its checkpoint: rows already folded by an earlier call are
 * never re-read, only what the feed gained since. A missing feed leaves the checkpoint as it was.
 */
function dayReadDemand(root, date, options) {
  const log = arrivalLogPath(root, date);
  const logDir = path.dirname(log);
  const held = readCheckpoint(root, date);
  let cursor = held.cursor;
  try {
    const scanned = journal.scanFrom(log, cursor, undefined, (_accum, row) => {
      const envelope = hookEnvelopeOfArrivalRow(row, logDir, options);
      if (envelope?.hookEventName !== "PreToolUse" || !READ_TOOLS.has(envelope.toolName)) return undefined;
      const file = envelope.payload?.tool_input?.file_path;
      if (typeof file !== "string" || file === "") return undefined;
      const target = path.resolve(typeof envelope.cwd === "string" ? envelope.cwd : "/", file);
      const seen = held.files.get(target) ?? { reads: 0, sessions: new Set() };
      seen.reads += 1;
      if (typeof envelope.sessionId === "string") seen.sessions.add(envelope.sessionId);
      held.files.set(target, seen);
      return undefined;
    });
    cursor = scanned.position;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (cursor !== held.cursor) writeCheckpoint(root, date, cursor, held.files);
  return held.files;
}

/**
 * The files read in the given days' arrival feeds under a data root, each with its reads and the
 * distinct sessions that read it, most sessions first. A day without a feed contributes nothing.
 */
export function hookReadDemand(root, dates, options = {}) {
  const files = new Map();
  for (const date of dates) {
    for (const [target, seen] of dayReadDemand(root, date, options)) {
      const held = files.get(target) ?? { reads: 0, sessions: new Set() };
      held.reads += seen.reads;
      for (const session of seen.sessions) held.sessions.add(session);
      files.set(target, held);
    }
  }
  return Object.freeze([...files]
    .map(([file, { reads, sessions }]) => Object.freeze({ path: file, reads, sessions: sessions.size }))
    .sort((left, right) => right.sessions - left.sessions || right.reads - left.reads || left.path.localeCompare(right.path)));
}
