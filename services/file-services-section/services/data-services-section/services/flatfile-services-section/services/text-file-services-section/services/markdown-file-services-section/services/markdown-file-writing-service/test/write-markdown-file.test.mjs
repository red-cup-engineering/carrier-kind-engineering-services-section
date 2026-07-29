import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeMarkdownFile } from "../src/write-markdown-file.mjs";

test("creates, normalizes, reads, and replaces one Markdown file", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-writer-"));
  try {
    const created = await writeMarkdownFile({ root, path: "notes/example.md", text: "One wraps\nhere. Two follows.\n" });
    assert.equal(created.created, true);
    assert.equal(created.text, "One wraps here.\nTwo follows.\n");
    assert.equal(await readFile(join(root, "notes/example.md"), "utf8"), created.text);
    const unchanged = await writeMarkdownFile({ root, path: "notes/example.md", text: created.text, mode: "upsert" });
    assert.equal(unchanged.changed, false);
    const replaced = await writeMarkdownFile({ root, path: "notes/example.md", text: 'This is **important.** Another follows.\n', mode: "replace" });
    assert.equal(replaced.text, "This is **important.**\nAnother follows.\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("enforces explicit create and replace modes", async () => {
  const root = await mkdtemp(join(tmpdir(), "markdown-writer-modes-"));
  try {
    await assert.rejects(() => writeMarkdownFile({ root, path: "missing.md", text: "Missing.\n", mode: "replace" }), /does not exist/u);
    await writeMarkdownFile({ root, path: "present.md", text: "Present.\n" });
    await assert.rejects(() => writeMarkdownFile({ root, path: "present.md", text: "Again.\n" }), /already exists/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
