import assert from "node:assert/strict";
import test from "node:test";

import { markdownDiffWorkbench } from "../dist/diff.mjs";

test("markdownDiffWorkbench detects an added heading section between two documents", () => {
  const before = "---\ntitle: Note\ntags: []\n---\n# Note\n\nSee [[Proof Path]] and [site](https://example.test).\n";
  const after = `${before}\n## Evidence\n\nA durable path.\n`;
  const diff = markdownDiffWorkbench(before, after);
  assert.equal(diff.changed, true);
  assert.equal(
    diff.headings.some((entry) => entry.kind === "added" && entry.signature.includes("Evidence")),
    true,
  );
});
