import assert from "node:assert/strict";
import test from "node:test";

import { applyMarkdownEdit } from "../dist/edit.mjs";

test("applyMarkdownEdit upserts a heading section into the body", () => {
  const before = "---\ntitle: Note\ntags: []\n---\n# Note\n\nSee [[Proof Path]] and [site](https://example.test).\n";
  const edited = applyMarkdownEdit(before, {
    kind: "red-cup-engineering.markdown.edit-request",
    operations: [{ operation: "upsert-section", heading: "Evidence", body: "A durable path." }],
  });
  assert.equal(edited.receipt.changed, true);
  assert.match(edited.text, /## Evidence\n\nA durable path\./u);
});
