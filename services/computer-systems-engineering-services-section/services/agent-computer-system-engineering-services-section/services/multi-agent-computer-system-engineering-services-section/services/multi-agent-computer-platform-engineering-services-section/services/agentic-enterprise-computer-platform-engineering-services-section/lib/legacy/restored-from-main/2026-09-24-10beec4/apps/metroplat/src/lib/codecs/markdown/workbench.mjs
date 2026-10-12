/**
 * formats/markdown/workbench - one programmatic surface for Markdown documents.
 *
 * This folds the package's Markdown codec, structure read, feature extraction,
 * validation, HTML projection, and edit normalization into one JSON-safe readout.
 * Callers that need to inspect or transform one Markdown file should start here
 * instead of manually sequencing the lower-level helpers.
 */
import { } from "@red-cup-engineering/json-services-section";
import {
  readMarkdownDocument,

} from "./document.mjs";
import { applyMarkdownEdit } from "./edit.mjs";
import { markdownFeatures } from "./features.mjs";
import { splitFrontMatterFence } from "./frontmatter.mjs";
import { markdownBodyToHtml } from "./html.mjs";
import { semanticLineBreaks } from "./semantic-line-breaks.mjs";
import { markdownStructure } from "./structure.mjs";
import { markdownValidationReport } from "./validation.mjs";

export const markdownWorkbenchKind = "metroplat.markdown.workbench";

export const MARKDOWN_WORKBENCH_EDIT_OPERATIONS = Object.freeze([
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

function lineCount(text) {
  if (text === "") return 0;
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

function textReadout(text) {
  return Object.freeze({
    text,
    bytes: Buffer.byteLength(text, "utf8"),
    lines: lineCount(text),
    hasFinalNewline: text.endsWith("\n"),
  });
}

function candidate(original, text) {
  return Object.freeze({
    changed: text !== original,
    text,
    bytes: Buffer.byteLength(text, "utf8"),
  });
}

function semanticLinefeedDocument(text) {
  const fence = splitFrontMatterFence(text);
  if (fence === null) return semanticLineBreaks(text);
  const bodyOffset = Math.max(0, text.length - fence.body.length);
  return `${text.slice(0, bodyOffset)}${semanticLineBreaks(fence.body)}`;
}

function fallbackDocumentReadout(
  text,
  validation,
  options,
) {
  const frontmatter = Object.freeze({ ...(validation.frontmatter ?? {}) });
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

function repoMarkdownDocument(text, forbiddenFrontmatterKeys) {
  return applyMarkdownEdit(text, {
    kind: "metroplat.markdown.edit-request",
    operations: Object.freeze([Object.freeze({
      operation: "normalize-repo-markdown",
      ...(forbiddenFrontmatterKeys === undefined ? {} : { forbiddenKeys: forbiddenFrontmatterKeys }),
    })]),
  }).text;
}

export function markdownWorkbench(text, options = {}) {
  const validation = markdownValidationReport(text, {
    ...(options.forbiddenFrontmatterKeys === undefined ? {} : { forbiddenFrontmatterKeys: options.forbiddenFrontmatterKeys }),
  });
  let document;
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
