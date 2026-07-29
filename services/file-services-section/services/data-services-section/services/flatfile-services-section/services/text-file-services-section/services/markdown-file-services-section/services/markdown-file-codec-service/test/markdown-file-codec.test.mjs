import assert from "node:assert/strict";
import test from "node:test";

import {
  applyMarkdownEdit,
  createMarkdown,
  markdownBodyToHtml,
  markdownDiffWorkbench,
  markdownFeatures,
  markdownStructure,
  markdownValidationReport,
  parseMarkdown,
  readMarkdownDocument,
} from "../dist/markdown/index.mjs";

test("Markdown codec round-trips YAML frontmatter without erasing empty values", () => {
  const text = createMarkdown({
    slug: "proof-paths",
    tags: [],
    nested: { owner: "red-cup" },
    body: "# Proof Paths\n\nPaths carry meaning.\n",
  }, { semanticLineBreaks: false });
  const parsed = parseMarkdown(text);
  assert.equal(parsed.format, "yaml");
  assert.deepEqual(parsed.frontmatter, {
    nested: { owner: "red-cup" },
    slug: "proof-paths",
    tags: [],
  });
  assert.equal(parsed.body, "# Proof Paths\n\nPaths carry meaning.\n");
});

test("Markdown codec decodes TOML frontmatter and emits structural assertions", () => {
  const text = "+++\nslug = \"toml-note\"\ntags = [\"a\", \"b\"]\n+++\n# TOML note\n";
  const parsed = parseMarkdown(text);
  assert.equal(parsed.format, "toml");
  assert.deepEqual(parsed.frontmatter, { slug: "toml-note", tags: ["a", "b"] });
  const readout = readMarkdownDocument(text, { coordinate: "notes/toml-note.md" });
  assert.equal(readout.subject, "toml-note");
  assert.equal(readout.assertions.some((row) => row.a === "body"), true);
  assert.equal(readout.structure.headings[0].title, "TOML note");
});

test("recovered feature, edit, diff, validation, and HTML capabilities share one codec", () => {
  const before = "---\ntitle: Note\ntags: []\n---\n# Note\n\nSee [[Proof Path]] and [site](https://example.test).\n";
  assert.deepEqual(markdownFeatures(parseMarkdown(before).body).map((feature) => feature.type), ["wikilink", "markdown-link"]);
  assert.equal(markdownStructure(before).headings[0].title, "Note");

  const edited = applyMarkdownEdit(before, {
    kind: "red-cup-engineering.markdown.edit-request",
    operations: [{ operation: "upsert-section", heading: "Evidence", body: "A durable path." }],
  });
  assert.equal(edited.receipt.changed, true);
  assert.match(edited.text, /## Evidence\n\nA durable path\./u);
  assert.equal(markdownDiffWorkbench(before, edited.text).changed, true);
  assert.equal(markdownValidationReport(edited.text).parseable, true);

  const html = markdownBodyToHtml("A <literal> and **strong** claim.");
  assert.match(html, /&lt;literal&gt;/u);
  assert.match(html, /<strong>strong<\/strong>/u);
});
