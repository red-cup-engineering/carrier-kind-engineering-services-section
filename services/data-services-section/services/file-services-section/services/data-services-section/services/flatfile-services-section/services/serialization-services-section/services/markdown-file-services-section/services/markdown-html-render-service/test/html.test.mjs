import assert from "node:assert/strict";
import test from "node:test";

import { markdownBodyToHtml } from "../dist/html.mjs";

test("markdownBodyToHtml escapes literal text and renders strong emphasis", () => {
  const html = markdownBodyToHtml("A <literal> and **strong** claim.");
  assert.match(html, /&lt;literal&gt;/u);
  assert.match(html, /<strong>strong<\/strong>/u);
});
