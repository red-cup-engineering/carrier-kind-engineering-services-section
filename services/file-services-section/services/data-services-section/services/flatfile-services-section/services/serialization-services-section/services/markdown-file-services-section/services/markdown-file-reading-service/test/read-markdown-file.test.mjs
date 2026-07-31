import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readMarkdownFile, resolveMarkdownFilePath } from "../src/read-markdown-file.mjs";

test("reads one Markdown file inside the admitted root", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-reader-"));
  try {
    await writeFile(join(root, "note.md"), "One sentence.\n", "utf8");
    const result = await readMarkdownFile({ root, path: "note.md" });
    assert.equal(result.text, "One sentence.\n");
    assert.equal(result.relativePath, "note.md");
    assert.equal(result.bytes, 14);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses traversal and non-Markdown paths", () => {
  assert.throws(() => resolveMarkdownFilePath({ root: "/tmp/inside", path: "../outside.md" }), /inside root/u);
  assert.throws(() => resolveMarkdownFilePath({ root: "/tmp/inside", path: "note.txt" }), /\.md/u);
});
