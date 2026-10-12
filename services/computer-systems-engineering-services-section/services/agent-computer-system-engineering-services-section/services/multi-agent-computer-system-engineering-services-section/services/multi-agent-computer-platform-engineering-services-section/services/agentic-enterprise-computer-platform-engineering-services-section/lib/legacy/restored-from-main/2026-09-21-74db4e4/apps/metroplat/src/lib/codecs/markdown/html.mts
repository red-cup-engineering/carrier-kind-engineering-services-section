/**
 * formats/markdown/html - project a Markdown body to safe HTML fragments.
 *
 * The Markdown document codec owns frontmatter/body splitting. This module owns
 * the body-to-HTML projection that static website renderers and other web
 * surfaces can share without each one carrying private Markdown regexes.
 */
import {
  htmlElement,
  htmlFragment,
  htmlText,
  renderHtmlNode,
  type HtmlAttributes,
  type HtmlChild,
  type HtmlNode,
} from "@red-cup-engineering/html-structural-projection-service/document-nodes";
import { markdownFeatures, type MarkdownFeature } from "./features.mts";

export interface MarkdownHtmlOptions {
  /** Return this fragment for an empty Markdown body. Default `<p></p>`. */
  readonly emptyHtml?: string;
}

/** Project a Markdown body fragment to HTML blocks. */
export function markdownBodyToHtml(markdown: string, options: MarkdownHtmlOptions = {}): string {
  const normalized = markdown.replace(/\r\n?/gu, "\n").trim();
  if (normalized === "") return options.emptyHtml ?? "<p></p>";
  return renderBlocks(normalized.split("\n"), 0).html;
}

/** Project Markdown inline markup to safe HTML. */
export function markdownInlineToHtml(markdown: string): string {
  return renderInlineNodes(markdown).map(renderHtmlNode).join("");
}

function renderElement(name: string, attributes: HtmlAttributes = {}, children: readonly HtmlChild[] = []): string {
  return renderHtmlNode(htmlElement(name, attributes, children));
}

function renderInlineNodes(text: string): readonly HtmlNode[] {
  const features = inlineMarkdownFeatures(text);
  const nodes: HtmlNode[] = [];
  let plain = "";
  const flushText = (): void => {
    if (plain === "") return;
    nodes.push(htmlText(plain));
    plain = "";
  };
  for (let index = 0; index < text.length;) {
    const feature = features.find((candidate) => candidate.span.start === index);
    if (feature !== undefined) {
      flushText();
      nodes.push(...renderInlineFeature(feature));
      index = feature.span.end;
      continue;
    }

    const code = text[index] === "`" ? bounded(text, "`", index) : null;
    if (code !== null) {
      flushText();
      nodes.push(htmlElement("code", {}, [code.inner]));
      index = code.next;
      continue;
    }

    const link = text[index] === "[" ? linkSpan(text, index) : null;
    if (link !== null) {
      const href = safeHref(link.href);
      flushText();
      nodes.push(...(href === null
        ? renderInlineNodes(link.label)
        : [htmlElement("a", { href }, renderInlineNodes(link.label))]));
      index = link.next;
      continue;
    }

    const strongEmphasis = text.startsWith("***", index) ? bounded(text, "***", index) : null;
    if (strongEmphasis !== null) {
      flushText();
      nodes.push(htmlElement("strong", {}, [htmlElement("em", {}, renderInlineNodes(strongEmphasis.inner))]));
      index = strongEmphasis.next;
      continue;
    }

    const strong = text.startsWith("**", index) ? bounded(text, "**", index) : null;
    if (strong !== null) {
      flushText();
      nodes.push(htmlElement("strong", {}, renderInlineNodes(strong.inner)));
      index = strong.next;
      continue;
    }

    const underscoreStrong = text.startsWith("__", index) ? bounded(text, "__", index) : null;
    if (underscoreStrong !== null) {
      flushText();
      nodes.push(htmlElement("strong", {}, renderInlineNodes(underscoreStrong.inner)));
      index = underscoreStrong.next;
      continue;
    }

    const emphasis = text[index] === "*" ? bounded(text, "*", index) : null;
    if (emphasis !== null) {
      flushText();
      nodes.push(htmlElement("em", {}, renderInlineNodes(emphasis.inner)));
      index = emphasis.next;
      continue;
    }

    const underscoreEmphasis = text[index] === "_" ? bounded(text, "_", index) : null;
    if (underscoreEmphasis !== null) {
      flushText();
      nodes.push(htmlElement("em", {}, renderInlineNodes(underscoreEmphasis.inner)));
      index = underscoreEmphasis.next;
      continue;
    }

    plain += text[index]!;
    index++;
  }
  flushText();
  return Object.freeze(nodes);
}

