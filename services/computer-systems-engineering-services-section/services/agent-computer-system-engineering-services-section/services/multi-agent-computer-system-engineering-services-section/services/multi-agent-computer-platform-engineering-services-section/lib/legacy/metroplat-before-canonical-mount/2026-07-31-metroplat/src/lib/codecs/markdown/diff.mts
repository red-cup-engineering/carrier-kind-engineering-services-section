/**
 * formats/markdown/diff - markdown-aware document comparison.
 *
 * This compares whole Markdown documents at the text, frontmatter, heading,
 * extension-feature, and validation layers. It gives agents a single readout
 * for auditing proposed edits without falling back to ad hoc diff commands.
 */
import { canonicalBytes } from "../../identity/index.mts";
import { type JsonValue } from "../json/core.mts";
import { type MarkdownFeature } from "./features.mts";
import { markdownWorkbench, type MarkdownWorkbenchReadout } from "./workbench.mts";

export const markdownDiffWorkbenchKind = "metroplat.markdown.diff-workbench" as const;

export type MarkdownDiffLineChange = Readonly<{
  readonly kind: "equal" | "delete" | "insert";
  readonly beforeLine?: number;
  readonly afterLine?: number;
  readonly text: string;
}>;

export type MarkdownDiffHunkLine = Readonly<{
  readonly kind: "context" | "delete" | "insert";
  readonly text: string;
  readonly beforeLine?: number;
  readonly afterLine?: number;
}>;

export type MarkdownDiffHunk = Readonly<{
  readonly beforeStart: number;
  readonly beforeLines: number;
  readonly afterStart: number;
  readonly afterLines: number;
  readonly lines: readonly MarkdownDiffHunkLine[];
}>;

export type MarkdownFrontmatterDiff = Readonly<{
  readonly key: string;
  readonly kind: "added" | "removed" | "changed";
  readonly before?: JsonValue;
  readonly after?: JsonValue;
}>;

export type MarkdownNamedDiff = Readonly<{
  readonly kind: "added" | "removed";
  readonly signature: string;
}>;

export type MarkdownValidationFindingDiff = Readonly<{
  readonly kind: "introduced" | "resolved";
  readonly signature: string;
}>;

export type MarkdownDiffWorkbenchReadout = Readonly<{
  readonly kind: typeof markdownDiffWorkbenchKind;
  readonly changed: boolean;
  readonly before: MarkdownWorkbenchReadout;
  readonly after: MarkdownWorkbenchReadout;
  readonly source: Readonly<{
    readonly beforeBytes: number;
    readonly afterBytes: number;
    readonly beforeLines: number;
    readonly afterLines: number;
  }>;
  readonly lines: Readonly<{
    readonly changed: boolean;
    readonly changes: readonly MarkdownDiffLineChange[];
    readonly hunks: readonly MarkdownDiffHunk[];
    readonly unified: string;
  }>;
  readonly frontmatter: readonly MarkdownFrontmatterDiff[];
  readonly headings: readonly MarkdownNamedDiff[];
  readonly features: readonly MarkdownNamedDiff[];
  readonly validation: readonly MarkdownValidationFindingDiff[];
  readonly normalization: Readonly<{
    readonly beforeSemanticLinefeeds: boolean;
    readonly afterSemanticLinefeeds: boolean;
    readonly beforeRepoNormalized: boolean;
    readonly afterRepoNormalized: boolean;
  }>;
}>;

export type MarkdownDiffWorkbenchOptions = Readonly<{
  readonly beforeLabel?: string;
  readonly afterLabel?: string;
  readonly contextLines?: number;
}>;

function documentLines(text: string): readonly string[] {
  const normalized = text.replace(/\r\n?/gu, "\n");
  if (normalized === "") return Object.freeze([]);
  const lines = normalized.split("\n");
  if (normalized.endsWith("\n")) lines.pop();
  return Object.freeze(lines);
}

