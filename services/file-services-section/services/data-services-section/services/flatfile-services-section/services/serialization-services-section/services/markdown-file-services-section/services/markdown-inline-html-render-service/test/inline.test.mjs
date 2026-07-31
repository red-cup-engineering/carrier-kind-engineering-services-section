import assert from "node:assert/strict";
import test from "node:test";

import { markdownInlineToHtml, markdownInlineNodes, safeHref } from "../dist/inline.mjs";

test("markdownInlineToHtml escapes literal text and renders strong emphasis", () => {
  const html = markdownInlineToHtml("A <literal> and **strong** claim.");
  assert.match(html, /&lt;literal&gt;/u);
  assert.match(html, /<strong>strong<\/strong>/u);
});

test("markdownInlineToHtml renders emphasis, strong+em, inline code, and links", () => {
  assert.equal(markdownInlineToHtml("*em*"), "<em>em</em>");
  assert.equal(markdownInlineToHtml("_em_"), "<em>em</em>");
  assert.equal(markdownInlineToHtml("__strong__"), "<strong>strong</strong>");
  assert.equal(markdownInlineToHtml("***both***"), "<strong><em>both</em></strong>");
  assert.equal(markdownInlineToHtml("`code`"), "<code>code</code>");
  assert.equal(markdownInlineToHtml("[text](https://example.com)"), '<a href="https://example.com">text</a>');
});

test("markdownInlineToHtml refuses javascript: and data: link targets", () => {
  assert.equal(markdownInlineToHtml("[x](javascript:alert1)"), "x");
  assert.equal(markdownInlineToHtml("[x](data:text/html,x)"), "x");
});

test("markdownInlineNodes returns a frozen HTML node array", () => {
  const nodes = markdownInlineNodes("plain text");
  assert.equal(Object.isFrozen(nodes), true);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].kind, "text");
});

test("safeHref denylists javascript/data and passes through everything else trimmed", () => {
  assert.equal(safeHref("  https://example.com  "), "https://example.com");
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("DATA:text/html,x"), null);
  assert.equal(safeHref(""), null);
});