type InlineMarkdownFeature = Extract<MarkdownFeature, {
  readonly type:
    | "wikilink"
    | "transclusion"
    | "markdown-link"
    | "inline-field"
    | "citation-group";
}>;

function inlineMarkdownFeatures(text: string): readonly InlineMarkdownFeature[] {
  const features: InlineMarkdownFeature[] = [];
  let cursor = 0;
  const ordered = [...markdownFeatures(text)]
    .filter((feature): feature is InlineMarkdownFeature => feature.type !== "callout")
    .sort((left, right) => left.span.start - right.span.start || right.span.end - left.span.end);
  for (const feature of ordered) {
    if (feature.span.start < cursor) continue;
    features.push(feature);
    cursor = feature.span.end;
  }
  return features;
}

function renderInlineFeature(feature: InlineMarkdownFeature): readonly HtmlNode[] {
  if (feature.type === "markdown-link") {
    const href = safeHref(feature.target);
    if (href === null) return renderInlineNodes(feature.label);
    if (feature.image) {
      return [htmlElement("img", {
        src: href,
        alt: feature.label,
        ...(feature.title === null ? {} : { title: feature.title }),
      })];
    }
    return [htmlElement("a", {
      href,
      ...(feature.title === null ? {} : { title: feature.title }),
    }, renderInlineNodes(feature.label))];
  }
  if (feature.type === "inline-field") {
    return [htmlElement("span", { class: "markdown-inline-field", "data-key": feature.key }, [
      htmlElement("span", { class: "markdown-inline-field-key" }, [feature.key]),
      htmlElement("span", { class: "markdown-inline-field-value" }, renderInlineNodes(feature.value)),
    ])];
  }
  if (feature.type === "citation-group") {
    return [htmlElement("span", {
      class: "markdown-citation-group",
      role: "doc-biblioref",
      "data-citation-keys": feature.keys.join(" "),
      "data-citation-suppressed-keys": feature.suppressedKeys.join(" "),
    }, [feature.span.text])];
  }
  const kind = feature.type === "wikilink" ? "markdown-wikilink" : "markdown-transclusion";
  const label = feature.label ?? feature.target;
  return [htmlElement("span", { class: kind, "data-target": feature.target }, [label])];
}

function bounded(text: string, delimiter: string, start: number): { readonly inner: string; readonly next: number } | null {
  const close = text.indexOf(delimiter, start + delimiter.length);
  if (close < 0) return null;
  return Object.freeze({
    inner: text.slice(start + delimiter.length, close),
    next: close + delimiter.length,
  });
}

function linkSpan(text: string, start: number): { readonly label: string; readonly href: string; readonly next: number } | null {
  const labelEnd = text.indexOf("]", start + 1);
  if (labelEnd < 0 || text[labelEnd + 1] !== "(") return null;
  const hrefEnd = text.indexOf(")", labelEnd + 2);
  if (hrefEnd < 0) return null;
  return Object.freeze({
    label: text.slice(start + 1, labelEnd),
    href: text.slice(labelEnd + 2, hrefEnd),
    next: hrefEnd + 1,
  });
}

function safeHref(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || /^(?:javascript|data):/iu.test(trimmed)) return null;
  return trimmed;
}

interface RenderedBlocks {
  readonly html: string;
  readonly next: number;
}

interface ListMarker {
  readonly indent: number;
  readonly ordered: boolean;
  readonly marker: string;
  readonly checkbox: "checked" | "unchecked" | null;
  readonly text: string;
}

