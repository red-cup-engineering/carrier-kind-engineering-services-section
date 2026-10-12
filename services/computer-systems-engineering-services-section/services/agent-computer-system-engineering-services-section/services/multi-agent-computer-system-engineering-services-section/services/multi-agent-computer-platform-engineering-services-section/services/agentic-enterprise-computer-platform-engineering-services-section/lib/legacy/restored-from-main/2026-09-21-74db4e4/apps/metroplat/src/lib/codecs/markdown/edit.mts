/**
 * formats/markdown/edit - pure document edit operations for markdown files.
 *
 * The document codec reads and writes whole markdown texts. This module is the
 * file-editor layer over that codec: callers can patch frontmatter, body text,
 * line ranges, literal/pattern matches, and heading sections without dropping to
 * ad hoc shell tools or reimplementing frontmatter splitting.
 */
import { type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { isObjectRecord } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { encodeToml, type TomlTable } from "@red-cup-engineering/toml-codec-service";
import {
  createMarkdown,
  decodeMarkdownFrontmatter,
  parseMarkdown,
  type MarkdownFrontmatterFormat,
} from "./document.mts";
import { splitFrontMatterFence } from "./frontmatter.mts";
import { semanticLineBreaks } from "./semantic-line-breaks.mts";

export const markdownEditRequestKind = "metroplat.markdown.edit-request" as const;
export const markdownEditReceiptKind = "metroplat.markdown.edit-receipt" as const;

export type MarkdownFrontmatterPatchMode = "replace" | "merge";

export type MarkdownEditOperation =
  | Readonly<{ readonly operation: "set-document"; readonly frontmatter?: JsonRecord | null; readonly body: string; readonly format?: Exclude<MarkdownFrontmatterFormat, null>; readonly semanticLineBreaks?: boolean }>
  | Readonly<{ readonly operation: "set-frontmatter"; readonly frontmatter: JsonRecord; readonly format?: Exclude<MarkdownFrontmatterFormat, null> }>
  | Readonly<{ readonly operation: "merge-frontmatter"; readonly patch: JsonRecord; readonly format?: Exclude<MarkdownFrontmatterFormat, null> }>
  | Readonly<{ readonly operation: "delete-frontmatter"; readonly keys: readonly string[] }>
  | Readonly<{ readonly operation: "rename-frontmatter"; readonly from: string; readonly to: string; readonly overwrite?: boolean; readonly format?: Exclude<MarkdownFrontmatterFormat, null> }>
  | Readonly<{ readonly operation: "set-body"; readonly body: string; readonly semanticLineBreaks?: boolean }>
  | Readonly<{ readonly operation: "prepend-body" | "append-body"; readonly text: string; readonly separator?: string }>
  | Readonly<{ readonly operation: "replace-text"; readonly search: string; readonly replacement: string; readonly all?: boolean; readonly required?: boolean }>
  | Readonly<{ readonly operation: "replace-pattern"; readonly pattern: string; readonly flags?: string; readonly replacement: string; readonly required?: boolean }>
  | Readonly<{ readonly operation: "insert-lines"; readonly atLine: number; readonly text: string }>
  | Readonly<{ readonly operation: "replace-lines"; readonly startLine: number; readonly endLine: number; readonly text: string }>
  | Readonly<{ readonly operation: "delete-lines"; readonly startLine: number; readonly endLine: number }>
  | Readonly<{ readonly operation: "replace-section"; readonly heading: string; readonly level?: number; readonly body: string; readonly required?: boolean }>
  | Readonly<{ readonly operation: "upsert-section"; readonly heading: string; readonly level?: number; readonly body: string }>
  | Readonly<{ readonly operation: "delete-section"; readonly heading: string; readonly level?: number; readonly required?: boolean }>
  | Readonly<{ readonly operation: "normalize-body"; readonly mode: "semantic-line-breaks" }>
  | Readonly<{ readonly operation: "normalize-repo-markdown"; readonly forbiddenKeys?: readonly string[] }>;

export type MarkdownEditRequest = Readonly<{
  readonly kind: typeof markdownEditRequestKind;
  readonly operations: readonly MarkdownEditOperation[];
  readonly createIfMissing?: boolean;
  readonly initialText?: string;
}>;

export type MarkdownEditReceipt = Readonly<{
  readonly kind: typeof markdownEditReceiptKind;
  readonly operations: number;
  readonly changed: boolean;
  readonly beforeBytes: number;
  readonly afterBytes: number;
  readonly frontmatterFormat: MarkdownFrontmatterFormat;
}>;

export type MarkdownEditApplication = Readonly<{
  readonly text: string;
  readonly receipt: MarkdownEditReceipt;
}>;

const isRecord = isObjectRecord as (value: unknown) => value is Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return isRecord(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isOperation(value: unknown): value is MarkdownEditOperation {
  if (!isRecord(value) || typeof value.operation !== "string") return false;
  switch (value.operation) {
    case "set-document":
      return typeof value.body === "string" && (value.frontmatter === undefined || value.frontmatter === null || isJsonRecord(value.frontmatter));
    case "set-frontmatter":
      return isJsonRecord(value.frontmatter);
    case "merge-frontmatter":
      return isJsonRecord(value.patch);
    case "delete-frontmatter":
      return isStringArray(value.keys);
    case "rename-frontmatter":
      return typeof value.from === "string" && typeof value.to === "string";
    case "set-body":
      return typeof value.body === "string";
    case "prepend-body":
    case "append-body":
      return typeof value.text === "string";
    case "replace-text":
      return typeof value.search === "string" && typeof value.replacement === "string";
    case "replace-pattern":
      return typeof value.pattern === "string" && typeof value.replacement === "string";
    case "insert-lines":
      return Number.isInteger(value.atLine) && typeof value.text === "string";
    case "replace-lines":
    case "delete-lines":
      return Number.isInteger(value.startLine) && Number.isInteger(value.endLine);
    case "replace-section":
    case "upsert-section":
      return typeof value.heading === "string" && typeof value.body === "string";
    case "delete-section":
      return typeof value.heading === "string";
    case "normalize-body":
      return value.mode === "semantic-line-breaks";
    case "normalize-repo-markdown":
      return value.forbiddenKeys === undefined || isStringArray(value.forbiddenKeys);
    default:
      return false;
  }
}

export function isMarkdownEditRequest(value: JsonValue): value is MarkdownEditRequest & JsonValue {
  return isRecord(value)
    && value.kind === markdownEditRequestKind
    && Array.isArray(value.operations)
    && value.operations.every(isOperation)
    && (value.initialText === undefined || typeof value.initialText === "string");
}

function frontmatterFormat(text: string): MarkdownFrontmatterFormat {
  return splitFrontMatterFence(text)?.format ?? null;
}

function documentWith(
  frontmatter: JsonRecord | null,
  body: string,
  format: Exclude<MarkdownFrontmatterFormat, null> = "yaml",
  options: { readonly semanticLineBreaks?: boolean } = {},
): string {
  const normalizedBody = options.semanticLineBreaks === false ? body : semanticLineBreaks(body);
  if (frontmatter === null || Object.keys(frontmatter).length === 0) return normalizedBody;
  if (format === "toml") return `+++\n${encodeToml(frontmatter as TomlTable)}+++\n${normalizedBody}`;
  return createMarkdown({ ...frontmatter, body: normalizedBody }, {
    ...(options.semanticLineBreaks === undefined ? {} : { semanticLineBreaks: options.semanticLineBreaks }),
  });
}

function decodeFrontmatter(text: string): { readonly frontmatter: JsonRecord; readonly body: string; readonly format: Exclude<MarkdownFrontmatterFormat, null> | null } {
  const fence = splitFrontMatterFence(text);
  if (fence === null) return Object.freeze({ frontmatter: Object.freeze({}) as JsonRecord, body: text, format: null });
  return Object.freeze({
    frontmatter: decodeMarkdownFrontmatter(fence.format, fence.raw),
    body: fence.body,
    format: fence.format,
  });
}

function withFrontmatter(text: string, next: JsonRecord | null, preferred?: Exclude<MarkdownFrontmatterFormat, null>): string {
  const parsed = decodeFrontmatter(text);
  return documentWith(next, parsed.body, preferred ?? parsed.format ?? "yaml");
}

function deleteFrontmatterKeys(text: string, keys: readonly string[]): string {
  const wanted = new Set(keys);
  if (wanted.size === 0) return text;
  const fence = splitFrontMatterFence(text);
  if (fence === null) return text;
  if (fence.format !== "yaml") {
    const parsed = decodeFrontmatter(text);
    const next = { ...parsed.frontmatter };
    for (const key of wanted) delete next[key];
    return documentWith(next, parsed.body, parsed.format ?? "yaml");
  }
  return documentWith(deleteYamlKeysLineOriented(fence.raw, wanted), fence.body, "yaml");
}

function topLevelYamlKey(line: string): string | null {
  if (/^\s/u.test(line) || line.trim() === "" || line.trimStart().startsWith("#")) return null;
  const quoted = line.match(/^(['"])(.*?)\1\s*:/u);
  if (quoted !== null) return quoted[2] ?? null;
  const bare = line.match(/^([A-Za-z0-9_][A-Za-z0-9_.-]*)\s*:/u);
  return bare?.[1] ?? null;
}

function deleteYamlKeysLineOriented(raw: string, keys: ReadonlySet<string>): JsonRecord {
  const lines = raw.split(/\r?\n/u);
  const kept: string[] = [];
  let dropping = false;
  for (const line of lines) {
    const key = topLevelYamlKey(line);
    if (key !== null) dropping = keys.has(key);
    if (!dropping) kept.push(line);
  }
  return decodeMarkdownFrontmatter("yaml", kept.join("\n"));
}

function bodyOf(text: string): { readonly frontmatter: JsonRecord | null; readonly format: Exclude<MarkdownFrontmatterFormat, null> | null; readonly body: string } {
  const parsed = parseMarkdown(text);
  return Object.freeze({
    frontmatter: parsed.frontmatter === null ? null : ({ ...parsed.frontmatter } as JsonRecord),
    format: parsed.format,
    body: parsed.body,
  });
}

function withoutForbiddenKeys(value: JsonValue, forbidden: ReadonlySet<string>): JsonValue | undefined {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return Object.freeze(value
      .map((entry) => withoutForbiddenKeys(entry, forbidden))
      .filter((entry): entry is JsonValue => entry !== undefined));
  }
  const next: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (forbidden.has(key)) continue;
    const cleaned = withoutForbiddenKeys(entry, forbidden);
    if (cleaned !== undefined) next[key] = cleaned;
  }
  return Object.freeze(next);
}

function normalizeTags(value: JsonValue | undefined): JsonValue | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    const tags = value.flatMap((entry) => typeof entry === "string" ? [entry.trim()] : []).filter((entry) => entry !== "");
    return tags.length === 0 ? undefined : Object.freeze(tags);
  }
  if (typeof value === "string") {
    const tags = value.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "");
    return tags.length === 0 ? undefined : Object.freeze(tags);
  }
  return value;
}

