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
  type JupyterNotebook,
  type JupyterExecutionRecord,
} from "./codec.mts";
import {
  observeJournalOperation,
  journalContentArtifact,
  journalObservation,
  journalRecordArtifact,
  type JupyterNotebookProjection,
  type JupyterRecordProjection,
  type JournalObservationOptions,
} from "../../journal/index.mts";
import {
  contentRecordArtifactPath,
  dataArtifactHandlePath,
  recordContentArtifactPath,
  dataStoreFromContentPath,
  dataStoreFromRecordPath,
  type DataArtifactHandle,
} from "../../lib/addressing/index.mts";
import { parseLines, serializeLines, type JsonValue } from "../../lib/codecs/json/core.mts";
import type { ContractValue } from "../../lib/contracts/index.mts";
import { readFileUtf8, writeFileAtomic } from "../../lib/filesystem/index.mts";

/** Project a Jupyter notebook `content/` artifact into JSONL execution records under `data/records`. */
export function projectContentPathJupyterRecords(
  contentArtifact: DataArtifactHandle,
  options: JournalObservationOptions = {},
): JupyterRecordProjection {
  const contentPath = dataArtifactHandlePath(contentArtifact, "content");
  const { store, feed } = dataStoreFromContentPath(contentPath);
  const recordPath = contentRecordArtifactPath(contentPath);
  const sourceArtifact = journalContentArtifact(contentPath, "json");
  const artifact = journalRecordArtifact(recordPath);
  const notebook = decodeIpynb(readFileUtf8(contentPath));
  const records = cellsToRecords(notebook);
  writeFileAtomic(recordPath, records.length === 0 ? "" : serializeLines(records as unknown as readonly JsonValue[]));
  const observation = observeJournalOperation(feed, "project-content-jupyter-record");
  return journalObservation(Object.freeze({
    ...observation,
    operation: "project-content-jupyter-record" as const,
    sourceArtifact,
    artifact,
    records: records.length,
  }), "jupyter record projection") as JupyterRecordProjection;
}

/** Project Jupyter JSONL execution records under `data/records` back into a notebook `content/` artifact. */
export function projectRecordPathJupyterNotebook(
  recordArtifact: DataArtifactHandle,
  options: JournalObservationOptions = {},
): JupyterNotebookProjection {
  const recordPath = dataArtifactHandlePath(recordArtifact, "record");
  const { store, feed } = dataStoreFromRecordPath(recordPath, { content: true });
  const notebookPath = recordContentArtifactPath(recordPath, "jupyter-notebook");
  const sourceArtifact = journalRecordArtifact(recordPath);
  const artifact = journalContentArtifact(notebookPath, "json");
  const records = Object.freeze(parseLines(readFileUtf8(recordPath))
    .map((record) => jupyterExecutionRecordContract.assert(record, "Jupyter execution record path") as JupyterExecutionRecord));
  const notebook = jupyterNotebookContract.assert(notebookFromRecords(records), "notebook from jupyter record path") as JupyterNotebook;
  writeFileAtomic(notebookPath, encodeIpynb(notebook));
  const observation = observeJournalOperation(feed, "project-record-jupyter-notebook");
  return journalObservation(Object.freeze({
    ...observation,
    operation: "project-record-jupyter-notebook" as const,
    sourceArtifact,
    artifact,
    cells: notebook.cells.length,
  }), "jupyter notebook projection") as JupyterNotebookProjection;
}
