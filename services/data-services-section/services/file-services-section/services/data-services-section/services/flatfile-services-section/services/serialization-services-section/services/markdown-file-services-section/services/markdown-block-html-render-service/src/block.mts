/**
 * formats/markdown/block-html - project a Markdown body to safe HTML blocks.
 *
 * Split out of markdown-html-render-service: this module owns block-level
 * tokenization (headings, thematic breaks, callouts, blockquotes, lists,
 * fenced code, paragraphs) and delegates every text run inside a block to
 * markdown-inline-html-render-service. The Markdown document codec owns
 * frontmatter/body splitting upstream of this module.
 */
import {
  htmlElement,
  htmlFragment,
  renderHtmlNode,
  type HtmlAttributes,
  type HtmlChild,
} from "@red-cup-engineering/html-file-codec-service/document-nodes";
import { markdownInlineNodes } from "@red-cup-engineering/markdown-inline-html-render-service";

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

function renderElement(name: string, attributes: HtmlAttributes = {}, children: readonly HtmlChild[] = []): string {
  return renderHtmlNode(htmlElement(name, attributes, children));
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
      const rendered = renderFence(lines, index, fence, fenceInfoString(line, fence));
      blocks.push(rendered.html);
      index = rendered.next;
      continue;
    }

    const heading = headingOf(line);
    if (heading !== null) {
      blocks.push(renderElement(`h${heading.level}`, {}, markdownInlineNodes(heading.text)));
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

function renderFence(lines: readonly string[], start: number, fence: string, infoString: string): RenderedBlocks {
  const code: string[] = [];
  let index = start + 1;
  while (index < lines.length && !closingFence(lines[index]!, fence)) {
    code.push(lines[index]!);
    index++;
  }
  if (index < lines.length) index++;
  const language = fenceLanguage(infoString);
  const codeAttributes = language === null ? {} : { class: `language-${language}` };
  return { html: renderElement("pre", {}, [htmlElement("code", codeAttributes, [code.join("\n")])]), next: index };
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
      htmlElement("p", { class: "markdown-callout-title" }, markdownInlineNodes(title)),
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
  return { html: renderElement("p", {}, markdownInlineNodes(paragraph.join(" "))), next: index };
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

/** The info string trailing the opening fence marker on its line, e.g. `js` in ` ```js `. */
function fenceInfoString(line: string, fence: string): string {
  return line.slice(line.indexOf(fence) + fence.length).trim();
}

/** The language token (first word) of a fence info string, or null if there is none. */
function fenceLanguage(infoString: string): string | null {
  const token = infoString.trim().split(/\s+/u)[0] ?? "";
  return /\w/u.test(token) ? token : null;
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
