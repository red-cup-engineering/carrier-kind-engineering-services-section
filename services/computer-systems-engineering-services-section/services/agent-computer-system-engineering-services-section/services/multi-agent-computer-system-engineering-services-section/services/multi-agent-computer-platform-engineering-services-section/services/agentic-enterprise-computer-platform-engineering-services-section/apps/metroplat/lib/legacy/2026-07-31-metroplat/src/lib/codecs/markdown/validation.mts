/**
 * formats/markdown/validation - repo-facing markdown quality readouts.
 *
 * This is a pure read over one markdown document. It names the formatting and
 * frontmatter issues that make agents fall back to ad hoc file tooling:
 * unparsable frontmatter, non-semantic prose linefeeds, author metadata drift,
 * scalar tags, and a leading H1 that duplicates the frontmatter title.
 */
import { type JsonRecord, type JsonValue } from "../json/core.mts";
import { parseMarkdown, type MarkdownFrontmatterFormat } from "./document.mts";
import { splitFrontMatterFence } from "./frontmatter.mts";
import { semanticLineBreaks } from "./semantic-line-breaks.mts";

export type MarkdownValidationRule =
  | "parseable-frontmatter"
  | "semantic-linefeeds"
  | "forbidden-frontmatter-key"
  | "tags-list"
  | "title-duplicates-h1";

export type MarkdownValidationSeverity = "error" | "warning" | "info";

export type MarkdownValidationFinding = Readonly<{
  readonly rule: MarkdownValidationRule;
  readonly severity: MarkdownValidationSeverity;
  readonly message: string;
  readonly path?: string;
  readonly value?: string;
}>;

export type MarkdownValidationReport = Readonly<{
  readonly kind: "metroplat.markdown.validation-report";
  readonly parseable: boolean;
  readonly conformant: boolean;
  readonly format: MarkdownFrontmatterFormat;
  readonly frontmatter: JsonRecord | null;
  readonly body: string;
  readonly normalizedBody: string;
  readonly semanticLinefeeds: Readonly<{ readonly normalized: boolean }>;
  readonly findings: readonly MarkdownValidationFinding[];
}>;

export type MarkdownValidationOptions = Readonly<{
  readonly forbiddenFrontmatterKeys?: readonly string[];
}>;

function finding(
  rule: MarkdownValidationRule,
  severity: MarkdownValidationSeverity,
  message: string,
  extra: { readonly path?: string; readonly value?: string } = {},
): MarkdownValidationFinding {
  return Object.freeze({ rule, severity, message, ...extra });
}

function frontmatterKeyFindings(value: JsonValue, forbidden: ReadonlySet<string>, path: string): readonly MarkdownValidationFinding[] {
  if (value === null || typeof value !== "object") return Object.freeze([]);
  const findings: MarkdownValidationFinding[] = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => findings.push(...frontmatterKeyFindings(entry, forbidden, `${path}[${index}]`)));
    return Object.freeze(findings);
  }
  for (const [key, entry] of Object.entries(value)) {
    const here = path === "" ? key : `${path}.${key}`;
    if (forbidden.has(key)) {
      findings.push(finding(
        "forbidden-frontmatter-key",
        "warning",
        `frontmatter key ${here} should not be present`,
        { path: here },
      ));
    }
    findings.push(...frontmatterKeyFindings(entry, forbidden, here));
  }
  return Object.freeze(findings);
}

function tagsFinding(frontmatter: JsonRecord): MarkdownValidationFinding | undefined {
  const tags = frontmatter["tags"];
  if (tags === undefined) return undefined;
  if (Array.isArray(tags) && tags.every((tag) => typeof tag === "string" && tag.trim() !== "")) return undefined;
  return finding("tags-list", "warning", "frontmatter tags should be a non-empty string list", { path: "tags" });
}

function leadingTitleH1Finding(frontmatter: JsonRecord, body: string): MarkdownValidationFinding | undefined {
  const title = frontmatter["title"];
  if (typeof title !== "string" || title.trim() === "") return undefined;
  const first = body.split(/\r?\n/u).find((line) => line.trim() !== "");
  if (first === undefined) return undefined;
  const match = first.match(/^#\s+(.+?)\s*#*\s*$/u);
  if (match?.[1]?.trim() !== title.trim()) return undefined;
  return finding("title-duplicates-h1", "warning", "body starts with an H1 duplicating frontmatter title", { value: title.trim() });
}

export function markdownValidationReport(text: string, options: MarkdownValidationOptions = {}): MarkdownValidationReport {
  const forbidden = new Set(options.forbiddenFrontmatterKeys ?? ["author", "authors"]);
  const findings: MarkdownValidationFinding[] = [];
  let parseable = true;
  let format: MarkdownFrontmatterFormat = null;
  let frontmatter: JsonRecord | null = null;
  let body = text;
  try {
    const parsed = parseMarkdown(text);
    format = parsed.format;
    frontmatter = parsed.frontmatter === null ? null : Object.freeze({ ...parsed.frontmatter }) as JsonRecord;
    body = parsed.body;
  } catch (error) {
    parseable = false;
    const fence = splitFrontMatterFence(text);
    format = fence?.format ?? null;
    body = fence?.body ?? text;
    findings.push(finding("parseable-frontmatter", "error", (error as Error).message));
  }

  const normalizedBody = semanticLineBreaks(body);
  if (normalizedBody !== body) {
    findings.push(finding("semantic-linefeeds", "warning", "body prose is not normalized to semantic linefeeds"));
  }
  if (frontmatter !== null) {
    findings.push(...frontmatterKeyFindings(frontmatter as JsonValue, forbidden, ""));
    const tags = tagsFinding(frontmatter);
    if (tags !== undefined) findings.push(tags);
    const h1 = leadingTitleH1Finding(frontmatter, body);
    if (h1 !== undefined) findings.push(h1);
  }

  return Object.freeze({
    kind: "metroplat.markdown.validation-report" as const,
    parseable,
    conformant: parseable && findings.length === 0,
    format,
    frontmatter,
    body,
    normalizedBody,
    semanticLinefeeds: Object.freeze({ normalized: normalizedBody === body }),
    findings: Object.freeze(findings),
  });
}
