/**
 * @packageDocumentation
 *
 * Markdown language behavior presented through the LSP face.
 *
 * @metroplatSubject lsp
 */
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/markdown-engineering-services-section/split-markdown-frontmatter-fence";
import { normalizeLinefeeds } from "@red-cup-engineering/computer-text-content-engineering-services-section/normalize-linefeeds";
import { readMarkdownStructure } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";
import { validateMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/validate-markdown-document";
import { applyMarkdownEdit, markdownEditRequestKind } from "@red-cup-engineering/markdown-engineering-services-section/apply-markdown-edit";
import { readMarkdownFeatures } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-features";
import {
  fullDocumentRange,
  lineRange,
  lineSpanRange,
  offsetAt,
  rangeOfOffset,
  rangesEqual,
  zeroRange,
} from "./text.domain.mjs";

export function markdownDocument(document) {
  return Object.freeze({
    kind: "markdown",
    id: document.id ?? document.uri,
    uri: document.uri,
    text: document.text,
  });
}

function markdownBodyOffset(text) {
  const fence = splitMarkdownFrontmatterFence(text);
  return fence === null ? 0 : Math.max(0, text.length - fence.body.length);
}

function markdownBodyRange(text) {
  const offset = markdownBodyOffset(text);
  return rangeOfOffset(text, offset, text.length - offset);
}

function markdownFrontmatterKeyRange(text, path) {
  if (path === undefined) return undefined;
  const key = path.split(/[.[\]]/u).find((part) => part !== "");
  if (key === undefined) return undefined;
  const bodyOffset = markdownBodyOffset(text);
  const frontmatterText = text.slice(0, bodyOffset);
  const match = new RegExp(`(^|\\n)([ \\t]*)(${key.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")})([ \\t]*:)`, "u").exec(frontmatterText);
  if (match === null || match.index === undefined) return undefined;
  const offset = match.index + (match[1] === "\n" ? 1 : 0) + (match[2]?.length ?? 0);
  return rangeOfOffset(text, offset, key.length);
}

function markdownDuplicateH1Range(text) {
  try {
    const parsed = readMarkdownFrontmatter(text);
    const title = parsed.frontmatter?.["title"];
    if (typeof title !== "string" || title.trim() === "") return undefined;
    const bodyOffset = markdownBodyOffset(text);
    const lines = parsed.body.split(/\r?\n/u);
    let offset = bodyOffset;
    for (const line of lines) {
      if (line.trim() === "") {
        offset += line.length + 1;
        continue;
      }
      const match = line.match(/^#\s+(.+?)\s*#*\s*$/u);
      if (match?.[1]?.trim() !== title.trim()) return undefined;
      return rangeOfOffset(text, offset, line.length);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function markdownDiagnosticRange(text, finding) {
  if (finding.rule === "semantic-linefeeds") return markdownBodyRange(text);
  if (finding.rule === "title-duplicates-h1") return markdownDuplicateH1Range(text) ?? markdownBodyRange(text);
  if (finding.rule === "forbidden-frontmatter-key" || finding.rule === "tags-list") {
    return markdownFrontmatterKeyRange(text, finding.path) ?? zeroRange();
  }
  return splitMarkdownFrontmatterFence(text) === null ? zeroRange() : lineRange(text, 1);
}

function markdownDiagnosticSeverity(finding) {
  if (finding.severity === "error") return 1;
  if (finding.severity === "warning") return 2;
  return 3;
}

export function markdownDiagnostics(doc) {
  const report = validateMarkdownDocument(doc.text);
  return Object.freeze(report.findings.map((finding) => Object.freeze({
    range: markdownDiagnosticRange(doc.text, finding),
    severity: markdownDiagnosticSeverity(finding),
    source: "@red-cup-engineering/metroplat/lsp",
    message: finding.message,
  })));
}

export function markdownFormattingEdits(doc) {
  const offset = markdownBodyOffset(doc.text);
  const body = doc.text.slice(offset);
  const normalized = normalizeLinefeeds(body);
  if (normalized === body) return Object.freeze([]);
  return Object.freeze([Object.freeze({
    range: rangeOfOffset(doc.text, offset, body.length),
    newText: normalized,
  })]);
}

function workspaceEdit(uri, edits) {
  return Object.freeze({
    changes: Object.freeze({ [uri]: Object.freeze(edits) }),
  });
}

function markdownRepoNormalizationEdits(doc) {
  const applied = applyMarkdownEdit(doc.text, {
    kind: markdownEditRequestKind,
    operations: Object.freeze([Object.freeze({ operation: "normalize-repo-markdown" })]),
  });
  if (applied.text === doc.text) return Object.freeze([]);
  return Object.freeze([Object.freeze({
    range: fullDocumentRange(doc.text),
    newText: applied.text,
  })]);
}

function codeActionAllowed(params, kind) {
  const only = params.context?.only;
  return only === undefined || only.length === 0 || only.some((entry) => kind === entry || kind.startsWith(`${entry}.`));
}

export function markdownCodeActions(doc, params) {
  const diagnostics = markdownDiagnostics(doc);
  const operations = [];
  const formatting = markdownFormattingEdits(doc);
  if (formatting.length > 0 && codeActionAllowed(params, "source.format")) {
    operations.push(Object.freeze({
      title: "Normalize markdown body to semantic linefeeds",
      kind: "source.format",
      diagnostics,
      edit: workspaceEdit(doc.uri, formatting),
    }));
  }
  const normalized = markdownRepoNormalizationEdits(doc);
  if (normalized.length > 0 && codeActionAllowed(params, "source.fixAll")) {
    operations.push(Object.freeze({
      title: "Normalize repo markdown frontmatter and body",
      kind: "source.fixAll",
      diagnostics,
      edit: workspaceEdit(doc.uri, normalized),
    }));
  }
  return Object.freeze(operations);
}

export function markdownHeadingAt(doc, position) {
  const line = position.line + 1;
  const headings = readMarkdownStructure(doc.text).headings
    .filter((heading) => heading.startLine <= line && line <= heading.endLine)
    .sort((left, right) => right.level - left.level);
  return headings[0];
}

export function markdownHeadingLocation(doc, heading) {
  return Object.freeze({ uri: doc.uri, range: lineRange(doc.text, heading.line) });
}

export function markdownHover(doc, params) {
  const structure = readMarkdownStructure(doc.text);
  const line = params.position.line + 1;
  if (structure.frontmatter !== null && structure.frontmatter.startLine <= line && line <= structure.frontmatter.endLine) {
    return Object.freeze({
      contents: Object.freeze({
        kind: "markdown",
        value: [
          "**Markdown frontmatter**",
          "",
          `Format: ${structure.frontmatter.format}`,
          "",
          `Lines: ${structure.frontmatter.startLine}-${structure.frontmatter.endLine}`,
        ].join("\n"),
      }),
      range: lineRange(doc.text, structure.frontmatter.startLine),
    });
  }
  const heading = markdownHeadingAt(doc, params.position);
  if (heading === undefined) return null;
  return Object.freeze({
    contents: Object.freeze({
      kind: "markdown",
      value: [
        `**${heading.title}**`,
        "",
        `Heading level: ${heading.level}`,
        "",
        `Path: ${heading.path.join(" / ")}`,
        "",
        `Section lines: ${heading.startLine}-${heading.endLine}`,
      ].join("\n"),
    }),
    range: lineRange(doc.text, heading.line),
  });
}

function freezeDocumentSymbol(symbol) {
  return Object.freeze({
    name: symbol.name,
    ...(symbol.detail === undefined ? {} : { detail: symbol.detail }),
    kind: symbol.kind,
    range: symbol.range,
    selectionRange: symbol.selectionRange,
    ...(symbol.children.length === 0 ? {} : { children: Object.freeze(symbol.children.map(freezeDocumentSymbol)) }),
  });
}

export function markdownDocumentSymbols(doc) {
  const structure = readMarkdownStructure(doc.text);
  const roots = [];
  if (structure.frontmatter !== null) {
    roots.push({
      name: "frontmatter",
      detail: structure.frontmatter.format,
      kind: 19,
      range: lineSpanRange(doc.text, structure.frontmatter.startLine, structure.frontmatter.endLine),
      selectionRange: lineRange(doc.text, structure.frontmatter.startLine),
      children: [],
    });
  }
  const stack = [];
  for (const heading of structure.headings) {
    const symbol = {
      name: heading.title,
      detail: `heading ${heading.level}`,
      kind: heading.level === 1 ? 1 : 3,
      range: lineSpanRange(doc.text, heading.startLine, heading.endLine),
      selectionRange: lineRange(doc.text, heading.line),
      level: heading.level,
      children: [],
    };
    while (stack.length > 0 && (stack.at(-1).level ?? 0) >= heading.level) stack.pop();
    const parent = stack.at(-1);
    if (parent === undefined) roots.push(symbol);
    else parent.children.push(symbol);
    stack.push(symbol);
  }
  return Object.freeze(roots.map(freezeDocumentSymbol));
}

function featureTarget(feature) {
  if (feature.type === "markdown-link") return feature.target;
  if (feature.type === "wikilink") return `metroplat-markdown://wikilink/${encodeURIComponent(feature.target)}`;
  if (feature.type === "transclusion") return `metroplat-markdown://transclusion/${encodeURIComponent(feature.target)}`;
  if (feature.type === "inline-field") return `metroplat-markdown://inline-field/${encodeURIComponent(feature.key)}`;
  if (feature.type === "citation-group") {
    const [key] = [...feature.keys, ...feature.suppressedKeys];
    return key === undefined ? undefined : `metroplat-markdown://citation/${encodeURIComponent(key)}`;
  }
  return undefined;
}

function featureTooltip(feature) {
  if (feature.type === "markdown-link") return feature.image ? `image: ${feature.target}` : `link: ${feature.target}`;
  if (feature.type === "wikilink") return `wikilink: ${feature.target}`;
  if (feature.type === "transclusion") return `transclusion: ${feature.target}`;
  if (feature.type === "inline-field") return `inline field: ${feature.key}`;
  if (feature.type === "citation-group") return `citations: ${[...feature.keys, ...feature.suppressedKeys].join(", ")}`;
  return `callout: ${feature.calloutType}`;
}

export function markdownDocumentLinks(doc) {
  const parsed = readMarkdownFrontmatter(doc.text);
  const bodyOffset = markdownBodyOffset(doc.text);
  return Object.freeze(readMarkdownFeatures(parsed.body)
    .filter((feature) => feature.type !== "callout")
    .map((feature) => {
      const target = featureTarget(feature);
      return Object.freeze({
        range: rangeOfOffset(doc.text, bodyOffset + feature.span.start, feature.span.end - feature.span.start),
        ...(target === undefined ? {} : { target }),
        tooltip: featureTooltip(feature),
        data: feature,
      });
    }));
}

export function markdownFoldingRanges(doc) {
  const structure = readMarkdownStructure(doc.text);
  const ranges = [];
  if (structure.frontmatter !== null && structure.frontmatter.endLine > structure.frontmatter.startLine) {
    ranges.push(Object.freeze({
      startLine: structure.frontmatter.startLine - 1,
      endLine: structure.frontmatter.endLine - 1,
      kind: "region",
    }));
  }
  for (const heading of structure.headings) {
    if (heading.endLine <= heading.line) continue;
    ranges.push(Object.freeze({
      startLine: heading.line - 1,
      endLine: heading.endLine - 1,
      kind: "region",
    }));
  }
  return Object.freeze(ranges);
}

function nestSelectionRanges(ranges) {
  if (ranges.length === 0) throw new TypeError("lsp selection range: expected at least one range");
  let parent;
  for (const range of [...ranges].reverse()) {
    const current = Object.freeze({
      range,
      ...(parent === undefined ? {} : { parent }),
    });
    parent = current;
  }
  return parent;
}

function markdownSelectionRange(doc, position) {
  const structure = readMarkdownStructure(doc.text);
  const line = position.line + 1;
  const ranges = [lineRange(doc.text, line)];
  if (structure.frontmatter !== null && structure.frontmatter.startLine <= line && line <= structure.frontmatter.endLine) {
    ranges.push(lineSpanRange(doc.text, structure.frontmatter.startLine, structure.frontmatter.endLine));
  } else {
    const headings = structure.headings
      .filter((heading) => heading.startLine <= line && line <= heading.endLine)
      .sort((left, right) => left.level - right.level);
    for (const heading of [...headings].reverse()) {
      ranges.push(lineSpanRange(doc.text, heading.startLine, heading.endLine));
    }
    ranges.push(markdownBodyRange(doc.text));
  }
  ranges.push(fullDocumentRange(doc.text));
  const unique = ranges.filter((range, index) => ranges.findIndex((candidate) => rangesEqual(candidate, range)) === index);
  return nestSelectionRanges(Object.freeze(unique));
}

export function markdownSelectionRanges(doc, params) {
  return Object.freeze(params.positions.map((position) => markdownSelectionRange(doc, position)));
}
