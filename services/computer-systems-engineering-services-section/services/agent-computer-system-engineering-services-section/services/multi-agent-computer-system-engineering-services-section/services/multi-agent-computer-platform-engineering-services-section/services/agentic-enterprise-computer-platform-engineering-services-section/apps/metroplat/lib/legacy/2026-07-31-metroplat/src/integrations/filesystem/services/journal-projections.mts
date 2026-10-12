// Journal-derived filesystem projection functions.
// Callers import projection legs here so journal can stay the durable append/read substrate instead of the public projection surface.
import { dataArtifactHandlePath, projectDataArtifactPath, dataStoreFromRecordPath, type DataArtifactHandle } from "../../../lib/addressing/index.mts";
import { canonicalBytes } from "../../../lib/identity/index.mts";
import { journal } from "../../../journal/index.mts";
import { foldFileLinesUtf8, statPathOrNull, writeFileAtomic } from "../../../lib/filesystem/index.mts";
import { observeJournalOperation, journalContentArtifact, journalObservation, journalRecordArtifact, journalStateArtifact, type ContentArtifactProjection, type MementoStateProjection, type MementoTimeMapProjection, type MementoTimeMapProjectionOptions, type JournalObservationOptions } from "../../../journal/index.mts";
import { feedResponseCollector, feedResponseFromProjection, type FeedResponseObservation } from "../../http/artifacts-stream.mts";
import { projectContentDocuments, type ContentDocument, type ContentProjection } from "../../../presentation/artifacts/content.mts";
import { statementIdentity, type StatementLogInformation, type StatementTuple } from "../../../lib/records/persistence.mts";
import { eavtObject, toEavt, type EAVT } from "../../../lib/codecs/json/jsonl/eavt/index.mts";
import { parse, type JsonValue } from "../../../lib/codecs/json/core.mts";
import { mementoDatetimeSelector, mementoStateAtCollector, mementoTimeMapCollector, type MementoRequest, type MementoSnapshot } from "../../../lib/codecs/http-datetime/index.mts";
import { foldStateAccumRow, initialStateAccum, closeStateAccum, type StateView } from "../../../lib/fixpoint/state-fold.mts";
export { diskProjectionProfile, type DiskProjectionProfile } from "./plate-profile.mts";

export { projectLogPathCredential } from "./credential-record.mts";
export { projectLogPathRaftSafetyJudgment } from "./raft-record.mts";

export type {
  FeedStateProjection,
  RecordCommitResult,
} from "../../../journal/index.mts";


/** Project a durable source log artifact into a lensed SSE feed response. */
export function feedResponseLogPath(
  logArtifact: DataArtifactHandle,
  lastEventId?: string,
): FeedResponseObservation {
  const collector = feedResponseCollector(lastEventId);
  journal.scan(logArtifact, undefined, (_accum, row) => {
    collector.push(row);
    return undefined;
  });
  return feedResponseFromProjection(collector.read(), lastEventId);
}

/** Read a durable source log artifact into source-information by folding rows without materializing the whole log. */
export function statementLogInformationPath(logArtifact: DataArtifactHandle): StatementLogInformation {
  const seen = new Set<string>();
  const folded = journal.scan(logArtifact, undefined, (_accum, row: EAVT) => {
    seen.add(statementIdentity(row as unknown as StatementTuple));
    return undefined;
  });
  const identities = Object.freeze([...seen]);
  return Object.freeze({
    kind: "witness.log-information" as const,
    rows: folded.rows,
    uniqueStatements: identities.length,
    duplicateStatements: folded.rows - identities.length,
    entropyUnits: identities.length,
    duplicateSurprisal: 0 as const,
    identities,
  });
}

