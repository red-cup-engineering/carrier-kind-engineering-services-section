import assert from "node:assert/strict";
import test from "node:test";

import { markdownBodyToHtml } from "../dist/block.mjs";

test("markdownBodyToHtml renders headings, paragraphs, and inline emphasis", () => {
  const html = markdownBodyToHtml("# Title\n\nA <literal> and **strong** claim.");
  assert.match(html, /<h1>Title<\/h1>/u);
  assert.match(html, /&lt;literal&gt;/u);
  assert.match(html, /<strong>strong<\/strong>/u);
});

test("markdownBodyToHtml renders fenced code, lists, and blockquotes", () => {
  const html = markdownBodyToHtml("```\ncode line\n```\n\n- one\n- two\n\n> quoted");
  assert.match(html, /<pre><code>code line<\/code><\/pre>/u);
  assert.match(html, /<ul>[\s\S]*<li><p>one<\/p><\/li>[\s\S]*<li><p>two<\/p><\/li>[\s\S]*<\/ul>/u);
  assert.match(html, /<blockquote>[\s\S]*quoted[\s\S]*<\/blockquote>/u);
});

test("markdownBodyToHtml returns the empty-body default and honors the emptyHtml option", () => {
  assert.equal(markdownBodyToHtml(""), "<p></p>");
  assert.equal(markdownBodyToHtml("   \n  ", { emptyHtml: "<p>empty</p>" }), "<p>empty</p>");
});

test("markdownBodyToHtml renders a callout as an aside with title and body", () => {
  const html = markdownBodyToHtml("> [!note] A title\n> body text");
  assert.match(html, /<aside class="markdown-callout markdown-callout-note" data-callout="note">/u);
  assert.match(html, /markdown-callout-title/u);
  assert.match(html, /body text/u);
});
