import assert from "node:assert/strict";
import test from "node:test";

import {
  createMarkdown,
  markdownFeatures,
  markdownStructure,
  parseMarkdown,
  readMarkdownDocument,
} from "../dist/index.mjs";

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

test("markdownFeatures and markdownStructure read wikilinks, links, and headings from one body", () => {
  const before = "---\ntitle: Note\ntags: []\n---\n# Note\n\nSee [[Proof Path]] and [site](https://example.test).\n";
  assert.deepEqual(markdownFeatures(parseMarkdown(before).body).map((feature) => feature.type), ["wikilink", "markdown-link"]);
  assert.equal(markdownStructure(before).headings[0].title, "Note");
});
