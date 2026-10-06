// Journal-derived filesystem projection functions.
// Callers import projection legs here so journal can stay the durable append/read substrate instead of the public projection surface.
import { dataArtifactHandlePath, projectDataArtifactPath, dataStoreFromRecordPath } from "@red-cup-engineering/eavt/data-artifact-address";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { writeFileAtomic } from "@red-cup-engineering/computer-system-engine/filesystem";
import { observeJournalOperation, journalContentArtifact, journalObservation, journalRecordArtifact, journalStateArtifact } from "@red-cup-engineering/computer-system-engine/journal/filesystem/operations";
import { feedResponseCollector, feedResponseFromProjection } from "@red-cup-engineering/http-services-section/statement-log-stream";
import { projectContentDocuments } from "@red-cup-engineering/eavt/ledger/content";
import { statementIdentity } from "@red-cup-engineering/eavt/statement";
import { parse } from "@red-cup-engineering/json-services-section";
import { mementoDatetimeSelector, mementoStateAtCollector, mementoTimeMapCollector } from "@red-cup-engineering/http-services-section/memento-datetime";
import { foldStateAccumRow, initialStateAccum, closeStateAccum } from "@red-cup-engineering/eavt/ledger/state-fold";
import { eavtRecord, toEavt } from "@red-cup-engineering/eavt/row";


/** Project a durable source log artifact into a lensed SSE feed response. */
export function feedResponseLogPath(
  logArtifact,
  lastEventId,
) {
  const collector = feedResponseCollector(lastEventId);
  journal.scan(logArtifact, undefined, (_accum, row) => {
    collector.push(row);
    return undefined;
  });
  return feedResponseFromProjection(collector.read(), lastEventId);
}

/** Read a durable source log artifact into source-information by folding rows without materializing the whole log. */
export function statementLogInformationPath(logArtifact) {
  const seen = new Set();
  const folded = journal.scan(logArtifact, undefined, (_accum, row) => {
    seen.add(statementIdentity(row));
    return undefined;
  });
  const identities = Object.freeze([...seen]);
  return Object.freeze({
    kind: "witness.log-information",
    rows: folded.rows,
    uniqueStatements: identities.length,
    duplicateStatements: folded.rows - identities.length,
    entropyUnits: identities.length,
    duplicateSurprisal: 0,
    identities,
  });
}

/** Project state at the selected Memento datetime from durable source rows. */
export function projectMementoLogPathState(
  logArtifact,
  functional,
  request,
  options = {},
) {
  void options;
  const { feed } = journal.describe(logArtifact);
  const sourceArtifact = journal.logArtifact(logArtifact);
  let selectedDatetime = request.acceptDatetime;
  let mementoSnapshot;
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
  writeFileAtomic(statePath, `${canonicalJson(mementoSnapshot.state)}\n`);
  const observation = observeJournalOperation(feed, "project-memento-state");
  return journalObservation(Object.freeze({
    ...observation,
    operation: "project-memento-state",
    requestedDatetime: request.acceptDatetime,
    selectedDatetime,
    sourceArtifact,
    artifact,
  }), "memento state projection");
}

/** Project a durable source log artifact into a Memento TimeMap record. */
export function projectLogPathMementoTimeMap(
  logArtifact,
  options = {},
) {
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
        payload: timemap,
        boundary: Object.freeze({ original, snapshots: timemap.snapshots.length }),
        receipt: Object.freeze({ original }),
      };
    },
    observationOptions,
  );
}

function datomStatementRow(value) {
  if (!Array.isArray(value) || value.length < 4) return undefined;
  const [e, a, v, t] = value;
  return toEavt({ e, a, v, t });
}

/** Recompute the content document manifest from settled record datoms. */
export function projectRecordPathContent(
  recordArtifact,
  opts,
) {
  const recordPath = dataArtifactHandlePath(recordArtifact, "record");
  const { feed } = dataStoreFromRecordPath(recordPath, { content: true });
  let datoms = 0;
  let view = Object.freeze({});
  let documents = Object.freeze([]);
  const contentPath = projectDataArtifactPath(recordPath, "content", "json");
  let accum = initialStateAccum;
  if (opts.statPathOrNull(recordPath) !== null) {
    opts.foldFileLinesUtf8(recordPath, (line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return;
      const row = datomStatementRow(parse(trimmed));
      if (row === undefined) return;
      accum = foldStateAccumRow(accum, eavtRecord(row), new Set());
      datoms += 1;
    });
  }
  view = closeStateAccum(accum).view;
  documents = projectContentDocuments(view, opts.projection);
  writeFileAtomic(contentPath, `${canonicalJson(documents)}\n`);
  const sourceArtifact = journalRecordArtifact(recordPath);
  const artifact = journalContentArtifact(contentPath, "json");
  const observation = observeJournalOperation(feed, "project-record-content");
  return journalObservation(Object.freeze({
    ...observation,
    operation: "project-record-content",
    sourceArtifact,
    artifact,
    documents: documents.length,
  }), "content settlement projection");
}
