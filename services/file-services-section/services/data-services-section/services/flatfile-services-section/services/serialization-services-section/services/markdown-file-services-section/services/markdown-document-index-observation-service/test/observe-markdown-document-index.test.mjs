import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { observeMarkdownDocumentIndex } from "../src/observe-markdown-document-index.mjs";

async function withFixture(fn) {
  const root = await mkdtemp(join(tmpdir(), "markdown-document-index-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("reads frontmatter and headings for a well-formed document", async () => {
  await withFixture(async (root) => {
    await writeFile(
      join(root, "rwil.md"),
      "---\ntitle: RWIL RDF Projection\nslug: rwil-rdf-projection\n---\n# RWIL overview\n\nSome body text.\n\n## Design notes\n\nMore text.\n",
    );
    const index = await observeMarkdownDocumentIndex({ paths: ["rwil.md"], root });
    assert.equal(index.length, 1);
    const [entry] = index;
    assert.equal(entry.path, "rwil.md");
    assert.equal(entry.frontmatter.title, "RWIL RDF Projection");
    assert.equal(entry.frontmatter.slug, "rwil-rdf-projection");
    assert.deepEqual(entry.headings.map((h) => h.title), ["RWIL overview", "Design notes"]);
  });
});

test("a document with no frontmatter fence gets frontmatter: null and still reads headings", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "plain.md"), "# Plain heading\n\nBody.\n");
    const [entry] = await observeMarkdownDocumentIndex({ paths: ["plain.md"], root });
    assert.equal(entry.frontmatter, null);
    assert.deepEqual(entry.headings.map((h) => h.title), ["Plain heading"]);
  });
});

test("a malformed frontmatter fence does not fail the whole read; headings still come through", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "broken.md"), "---\n: : not: valid: yaml: [\n---\n# Still readable\n");
    const [entry] = await observeMarkdownDocumentIndex({ paths: ["broken.md"], root });
    assert.equal(entry.frontmatter, null);
    assert.deepEqual(entry.headings.map((h) => h.title), ["Still readable"]);
  });
});

test("reads several paths in the given order and returns one frozen entry per path", async () => {
  await withFixture(async (root) => {
    await mkdir(join(root, "nested"), { recursive: true });
    await writeFile(join(root, "a.md"), "# A\n");
    await writeFile(join(root, "nested", "b.md"), "# B\n");
    const index = await observeMarkdownDocumentIndex({ paths: ["a.md", "nested/b.md"], root });
    assert.deepEqual(index.map((e) => e.path), ["a.md", "nested/b.md"]);
    assert.ok(Object.isFrozen(index));
    assert.ok(Object.isFrozen(index[0]));
  });
});

test("an unreadable path (dangling reference) is skipped, not fatal to the rest of the index", async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, "real.md"), "# Real\n");
    const index = await observeMarkdownDocumentIndex({ paths: ["does-not-exist.md", "real.md"], root });
    assert.deepEqual(index.map((e) => e.path), ["real.md"]);
  });
});

test("an empty paths array yields an empty frozen index", async () => {
  await withFixture(async (root) => {
    const index = await observeMarkdownDocumentIndex({ paths: [], root });
    assert.deepEqual(index, []);
    assert.ok(Object.isFrozen(index));
  });
});

test("throws when paths is not an array", async () => {
  await assert.rejects(() => observeMarkdownDocumentIndex({ paths: null, root: "/tmp" }), TypeError);
});

test("throws when root is missing", async () => {
  await assert.rejects(() => observeMarkdownDocumentIndex({ paths: [] }), TypeError);
});
