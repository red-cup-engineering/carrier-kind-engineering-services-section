/** The single behavioral API for MetroPlat's durable event journal. */
import path from "node:path";
import { eavtObject, toEavt, type EAVT } from "../lib/codecs/json/jsonl/eavt/index.mts";
import type { DataArtifactHandle } from "../lib/addressing/index.mts";
import type { JournalWitness } from "./event.mts";
import {
  admitEvents,
  readArtifactSource,
  readEventRowsAsOf,
  readEvents,
  readEventsAsOf,
  type EventWrite,
} from "./filesystem/events.mts";
import type { ArtifactRef, ArtifactSource } from "../lib/identity/index.mts";
import {
  listDailyFeedsInternal,
  scanDailyRowsInternal,
  foldTerritoryRows,
  territoryLogPathsInternal,
  journalDateStatus,
  discoverJournalRoots,
  enclosingJournalRoot,
  journalAdmissionSpan,
  projectDomainRecordInternal,
  projectStateInternal,
  projectRecordInternal,
  commitRecordInternal,
  readStateInternal,
  readStateArtifactInternal,
  scanRowsInternal,
  sourceByteLengthInternal,
  sourceExistsInternal,
  writePacketText,
  appendRowsInternal,
  type EventWriteResult,
  type PacketWrite,
  type RootEventWriteOptions,
  type JournalObservation,
  type JournalObservationOptions,
  type LogRecordProjectionBuild,
  type LogRecordProjectionFoldSource,
  type LogRecordProjectionOperation,
  type FeedStateProjection,
  type RecordCommitResult,
} from "./filesystem/index.mts";
import { causalGraphOf, topologicalOrder } from "./causal-graph.mts";
import { journalAppendAddress, journalLogArtifact, type RecordArtifactProjection } from "./filesystem/operations/index.mts";
import { dataArtifactHandlePath, dataTierDirectory, mementoStateArtifactPath, parseArtifactStem, projectDataArtifactPath, type DataArtifactEncoding, type DataArtifactTier } from "../lib/addressing/index.mts";
import type { JsonValue } from "../lib/codecs/json/core.mts";
import { parse } from "../lib/codecs/json/core.mts";
import { readFileUtf8 } from "../lib/filesystem/index.mts";
import { readJournalHead, writeJournalHead } from "./filesystem/heads.mts";
import { journalDirectoryOf, settlementRootOf } from "./store-root.mts";

export interface JournalSourceStatus {
  readonly exists: boolean;
  readonly bytes: number;
}

export interface JournalFeed {
  readonly name: string;
  readonly artifact: DataArtifactHandle;
}

export type JournalHandle = DataArtifactHandle | JournalFeed;

function artifactOf(handle: JournalHandle): DataArtifactHandle {
  return typeof handle === "object" && handle !== null && "artifact" in handle
    ? handle.artifact
    : handle;
}

export interface JournalScanResult<Acc> {
  readonly result: Acc;
  readonly rows: number;
  readonly malformed: number;
}

function scanCausalEvents<Acc>(
  events: readonly JournalWitness[],
  initial: Acc,
  fold: (accumulator: Acc, row: EAVT, event: JournalWitness) => Acc,
): JournalScanResult<Acc> {
  let result = initial;
  let rows = 0;
  let malformed = 0;
  for (const event of topologicalOrder(causalGraphOf(events))) {
    if (!Array.isArray(event.observation.payload)) {
      malformed += 1;
      continue;
    }
    try {
      result = fold(result, toEavt(eavtObject(event.observation.payload as unknown as EAVT)), event);
      rows += 1;
    } catch {
      malformed += 1;
    }
  }
  return Object.freeze({ result, rows, malformed });
}

function causalSubjectLogPathsInternal(
  root: string,
  subject: string,
  throughDate: string,
): readonly string[] {
  const addressed = journalAppendAddress(root, subject, throughDate, { subject });
  return Object.freeze(territoryLogPathsInternal(root).filter((logPath) => {
    const stem = path.basename(logPath, path.extname(logPath));
    const parsed = parseArtifactStem(stem);
    return parsed !== null
      && parsed.act === "admit"
      && parsed.token === addressed.subject
      && parsed.date <= addressed.date;
  }));
}

/**
 * Filesystem-backed journal rooted at one MetroPlat territory.
 *
 * Consumers name feeds and queries. Only this subsystem turns those names into
 * paths, event directories, indexes, packets, or legacy JSONL projections.
 */
export class FilesystemJournal {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  appendRows(
    action: string,
    rows: readonly EAVT[],
    options: RootEventWriteOptions = {},
  ): EventWriteResult {
    return appendRowsInternal(this.root, action, rows, options);
  }

