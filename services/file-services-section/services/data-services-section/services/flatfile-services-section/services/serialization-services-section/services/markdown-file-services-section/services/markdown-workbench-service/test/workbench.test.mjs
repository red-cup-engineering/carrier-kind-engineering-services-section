import assert from "node:assert/strict";
import test from "node:test";

import { markdownWorkbench } from "../dist/workbench.mjs";

// The old monolith's test file never called markdownWorkbench directly; this
// is the first real assertion against it.
test("markdownWorkbench folds structure, features, validation, and HTML into one readout", () => {
  const text = "---\ntitle: Note\ntags: []\n---\n# Note\n\nSee [[Proof Path]] and [site](https://example.test).\n";
  const readout = markdownWorkbench(text);
  assert.equal(readout.kind, "red-cup-engineering.markdown.workbench");
  assert.equal(readout.structure.headings[0].title, "Note");
  assert.equal(readout.features.some((feature) => feature.type === "wikilink"), true);
  assert.match(readout.html, /<h1>Note<\/h1>/u);
  assert.equal(readout.validation.parseable, true);
});
