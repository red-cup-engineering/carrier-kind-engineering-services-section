import assert from "node:assert/strict";
import test from "node:test";

import { markdownValidationReport } from "../dist/validation.mjs";

test("markdownValidationReport passes clean frontmatter and prose", () => {
  const text = "---\ntitle: Note\n---\n## Section\n\nBody text.\n";
  const report = markdownValidationReport(text);
  assert.equal(report.parseable, true);
  assert.equal(report.conformant, true);
});

test("markdownValidationReport flags a forbidden frontmatter key", () => {
  const text = "---\nauthor: Someone\ntitle: Note\n---\n# Note\n\nBody text.\n";
  const report = markdownValidationReport(text);
  assert.equal(report.parseable, true);
  assert.equal(report.findings.some((finding) => finding.rule === "forbidden-frontmatter-key" && finding.path === "author"), true);
});