function removeDuplicatedTitleH1(body: string, frontmatter: JsonRecord): string {
  const title = frontmatter["title"];
  if (typeof title !== "string" || title.trim() === "") return body;
  const split = splitLinesPreservingFinal(body);
  const index = split.lines.findIndex((line) => line.trim() !== "");
  if (index < 0) return body;
  const match = split.lines[index]!.match(/^#\s+(.+?)\s*#*\s*$/u);
  if (match?.[1]?.trim() !== title.trim()) return body;
  const lines = [...split.lines.slice(0, index), ...split.lines.slice(index + 1)];
  while (lines[0] === "") lines.shift();
  return joinLines(lines, split.trailing);
}

function normalizeRepoMarkdown(text: string, forbiddenKeys: readonly string[] = ["author", "authors"]): string {
  const parsed = bodyOf(text);
  const forbidden = new Set(forbiddenKeys);
  const cleaned = parsed.frontmatter === null
    ? null
    : withoutForbiddenKeys(parsed.frontmatter as JsonValue, forbidden) as JsonRecord;
  const frontmatter = cleaned === null ? null : { ...cleaned };
  const tags = normalizeTags(frontmatter?.["tags"]);
  if (frontmatter !== null) {
    if (tags === undefined) delete frontmatter["tags"];
    else frontmatter["tags"] = tags;
  }
  const body = frontmatter === null ? parsed.body : removeDuplicatedTitleH1(parsed.body, frontmatter);
  return documentWith(frontmatter, body, parsed.format ?? "yaml");
}

function withBody(text: string, body: string, options: { readonly semanticLineBreaks?: boolean } = {}): string {
  const parsed = bodyOf(text);
  return documentWith(parsed.frontmatter, body, parsed.format ?? "yaml", options);
}

function replaceLiteral(text: string, search: string, replacement: string, all: boolean, required: boolean): string {
  if (search === "") throw new TypeError("markdown edit replace-text: search must be non-empty");
  if (!text.includes(search)) {
    if (required) throw new TypeError(`markdown edit replace-text: ${JSON.stringify(search)} not found`);
    return text;
  }
  return all ? text.split(search).join(replacement) : text.replace(search, replacement);
}

function replacePattern(text: string, pattern: string, flags: string | undefined, replacement: string, required: boolean): string {
  const finalFlags = flags?.includes("g") === true ? flags : `${flags ?? ""}g`;
  const re = new RegExp(pattern, finalFlags);
  if (!re.test(text)) {
    if (required) throw new TypeError(`markdown edit replace-pattern: ${JSON.stringify(pattern)} not found`);
    return text;
  }
  re.lastIndex = 0;
  return text.replace(re, replacement);
}

function splitLinesPreservingFinal(text: string): { readonly lines: string[]; readonly trailing: boolean } {
  const trailing = text.endsWith("\n");
  const lines = text.split("\n");
  if (trailing) lines.pop();
  return Object.freeze({ lines, trailing });
}

function joinLines(lines: readonly string[], trailing: boolean): string {
  return `${lines.join("\n")}${trailing ? "\n" : ""}`;
}

function lineRange(text: string, startLine: number, endLine: number, replacement: readonly string[]): string {
  if (startLine < 1 || endLine < startLine) throw new TypeError("markdown edit line range: expected 1-based startLine <= endLine");
  const split = splitLinesPreservingFinal(text);
  const start = Math.min(startLine - 1, split.lines.length);
  const end = Math.min(endLine, split.lines.length);
  const lines = [...split.lines.slice(0, start), ...replacement, ...split.lines.slice(end)];
  return joinLines(lines, split.trailing);
}

function insertLines(text: string, atLine: number, insertion: string): string {
  if (atLine < 1) throw new TypeError("markdown edit insert-lines: atLine is 1-based");
  const split = splitLinesPreservingFinal(text);
  const at = Math.min(atLine - 1, split.lines.length);
  const lines = [...split.lines.slice(0, at), ...splitLinesPreservingFinal(insertion).lines, ...split.lines.slice(at)];
  return joinLines(lines, split.trailing);
}

function sectionBounds(body: string, heading: string, level?: number): { readonly start: number; readonly end: number; readonly level: number } | null {
  const split = splitLinesPreservingFinal(body);
  const headingText = heading.trim().replace(/^#+\s*/u, "").trim();
  for (let index = 0; index < split.lines.length; index += 1) {
    const match = split.lines[index]!.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/u);
    if (match === null) continue;
    const foundLevel = match[1]!.length;
    if ((level === undefined || foundLevel === level) && match[2]!.trim() === headingText) {
      let end = split.lines.length;
      for (let next = index + 1; next < split.lines.length; next += 1) {
        const nextMatch = split.lines[next]!.match(/^(#{1,6})\s+/u);
        if (nextMatch !== null && nextMatch[1]!.length <= foundLevel) {
          end = next;
          break;
        }
      }
      return Object.freeze({ start: index, end, level: foundLevel });
    }
  }
  return null;
}

function sectionText(heading: string, level: number, body: string): string {
  const title = heading.trim().replace(/^#+\s*/u, "").trim();
  const normalizedBody = body.endsWith("\n") || body === "" ? body : `${body}\n`;
  return `${"#".repeat(level)} ${title}\n\n${normalizedBody}`;
}

function replaceSection(body: string, heading: string, level: number | undefined, replacementBody: string, required: boolean, upsert: boolean): string {
  const bounds = sectionBounds(body, heading, level);
  const finalLevel = level ?? bounds?.level ?? 2;
  const replacement = splitLinesPreservingFinal(sectionText(heading, finalLevel, replacementBody)).lines;
  if (bounds === null) {
    if (required && !upsert) throw new TypeError(`markdown edit section: ${JSON.stringify(heading)} not found`);
    const prefix = body === "" || body.endsWith("\n\n") ? body : body.endsWith("\n") ? `${body}\n` : `${body}\n\n`;
    return `${prefix}${replacement.join("\n")}\n`;
  }
  const split = splitLinesPreservingFinal(body);
  const lines = [...split.lines.slice(0, bounds.start), ...replacement, ...split.lines.slice(bounds.end)];
  return joinLines(lines, split.trailing);
}

function deleteSection(body: string, heading: string, level: number | undefined, required: boolean): string {
  const bounds = sectionBounds(body, heading, level);
  if (bounds === null) {
    if (required) throw new TypeError(`markdown edit section: ${JSON.stringify(heading)} not found`);
    return body;
  }
  const split = splitLinesPreservingFinal(body);
  const lines = [...split.lines.slice(0, bounds.start), ...split.lines.slice(bounds.end)];
  return joinLines(lines, split.trailing);
}

function applyOne(text: string, operation: MarkdownEditOperation): string {
  switch (operation.operation) {
    case "set-document":
      return documentWith(
        operation.frontmatter === undefined ? null : operation.frontmatter,
        operation.body,
        operation.format ?? "yaml",
      );
    case "set-frontmatter":
      return withFrontmatter(text, operation.frontmatter, operation.format);
    case "merge-frontmatter": {
      const parsed = decodeFrontmatter(text);
      return documentWith({ ...parsed.frontmatter, ...operation.patch }, parsed.body, operation.format ?? parsed.format ?? "yaml");
    }
    case "delete-frontmatter":
      return deleteFrontmatterKeys(text, operation.keys);
    case "rename-frontmatter": {
      const parsed = decodeFrontmatter(text);
      if (!(operation.from in parsed.frontmatter)) return text;
      if (operation.overwrite !== true && operation.to in parsed.frontmatter) {
        throw new TypeError(`markdown edit rename-frontmatter: ${operation.to} already exists`);
      }
      const value = parsed.frontmatter[operation.from];
      if (value === undefined) return text;
      const next: Record<string, JsonValue> = { ...parsed.frontmatter, [operation.to]: value };
      delete next[operation.from];
      return documentWith(next, parsed.body, operation.format ?? parsed.format ?? "yaml");
    }
    case "set-body":
      return withBody(text, operation.body, {
        ...(operation.semanticLineBreaks === undefined ? {} : { semanticLineBreaks: operation.semanticLineBreaks }),
      });
    case "prepend-body": {
      const parsed = bodyOf(text);
      const separator = operation.separator ?? (parsed.body === "" || operation.text.endsWith("\n") ? "" : "\n");
      return documentWith(parsed.frontmatter, `${operation.text}${separator}${parsed.body}`, parsed.format ?? "yaml");
    }
    case "append-body": {
      const parsed = bodyOf(text);
      const separator = operation.separator ?? (parsed.body === "" || parsed.body.endsWith("\n") ? "" : "\n");
      return documentWith(parsed.frontmatter, `${parsed.body}${separator}${operation.text}`, parsed.format ?? "yaml");
    }
    case "replace-text":
      return replaceLiteral(text, operation.search, operation.replacement, operation.all === true, operation.required === true);
    case "replace-pattern":
      return replacePattern(text, operation.pattern, operation.flags, operation.replacement, operation.required === true);
    case "insert-lines":
      return insertLines(text, operation.atLine, operation.text);
    case "replace-lines":
      return lineRange(text, operation.startLine, operation.endLine, splitLinesPreservingFinal(operation.text).lines);
    case "delete-lines":
      return lineRange(text, operation.startLine, operation.endLine, []);
    case "replace-section": {
      const parsed = bodyOf(text);
      return documentWith(parsed.frontmatter, replaceSection(parsed.body, operation.heading, operation.level, operation.body, operation.required === true, false), parsed.format ?? "yaml");
    }
    case "upsert-section": {
      const parsed = bodyOf(text);
      return documentWith(parsed.frontmatter, replaceSection(parsed.body, operation.heading, operation.level, operation.body, false, true), parsed.format ?? "yaml");
    }
    case "delete-section": {
      const parsed = bodyOf(text);
      return documentWith(parsed.frontmatter, deleteSection(parsed.body, operation.heading, operation.level, operation.required === true), parsed.format ?? "yaml");
    }
    case "normalize-body": {
      const parsed = bodyOf(text);
      return documentWith(parsed.frontmatter, semanticLineBreaks(parsed.body), parsed.format ?? "yaml");
    }
    case "normalize-repo-markdown":
      return normalizeRepoMarkdown(text, operation.forbiddenKeys);
  }
}

export function applyMarkdownEdit(text: string, request: MarkdownEditRequest): MarkdownEditApplication {
  const before = text;
  let next = text;
  for (const operation of request.operations) next = applyOne(next, operation);
  return Object.freeze({
    text: next,
    receipt: Object.freeze({
      kind: markdownEditReceiptKind,
      operations: request.operations.length,
      changed: next !== before,
      beforeBytes: Buffer.byteLength(before, "utf8"),
      afterBytes: Buffer.byteLength(next, "utf8"),
      frontmatterFormat: frontmatterFormat(next),
    }),
  });
}