  /** Low-level event admission retained for importing an existing event set. */
  appendEvents(
    log: DataArtifactHandle,
    events: readonly JournalWitness[],
    artifacts: readonly ArtifactSource[] = [],
  ): readonly EventWrite[] {
    return admitEvents(dataArtifactHandlePath(log, "log"), events, artifacts);
  }

  read(log: JournalHandle): readonly JournalWitness[] {
    return readEvents(dataArtifactHandlePath(artifactOf(log), "log"));
  }

  readAsOf(log: JournalHandle, frontier: readonly string[]): readonly JournalWitness[] {
    return readEventsAsOf(dataArtifactHandlePath(artifactOf(log), "log"), frontier);
  }

  /** Read one exact artifact committed anywhere in this territory's journal. */
  readArtifact(reference: ArtifactRef): ArtifactSource | undefined {
    return readArtifactSource(path.join(journalDirectoryOf(this.root), "objects-anchor.jsonl"), reference);
  }

  readRowsAsOf(log: DataArtifactHandle, frontier: readonly string[]): readonly EAVT[] {
    return readEventRowsAsOf(dataArtifactHandlePath(log, "log"), frontier).rows;
  }

  scan<Acc>(
    log: JournalHandle,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT) => Acc,
  ): JournalScanResult<Acc> {
    return scanRowsInternal(dataArtifactHandlePath(artifactOf(log), "log"), initial, fold);
  }

  /** Fold one feed in witnessed causal order. Spacelike rows retain no
   * invented temporal relationship; their deterministic tie is event identity. */
  scanCausal<Acc>(
    log: JournalHandle,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT, event: JournalWitness) => Acc,
  ): JournalScanResult<Acc> {
    return scanCausalEvents(readEvents(dataArtifactHandlePath(artifactOf(log), "log")), initial, fold);
  }

  scanAll<Acc>(
    date: string,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT) => Acc,
  ): JournalScanResult<Acc> & { readonly feeds: number } {
    return scanDailyRowsInternal(this.root, date, initial, fold);
  }

  listFeeds(date: string): readonly string[] {
    return listDailyFeedsInternal(this.root, date);
  }

  sourceStatus(log: DataArtifactHandle): JournalSourceStatus {
    return Object.freeze({
      exists: sourceExistsInternal(log),
      bytes: sourceByteLengthInternal(log),
    });
  }

  storePacket(at: string, text: string): PacketWrite {
    return writePacketText(dataTierDirectory(this.root, "log", at), text);
  }

  readHead(at: string, namespace: string, key: string): Readonly<Record<string, JsonValue>> | undefined {
    return readJournalHead(this.root, at, namespace, key);
  }

  writeHead(at: string, namespace: string, key: string, value: Readonly<Record<string, JsonValue>>): void {
    writeJournalHead(this.root, at, namespace, key, value);
  }
}

export function openJournal(root: string): FilesystemJournal {
  return new FilesystemJournal(root);
}

/**
 * Root-independent journal reads for code that receives an opaque log handle.
 * This is the only public route to storage inspection; implementation walkers
 * and physical event-file functions remain inside `src/journal`.
 */