function lineChanges(beforeText: string, afterText: string): readonly MarkdownDiffLineChange[] {
  const before = documentLines(beforeText);
  const after = documentLines(afterText);
  const table: number[][] = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0));
  for (let left = before.length - 1; left >= 0; left -= 1) {
    for (let right = after.length - 1; right >= 0; right -= 1) {
      table[left]![right] = before[left] === after[right]
        ? table[left + 1]![right + 1]! + 1
        : Math.max(table[left + 1]![right]!, table[left]![right + 1]!);
    }
  }
  const changes: MarkdownDiffLineChange[] = [];
  let left = 0;
  let right = 0;
  while (left < before.length || right < after.length) {
    if (left < before.length && right < after.length && before[left] === after[right]) {
      changes.push(Object.freeze({
        kind: "equal" as const,
        beforeLine: left + 1,
        afterLine: right + 1,
        text: before[left]!,
      }));
      left += 1;
      right += 1;
    } else if (right < after.length && (left >= before.length || table[left]![right + 1]! >= table[left + 1]![right]!)) {
      changes.push(Object.freeze({ kind: "insert" as const, afterLine: right + 1, text: after[right]! }));
      right += 1;
    } else {
      changes.push(Object.freeze({ kind: "delete" as const, beforeLine: left + 1, text: before[left]! }));
      left += 1;
    }
  }
  return Object.freeze(changes);
}

function hunkLine(change: MarkdownDiffLineChange): MarkdownDiffHunkLine {
  if (change.kind === "equal") {
    return Object.freeze({
      kind: "context" as const,
      text: change.text,
      ...(change.beforeLine === undefined ? {} : { beforeLine: change.beforeLine }),
      ...(change.afterLine === undefined ? {} : { afterLine: change.afterLine }),
    });
  }
  if (change.kind === "delete") {
    return Object.freeze({
      kind: "delete" as const,
      text: change.text,
      ...(change.beforeLine === undefined ? {} : { beforeLine: change.beforeLine }),
    });
  }
  return Object.freeze({
    kind: "insert" as const,
    text: change.text,
    ...(change.afterLine === undefined ? {} : { afterLine: change.afterLine }),
  });
}

function hunkOf(changes: readonly MarkdownDiffLineChange[], start: number, end: number): MarkdownDiffHunk {
  const beforeStart = changes.slice(0, start).filter((change) => change.kind !== "insert").length + 1;
  const afterStart = changes.slice(0, start).filter((change) => change.kind !== "delete").length + 1;
  const selected = changes.slice(start, end + 1);
  const beforeLines = selected.filter((change) => change.kind !== "insert").length;
  const afterLines = selected.filter((change) => change.kind !== "delete").length;
  return Object.freeze({
    beforeStart,
    beforeLines,
    afterStart,
    afterLines,
    lines: Object.freeze(selected.map(hunkLine)),
  });
}

function hunks(changes: readonly MarkdownDiffLineChange[], contextLines: number): readonly MarkdownDiffHunk[] {
  const hunksOut: MarkdownDiffHunk[] = [];
  let index = 0;
  while (index < changes.length) {
    while (index < changes.length && changes[index]!.kind === "equal") index += 1;
    if (index >= changes.length) break;
    const start = Math.max(0, index - contextLines);
    let end = Math.min(changes.length - 1, index + contextLines);
    for (let scan = index + 1; scan < changes.length; scan += 1) {
      if (changes[scan]!.kind !== "equal" && scan <= end + contextLines) {
        end = Math.min(changes.length - 1, scan + contextLines);
      }
      if (scan > end) break;
    }
    hunksOut.push(hunkOf(changes, start, end));
    index = end + 1;
  }
  return Object.freeze(hunksOut);
}

function countPart(count: number): string {
  return count === 1 ? "" : `,${count}`;
}

function hunkPrefix(line: MarkdownDiffHunkLine): string {
  if (line.kind === "context") return " ";
  if (line.kind === "delete") return "-";
  return "+";
}

function unifiedDiff(
  hunksIn: readonly MarkdownDiffHunk[],
  beforeLabel: string,
  afterLabel: string,
): string {
  if (hunksIn.length === 0) return "";
  const lines = [`--- ${beforeLabel}`, `+++ ${afterLabel}`];
  for (const hunk of hunksIn) {
    lines.push(`@@ -${hunk.beforeStart}${countPart(hunk.beforeLines)} +${hunk.afterStart}${countPart(hunk.afterLines)} @@`);
    for (const line of hunk.lines) lines.push(`${hunkPrefix(line)}${line.text}`);
  }
  return `${lines.join("\n")}\n`;
}

