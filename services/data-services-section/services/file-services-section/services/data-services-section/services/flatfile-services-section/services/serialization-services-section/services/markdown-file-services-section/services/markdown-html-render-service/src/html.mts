/**
 * formats/markdown/html - project a Markdown body to safe HTML fragments.
 *
 * This is the composition point over two atomic packages: block-level
 * tokenization (markdown-block-html-render-service) and inline markup
 * projection (markdown-inline-html-render-service). The Markdown document
 * codec owns frontmatter/body splitting upstream of both. Export surface is
 * unchanged so existing consumers (markdown-workbench-service and others)
 * keep working without modification.
 */
import {
  markdownBodyToHtml as renderMarkdownBodyToHtml,
  type MarkdownHtmlOptions,
} from "@red-cup-engineering/markdown-block-html-render-service";
import { markdownInlineToHtml as renderMarkdownInlineToHtml } from "@red-cup-engineering/markdown-inline-html-render-service";

export type { MarkdownHtmlOptions };

/** Project a Markdown body fragment to HTML blocks. */
export function markdownBodyToHtml(markdown: string, options: MarkdownHtmlOptions = {}): string {
  return renderMarkdownBodyToHtml(markdown, options);
}

/** Project Markdown inline markup to safe HTML. */
export function markdownInlineToHtml(markdown: string): string {
  return renderMarkdownInlineToHtml(markdown);
}