function renderBlocks(lines: readonly string[], start: number): RenderedBlocks {
  const blocks: string[] = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index]!;
    if (line.trim() === "") {
      index++;
      continue;
    }

    const fence = fenceStart(line);
    if (fence !== null) {
      const rendered = renderFence(lines, index, fence);
      blocks.push(rendered.html);
      index = rendered.next;
      continue;
    }

    const heading = headingOf(line);
    if (heading !== null) {
      blocks.push(renderElement(`h${heading.level}`, {}, renderInlineNodes(heading.text)));
      index++;
      continue;
    }

    if (thematicBreak(line)) {
      blocks.push(renderElement("hr"));
      index++;
      continue;
    }

    const callout = calloutStart(line);
    if (callout !== null) {
      const rendered = renderCallout(lines, index, callout);
      blocks.push(rendered.html);
      index = rendered.next;
      continue;
    }

    if (blockquoteStart(line)) {
      const rendered = renderBlockquote(lines, index);
      blocks.push(rendered.html);
      index = rendered.next;
      continue;
    }

    const marker = listMarker(line);
    if (marker !== null) {
      const rendered = renderList(lines, index, marker);
      blocks.push(rendered.html);
      index = rendered.next;
      continue;
    }

    const rendered = renderParagraph(lines, index);
    blocks.push(rendered.html);
    index = rendered.next;
  }
  return { html: blocks.join("\n"), next: index };
}

function renderFence(lines: readonly string[], start: number, fence: string): RenderedBlocks {
  const code: string[] = [];
  let index = start + 1;
  while (index < lines.length && !closingFence(lines[index]!, fence)) {
    code.push(lines[index]!);
    index++;
  }
  if (index < lines.length) index++;
  return { html: renderElement("pre", {}, [htmlElement("code", {}, [code.join("\n")])]), next: index };
}

function renderCallout(
  lines: readonly string[],
  start: number,
  callout: { readonly type: string; readonly title: string | null },
): RenderedBlocks {
  const quoted: string[] = [];
  let index = start + 1;
  while (index < lines.length && (blockquoteStart(lines[index]!) || lines[index]!.trim() === "")) {
    quoted.push(lines[index]!.replace(/^ {0,3}>\s?/u, ""));
    index++;
  }
  const body = renderBlocks(quoted, 0).html;
  const title = callout.title ?? callout.type;
  return {
    html: renderElement("aside", {
      class: `markdown-callout markdown-callout-${slugClass(callout.type)}`,
      "data-callout": callout.type,
    }, [
      htmlElement("p", { class: "markdown-callout-title" }, renderInlineNodes(title)),
      body === "" ? null : htmlElement("div", { class: "markdown-callout-body" }, [htmlFragment(`\n${indent(body, 2)}\n`)]),
    ]),
    next: index,
  };
}

function renderBlockquote(lines: readonly string[], start: number): RenderedBlocks {
  const quoted: string[] = [];
  let index = start;
  while (index < lines.length && (blockquoteStart(lines[index]!) || lines[index]!.trim() === "")) {
    quoted.push(lines[index]!.replace(/^ {0,3}>\s?/u, ""));
    index++;
  }
  return { html: renderElement("blockquote", {}, [htmlFragment(`\n${indent(renderBlocks(quoted, 0).html, 2)}\n`)]), next: index };
}

function renderList(lines: readonly string[], start: number, first: ListMarker): RenderedBlocks {
  const tag = first.ordered ? "ol" : "ul";
  const items: string[] = [];
  let index = start;
  while (index < lines.length) {
    const marker = listMarker(lines[index]!);
    if (marker === null || marker.indent !== first.indent || marker.ordered !== first.ordered) break;
    const itemLines: string[] = [itemPrefix(marker) + marker.text];
    index++;
    while (index < lines.length) {
      const line = lines[index]!;
      const nextMarker = listMarker(line);
      if (nextMarker !== null && nextMarker.indent === first.indent) break;
      if (line.trim() !== "" && indentWidth(line) <= first.indent) break;
      itemLines.push(dedentListContinuation(line, first.indent));
      index++;
    }
    items.push(renderElement("li", {}, [htmlFragment(renderBlocks(itemLines, 0).html)]));
  }
  const startValue = first.ordered && /^\d+/u.test(first.marker) && first.marker.replace(/\D/gu, "") !== "1"
    ? first.marker.replace(/\D/gu, "")
    : undefined;
  return { html: renderElement(tag, startValue === undefined ? {} : { start: startValue }, [htmlFragment(`\n${indent(items.join("\n"), 2)}\n`)]), next: index };
}

