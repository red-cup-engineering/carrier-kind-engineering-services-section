/**
 * formats/markdown/features - structural features read from a Markdown body.
 *
 * This is the body-side companion to the frontmatter document codec: it reads
 * vault-style plaintext affordances as span-carrying features without interpreting
 * them as site routes, citations, or facts. Callers own those domain-specific
 * projections.
 */

export interface MarkdownFeatureSpan {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export type MarkdownFeature =
  | MarkdownWikilinkFeature
  | MarkdownTransclusionFeature
  | MarkdownLinkFeature
  | MarkdownInlineFieldFeature
  | MarkdownCitationGroupFeature
  | MarkdownCalloutFeature;

export interface MarkdownWikilinkFeature {
  readonly type: "wikilink";
  readonly targetRaw: string;
  readonly target: string;
  readonly label: string | null;
  readonly span: MarkdownFeatureSpan;
}

export interface MarkdownTransclusionFeature {
  readonly type: "transclusion";
  readonly targetRaw: string;
  readonly target: string;
  readonly label: string | null;
  readonly span: MarkdownFeatureSpan;
}

export interface MarkdownLinkFeature {
  readonly type: "markdown-link";
  readonly label: string;
  readonly target: string;
  readonly title: string | null;
  readonly image: boolean;
  readonly span: MarkdownFeatureSpan;
}

export interface MarkdownInlineFieldFeature {
  readonly type: "inline-field";
  readonly key: string;
  readonly value: string;
  readonly delimiter: "[]" | "()";
  readonly span: MarkdownFeatureSpan;
}

export interface MarkdownCitationGroupFeature {
  readonly type: "citation-group";
  readonly keys: readonly string[];
  readonly suppressedKeys: readonly string[];
  readonly span: MarkdownFeatureSpan;
}

export interface MarkdownCalloutFeature {
  readonly type: "callout";
  readonly calloutType: string;
  readonly title: string | null;
  readonly body: string;
  readonly span: MarkdownFeatureSpan;
}

const FENCED_BLOCK = /^ {0,3}(`{3,}|~{3,}).*?\n[\s\S]*?^ {0,3}\1[ \t]*$\n?/gmu;
const INLINE_CODE = /(`+)([^`\n]*?)\1/gu;
const WIKILINK = /(?<!\\)(!?)\[\[([^\]\n]+?)\]\]/gu;
const INLINE_FIELD = /(?<!\\)(\[|\()([^\]\)\n]+?)::[ \t]*([^\]\)\n]+?)(\]|\))/gu;
const CITATION_GROUP = /(?<!\\)\[([^\]\n]*@[^\]\n]*)\]/gu;
const MARKDOWN_LINK = /(?<!\\)(!?)\[([^\]\n]+)\]\(([^)\s]+)(?:[ \t]+"([^"]*)")?\)/gu;
const CALLOUT_START = /^ {0,3}>[ \t]*\[!([A-Za-z0-9_-]+)\][ \t]*(.*)$/u;

function spanOf(body: string, start: number, end: number): MarkdownFeatureSpan {
  return Object.freeze({ start, end, text: body.slice(start, end) });
}

function maskRange(match: string): string {
  return " ".repeat(match.length);
}

function eligibleText(body: string): string {
  return body.replace(FENCED_BLOCK, maskRange).replace(INLINE_CODE, maskRange);
}

function splitTargetLabel(value: string): { readonly target: string; readonly label: string | null } {
  const index = value.indexOf("|");
  if (index < 0) return Object.freeze({ target: value.trim(), label: null });
  const target = value.slice(0, index).trim();
  const label = value.slice(index + 1).trim();
  return Object.freeze({ target, label: label === "" ? null : label });
}

function citationKeys(value: string): { readonly keys: readonly string[]; readonly suppressedKeys: readonly string[] } {
  const keys: string[] = [];
  const suppressedKeys: string[] = [];
  for (const match of value.matchAll(/(?<!\S)(-?)@([A-Za-z0-9_:-]+)/gu)) {
    const key = match[2]!;
    if (match[1] === "-") suppressedKeys.push(key);
    else keys.push(key);
  }
  return Object.freeze({ keys: Object.freeze(keys), suppressedKeys: Object.freeze(suppressedKeys) });
}

function inlineFeatures(body: string, eligible: string): MarkdownFeature[] {
  const features: MarkdownFeature[] = [];
  for (const match of eligible.matchAll(WIKILINK)) {
    const raw = match[2]!;
    const split = splitTargetLabel(raw);
    features.push(Object.freeze({
      type: match[1] === "!" ? "transclusion" as const : "wikilink" as const,
      targetRaw: raw,
      target: split.target,
      label: split.label,
      span: spanOf(body, match.index, match.index + match[0].length),
    }));
  }
  for (const match of eligible.matchAll(MARKDOWN_LINK)) {
    features.push(Object.freeze({
      type: "markdown-link" as const,
      label: match[2]!.trim(),
      target: match[3]!.trim(),
      title: match[4] ?? null,
      image: match[1] === "!",
      span: spanOf(body, match.index, match.index + match[0].length),
    }));
  }
  for (const match of eligible.matchAll(INLINE_FIELD)) {
    const open = match[1]!;
    const close = match[4]!;
    if ((open === "[" && close !== "]") || (open === "(" && close !== ")")) continue;
    features.push(Object.freeze({
      type: "inline-field" as const,
      key: match[2]!.trim(),
      value: match[3]!.trim(),
      delimiter: open === "[" ? "[]" as const : "()" as const,
      span: spanOf(body, match.index, match.index + match[0].length),
    }));
  }
  for (const match of eligible.matchAll(CITATION_GROUP)) {
    const keys = citationKeys(match[1]!);
    if (keys.keys.length === 0 && keys.suppressedKeys.length === 0) continue;
    features.push(Object.freeze({
      type: "citation-group" as const,
      keys: keys.keys,
      suppressedKeys: keys.suppressedKeys,
      span: spanOf(body, match.index, match.index + match[0].length),
    }));
  }
  return features;
}

function calloutFeatures(body: string, eligible: string): MarkdownCalloutFeature[] {
  const lines = body.split(/(?<=\n)/u);
  const eligibleLines = eligible.split(/(?<=\n)/u);
  const features: MarkdownCalloutFeature[] = [];
  let offset = 0;
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!;
    const eligibleLine = eligibleLines[index] ?? line;
    const match = eligibleLine.replace(/\r?\n$/u, "").match(CALLOUT_START);
    if (match === null) {
      offset += line.length;
      index++;
      continue;
    }
    const start = offset;
    const bodyLines: string[] = [];
    const title = match[2]!.trim();
    offset += line.length;
    index++;
    while (index < lines.length && /^ {0,3}>/u.test(eligibleLines[index] ?? lines[index]!)) {
      bodyLines.push(lines[index]!.replace(/^ {0,3}>[ \t]?/u, "").replace(/\r?\n$/u, ""));
      offset += lines[index]!.length;
      index++;
    }
    features.push(Object.freeze({
      type: "callout" as const,
      calloutType: match[1]!.trim().toLowerCase(),
      title: title === "" ? null : title,
      body: bodyLines.join("\n").trimEnd(),
      span: spanOf(body, start, offset),
    }));
  }
  return features;
}

/** Read a Markdown body into span-carrying extension features. */
export function markdownFeatures(body: string): readonly MarkdownFeature[] {
  const normalized = body.replace(/\r\n?/gu, "\n");
  const eligible = eligibleText(normalized);
  return Object.freeze([
    ...inlineFeatures(normalized, eligible),
    ...calloutFeatures(normalized, eligible),
  ].sort((left, right) => left.span.start - right.span.start || left.span.end - right.span.end));
}
