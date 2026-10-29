/**
 * @red-cup-engineering/organizing-with-python
 *
 * The generic Python faculty. It reads the JupyterLab platform as an
 * organizing harness: the lab server is a habitat; kernels (and the kernelspecs
 * that name them), notebook documents, the cells that make them up, sessions
 * binding a kernel to a document, and cell execution are all modeled as
 * @emsenn/relating carriers (JSON-Schema literals) with bare descent-path `$id`s and
 * carrier-to-carrier / boundary actions.
 *
 * This package is provider-neutral: it knows nothing about VS Code, WSL, or any
 * particular cockpit. The `-in-vs-code` sibling specializes a cockpit over it,
 * exactly as organizing-with-claude-code-in-vs-code specializes the generic VS
 * Code agent cockpit. It mirrors the carrier/action idiom of
 * lib/organizing-with-vscode-agents/src/index.mts.
 *
 * Descent root: `organizing/python/...`. Every `$id` is a bare descent path,
 * never a baked URL; absolute URLs are a serve-time cool-uri projection.
 */
import { action, carrierFrom, tm, type FromSchema } from "@emsenn/relating";

// ───────────────────────────── kernelspec ──────────────────────────────────
// A kernelspec names an installable kernel: the language it runs and how the
// lab server launches it. It is the vocabulary of "what kernels this habitat
// can admit", analogous to a capability surface.

export const KernelSpecSchema = {
  $id: "organizing/python/kernelspec",
  type: "object",
  title: "JupyterKernelSpec",
  required: ["name", "displayName", "language", "argv"],
  properties: {
    name: { type: "string", minLength: 1 },
    displayName: { type: "string", minLength: 1 },
    language: { type: "string", minLength: 1 },
    argv: { type: "array", items: { type: "string", minLength: 1 } },
    interruptMode: { enum: ["signal", "message"] },
  },
  additionalProperties: false,
} as const;

export type JupyterKernelSpec = Readonly<Omit<
  FromSchema<typeof KernelSpecSchema>,
  "argv" | "interruptMode"
> & {
  readonly argv: readonly string[];
  readonly interruptMode?: "signal" | "message";
}>;

export const kernelSpecCarrier = carrierFrom(KernelSpecSchema);

// ─────────────────────────────── kernel ────────────────────────────────────
// A kernel is a running execution context the lab server owns. Its execution
// state is the lab's moment-to-moment liveness signal.

export const KernelExecutionStateSchema = {
  enum: ["starting", "idle", "busy", "dead", "restarting", "unknown"],
} as const;

export type KernelExecutionState = FromSchema<typeof KernelExecutionStateSchema>;