function renderParagraph(lines: readonly string[], start: number): RenderedBlocks {
  const paragraph: string[] = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index]!;
    if (line.trim() === "") break;
    if (paragraph.length > 0 && isBlockStart(line)) break;
    paragraph.push(line.trim());
    index++;
  }
  return { html: renderElement("p", {}, renderInlineNodes(paragraph.join(" "))), next: index };
}

function itemPrefix(marker: ListMarker): string {
  if (marker.checkbox === null) return "";
  return marker.checkbox === "checked" ? "[x] " : "[ ] ";
}

function dedentListContinuation(line: string, baseIndent: number): string {
  if (line.trim() === "") return "";
  return removeIndentColumns(line, baseIndent + 2);
}

function isBlockStart(line: string): boolean {
  return fenceStart(line) !== null
    || headingOf(line) !== null
    || thematicBreak(line)
    || calloutStart(line) !== null
    || blockquoteStart(line)
    || listMarker(line) !== null;
}

function fenceStart(line: string): string | null {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})/u);
  return match?.[1] ?? null;
}

function closingFence(line: string, fence: string): boolean {
  return new RegExp(`^ {0,3}${escapeRegExp(fence[0]!).repeat(fence.length)}\\s*$`, "u").test(line);
}

function headingOf(line: string): { readonly level: number; readonly text: string } | null {
  const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/u);
  return heading === null ? null : { level: heading[1]!.length, text: heading[2]! };
}

function thematicBreak(line: string): boolean {
  return /^ {0,3}((?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/u.test(line);
}

function blockquoteStart(line: string): boolean {
  return /^ {0,3}>/u.test(line);
}

function calloutStart(line: string): { readonly type: string; readonly title: string | null } | null {
  const match = line.match(/^ {0,3}>[ \t]*\[!([A-Za-z0-9_-]+)\][ \t]*(.*)$/u);
  if (match === null) return null;
  const title = match[2]!.trim();
  return {
    type: match[1]!.trim().toLowerCase(),
    title: title === "" ? null : title,
  };
}

function listMarker(line: string): ListMarker | null {
  const expanded = expandLeadingTabs(line);
  const match = expanded.match(/^(\s*)((?:[-+*])|(?:\d{1,9}[.)]))\s+(?:\[([ xX])\]\s+)?(.*)$/u);
  if (match === null) return null;
  return {
    indent: match[1]!.length,
    ordered: /^\d/u.test(match[2]!),
    marker: match[2]!,
    checkbox: match[3] === undefined ? null : match[3]!.trim().toLowerCase() === "x" ? "checked" : "unchecked",
    text: match[4]!,
  };
}

function indentWidth(line: string): number {
  return expandLeadingTabs(line).match(/^\s*/u)?.[0].length ?? 0;
}

function expandLeadingTabs(line: string): string {
  const leading = line.match(/^\s*/u)?.[0] ?? "";
  return leading.replace(/\t/gu, "  ") + line.slice(leading.length);
}

function removeIndentColumns(line: string, columns: number): string {
  let index = 0;
  let remaining = columns;
  while (index < line.length && remaining > 0) {
    const char = line[index]!;
    if (char === " ") {
      remaining -= 1;
      index += 1;
      continue;
    }
    if (char === "\t") {
      remaining -= 2;
      index += 1;
      continue;
    }
    break;
  }
  return line.slice(index);
}

function indent(value: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return value.split("\n").map((line) => `${pad}${line}`).join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function slugClass(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/gu, "-").replace(/^-+|-+$/gu, "") || "callout";
}
