/** The single behavioral API for MetroPlat's durable event journal. */
import path from "node:path";

import {
  admitEvents,
  appendRowsInternal,
  commitRecordInternal,
  compactJournalStore,
  discoverJournalRoots,
  enclosingJournalRoot,
  feedRevisionInternal,
  foldTerritoryRows,
  journalAdmissionSpan,
  journalDateStatus,
  listDailyFeedsInternal,
  projectDomainRecordInternal,
  projectRecordInternal,
  projectStateInternal,
  readArtifactSource,
  readAdmittedWitness,
  readEventRowsAsOf,
  readEvents,
  readRowEvents,
  readEventsAsOf,
  readJournalHead,
  readStateArtifactInternal,
  readStateInternal,
  scanDailyRowsInternal,
  scanRowsFromInternal,
  positionBeforeInternal,
  scanRowsInternal,
  sourceByteLengthInternal,
  sourceExistsInternal,
  subjectLogPathsInternal,
  territoryLogPathsInternal,
  territoryStructuralSignature,
  writeJournalHead,
  writePacketText,

} from "./filesystem/write-journal-store.mjs";
import { readThroughDateEvents, readThroughTerritoryEvents } from "./filesystem/territory-cache.mjs";
import { causalGraphOf, topologicalOrder } from "@red-cup-engineering/semiotic-eavt-services-section/journal/causal-graph";
import { journalAppendAddress, journalLogArtifact } from "./filesystem/operations/index.mjs";
import { dataArtifactHandlePath, dataTierDirectory, mementoStateArtifactPath, parseArtifactStem, projectDataArtifactPath } from "@red-cup-engineering/eavt-services-section/data-artifact-address";

import { parse } from "@red-cup-engineering/json-services-section";
import { journalDirectoryOf, settlementRootOf } from "@red-cup-engineering/semiotic-eavt-services-section/journal/store-root";
import { eavtRecord, toEavt } from "@red-cup-engineering/eavt-services-section/row";

function artifactOf(handle) {
  return typeof handle === "object" && handle !== null && "artifact" in handle
    ? handle.artifact
    : handle;
}

/** Causal row folds expose admitted identity and cause edges beside the payload;
 * full witness bodies are the distinct read/readArtifact capability. */
function scanCausalEvents(
  events,
  initial,
  fold,
) {
  let result = initial;
  let rows = 0;
  let malformed = 0;
  for (const event of topologicalOrder(causalGraphOf(events))) {
    if (!Array.isArray(event.observation.payload)) {
      malformed += 1;
      continue;
    }
    try {
      result = fold(result, toEavt(eavtRecord(event.observation.payload)), event);
      rows += 1;
    } catch {
      malformed += 1;
    }
  }
  return Object.freeze({ result, rows, malformed });
}

function causalSubjectLogPathsInternal(
  root,
  subject,
  throughDate,
) {
  return subjectLogPathsInternal(root, subject, throughDate);
}

/**
 * Filesystem-backed journal rooted at one MetroPlat territory.
 *
 * Consumers name feeds and queries. Only this subsystem turns those names into
 * paths, event directories, indexes, packets, or legacy JSONL projections.
 */
export class FilesystemJournal {
 root;

  constructor(root) {
    this.root = root;
  }

  appendRows(
    action,
    rows,
    options = {},
  ) {
    return appendRowsInternal(this.root, action, rows, options);
  }

  /** Low-level event admission retained for importing an existing event set. */
  appendEvents(
    log,
    events,
    artifacts = [],
  ) {
    return admitEvents(dataArtifactHandlePath(log, "log"), events, artifacts);
  }

  read(log) {
    return readEvents(dataArtifactHandlePath(artifactOf(log), "log"));
  }

  readAsOf(log, frontier) {
    return readEventsAsOf(dataArtifactHandlePath(artifactOf(log), "log"), frontier);
  }

  /** Read and verify one exact admitted witness by its receipt. */
  readWitness(reference) {
    return readAdmittedWitness(path.join(journalDirectoryOf(this.root), "objects-anchor.jsonl"), reference);
  }