export const journal = Object.freeze({
  readArtifact(root: string, reference: ArtifactRef): ArtifactSource | undefined {
    return openJournal(root).readArtifact(reference);
  },

  feed(root: string, action: string, at: string, options: RootEventWriteOptions = {}): JournalFeed {
    const artifact = journalAppendAddress(root, action, at, options);
    return Object.freeze({ name: action, artifact });
  },

  scan<Acc>(
    log: JournalHandle,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT) => Acc,
  ): JournalScanResult<Acc> {
    return scanRowsInternal(dataArtifactHandlePath(artifactOf(log), "log"), initial, fold);
  },

  /** Fold one feed in causal order, carrying the exact witness responsible
   * for each EAVT row. */
  scanCausal<Acc>(
    log: JournalHandle,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT, event: JournalWitness) => Acc,
  ): JournalScanResult<Acc> {
    return scanCausalEvents(readEvents(dataArtifactHandlePath(artifactOf(log), "log")), initial, fold);
  },

  scanTerritory<Acc>(
    root: string,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT) => Acc,
  ): JournalScanResult<Acc> & { readonly feeds: number } {
    return foldTerritoryRows(root, initial, fold);
  },

  /** Fold one date's source rows in causal order. This intentionally
   * materializes the bounded causal section; use `scanAll` for order-insensitive
   * streaming folds over very large logs. */
  scanCausalAll<Acc>(
    root: string,
    date: string,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT, event: JournalWitness) => Acc,
  ): JournalScanResult<Acc> & { readonly feeds: number } {
    const paths = listDailyFeedsInternal(root, date);
    const scanned = scanCausalEvents(paths.flatMap((logPath) => readEvents(logPath)), initial, fold);
    return Object.freeze({ ...scanned, feeds: paths.length });
  },

  /** Fold the territory's source rows in one causal order across feeds. */
  scanCausalTerritory<Acc>(
    root: string,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT, event: JournalWitness) => Acc,
  ): JournalScanResult<Acc> & { readonly feeds: number } {
    const paths = territoryLogPathsInternal(root);
    const scanned = scanCausalEvents(paths.flatMap((logPath) => readEvents(logPath)), initial, fold);
    return Object.freeze({ ...scanned, feeds: paths.length });
  },

  /** Fold one subject's source rows in causal order through an inclusive date
   * frontier. Calendar partitions locate artifacts; they do not break the
   * subject's causal history. */
  scanCausalSubject<Acc>(
    root: string,
    subject: string,
    throughDate: string,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT, event: JournalWitness) => Acc,
  ): JournalScanResult<Acc> & { readonly feeds: number } {
    const paths = causalSubjectLogPathsInternal(root, subject, throughDate);
    const scanned = scanCausalEvents(paths.flatMap((logPath) => readEvents(logPath)), initial, fold);
    return Object.freeze({ ...scanned, feeds: paths.length });
  },

  scanAll<Acc>(
    root: string,
    date: string,
    initial: Acc,
    fold: (accumulator: Acc, row: EAVT) => Acc,
  ): JournalScanResult<Acc> & { readonly feeds: number } {
    return scanDailyRowsInternal(root, date, initial, fold);
  },

  listFeeds(root: string, date: string): readonly JournalFeed[] {
    return Object.freeze(listDailyFeedsInternal(root, date).map((logPath) => Object.freeze({
      name: logPath.split(/[\\/]/u).at(-1) ?? logPath,
      artifact: journalLogArtifact(logPath),
    })));
  },

  dateStatus(root: string, date: string): { readonly exists: boolean; readonly legacyIdentitySidecars: number } {
    return journalDateStatus(root, date);
  },

  discoverRoots(root: string, maxDepth = 7): readonly string[] {
    return discoverJournalRoots(root, maxDepth);
  },

  enclosingRoot(targetPath: string, fallback: string): string {
    return enclosingJournalRoot(targetPath, fallback);
  },

  admissionSpan(root: string): { readonly first: string | null; readonly last: string | null; readonly feeds: number } {
    return journalAdmissionSpan(root);
  },

  sourceStatus(log: JournalHandle): JournalSourceStatus {
    return Object.freeze({
      exists: sourceExistsInternal(artifactOf(log)),
      bytes: sourceByteLengthInternal(artifactOf(log)),
    });
  },

  projectPath(log: JournalHandle, tier: DataArtifactTier, encoding?: DataArtifactEncoding): string {
    return projectDataArtifactPath(dataArtifactHandlePath(artifactOf(log), "log"), tier, encoding);
  },

  projectDomainRecord<T extends JournalObservation, Acc>(
    log: DataArtifactHandle,
    operation: LogRecordProjectionOperation,
    suffix: string,
    context: string,
    initial: () => Acc,
    fold: (accumulator: Acc, row: EAVT) => Acc,
    build: (accumulator: Acc, source: LogRecordProjectionFoldSource) => LogRecordProjectionBuild,
    options: JournalObservationOptions = {},
  ): T {
    return projectDomainRecordInternal<T, Acc>(log, operation, suffix, context, initial, fold, build, options);
  },

  projectState(log: DataArtifactHandle, functional: readonly string[] = [], options: JournalObservationOptions = {}): FeedStateProjection {
    return projectStateInternal(log, functional, options);
  },

  projectRecord(log: DataArtifactHandle, options: JournalObservationOptions = {}): RecordArtifactProjection {
    return projectRecordInternal(log, options);
  },

  commitRecord(log: DataArtifactHandle, reading: JsonValue, options: JournalObservationOptions = {}): RecordCommitResult {
    return commitRecordInternal(log, reading, options);
  },

  readState(log: DataArtifactHandle, functional: readonly string[] = []): ReturnType<typeof readStateInternal> {
    return readStateInternal(log, functional);
  },

  readStateArtifact(artifact: DataArtifactHandle): ReturnType<typeof readStateArtifactInternal> {
    return readStateArtifactInternal(artifact);
  },

  mementoStatePath(log: JournalHandle, selectedDatetime: string): string {
    return mementoStateArtifactPath(dataArtifactHandlePath(artifactOf(log), "log"), selectedDatetime);
  },

  describe(log: JournalHandle): { readonly root: string; readonly date: string; readonly name: string; readonly feed: string } {
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

  logArtifact(log: JournalHandle): ReturnType<typeof journalLogArtifact> {
    return journalLogArtifact(dataArtifactHandlePath(artifactOf(log), "log"));
  },

  readPacket(log: JournalHandle, relativePath: string): JsonValue {
    const logPath = dataArtifactHandlePath(artifactOf(log), "log");
    return parse(readFileUtf8(path.join(path.dirname(logPath), relativePath)));
  },

});
