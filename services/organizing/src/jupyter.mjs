/**
 * jupyter - organizing-owned standards boundary for notebook/runtime projection.
 *
 * Relating owns generic HTTP, OpenAPI, MCP, and codec law. This module owns the
 * Jupyter-shaped carriers that only make sense as organizing runtime projections:
 * notebooks as work records, kernels as offices of execution, sessions as active
 * work, and contents as organized workspace resources.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { buildHtmlDocumentPlan } from "@red-cup-engineering/html-engineering-services-section/html-document-render";

export const JupyterJsonSchema = {};
export const JupyterJsonRecordSchema = { type: "object", additionalProperties: true };
export const JupyterSourceSchema = { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] };

export const JupyterStreamOutputSchema = {
  type: "object",
  additionalProperties: true,
  required: ["output_type", "name", "text"],
  properties: {
    output_type: { const: "stream" },
    name: { enum: ["stdout", "stderr"] },
    text: JupyterSourceSchema,
  },
};

export const JupyterDisplayOutputSchema = {
  type: "object",
  additionalProperties: true,
  required: ["output_type", "data", "metadata"],
  properties: {
    output_type: { enum: ["display_data", "execute_result"] },
    data: JupyterJsonRecordSchema,
    metadata: JupyterJsonRecordSchema,
    execution_count: { type: ["number", "null"] },
  },
};

export const JupyterErrorOutputSchema = {
  type: "object",
  additionalProperties: true,
  required: ["output_type", "ename", "evalue", "traceback"],
  properties: {
    output_type: { const: "error" },
    ename: { type: "string" },
    evalue: { type: "string" },
    traceback: { type: "array", items: { type: "string" } },
  },
};

export const JupyterOutputSchema = { anyOf: [JupyterStreamOutputSchema, JupyterDisplayOutputSchema, JupyterErrorOutputSchema] };

export const JupyterMarkdownCellSchema = {
  type: "object",
  additionalProperties: true,
  required: ["cell_type", "metadata", "source"],
  properties: {
    cell_type: { enum: ["markdown", "raw"] },
    id: { type: "string", minLength: 1 },
    metadata: JupyterJsonRecordSchema,
    source: JupyterSourceSchema,
  },
};

export const JupyterCodeCellSchema = {
  type: "object",
  additionalProperties: true,
  required: ["cell_type", "metadata", "source", "execution_count", "outputs"],
  properties: {
    cell_type: { const: "code" },
    id: { type: "string", minLength: 1 },
    metadata: JupyterJsonRecordSchema,
    source: JupyterSourceSchema,
    execution_count: { type: ["number", "null"] },
    outputs: { type: "array", items: JupyterOutputSchema },
  },
};

export const JupyterCellSchema = { anyOf: [JupyterMarkdownCellSchema, JupyterCodeCellSchema] };

export const JupyterNotebookSchema = {
  $id: "organizing/jupyter/notebook",
  title: "Jupyter notebook",
  description: "An organizing-owned nbformat 4 notebook projection.",
  type: "object",
  additionalProperties: true,
  required: ["nbformat", "nbformat_minor", "metadata", "cells"],
  properties: {
    nbformat: { const: 4 },
    nbformat_minor: { type: "number", minimum: 0 },
    metadata: JupyterJsonRecordSchema,
    cells: { type: "array", items: JupyterCellSchema },
  },
};

export const JupyterKernelSpecSchema = {
  $id: "organizing/jupyter/kernelspec",
  title: "Jupyter kernelspec",
  description: "A Jupyter kernelspec projected from an organizing execution office.",
  type: "object",
  additionalProperties: true,
  required: ["argv", "display_name", "language"],
  properties: {
    argv: { type: "array", minItems: 1, items: { type: "string" } },
    display_name: { type: "string", minLength: 1 },
    language: { type: "string", minLength: 1 },
    env: JupyterJsonRecordSchema,
    metadata: JupyterJsonRecordSchema,
  },
};

export const JupyterKernelModelSchema = {
  $id: "organizing/jupyter/kernel",
  title: "Jupyter kernel model",
  description: "A Jupyter Server kernel model projected from organizing runtime state.",
  type: "object",
  additionalProperties: true,
  required: ["id", "name"],
  properties: {
    id: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
    last_activity: { type: "string" },
    execution_state: { enum: ["starting", "idle", "busy", "restarting", "dead", "unknown"] },
    connections: { type: "number", minimum: 0 },
  },
};

export const JupyterSessionModelSchema = {
  $id: "organizing/jupyter/session",
  title: "Jupyter session model",
  description: "A Jupyter Server session model projected from organizing active work.",
  type: "object",
  additionalProperties: true,
  required: ["id", "path", "name", "type", "kernel"],
  properties: {
    id: { type: "string", minLength: 1 },
    path: { type: "string" },
    name: { type: "string" },
    type: { enum: ["notebook", "console", "file", "terminal"] },
    kernel: JupyterKernelModelSchema,
  },
};

export const JupyterContentsModelSchema = {
  $id: "organizing/jupyter/contents",
  title: "Jupyter contents model",
  description: "A Jupyter Server contents model projected over an organized workspace.",
  type: "object",
  additionalProperties: true,
  required: ["name", "path", "type", "writable", "created", "last_modified", "mimetype", "content", "format"],
  properties: {
    name: { type: "string" },
    path: { type: "string" },
    type: { enum: ["file", "directory", "notebook"] },
    writable: { type: "boolean" },
    created: { type: "string" },
    last_modified: { type: "string" },
    mimetype: { type: ["string", "null"] },
    content: JupyterJsonSchema,
    format: { enum: ["json", "text", "base64", null] },
  },
};

export const jupyterNotebookCarrier = schemaFrom(JupyterNotebookSchema);
export const jupyterKernelSpecCarrier = schemaFrom(JupyterKernelSpecSchema);
export const jupyterKernelModelCarrier = schemaFrom(JupyterKernelModelSchema);
export const jupyterSessionModelCarrier = schemaFrom(JupyterSessionModelSchema);
export const jupyterContentsModelCarrier = schemaFrom(JupyterContentsModelSchema);

export const ORGANIZING_JUPYTER_METADATA_KEY = "organizing";

export const jupyterHtmlRenderProfile = Object.freeze({
  kind: "rendering.profile",
  name: "jupyter-html",
  allowedElements: Object.freeze([
    "article",
    "section",
    "header",
    "h1",
    "h2",
    "p",
    "pre",
    "code",
    "div",
    "span",
    "ol",
    "ul",
    "li",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "figure",
    "figcaption",
    "details",
    "summary",
  ]),
  allowedStyleBehavior: Object.freeze(["none", "static", "settled-interactive"]),
  // Regimes by their Lean names; the CSS system's own is read off its cascade's closure.
  allowedCompletionRegimes: Object.freeze(["strict", "scott"]),
  obligations: Object.freeze([
    "nbformat-carrier-preserved",
    "code-cell-log-preserved",
    "outputs-carried-as-records",
    "no-browser-script-as-primitive",
  ]),
  preservationLaws: Object.freeze([
    "preserve-addresses",
    "preserve-order",
    "preserve-references",
    "preserve-valuation-sites",
    "carrier-not-document",
    "css-settles",
  ]),
});

export function jupyterNotebookHtmlFiber(
  input

,
) {
  const notebook = jupyterNotebookCarrier.assert(input.notebook, "jupyterNotebookHtmlFiber");
  const renderFiber = buildHtmlDocumentPlan(
    jupyterHtmlRenderProfile,
    input.carrier,
    input.system,
    input.styleBehavior ?? "static",
  );
  if (renderFiber.kind !== "rendering.profile_forms_render_fiber:witness") {
    return Object.freeze({
      kind: "organizing.jupyter.htmlProfileFiber-obstruction",
      notebook,
      profile: jupyterHtmlRenderProfile,
      renderFiber,
    });
  }
  return Object.freeze({
    kind: "organizing.jupyter.htmlProfileFiber:witness",
    notebook,
    profile: jupyterHtmlRenderProfile,
    renderFiber,
  });
}

export const organizingIpynbCodec = Object.freeze({
  name: "organizing.ipynb",
  mediaType: "application/x-ipynb+json",
  decode: decodeIpynb,
  encode: encodeIpynb,
});

export function organizingNotebook(input) {
  const cells = input.cells === undefined || input.cells.length === 0
    ? defaultNotebookCells(input)
    : input.cells.map(jupyterCell);
  return jupyterNotebookCarrier.assert(Object.freeze({
    nbformat: 4,
    nbformat_minor: 5,
    metadata: Object.freeze({
      ...(input.metadata ?? {}),
      [ORGANIZING_JUPYTER_METADATA_KEY]: Object.freeze({
        id: input.id,
        title: input.title,
        renderProfile: jupyterHtmlRenderProfile.name,
        ...(input.summary === undefined ? {} : { summary: input.summary }),
      }),
    }),
    cells: Object.freeze(cells),
  }), "organizingNotebook");
}

export function encodeIpynb(notebook) {
  const admitted = jupyterNotebookCarrier.assert(notebook, "ipynb");
  return `${JSON.stringify(admitted, null, 2)}\n`;
}

export function decodeIpynb(text) {
  const parsed = JSON.parse(text);
  return jupyterNotebookCarrier.assert(parsed, "ipynb");
}

export function organizingKernelSpec(input

) {
  if (input.argv.length === 0) throw new TypeError("organizingKernelSpec: argv must contain at least one command");
  return jupyterKernelSpecCarrier.assert(Object.freeze({
    argv: Object.freeze([...input.argv]),
    display_name: input.displayName,
    language: input.language,
    ...(input.env === undefined ? {} : { env: input.env }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  }), "organizingKernelSpec");
}

export function organizingKernelModel(input

) {
  return jupyterKernelModelCarrier.assert(Object.freeze({
    id: input.id,
    name: input.name,
    ...(input.lastActivity === undefined ? {} : { last_activity: input.lastActivity }),
    ...(input.executionState === undefined ? {} : { execution_state: input.executionState }),
    ...(input.connections === undefined ? {} : { connections: input.connections }),
  }), "organizingKernelModel");
}

export function organizingSessionModel(input

) {
  return jupyterSessionModelCarrier.assert(Object.freeze({
    id: input.id,
    path: input.path,
    name: input.name,
    type: input.type ?? "notebook",
    kernel: input.kernel,
  }), "organizingSessionModel");
}

export function organizingContentsModel(input

) {
  return jupyterContentsModelCarrier.assert(Object.freeze({
    name: input.name,
    path: input.path,
    type: input.type,
    writable: input.writable ?? true,
    created: input.created,
    last_modified: input.lastModified,
    mimetype: input.mimetype ?? null,
    content: input.content ?? null,
    format: input.format ?? null,
  }), "organizingContentsModel");
}

function defaultNotebookCells(input) {
  return Object.freeze([
    jupyterCell({
      kind: "markdown",
      source: [`# ${input.title}\n`, "\n", input.summary ?? "Organizing notebook projection."],
      metadata: Object.freeze({ [ORGANIZING_JUPYTER_METADATA_KEY]: "title" }),
    }),
  ]);
}

function jupyterCell(cell) {
  const metadata = cell.metadata ?? Object.freeze({});
  if (cell.kind === "code") {
    return Object.freeze({
      cell_type: "code",
      metadata,
      source: sourceValue(cell.source),
      execution_count: cell.executionCount ?? null,
      outputs: [...(cell.outputs ?? [])],
    });
  }
  return Object.freeze({
    cell_type: cell.kind,
    metadata,
    source: sourceValue(cell.source),
  });
}

function sourceValue(source) {
  return typeof source === "string" ? source : [...source];
}
