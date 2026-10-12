/**
 * formats/markdown/diff - markdown-aware document comparison.
 *
 * This compares whole Markdown documents at the text, frontmatter, heading,
 * extension-feature, and validation layers. It gives agents a single readout
 * for auditing proposed edits without falling back to ad hoc diff commands.
 */
import { canonicalBytes } from "../../identity/index.mjs";
import { } from "@red-cup-engineering/json-services-section";
import { } from "./features.mjs";
import { markdownWorkbench } from "./workbench.mjs";

export const markdownDiffWorkbenchKind = "metroplat.markdown.diff-workbench";

function documentLines(text) {
  const normalized = text.replace(/\r\n?/gu, "\n");
  if (normalized === "") return Object.freeze([]);
  const lines = normalized.split("\n");
  if (normalized.endsWith("\n")) lines.pop();
  return Object.freeze(lines);
}

function lineChanges(beforeText, afterText) {
  const before = documentLines(beforeText);
  const after = documentLines(afterText);
  const table = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0));
  for (let left = before.length - 1; left >= 0; left -= 1) {
    for (let right = after.length - 1; right >= 0; right -= 1) {
      table[left][right] = before[left] === after[right]
        ? table[left + 1][right + 1] + 1
        : Math.max(table[left + 1][right], table[left][right + 1]);
    }
  }
  const changes = [];
  let left = 0;
  let right = 0;
  while (left < before.length || right < after.length) {
    if (left < before.length && right < after.length && before[left] === after[right]) {
      changes.push(Object.freeze({
        kind: "equal",
        beforeLine: left + 1,
        afterLine: right + 1,
        text: before[left],
      }));
      left += 1;
      right += 1;
    } else if (right < after.length && (left >= before.length || table[left][right + 1] >= table[left + 1][right])) {
      changes.push(Object.freeze({ kind: "insert", afterLine: right + 1, text: after[right] }));
      right += 1;
    } else {
      changes.push(Object.freeze({ kind: "delete", beforeLine: left + 1, text: before[left] }));
      left += 1;
    }
  }
  return Object.freeze(changes);
}

function hunkLine(change) {
  if (change.kind === "equal") {
    return Object.freeze({
      kind: "context",
      text: change.text,
      ...(change.beforeLine === undefined ? {} : { beforeLine: change.beforeLine }),
      ...(change.afterLine === undefined ? {} : { afterLine: change.afterLine }),
    });
  }
  if (change.kind === "delete") {
    return Object.freeze({
      kind: "delete",
      text: change.text,
      ...(change.beforeLine === undefined ? {} : { beforeLine: change.beforeLine }),
    });
  }
  return Object.freeze({
    kind: "insert",
    text: change.text,
    ...(change.afterLine === undefined ? {} : { afterLine: change.afterLine }),
  });
}

function hunkOf(changes, start, end) {
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

function hunks(changes, contextLines) {
  const hunksOut = [];
  let index = 0;
  while (index < changes.length) {
    while (index < changes.length && changes[index].kind === "equal") index += 1;
    if (index >= changes.length) break;
    const start = Math.max(0, index - contextLines);
    let end = Math.min(changes.length - 1, index + contextLines);
    for (let scan = index + 1; scan < changes.length; scan += 1) {
      if (changes[scan].kind !== "equal" && scan <= end + contextLines) {
        end = Math.min(changes.length - 1, scan + contextLines);
      }
      if (scan > end) break;
    }
    hunksOut.push(hunkOf(changes, start, end));
    index = end + 1;
  }
  return Object.freeze(hunksOut);
}

function countPart(count) {
  return count === 1 ? "" : `,${count}`;
}

function hunkPrefix(line) {
  if (line.kind === "context") return " ";
  if (line.kind === "delete") return "-";
  return "+";
}

function unifiedDiff(
  hunksIn,
  beforeLabel,
  afterLabel,
) {
  if (hunksIn.length === 0) return "";
  const lines = [`--- ${beforeLabel}`, `+++ ${afterLabel}`];
  for (const hunk of hunksIn) {
    lines.push(`@@ -${hunk.beforeStart}${countPart(hunk.beforeLines)} +${hunk.afterStart}${countPart(hunk.afterLines)} @@`);
    for (const line of hunk.lines) lines.push(`${hunkPrefix(line)}${line.text}`);
  }
  return `${lines.join("\n")}\n`;
}

function frontmatterDiff(
  before,
  after,
) {
  const keys = [...new Set([...Object.keys(before.frontmatter), ...Object.keys(after.frontmatter)])].sort();
  return Object.freeze(keys.flatMap((key) => {
    const left = before.frontmatter[key];
    const right = after.frontmatter[key];
    if (left !== undefined && right !== undefined && canonicalBytes(left) === canonicalBytes(right)) return [];
    if (left === undefined && right !== undefined) return [Object.freeze({ key, kind: "added", after: right })];
    if (left !== undefined && right === undefined) return [Object.freeze({ key, kind: "removed", before: left })];
    if (left !== undefined && right !== undefined) {
      return [Object.freeze({ key, kind: "changed", before: left, after: right })];
    }
    return [];
  }));
}

function headingSignature(entry) {
  return `${entry.level}:${entry.path.join(" / ")}`;
}

function featureSignature(feature) {
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

function namedDiff(before, after) {
  const left = new Set(before);
  const right = new Set(after);
  return Object.freeze([
    ...[...left].filter((entry) => !right.has(entry)).map((signature) => Object.freeze({ kind: "removed", signature })),
    ...[...right].filter((entry) => !left.has(entry)).map((signature) => Object.freeze({ kind: "added", signature })),
  ].sort((a, b) => a.signature.localeCompare(b.signature)));
}

function validationDiff(before, after) {
  const left = new Set(before);
  const right = new Set(after);
  return Object.freeze([
    ...[...left].filter((entry) => !right.has(entry)).map((signature) => Object.freeze({ kind: "resolved", signature })),
    ...[...right].filter((entry) => !left.has(entry)).map((signature) => Object.freeze({ kind: "introduced", signature })),
  ].sort((a, b) => a.signature.localeCompare(b.signature)));
}

function findingSignature(value) {
  return canonicalBytes(value);
}

export function markdownDiffWorkbench(
  beforeText,
  afterText,
  options = {},
) {
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
