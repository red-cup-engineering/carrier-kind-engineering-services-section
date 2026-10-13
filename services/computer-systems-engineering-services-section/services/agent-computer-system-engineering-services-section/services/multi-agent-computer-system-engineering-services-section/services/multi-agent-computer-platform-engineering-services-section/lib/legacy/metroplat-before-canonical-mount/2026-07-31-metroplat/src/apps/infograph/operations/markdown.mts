/**
 * @packageDocumentation
 *
 * apps/infograph/operations/markdown - programmatic Markdown document operation.
 *
 * This is the package operation for working with one Markdown document as material:
 * inspect the current readout, optionally apply structured Markdown edit
 * operations, and inspect the resulting readout. File persistence stays with
 * filesystem's `write`; this operation is the pure document operation surface.
 */
import { schemaFrom } from "../../../lib/schema/index.mts";
import { type JsonValue } from "../../../lib/codecs/json/core.mts";
import {
  applyMarkdownEdit,
  isMarkdownEditRequest,
  markdownWorkbench,
  type MarkdownEditApplication,
  type MarkdownEditOperation,
  type MarkdownWorkbenchReadout,
} from "../../../lib/codecs/markdown/index.mts";
import { operation, type Operation } from "../../../rpc/index.mts";

const markdownWorkbenchRequestSchema = {
  $id: "metroplat/markdown/workbench-request",
  title: "MarkdownWorkbenchRequest",
  description: "Request to inspect and optionally transform one Markdown document text.",
  type: "object",
  required: ["text"],
  additionalProperties: false,
  properties: {
    text: { type: "string" },
    coordinate: { type: "string" },
    subject: { type: "string" },
    jsonObjectFrontmatter: { type: "boolean" },
    frontmatterFormats: {
      type: "array",
      items: { enum: ["yaml", "toml"] },
    },
    forbiddenFrontmatterKeys: {
      type: "array",
      items: { type: "string" },
    },
    operations: {
      type: "array",
      items: {
        type: "object",
        required: ["operation"],
        additionalProperties: true,
        properties: {
          operation: { type: "string" },
        },
      },
    },
  },
} as const;

const markdownWorkbenchResponseSchema = {
  $id: "metroplat/markdown/workbench-response",
  title: "MarkdownWorkbenchResponse",
  description: "Before/after workbench readouts and optional structured edit receipt for one Markdown text.",
  type: "object",
  required: ["kind", "before", "text"],
  additionalProperties: true,
  properties: {
    kind: { const: "metroplat.markdown.workbench-response" },
    before: { type: "object", additionalProperties: true },
    after: { type: "object", additionalProperties: true },
    edit: { type: "object", additionalProperties: true },
    text: { type: "string" },
    changed: { type: "boolean" },
  },
} as const;

export type MarkdownWorkbenchOperationRequest = Readonly<{
  readonly text: string;
  readonly coordinate?: string;
  readonly subject?: string;
  readonly jsonObjectFrontmatter?: boolean;
  readonly frontmatterFormats?: readonly ("yaml" | "toml")[];
  readonly forbiddenFrontmatterKeys?: readonly string[];
  readonly operations?: readonly MarkdownEditOperation[];
}>;

export type MarkdownWorkbenchOperationResponse = Readonly<{
  readonly kind: "metroplat.markdown.workbench-response";
  readonly before: MarkdownWorkbenchReadout;
  readonly after?: MarkdownWorkbenchReadout;
  readonly edit?: MarkdownEditApplication["receipt"];
  readonly text: string;
  readonly changed: boolean;
}>;

export const markdownWorkbenchRequestContract = schemaFrom(markdownWorkbenchRequestSchema);
export const markdownWorkbenchResponseContract = schemaFrom(markdownWorkbenchResponseSchema);

function recordValue(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  throw new TypeError("markdown-workbench input must be an object");
}

function requestOptions(request: MarkdownWorkbenchOperationRequest): Parameters<typeof markdownWorkbench>[1] {
  return Object.freeze({
    ...(request.coordinate === undefined ? {} : { coordinate: request.coordinate }),
    ...(request.subject === undefined ? {} : { subject: request.subject }),
    ...(request.jsonObjectFrontmatter === undefined ? {} : { jsonObjectFrontmatter: request.jsonObjectFrontmatter }),
    ...(request.frontmatterFormats === undefined ? {} : { frontmatterFormats: request.frontmatterFormats }),
    ...(request.forbiddenFrontmatterKeys === undefined ? {} : { forbiddenFrontmatterKeys: request.forbiddenFrontmatterKeys }),
  });
}

function editApplication(request: MarkdownWorkbenchOperationRequest): MarkdownEditApplication | undefined {
  if (request.operations === undefined) return undefined;
  const editRequest = Object.freeze({
    kind: "metroplat.markdown.edit-request" as const,
    operations: request.operations,
  });
  if (!isMarkdownEditRequest(editRequest as JsonValue)) {
    throw new TypeError("markdown-workbench operations must be valid metroplat markdown edit operations");
  }
  return applyMarkdownEdit(request.text, editRequest);
}

function markdownWorkbenchOperationRun(input: unknown): MarkdownWorkbenchOperationResponse {
  const request = recordValue(input) as MarkdownWorkbenchOperationRequest;
  const options = requestOptions(request);
  const before = markdownWorkbench(request.text, options);
  const edit = editApplication(request);
  const text = edit?.text ?? request.text;
  const after = edit === undefined ? undefined : markdownWorkbench(text, options);
  return Object.freeze({
    kind: "metroplat.markdown.workbench-response" as const,
    before,
    ...(after === undefined ? {} : { after }),
    ...(edit === undefined ? {} : { edit: edit.receipt }),
    text,
    changed: text !== request.text,
  });
}

export const markdownWorkbenchOperation: Operation = operation({
  verb: "markdown-workbench",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Inspect and transform one Markdown document through MetroPlat's Markdown workbench.",
  description: "Domain: MarkdownWorkbenchRequest. Codomain: MarkdownWorkbenchResponse. Reads decoded frontmatter, body, structure, features, assertions, validation, HTML, normalized candidate documents, and optionally applies structured Markdown edit operations.",
  domain: markdownWorkbenchRequestContract,
  codomain: markdownWorkbenchResponseContract,
  run: markdownWorkbenchOperationRun,
});

export const markdownOperations: readonly Operation[] = Object.freeze([
  markdownWorkbenchOperation,
]);