/** Project state at the selected Memento datetime from durable source rows. */
export function projectMementoLogPathState(
  logArtifact: DataArtifactHandle,
  functional: readonly string[],
  request: MementoRequest,
  options: JournalObservationOptions = {},
): MementoStateProjection {
  void options;
  const { feed } = journal.describe(logArtifact);
  const sourceArtifact = journal.logArtifact(logArtifact);
  let selectedDatetime = request.acceptDatetime;
  let mementoSnapshot: MementoSnapshot | undefined;
  let statePath = journal.mementoStatePath(logArtifact, selectedDatetime);
  let artifact = journalStateArtifact(statePath);
  const selector = mementoDatetimeSelector(request.acceptDatetime);
  journal.scan(logArtifact, undefined, (_accum, row) => {
    selector.push(row);
    return undefined;
  });
  selectedDatetime = selector.read();
  const snapshotCollector = mementoStateAtCollector(new Set(functional), selectedDatetime);
  journal.scan(logArtifact, undefined, (_accum, row) => {
    snapshotCollector.push(row);
    return undefined;
  });
  mementoSnapshot = snapshotCollector.read();
  statePath = journal.mementoStatePath(logArtifact, selectedDatetime);
  artifact = journalStateArtifact(statePath);
  writeFileAtomic(statePath, `${canonicalBytes(mementoSnapshot.state as unknown as JsonValue)}\n`);
  const observation = observeJournalOperation(feed, "project-memento-state");
  return journalObservation(Object.freeze({
    ...observation,
    operation: "project-memento-state" as const,
    requestedDatetime: request.acceptDatetime,
    selectedDatetime,
    sourceArtifact,
    artifact,
  }), "memento state projection") as MementoStateProjection;
}

/** Project a durable source log artifact into a Memento TimeMap record. */
export function projectLogPathMementoTimeMap(
  logArtifact: DataArtifactHandle,
  options: MementoTimeMapProjectionOptions = {},
): MementoTimeMapProjection {
  const { original = "", ...observationOptions } = options;
  return journal.projectDomainRecord(
    logArtifact,
    "project-log-memento-timemap",
    "memento-timemap",
    "memento timemap projection",
    () => mementoTimeMapCollector(original),
    (collector, row) => {
      collector.push(row);
      return collector;
    },
    (collector) => {
      const timemap = collector.read();
      return {
        payload: timemap as unknown as JsonValue,
        boundary: Object.freeze({ original, snapshots: timemap.snapshots.length }),
        receipt: Object.freeze({ original }),
      };
    },
    observationOptions,
  );
}

function datomStatementRow(value: JsonValue): EAVT | undefined {
  if (!Array.isArray(value) || value.length < 4) return undefined;
  const [e, a, v, t] = value;
  return toEavt({ e, a, v, t });
}

/** Recompute the content document manifest from settled record datoms. */
export function projectRecordPathContent(
  recordArtifact: DataArtifactHandle,
  opts: { readonly projection?: ContentProjection; readonly observation?: JournalObservationOptions } = {},
): ContentArtifactProjection {
  const recordPath = dataArtifactHandlePath(recordArtifact, "record");
  const { feed } = dataStoreFromRecordPath(recordPath, { content: true });
  let datoms = 0;
  let view: StateView = Object.freeze({});
  let documents: readonly ContentDocument[] = Object.freeze([]);
  const contentPath = projectDataArtifactPath(recordPath, "content", "json");
  let accum = initialStateAccum;
  if (statPathOrNull(recordPath) !== null) {
    foldFileLinesUtf8(recordPath, (line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return;
      const row = datomStatementRow(parse(trimmed));
      if (row === undefined) return;
      accum = foldStateAccumRow(accum, eavtObject(row), new Set());
      datoms += 1;
    });
  }
  view = closeStateAccum(accum).view;
  documents = projectContentDocuments(view, opts.projection);
  writeFileAtomic(contentPath, `${canonicalBytes(documents as unknown as JsonValue)}\n`);
  const sourceArtifact = journalRecordArtifact(recordPath);
  const artifact = journalContentArtifact(contentPath, "json");
  const observation = observeJournalOperation(feed, "project-record-content");
  return journalObservation(Object.freeze({
    ...observation,
    operation: "project-record-content" as const,
    sourceArtifact,
    artifact,
    documents: documents.length,
  }), "content settlement projection") as ContentArtifactProjection;
}