function frontmatterDiff(
  before: MarkdownWorkbenchReadout,
  after: MarkdownWorkbenchReadout,
): readonly MarkdownFrontmatterDiff[] {
  const keys = [...new Set([...Object.keys(before.frontmatter), ...Object.keys(after.frontmatter)])].sort();
  return Object.freeze(keys.flatMap((key): MarkdownFrontmatterDiff[] => {
    const left = before.frontmatter[key];
    const right = after.frontmatter[key];
    if (left !== undefined && right !== undefined && canonicalBytes(left) === canonicalBytes(right)) return [];
    if (left === undefined && right !== undefined) return [Object.freeze({ key, kind: "added" as const, after: right })];
    if (left !== undefined && right === undefined) return [Object.freeze({ key, kind: "removed" as const, before: left })];
    if (left !== undefined && right !== undefined) {
      return [Object.freeze({ key, kind: "changed" as const, before: left, after: right })];
    }
    return [];
  }));
}

function headingSignature(entry: MarkdownWorkbenchReadout["structure"]["headings"][number]): string {
  return `${entry.level}:${entry.path.join(" / ")}`;
}

function featureSignature(feature: MarkdownFeature): string {
  const spanText = feature.span.text;
  const extra = "target" in feature
    ? feature.target
    : "key" in feature
      ? `${feature.key}=${feature.value}`
      : "keys" in feature
        ? feature.keys.join(",")
        : "calloutType" in feature
          ? feature.calloutType
          : spanText;
  return `${feature.type}:${extra}`;
}

function namedDiff(before: readonly string[], after: readonly string[]): readonly MarkdownNamedDiff[] {
  const left = new Set(before);
  const right = new Set(after);
  return Object.freeze([
    ...[...left].filter((entry) => !right.has(entry)).map((signature) => Object.freeze({ kind: "removed" as const, signature })),
    ...[...right].filter((entry) => !left.has(entry)).map((signature) => Object.freeze({ kind: "added" as const, signature })),
  ].sort((a, b) => a.signature.localeCompare(b.signature)));
}

function validationDiff(before: readonly string[], after: readonly string[]): readonly MarkdownValidationFindingDiff[] {
  const left = new Set(before);
  const right = new Set(after);
  return Object.freeze([
    ...[...left].filter((entry) => !right.has(entry)).map((signature) => Object.freeze({ kind: "resolved" as const, signature })),
    ...[...right].filter((entry) => !left.has(entry)).map((signature) => Object.freeze({ kind: "introduced" as const, signature })),
  ].sort((a, b) => a.signature.localeCompare(b.signature)));
}

function findingSignature(value: MarkdownWorkbenchReadout["validation"]["findings"][number]): string {
  return canonicalBytes(value as unknown as JsonValue);
}

export function markdownDiffWorkbench(
  beforeText: string,
  afterText: string,
  options: MarkdownDiffWorkbenchOptions = {},
): MarkdownDiffWorkbenchReadout {
  const before = markdownWorkbench(beforeText, { coordinate: options.beforeLabel ?? "before" });
  const after = markdownWorkbench(afterText, { coordinate: options.afterLabel ?? "after" });
  const changes = lineChanges(beforeText, afterText);
  const hunkReadouts = hunks(changes, options.contextLines ?? 3);
  return Object.freeze({
    kind: markdownDiffWorkbenchKind,
    changed: beforeText !== afterText,
    before,
    after,
    source: Object.freeze({
      beforeBytes: before.source.bytes,
      afterBytes: after.source.bytes,
      beforeLines: before.source.lines,
      afterLines: after.source.lines,
    }),
    lines: Object.freeze({
      changed: changes.some((change) => change.kind !== "equal"),
      changes,
      hunks: hunkReadouts,
      unified: unifiedDiff(hunkReadouts, options.beforeLabel ?? "before.md", options.afterLabel ?? "after.md"),
    }),
    frontmatter: frontmatterDiff(before, after),
    headings: namedDiff(
      before.structure.headings.map(headingSignature),
      after.structure.headings.map(headingSignature),
    ),
    features: namedDiff(
      before.features.map(featureSignature),
      after.features.map(featureSignature),
    ),
    validation: validationDiff(
      before.validation.findings.map(findingSignature),
      after.validation.findings.map(findingSignature),
    ),
    normalization: Object.freeze({
      beforeSemanticLinefeeds: !before.normalization.semanticLinefeedDocument.changed,
      afterSemanticLinefeeds: !after.normalization.semanticLinefeedDocument.changed,
      beforeRepoNormalized: !before.normalization.repoMarkdownDocument.changed,
      afterRepoNormalized: !after.normalization.repoMarkdownDocument.changed,
    }),
  });
}