  /** Read one exact artifact committed anywhere in this territory's journal. */
  readArtifact(reference) {
    return readArtifactSource(path.join(journalDirectoryOf(this.root), "objects-anchor.jsonl"), reference);
  }

  readRowsAsOf(log, frontier) {
    return readEventRowsAsOf(dataArtifactHandlePath(log, "log"), frontier).rows;
  }

  scan(
    log,
    initial,
    fold,
  ) {
    return scanRowsInternal(dataArtifactHandlePath(artifactOf(log), "log"), initial, fold);
  }

  /** Fold one feed in witnessed causal order. Spacelike rows retain no
   * invented temporal relationship; their deterministic tie is event identity. */
  scanCausal(
    log,
    initial,
    fold,
  ) {
    return scanCausalEvents(readRowEvents(dataArtifactHandlePath(artifactOf(log), "log")), initial, fold);
  }

  scanAll(
    date,
    initial,
    fold,
  ) {
    return scanDailyRowsInternal(this.root, date, initial, fold);
  }

  listFeeds(date) {
    return listDailyFeedsInternal(this.root, date);
  }

  sourceStatus(log) {
    return Object.freeze({
      exists: sourceExistsInternal(log),
      bytes: sourceByteLengthInternal(log),
    });
  }

  storePacket(at, text) {
    return writePacketText(dataTierDirectory(this.root, "log", at), text);
  }

  readHead(at, namespace, key) {
    return readJournalHead(this.root, at, namespace, key);
  }

  writeHead(at, namespace, key, value) {
    writeJournalHead(this.root, at, namespace, key, value);
  }

  /** Carry this root from the one-file-per-fact layout into witness segments; `remove` deletes the earlier layout after checking. */
  compact(options = {}) {
    return compactJournalStore(this.root, options);
  }
}

export function openJournal(root) {
  return new FilesystemJournal(root);
}

/**
 * Root-independent journal reads for code that receives an opaque log handle.
 * This is the only public route to storage inspection; implementation walkers
 * and physical event-file functions remain inside `src/journal`.
 */
