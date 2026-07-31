import assert from "node:assert/strict";
import test from "node:test";

import * as shim from "../dist/markdown/index.mjs";

// This package is now a compatibility shim: its own bytes implement nothing,
// they re-export the six single-capability packages it was split into. This
// test proves the re-export surface still resolves to the same names the
// original monolith exported, and that a call through the shim reaches real
// behavior end to end.
const expectedExports = [
  "splitFrontMatterFence",
  "parseMarkdown",
  "decodeMarkdownFrontmatter",
  "readMarkdownDocument",
  "createMarkdown",
  "markdownFeatures",
  "semanticLineBreaks",
  "markdownStructure",
  "markdownBodyToHtml",
  "markdownInlineToHtml",
  "markdownEditRequestKind",
  "markdownEditReceiptKind",
  "isMarkdownEditRequest",
  "applyMarkdownEdit",
  "markdownValidationReport",
  "markdownWorkbenchKind",
  "MARKDOWN_WORKBENCH_EDIT_OPERATIONS",
  "markdownWorkbench",
  "markdownDiffWorkbenchKind",
  "markdownDiffWorkbench",
];

test("shim re-exports the full pre-split surface", () => {
  for (const name of expectedExports) {
    assert.notEqual(shim[name], undefined, `expected shim export ${name}`);
  }
});

test("shim's parseMarkdown and createMarkdown still round-trip through the split packages", () => {
  const text = shim.createMarkdown({ slug: "shim-check", body: "# Shim\n" });
  const parsed = shim.parseMarkdown(text);
  assert.equal(parsed.frontmatter.slug, "shim-check");
  assert.equal(parsed.body, "# Shim\n");
});

test("shim's markdownWorkbench still composes edit, validation, and HTML behind one call", () => {
  const readout = shim.markdownWorkbench("---\ntitle: Shim\n---\n# Shim\n\nBody.\n");
  assert.equal(readout.kind, "red-cup-engineering.markdown.workbench");
  assert.equal(readout.validation.parseable, true);
  assert.match(readout.html, /<h1>Shim<\/h1>/u);
});
