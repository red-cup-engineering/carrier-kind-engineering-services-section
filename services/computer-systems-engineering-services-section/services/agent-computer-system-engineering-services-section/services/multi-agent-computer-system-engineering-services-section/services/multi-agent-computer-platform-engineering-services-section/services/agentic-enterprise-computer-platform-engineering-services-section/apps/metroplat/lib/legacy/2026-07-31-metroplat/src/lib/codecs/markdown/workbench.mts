/**
 * formats/markdown/workbench - one programmatic surface for Markdown documents.
 *
 * This folds the package's Markdown codec, structure read, feature extraction,
 * validation, HTML projection, and edit normalization into one JSON-safe readout.
 * Callers that need to inspect or transform one Markdown file should start here
 * instead of manually sequencing the lower-level helpers.
 */
import { type JsonRecord } from "../json/core.mts";
import {
  readMarkdownDocument,
  type MarkdownAssertion,
  type MarkdownDocumentReadout,
  type MarkdownFrontmatterFormat,
  type ReadMarkdownDocumentOptions,
} from "./document.mts";
import { applyMarkdownEdit, type MarkdownEditOperation } from "./edit.mts";
import { markdownFeatures, type MarkdownFeature } from "./features.mts";
import { splitFrontMatterFence } from "./frontmatter.mts";
import { markdownBodyToHtml } from "./html.mts";
import { semanticLineBreaks } from "./semantic-line-breaks.mts";
import { markdownStructure, type MarkdownStructure } from "./structure.mts";
import { markdownValidationReport, type MarkdownValidationReport } from "./validation.mts";

export const markdownWorkbenchKind = "metroplat.markdown.workbench" as const;

export const MARKDOWN_WORKBENCH_EDIT_OPERATIONS: readonly MarkdownEditOperation["operation"][] = Object.freeze([
  "set-document",
  "set-frontmatter",
  "merge-frontmatter",
  "delete-frontmatter",
  "rename-frontmatter",
  "set-body",
  "prepend-body",
  "append-body",
  "replace-text",
  "replace-pattern",
  "insert-lines",
  "replace-lines",
  "delete-lines",
  "replace-section",
  "upsert-section",
  "delete-section",
  "normalize-body",
  "normalize-repo-markdown",
]);

export type MarkdownWorkbenchText = Readonly<{
  readonly text: string;
  readonly bytes: number;
  readonly lines: number;
  readonly hasFinalNewline: boolean;
}>;

export type MarkdownWorkbenchCandidate = Readonly<{
  readonly changed: boolean;
  readonly text: string;
  readonly bytes: number;
}>;

export type MarkdownWorkbenchNormalization = Readonly<{
  readonly semanticLinefeedDocument: MarkdownWorkbenchCandidate;
  readonly repoMarkdownDocument: MarkdownWorkbenchCandidate;
}>;

export type MarkdownWorkbenchReadout = Readonly<{
  readonly kind: typeof markdownWorkbenchKind;
  readonly subject: string;
  readonly format: MarkdownFrontmatterFormat;
  readonly source: MarkdownWorkbenchText;
  readonly frontmatter: JsonRecord;
  readonly body: string;
  readonly structure: MarkdownStructure;
  readonly features: readonly MarkdownFeature[];
  readonly assertions: readonly MarkdownAssertion[];
  readonly validation: MarkdownValidationReport;
  readonly html: string;
  readonly normalization: MarkdownWorkbenchNormalization;
  readonly editOperations: readonly MarkdownEditOperation["operation"][];
}>;

export type MarkdownWorkbenchOptions = ReadMarkdownDocumentOptions & Readonly<{
  readonly forbiddenFrontmatterKeys?: readonly string[];
}>;

function lineCount(text: string): number {
  if (text === "") return 0;
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

function textReadout(text: string): MarkdownWorkbenchText {
  return Object.freeze({
    text,
    bytes: Buffer.byteLength(text, "utf8"),
    lines: lineCount(text),
    hasFinalNewline: text.endsWith("\n"),
  });
}

function candidate(original: string, text: string): MarkdownWorkbenchCandidate {
  return Object.freeze({
    changed: text !== original,
    text,
    bytes: Buffer.byteLength(text, "utf8"),
  });
}

function semanticLinefeedDocument(text: string): string {
  const fence = splitFrontMatterFence(text);
  if (fence === null) return semanticLineBreaks(text);
  const bodyOffset = Math.max(0, text.length - fence.body.length);
  return `${text.slice(0, bodyOffset)}${semanticLineBreaks(fence.body)}`;
}

function fallbackDocumentReadout(
  text: string,
  validation: MarkdownValidationReport,
  options: MarkdownWorkbenchOptions,
): MarkdownDocumentReadout {
  const frontmatter = Object.freeze({ ...(validation.frontmatter ?? {}) }) as JsonRecord;
  const coordinate = options.coordinate ?? "markdown";
  const subject = options.subject ?? (typeof frontmatter["slug"] === "string" && frontmatter["slug"].trim() !== "" ? frontmatter["slug"] : coordinate);
  const body = validation.body;
  return Object.freeze({
    subject,
    format: validation.format,
    frontmatter,
    body,
    structure: markdownStructure(text),
    features: markdownFeatures(body),
    assertions: Object.freeze([]),
  });
}

function repoMarkdownDocument(text: string, forbiddenFrontmatterKeys: readonly string[] | undefined): string {
  return applyMarkdownEdit(text, {
    kind: "metroplat.markdown.edit-request",
    operations: Object.freeze([Object.freeze({
      operation: "normalize-repo-markdown" as const,
      ...(forbiddenFrontmatterKeys === undefined ? {} : { forbiddenKeys: forbiddenFrontmatterKeys }),
    })]),
  }).text;
}

export function markdownWorkbench(text: string, options: MarkdownWorkbenchOptions = {}): MarkdownWorkbenchReadout {
  const validation = markdownValidationReport(text, {
    ...(options.forbiddenFrontmatterKeys === undefined ? {} : { forbiddenFrontmatterKeys: options.forbiddenFrontmatterKeys }),
  });
  let document: MarkdownDocumentReadout;
  try {
    document = readMarkdownDocument(text, options);
  } catch {
    document = fallbackDocumentReadout(text, validation, options);
  }
  const semanticText = semanticLinefeedDocument(text);
  const repoText = validation.parseable
    ? repoMarkdownDocument(text, options.forbiddenFrontmatterKeys)
    : semanticText;
  return Object.freeze({
    kind: markdownWorkbenchKind,
    subject: document.subject,
    format: document.format,
    source: textReadout(text),
    frontmatter: document.frontmatter,
    body: document.body,
    structure: document.structure,
    features: document.features,
    assertions: document.assertions,
    validation,
    html: markdownBodyToHtml(document.body),
    normalization: Object.freeze({
      semanticLinefeedDocument: candidate(text, semanticText),
      repoMarkdownDocument: candidate(text, repoText),
    }),
    editOperations: MARKDOWN_WORKBENCH_EDIT_OPERATIONS,
  });
}
