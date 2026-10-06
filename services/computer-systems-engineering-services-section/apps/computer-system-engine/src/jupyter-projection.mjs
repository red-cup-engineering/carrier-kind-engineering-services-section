/**
 * services/filesystem-store/jupyter-record — project a Jupyter notebook
 * `content/` artifact into JSONL execution records under `data/records`, and
 * back. Split out of the generic `filesystem-store/index.mts` so the
 * generic journal never has to import the Jupyter domain
 * directly — this file depends INTO the store's own generic read/write
 * primitives (the JSONL codec and data-store address helpers), not the
 * other way around.
 */
import {
  cellsToRecords,
  decodeIpynb,
  encodeIpynb,
  jupyterNotebookContract,
  jupyterExecutionRecordContract,
  notebookFromRecords,

} from "@red-cup-engineering/computer-content-engineering-services-section/jupyter/codec";
import { observeJournalOperation, journalContentArtifact, journalObservation, journalRecordArtifact } from "@red-cup-engineering/computer-system-engine/journal/filesystem/operations";
import { contentRecordArtifactPath, dataArtifactHandlePath, recordContentArtifactPath, dataStoreFromContentPath, dataStoreFromRecordPath } from "@red-cup-engineering/eavt/data-artifact-address";
import { } from "@red-cup-engineering/json-services-section";
import { parseLines, serializeLines } from "@red-cup-engineering/jsonl-services-section";

import { writeFileAtomic } from "@red-cup-engineering/computer-system-engine/filesystem";

/** Project a Jupyter notebook `content/` artifact into JSONL execution records under `data/records`. */
export function projectContentPathJupyterRecords(
  contentArtifact,
  options,
) {
  const contentPath = dataArtifactHandlePath(contentArtifact, "content");
  const { store, feed } = dataStoreFromContentPath(contentPath);
  const recordPath = contentRecordArtifactPath(contentPath);
  const sourceArtifact = journalContentArtifact(contentPath, "json");
  const artifact = journalRecordArtifact(recordPath);
  const notebook = decodeIpynb(options.readFileUtf8(contentPath));
  const records = cellsToRecords(notebook);
  writeFileAtomic(recordPath, records.length === 0 ? "" : serializeLines(records));
  const observation = observeJournalOperation(feed, "project-content-jupyter-record");
  return journalObservation(Object.freeze({
    ...observation,
    operation: "project-content-jupyter-record",
    sourceArtifact,
    artifact,
    records: records.length,
  }), "jupyter record projection");
}

/** Project Jupyter JSONL execution records under `data/records` back into a notebook `content/` artifact. */
export function projectRecordPathJupyterNotebook(
  recordArtifact,
  options,
) {
  const recordPath = dataArtifactHandlePath(recordArtifact, "record");
  const { store, feed } = dataStoreFromRecordPath(recordPath, { content: true });
  const notebookPath = recordContentArtifactPath(recordPath, "jupyter-notebook");
  const sourceArtifact = journalRecordArtifact(recordPath);
  const artifact = journalContentArtifact(notebookPath, "json");
  const records = Object.freeze(parseLines(options.readFileUtf8(recordPath))
    .map((record) => jupyterExecutionRecordContract.assert(record, "Jupyter execution record path")));
  const notebook = jupyterNotebookContract.assert(notebookFromRecords(records), "notebook from jupyter record path");
  writeFileAtomic(notebookPath, encodeIpynb(notebook));
  const observation = observeJournalOperation(feed, "project-record-jupyter-notebook");
  return journalObservation(Object.freeze({
    ...observation,
    operation: "project-record-jupyter-notebook",
    sourceArtifact,
    artifact,
    cells: notebook.cells.length,
  }), "jupyter notebook projection");
}