export const KernelSchema = {
  $id: "organizing/python/kernel",
  type: "object",
  title: "JupyterKernel",
  required: ["id", "specName", "executionState", "connections"],
  properties: {
    id: { type: "string", minLength: 1 },
    specName: { type: "string", minLength: 1 },
    executionState: KernelExecutionStateSchema,
    connections: { type: "number", minimum: 0 },
    lastActivity: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export type JupyterKernel = Readonly<Omit<
  FromSchema<typeof KernelSchema>,
  "lastActivity"
> & {
  readonly lastActivity?: string;
}>;

export const kernelCarrier = carrierFrom(KernelSchema);

// ──────────────────────────────── cell ─────────────────────────────────────
// A cell is one unit of a notebook document. Code cells carry an execution
// count and outputs; markdown/raw cells carry only source.

export const CellTypeSchema = { enum: ["code", "markdown", "raw"] } as const;

export type CellType = FromSchema<typeof CellTypeSchema>;

export const NotebookCellSchema = {
  $id: "organizing/python/notebook/cell",
  type: "object",
  title: "JupyterNotebookCell",
  required: ["id", "cellType", "source"],
  properties: {
    id: { type: "string", minLength: 1 },
    cellType: CellTypeSchema,
    source: { type: "string" },
    // executionCount is null until a code cell runs; absent for non-code cells.
    executionCount: { type: ["number", "null"], minimum: 0 },
    outputCount: { type: "number", minimum: 0 },
  },
  additionalProperties: false,
} as const;

export type JupyterNotebookCell = Readonly<Omit<
  FromSchema<typeof NotebookCellSchema>,
  "executionCount" | "outputCount"
> & {
  readonly executionCount?: number | null;
  readonly outputCount?: number;
}>;

export const notebookCellCarrier = carrierFrom(NotebookCellSchema);

// ───────────────────────── notebook document ───────────────────────────────
// A notebook document is the persisted artifact (.ipynb, or a jupytext-paired
// .py). It is the thing under version control and the thing a cockpit opens.

export const NotebookDocumentSchema = {
  $id: "organizing/python/notebook/document",
  type: "object",
  title: "JupyterNotebookDocument",
  required: ["path", "nbformat", "nbformatMinor", "kernelSpecName", "language", "cells"],
  properties: {
    path: { type: "string", minLength: 1 },
    nbformat: { type: "number", minimum: 1 },
    nbformatMinor: { type: "number", minimum: 0 },
    kernelSpecName: { type: "string", minLength: 1 },
    language: { type: "string", minLength: 1 },
    cells: { type: "array", items: NotebookCellSchema },
    // jupytext pairing: the paired text representation, if any (e.g. py:percent).
    pairedFormat: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export type JupyterNotebookDocument = Readonly<Omit<
  FromSchema<typeof NotebookDocumentSchema>,
  "cells" | "pairedFormat"
> & {
  readonly cells: readonly JupyterNotebookCell[];
  readonly pairedFormat?: string;
}>;

export const notebookDocumentCarrier = carrierFrom(NotebookDocumentSchema);

// ────────────────────────────── session ────────────────────────────────────
// A session binds a notebook document to a running kernel. It is the live
// pairing the lab server tracks (path ↔ kernel).

export const SessionTypeSchema = { enum: ["notebook", "console", "file"] } as const;

export type SessionType = FromSchema<typeof SessionTypeSchema>;

export const SessionSchema = {
  $id: "organizing/python/session",
  type: "object",
  title: "JupyterSession",
  required: ["id", "path", "name", "type", "kernelId"],
  properties: {
    id: { type: "string", minLength: 1 },
    path: { type: "string", minLength: 1 },
    name: { type: "string" },
    type: SessionTypeSchema,
    kernelId: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export type JupyterSession = Readonly<FromSchema<typeof SessionSchema>>;

export const sessionCarrier = carrierFrom(SessionSchema);

// ─────────────────────────── cell execution ────────────────────────────────
// Cell execution is the request/result carrier: a code cell submitted to a
// kernel and the settlement it produces (ok / error / aborted) with its
// outputs. `executeCellAction` is the carrier-to-carrier morphism from a
// pending request to its settled result.

export const ExecutionStatusSchema = { enum: ["ok", "error", "aborted", "pending"] } as const;

export type ExecutionStatus = FromSchema<typeof ExecutionStatusSchema>;

export const OutputKindSchema = { enum: ["stream", "execute_result", "display_data", "error"] } as const;

export type OutputKind = FromSchema<typeof OutputKindSchema>;

export const CellExecutionSchema = {
  $id: "organizing/python/execution/cell",
  type: "object",
  title: "JupyterCellExecution",
  required: ["kernelId", "cellId", "code", "status", "outputs"],
  properties: {
    kernelId: { type: "string", minLength: 1 },
    cellId: { type: "string", minLength: 1 },
    code: { type: "string" },
    status: ExecutionStatusSchema,
    executionCount: { type: ["number", "null"], minimum: 0 },
    outputs: {
      type: "array",
      items: {
        type: "object",
        required: ["kind"],
        properties: {
          kind: OutputKindSchema,
          text: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

export type JupyterCellExecution = Readonly<Omit<
  FromSchema<typeof CellExecutionSchema>,
  "executionCount" | "outputs"
> & {
  readonly executionCount?: number | null;
  readonly outputs: readonly Readonly<{ kind: OutputKind; text?: string }>[];
}>;

export const cellExecutionCarrier = carrierFrom(CellExecutionSchema);

// ──────────────────────────── lab habitat ──────────────────────────────────
// The lab server itself, read as a habitat: a base URL the server listens on,
// the kernelspecs it can admit, and its live kernels and sessions. This is the
// organizing harness boundary — the "where the work runs" carrier.

export const LabHabitatSchema = {
  $id: "organizing/python/habitat",
  type: "object",
  title: "JupyterLabHabitat",
  required: ["baseUrl", "rootDir", "kernelSpecs", "kernels", "sessions"],
  properties: {
    baseUrl: { type: "string", minLength: 1 },
    rootDir: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    kernelSpecs: { type: "array", items: KernelSpecSchema },
    kernels: { type: "array", items: KernelSchema },
    sessions: { type: "array", items: SessionSchema },
  },
  additionalProperties: false,
} as const;

export type JupyterLabHabitat = Readonly<Omit<
  FromSchema<typeof LabHabitatSchema>,
  "version" | "kernelSpecs" | "kernels" | "sessions"
> & {
  readonly version?: string;
  readonly kernelSpecs: readonly JupyterKernelSpec[];
  readonly kernels: readonly JupyterKernel[];
  readonly sessions: readonly JupyterSession[];
}>;

export const labHabitatCarrier = carrierFrom(LabHabitatSchema);

// ─────────────────────── default / reference values ────────────────────────
// A reference habitat matching the super-repo `lab/` submodule: a WSL-built uv
// venv serving JupyterLab over paired py:percent notebooks (see lab/Makefile
// `lab` and `nb` targets). These mirror defaultVsCodeAgentExtension etc.

export const defaultPythonKernelSpec: JupyterKernelSpec = Object.freeze({
  name: "python3",
  displayName: "Python 3 (uv venv)",
  language: "python",
  // TODO(verify): the actual argv the lab/ venv launches; this is the standard
  // ipykernel launch line. The WSL venv interpreter is .venv/bin/python.
  argv: Object.freeze([
    ".venv/bin/python",
    "-m",
    "ipykernel_launcher",
    "-f",
    "{connection_file}",
  ]),
  interruptMode: "signal",
});

export const defaultLabHabitat: JupyterLabHabitat = Object.freeze({
  baseUrl: "http://localhost:8888/",
  rootDir: "lab",
  kernelSpecs: Object.freeze([defaultPythonKernelSpec]),
  kernels: Object.freeze([] as readonly JupyterKernel[]),
  sessions: Object.freeze([] as readonly JupyterSession[]),
});

// ───────────────────────── derivations / readers ───────────────────────────

/** True when the habitat has at least one live, non-dead kernel. */
export function habitatHasLiveKernel(habitat: JupyterLabHabitat): boolean {
  return habitat.kernels.some((kernel) => kernel.executionState !== "dead");
}

/** Count code cells in a notebook document. */
export function codeCellCount(document: JupyterNotebookDocument): number {
  return document.cells.filter((cell) => cell.cellType === "code").length;
}

/** A pending cell-execution request carrier for a code cell against a kernel. */
export function pendingCellExecution(input: Readonly<{
  kernelId: string;
  cellId: string;
  code: string;
}>): JupyterCellExecution {
  return Object.freeze({
    kernelId: input.kernelId,
    cellId: input.cellId,
    code: input.code,
    status: "pending" as const,
    executionCount: null,
    outputs: Object.freeze([] as readonly Readonly<{ kind: OutputKind; text?: string }>[]),
  });
}

// ──────────────────────────────── actions ──────────────────────────────────
// Canonicalization actions are identity morphisms on each carrier (mirroring
// canonicalizeVsCodeAgentExtensionAction). `executeCellAction` is a real
// carrier-to-carrier morphism: cell execution → cell execution, the place a
// downstream runtime binds the actual kernel round-trip behind the IR boundary.

export const canonicalizeKernelSpecAction = action({
  verb: "organizing.python.canonicalize-kernelspec",
  description: "Canonicalize a JupyterLab kernelspec carrier.",
  domain: kernelSpecCarrier,
  codomain: kernelSpecCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeKernelAction = action({
  verb: "organizing.python.canonicalize-kernel",
  description: "Canonicalize a JupyterLab running-kernel carrier.",
  domain: kernelCarrier,
  codomain: kernelCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeNotebookCellAction = action({
  verb: "organizing.python.canonicalize-notebook-cell",
  description: "Canonicalize a JupyterLab notebook cell carrier.",
  domain: notebookCellCarrier,
  codomain: notebookCellCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeNotebookDocumentAction = action({
  verb: "organizing.python.canonicalize-notebook-document",
  description: "Canonicalize a JupyterLab notebook document carrier.",
  domain: notebookDocumentCarrier,
  codomain: notebookDocumentCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeSessionAction = action({
  verb: "organizing.python.canonicalize-session",
  description: "Canonicalize a JupyterLab session carrier.",
  domain: sessionCarrier,
  codomain: sessionCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeLabHabitatAction = action({
  verb: "organizing.python.canonicalize-habitat",
  description: "Canonicalize a JupyterLab server habitat carrier.",
  domain: labHabitatCarrier,
  codomain: labHabitatCarrier,
  runTerm: tm.lam(tm.var(0)),
});

/**
 * Execute a cell: the morphism from a (possibly pending) cell-execution carrier
 * to its settled form. The IR body is identity at this layer; a downstream
 * runtime that actually owns a kernel connection supplies the real round-trip
 * by binding this morphism's `run`. This keeps the kernel side-effect behind
 * the action boundary rather than in the carrier algebra.
 *
 * TODO(runtime): bind a real kernel round-trip in the -in-vs-code / serving
 * layer; here the morphism only types the boundary.
 */
export const executeCellAction = action({
  verb: "organizing.python.execute-cell",
  description: "Settle a JupyterLab cell execution against its kernel.",
  domain: cellExecutionCarrier,
  codomain: cellExecutionCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const actions = Object.freeze([
  canonicalizeKernelSpecAction,
  canonicalizeKernelAction,
  canonicalizeNotebookCellAction,
  canonicalizeNotebookDocumentAction,
  canonicalizeSessionAction,
  canonicalizeLabHabitatAction,
  executeCellAction,
]);
