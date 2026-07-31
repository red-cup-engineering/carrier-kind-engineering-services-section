/**
 * formats/markdown/inline-html - project Markdown inline markup to safe HTML.
 *
 * Split out of markdown-html-render-service: this module owns the
 * text-run-to-HTML-node projection (emphasis, strong, code spans, links,
 * images, wikilinks, transclusions, inline fields, citation groups) that the
 * block renderer composes for headings, paragraphs, callout titles, and list
 * items. It carries no block-level concept of its own.
 */
import {
  htmlElement,
  htmlText,
  renderHtmlNode,
  type HtmlNode,
} from "@red-cup-engineering/html-file-codec-service/document-nodes";
import { markdownFeatures, type MarkdownFeature } from "@red-cup-engineering/markdown-document-codec-service";

/** Project Markdown inline markup within one text run to HTML nodes. */
export function markdownInlineNodes(text: string): readonly HtmlNode[] {
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
        ? markdownInlineNodes(link.label)
        : [htmlElement("a", { href }, markdownInlineNodes(link.label))]));
      index = link.next;
      continue;
    }

    const strongEmphasis = text.startsWith("***", index) ? bounded(text, "***", index) : null;
    if (strongEmphasis !== null) {
      flushText();
      nodes.push(htmlElement("strong", {}, [htmlElement("em", {}, markdownInlineNodes(strongEmphasis.inner))]));
      index = strongEmphasis.next;
      continue;
    }

    const strong = text.startsWith("**", index) ? bounded(text, "**", index) : null;
    if (strong !== null) {
      flushText();
      nodes.push(htmlElement("strong", {}, markdownInlineNodes(strong.inner)));
      index = strong.next;
      continue;
    }

    const underscoreStrong = text.startsWith("__", index) ? bounded(text, "__", index) : null;
    if (underscoreStrong !== null) {
      flushText();
      nodes.push(htmlElement("strong", {}, markdownInlineNodes(underscoreStrong.inner)));
      index = underscoreStrong.next;
      continue;
    }

    const emphasis = text[index] === "*" ? bounded(text, "*", index) : null;
    if (emphasis !== null) {
      flushText();
      nodes.push(htmlElement("em", {}, markdownInlineNodes(emphasis.inner)));
      index = emphasis.next;
      continue;
    }

    const underscoreEmphasis = text[index] === "_" ? bounded(text, "_", index) : null;
    if (underscoreEmphasis !== null) {
      flushText();
      nodes.push(htmlElement("em", {}, markdownInlineNodes(underscoreEmphasis.inner)));
      index = underscoreEmphasis.next;
      continue;
    }

    plain += text[index]!;
    index++;
  }
  flushText();
  return Object.freeze(nodes);
}

/** Project Markdown inline markup to a safe HTML string. */
export function markdownInlineToHtml(markdown: string): string {
  return markdownInlineNodes(markdown).map(renderHtmlNode).join("");
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
    if (href === null) return markdownInlineNodes(feature.label);
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
    }, markdownInlineNodes(feature.label))];
  }
  if (feature.type === "inline-field") {
    return [htmlElement("span", { class: "markdown-inline-field", "data-key": feature.key }, [
      htmlElement("span", { class: "markdown-inline-field-key" }, [feature.key]),
      htmlElement("span", { class: "markdown-inline-field-value" }, markdownInlineNodes(feature.value)),
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

/** Reject `javascript:`/`data:` targets; everything else passes through trimmed. */
export function safeHref(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || /^(?:javascript|data):/iu.test(trimmed)) return null;
  return trimmed;
}
