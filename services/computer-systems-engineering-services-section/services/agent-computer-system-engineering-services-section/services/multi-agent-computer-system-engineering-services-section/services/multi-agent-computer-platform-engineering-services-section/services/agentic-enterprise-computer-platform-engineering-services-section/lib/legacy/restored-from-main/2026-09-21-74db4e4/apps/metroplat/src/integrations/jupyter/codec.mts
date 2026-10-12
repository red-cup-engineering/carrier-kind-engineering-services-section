/**
 * integrations/jupyter/codec — Jupyter notebooks as execution-log material.
 *
 * This is the package-owned part of the Jupyter protocol instrument. A notebook
 * is not treated as a downstream implementation detail: ordered code cells are
 * admitted as execution loci, outputs are boundary observations, and the
 * record-tier projection is a reversible read of that code-cell log.
 *
 * @packageDocumentation
 */
import { canonicalBytes } from "../../lib/identity/index.mts";
import {
  jupyterCodeCellContract,
  jupyterExecuteReplyContract,
  jupyterExecuteRequestContract,
  jupyterIopubMessageContract,
  jupyterNotebookContract,
  jupyterExecutionLogContract,
  jupyterExecutionRecordContract,
} from "./schema.mts";
import { parse as parseJson, requireJsonValue, type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";

export {
  jupyterCodeCellContract,
  jupyterExecuteReplyContract,
  jupyterExecuteRequestContract,
  jupyterIopubMessageContract,
  jupyterNotebookContract,
  jupyterOutputContract,
  jupyterExecutionLogContract,
  jupyterExecutionRecordContract,
} from "./schema.mts";

export type JupyterOutput = JsonRecord & { readonly output_type: "stream" | "execute_result" | "display_data" | "error" };
export type JupyterCodeCell = JsonRecord & {
  readonly cell_type: "code";
  readonly id?: string;
  readonly metadata: JsonRecord;
  readonly source: string | readonly string[];
  readonly outputs: readonly JupyterOutput[];
  readonly execution_count: number | null;
};
export type JupyterNotebookCell = JsonRecord & {
  readonly cell_type: "code" | "markdown" | "raw";
  readonly id?: string;
  readonly metadata: JsonRecord;
  readonly source: string | readonly string[];
  readonly outputs?: readonly JupyterOutput[];
  readonly execution_count?: number | null;
};
export type JupyterNotebook = JsonRecord & {
  readonly nbformat: number;
  readonly nbformat_minor: number;
  readonly metadata: JsonRecord;
  readonly cells: readonly JupyterNotebookCell[];
};
export type JupyterExecuteRequest = JsonRecord & {
  readonly code: string;
  readonly silent: boolean;
  readonly store_history?: boolean;
  readonly user_expressions?: JsonRecord;
  readonly allow_stdin?: boolean;
  readonly stop_on_error?: boolean;
};
export type JupyterExecuteReply = JsonRecord & {
  readonly status: "ok" | "error" | "abort";
  readonly execution_count: number | null;
  readonly outputs: readonly JupyterOutput[];
};
export type JupyterIopubMessage = Readonly<{ readonly msg_type: "status" | "stream" | "execute_result" | "display_data" | "error"; readonly content: JsonValue }>;
export type JupyterExecutionRecord = Readonly<{
  readonly kind: "jupyter.witness.record";
  readonly cellId: string;
  readonly index: number;
  readonly source: string;
  readonly executionCount: number | null;
  readonly outputs: readonly JupyterOutput[];
  readonly metadata: JsonRecord;
}>;
export type JupyterExecutionLog = Readonly<{
  readonly kind: "jupyter.witness.log";
  readonly notebook?: string;
  readonly records: readonly JupyterExecutionRecord[];
}>;

function sourceText(source: string | readonly string[]): string {
  return typeof source === "string" ? source : source.join("");
}

function jsonRecord(value: unknown, label: string): JsonRecord {
  const json = requireJsonValue(value, label);
  if (json === null || typeof json !== "object" || Array.isArray(json)) throw new TypeError(`${label}: expected a JSON object`);
  return json as JsonRecord;
}

function codeCellId(cell: JupyterCodeCell, index: number): string {
  return typeof cell.id === "string" && cell.id.length > 0 ? cell.id : `code-cell-${index}`;
}

/** Parse an `.ipynb` JSON document into the notebook record. */
export function decodeIpynb(content: string): JupyterNotebook {
  return jupyterNotebookContract.assert(parseJson(content), "ipynb notebook") as JupyterNotebook;
}

/** Encode a notebook record as canonical ipynb JSON. */
export function encodeIpynb(notebook: JupyterNotebook): string {
  return `${canonicalBytes(jupyterNotebookContract.assert(notebook, "ipynb notebook") as unknown as JsonValue)}\n`;
}

/** Construct a minimal nbformat 4 notebook from cells. */
export function jupyterNotebook(
  cells: readonly JupyterNotebookCell[],
  options: { readonly metadata?: JsonRecord; readonly nbformatMinor?: number } = {},
): JupyterNotebook {
  return jupyterNotebookContract.assert(Object.freeze({
    nbformat: 4,
    nbformat_minor: options.nbformatMinor ?? 5,
    metadata: options.metadata ?? Object.freeze({}),
    cells: Object.freeze([...cells]),
  }), "jupyter notebook") as JupyterNotebook;
}

/** Construct a code cell carrying source, outputs, and execution count. */
export function jupyterCodeCell(
  source: string | readonly string[],
  options: {
    readonly id?: string;
    readonly outputs?: readonly JupyterOutput[];
    readonly executionCount?: number | null;
    readonly metadata?: JsonRecord;
  } = {},
): JupyterCodeCell {
  return jupyterCodeCellContract.assert(Object.freeze({
    cell_type: "code",
    ...(options.id === undefined ? {} : { id: options.id }),
    metadata: options.metadata ?? Object.freeze({}),
    source,
    outputs: Object.freeze([...(options.outputs ?? [])]),
    execution_count: options.executionCount ?? null,
  }), "jupyter code cell") as JupyterCodeCell;
}

/** Convert one code cell into an execute_request content object. */
export function executeRequestFromCell(cell: JupyterCodeCell): JupyterExecuteRequest {
  const admitted = jupyterCodeCellContract.assert(cell, "execute request cell") as JupyterCodeCell;
  return jupyterExecuteRequestContract.assert(Object.freeze({
    code: sourceText(admitted.source),
    silent: false,
    store_history: true,
    user_expressions: Object.freeze({}),
    allow_stdin: false,
    stop_on_error: true,
  }), "jupyter execute_request") as JupyterExecuteRequest;
}

/** Convert one code cell into the settled execute_reply content it records. */
export function executeReplyFromCell(cell: JupyterCodeCell): JupyterExecuteReply {
  const admitted = jupyterCodeCellContract.assert(cell, "execute reply cell") as JupyterCodeCell;
  const hasError = admitted.outputs.some((output) => output.output_type === "error");
  return jupyterExecuteReplyContract.assert(Object.freeze({
    status: hasError ? "error" : "ok",
    execution_count: admitted.execution_count,
    outputs: Object.freeze([...admitted.outputs]),
  }), "jupyter execute_reply") as JupyterExecuteReply;
}

/** Read code-cell outputs as normalized IOPub messages. */
export function iopubMessagesFromCell(cell: JupyterCodeCell): readonly JupyterIopubMessage[] {
  const admitted = jupyterCodeCellContract.assert(cell, "iopub cell") as JupyterCodeCell;
  const messages: JupyterIopubMessage[] = [
    Object.freeze({ msg_type: "status" as const, content: Object.freeze({ execution_state: "busy" }) as JsonValue }),
  ];
  for (const output of admitted.outputs) {
    messages.push(jupyterIopubMessageContract.assert(Object.freeze({
      msg_type: output.output_type,
      content: output as unknown as JsonValue,
    }), "jupyter iopub message") as JupyterIopubMessage);
  }
  messages.push(Object.freeze({ msg_type: "status" as const, content: Object.freeze({ execution_state: "idle" }) as JsonValue }));
  return Object.freeze(messages);
}

/** Project a notebook's ordered code-cell log into record-tier statement material. */
export function cellsToRecords(notebook: JupyterNotebook): readonly JupyterExecutionRecord[] {
  const admitted = jupyterNotebookContract.assert(notebook, "cellsToRecords notebook") as JupyterNotebook;
  return Object.freeze(admitted.cells.flatMap((cell, index) => {
    if (cell.cell_type !== "code") return [];
    const code = jupyterCodeCellContract.assert(cell, "cellsToRecords code cell") as JupyterCodeCell;
    return [jupyterExecutionRecordContract.assert(Object.freeze({
      kind: "jupyter.witness.record",
      cellId: codeCellId(code, index),
      index,
      source: sourceText(code.source),
      executionCount: code.execution_count,
      outputs: Object.freeze([...code.outputs]),
      metadata: jsonRecord(code.metadata, "cellsToRecords metadata"),
    }), "Jupyter execution record") as JupyterExecutionRecord];
  }));
}

/** Rebuild ordered code cells from the record-tier execution projection. */
export function recordsToCells(records: readonly JupyterExecutionRecord[]): readonly JupyterCodeCell[] {
  return Object.freeze(records
    .map((record) => jupyterExecutionRecordContract.assert(record, "recordsToCells record") as JupyterExecutionRecord)
    .sort((left, right) => left.index - right.index || left.cellId.localeCompare(right.cellId))
    .map((record) => jupyterCodeCell(record.source, {
      id: record.cellId,
      outputs: record.outputs,
      executionCount: record.executionCount,
      metadata: record.metadata,
    })));
}

/** Project a notebook into a named statement log. */
export function executionLogFromNotebook(notebook: JupyterNotebook, options: { readonly notebook?: string } = {}): JupyterExecutionLog {
  return jupyterExecutionLogContract.assert(Object.freeze({
    kind: "jupyter.witness.log",
    ...(options.notebook === undefined ? {} : { notebook: options.notebook }),
    records: cellsToRecords(notebook),
  }), "jupyter statement log") as JupyterExecutionLog;
}

/** Rebuild a minimal notebook from execution records. */
export function notebookFromRecords(records: readonly JupyterExecutionRecord[], options: { readonly metadata?: JsonRecord; readonly nbformatMinor?: number } = {}): JupyterNotebook {
  return jupyterNotebook(recordsToCells(records), options);
}

/** The brick law named by the Jupyter protocol relation: recordsToCells after cellsToRecords is identity on code-cell logs. */
export function codeCellLogRoundTrip(notebook: JupyterNotebook): boolean {
  const original = cellsToRecords(notebook);
  const rebuilt = cellsToRecords(notebookFromRecords(original));
  return canonicalBytes(original as unknown as JsonValue) === canonicalBytes(rebuilt as unknown as JsonValue);
}