export const journal = Object.freeze({
  readWitness(root, reference) {
    return openJournal(root).readWitness(reference);
  },
  readArtifact(root, reference) {
    return openJournal(root).readArtifact(reference);
  },

  feed(root, action, at, options = {}) {
    const artifact = journalAppendAddress(root, action, at, options);
    return Object.freeze({ name: action, artifact });
  },

  scan(
    log,
    initial,
    fold,
  ) {
    return scanRowsInternal(dataArtifactHandlePath(artifactOf(log), "log"), initial, fold);
  },

  /** Fold only the rows admitted after a prior `scan`/`scanFrom`'s returned `position` (`0` for a
   *  first scan): a checkpointed consumer's resumable counterpart to `scan`, for a fold whose own
   *  accumulator already reflects everything before that position and whose folding order does
   *  not need to agree with `scan`'s -- an order-independent aggregation such as a demand count,
   *  never one that depends on row order. Persist the result's `position` as the next call's
   *  cursor. */
  scanFrom(
    log,
    position,
    initial,
    fold,
  ) {
    return scanRowsFromInternal(dataArtifactHandlePath(artifactOf(log), "log"), position, initial, fold);
  },

  /** A `scanFrom` cursor at most `bytes` before a feed's tail, at a row's start: where a live
   *  reader begins when it wants what was admitted lately and not the whole day before it. */
  positionBefore(log, bytes) {
    return positionBeforeInternal(dataArtifactHandlePath(artifactOf(log), "log"), bytes);
  },

  /** Fold one feed in causal order, carrying the exact witness responsible
   * for each EAVT row. */
  scanCausal(
    log,
    initial,
    fold,
  ) {
    return scanCausalEvents(readRowEvents(dataArtifactHandlePath(artifactOf(log), "log")), initial, fold);
  },

  scanTerritory(
    root,
    initial,
    fold,
  ) {
    return foldTerritoryRows(root, initial, fold);
  },

  /** Fold one date's source rows in causal order. This intentionally
   * materializes the bounded causal section; use `scanAll` for order-insensitive
   * streaming folds over very large logs. Reuses verified row projections: a feed whose admitted set is
   * unchanged folds its retained row evidence, even while another feed under
   * the same root admits on every call. `admit(logPath)`, when given, keeps
   * only the feeds a reader folds (a work reader leaves the hook catchment out).
   * `withSource` passes the original log path as the fourth fold argument
   * without reading the feeds again after causal ordering. */
  scanCausalAll(
    root,
    date,
    initial,
    fold,
    { admit = () => true, withSource = false } = {},
  ) {
    const sourceByWitness = withSource ? new Map() : undefined;
    const { logPaths, events } = readThroughDateEvents(root, {
      discoverLogPaths: () => listDailyFeedsInternal(root, date).filter(admit),
      readLog: (logPath) => readRowEvents(logPath),
      ...(sourceByWitness === undefined ? {} : { onEvent: (logPath, event) => {
        const prior = sourceByWitness.get(event.id);
        if (prior !== undefined && prior !== logPath) throw new Error("one witness cannot belong to two admitted feeds");
        sourceByWitness.set(event.id, logPath);
      } }),
    });
    const scanned = scanCausalEvents(events, initial, withSource
      ? (state, row, event) => fold(state, row, event, sourceByWitness.get(event.id))
      : fold);
    return Object.freeze({ ...scanned, feeds: logPaths.length });
  },

  /** Root-independent read of one feed's admitted events. The kernel edge's
   *  own composition -- callers that already hold a `log` handle reach the
   *  physical event store through this, never through `filesystem/write-
   *  journal-store.mjs` directly. */
  read(log) {
    return readEvents(dataArtifactHandlePath(artifactOf(log), "log"));
  },

  /** Fold the territory's source rows in one causal order across feeds.
   *  Reuses {@link readThroughTerritoryEvents}: discovery is cached by the
   *  territory's structural signature, and each log's own parse is cached
   *  independently, so one feed's admission never forces another to re-parse. */
  scanCausalTerritory(
    root,
    initial,
    fold,
  ) {
    const { logPaths, events } = readThroughTerritoryEvents(root, {
      discoverLogPaths: () => territoryLogPathsInternal(root),
      readLog: (logPath) => readRowEvents(logPath),
      territorySignature: () => territoryStructuralSignature(root),
    });
    const scanned = scanCausalEvents(events, initial, fold);
    return Object.freeze({ ...scanned, feeds: logPaths.length });
  },

  /** Fold all admitted source rows through one inclusive date frontier.
   * `withSource` supplies the originating log path as the fourth fold argument. */
  scanCausalThroughDate(
    root,
    throughDate,
    initial,
    fold,
    { admit = () => true, withSource = false } = {},
  ) {
    if (typeof throughDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(throughDate)) throw new TypeError("journal frontier must be a calendar date");
    const sourceByWitness = withSource ? new Map() : undefined;
    const { logPaths, events } = readThroughDateEvents(root, {
      discoverLogPaths: () => territoryLogPathsInternal(root, throughDate).filter(admit),
      readLog: (logPath) => readRowEvents(logPath),
      ...(sourceByWitness === undefined ? {} : { onEvent: (logPath, event) => {
        // The causal graph retains the last copy of a content-addressed witness.
        // Older feeds may contain that same witness, so retain its last source too.
        sourceByWitness.set(event.id, logPath);
      } }),
    });
    const scanned = scanCausalEvents(events, initial, withSource
      ? (state, row, event) => fold(state, row, event, sourceByWitness.get(event.id))
      : fold);
    return Object.freeze({ ...scanned, feeds: logPaths.length });
  },

  /** The revision of what {@link scanCausalThroughDate} reads under the same frontier and
   *  `admit`: equal revisions scan equal rows, so a projection of the scan holds across them and
   *  is refolded only when a feed it reads changes. Undefined when a feed has no revision. */
  revisionThroughDate(root, throughDate, { admit = () => true } = {}) {
    const parts = [];
    for (const logPath of territoryLogPathsInternal(root, throughDate).filter(admit)) {
      const revision = feedRevisionInternal(logPath);
      if (revision === undefined) return undefined;
      parts.push(`${logPath}\u0000${revision}`);
    }
    return parts.join("\n");
  },

  /** The revision of what {@link scanCausalSubject} reads for one subject through a date: equal
   *  revisions scan equal rows. Undefined when a feed has no revision. */
  revisionOfSubject(root, subject, throughDate) {
    const parts = [];
    for (const logPath of causalSubjectLogPathsInternal(root, subject, throughDate)) {
      const revision = feedRevisionInternal(logPath);
      if (revision === undefined) return undefined;
      parts.push(`${logPath}\u0000${revision}`);
    }
    return parts.join("\n");
  },

  /** Fold one subject's source rows in causal order through an inclusive date
   * frontier. Calendar partitions locate artifacts; they do not break the
   * subject's causal history. */
  scanCausalSubject(
    root,
    subject,
    throughDate,
    initial,
    fold,
  ) {
    const paths = causalSubjectLogPathsInternal(root, subject, throughDate);
    const scanned = scanCausalEvents(paths.flatMap((logPath) => readRowEvents(logPath)), initial, fold);
    return Object.freeze({ ...scanned, feeds: paths.length });
  },

  scanAll(
    root,
    date,
    initial,
    fold,
    { admit } = {},
  ) {
    return scanDailyRowsInternal(root, date, initial, fold, admit);
  },

  listFeeds(root, date) {
    return Object.freeze(listDailyFeedsInternal(root, date).map((logPath) => Object.freeze({
      name: logPath.split(/[\\/]/u).at(-1) ?? logPath,
      artifact: journalLogArtifact(logPath),
    })));
  },

  dateStatus(root, date) {
    return journalDateStatus(root, date);
  },

  discoverRoots(root, maxDepth = 7) {
    return discoverJournalRoots(root, maxDepth);
  },

  enclosingRoot(targetPath, fallback) {
    return enclosingJournalRoot(targetPath, fallback);
  },

  admissionSpan(root) {
    return journalAdmissionSpan(root);
  },

  sourceStatus(log) {
    return Object.freeze({
      exists: sourceExistsInternal(artifactOf(log)),
      bytes: sourceByteLengthInternal(artifactOf(log)),
    });
  },

  projectPath(log, tier, encoding) {
    return projectDataArtifactPath(dataArtifactHandlePath(artifactOf(log), "log"), tier, encoding);
  },

  projectDomainRecord(
    log,
    operation,
    suffix,
    context,
    initial,
    fold,
    build,
    options = {},
  ) {
    return projectDomainRecordInternal(log, operation, suffix, context, initial, fold, build, options);
  },

  projectState(log, functional = [], options = {}) {
    return projectStateInternal(log, functional, options);
  },

  projectRecord(log, options = {}) {
    return projectRecordInternal(log, options);
  },

  commitRecord(log, reading, options = {}) {
    return commitRecordInternal(log, reading, options);
  },

  readState(log, functional = []) {
    return readStateInternal(log, functional);
  },

  readStateArtifact(artifact) {
    return readStateArtifactInternal(artifact);
  },

  mementoStatePath(log, selectedDatetime) {
    return mementoStateArtifactPath(dataArtifactHandlePath(artifactOf(log), "log"), selectedDatetime);
  },

  describe(log) {
    const logPath = dataArtifactHandlePath(artifactOf(log), "log");
    const normalized = path.resolve(logPath);
    const settlement = settlementRootOf(logPath);
    const name = path.basename(logPath);
    const stem = name.endsWith(".jsonl") ? name.slice(0, -".jsonl".length) : name.replace(/\.[^./]+$/u, "");
    return Object.freeze({
      root: settlement ?? path.dirname(normalized),
      date: parseArtifactStem(stem)?.date ?? "0000-00-00",
      name,
      feed: stem,
    });
  },

  logArtifact(log) {
    return journalLogArtifact(dataArtifactHandlePath(artifactOf(log), "log"));
  },

  readPacket(log, relativePath, options) {
    const logPath = dataArtifactHandlePath(artifactOf(log), "log");
    return parse(options.readFileUtf8(path.join(path.dirname(logPath), relativePath)));
  },

});
