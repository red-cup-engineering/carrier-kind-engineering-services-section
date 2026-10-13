import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  canonicalMarkdownNodePath,
  markdownNodePresentationPaths,
} from "../src/lib/addressing/markdown-node.mts";
import {
  defaultFilesystemBinding,
  readAtRoot,
} from "../src/integrations/filesystem/services/read-write.mts";
import { readVaultNote } from "../src/integrations/knowledge-vaults/services/notes.mts";
import { vaultLinkWorkbench } from "../src/integrations/knowledge-vaults/wikilinks.mts";

test("markdown node addressing canonicalizes flat and own-folder presentations idempotently", () => {
  assert.equal(canonicalMarkdownNodePath("notes/topic"), "notes/topic.md");
  assert.equal(canonicalMarkdownNodePath("notes/topic.md"), "notes/topic.md");
  assert.equal(canonicalMarkdownNodePath("notes/topic/topic.md"), "notes/topic.md");
  assert.equal(
    canonicalMarkdownNodePath(canonicalMarkdownNodePath("notes/topic/topic.md")),
    "notes/topic.md",
  );
  assert.deepEqual(markdownNodePresentationPaths("notes/topic/topic.md"), [
    "notes/topic.md",
    "notes/topic/topic.md",
  ]);
});

test("filesystem reads one markdown node through either carrier spelling and reports the canonical logical path", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-markdown-node-"));
  try {
    mkdirSync(path.join(root, "notes", "topic"), { recursive: true });
    writeFileSync(path.join(root, "notes", "topic", "topic.md"), "# Topic\n", "utf8");
    const binding = defaultFilesystemBinding(root, { packageRoot: root, now: () => "2026-07-15T12:10:00.000Z" });

    const flatRead = await readAtRoot(binding, { path: path.join(root, "notes", "topic.md") });
    const folderRead = await readAtRoot(binding, { path: path.join(root, "notes", "topic", "topic.md") });

    assert.equal(flatRead.path, path.join(root, "notes", "topic.md"));
    assert.equal(folderRead.path, path.join(root, "notes", "topic.md"));
    assert.equal(flatRead.content, folderRead.content);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("filesystem and vault reads obstruct ambiguous markdown node carriers", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-markdown-node-"));
  try {
    mkdirSync(path.join(root, "notes", "topic"), { recursive: true });
    writeFileSync(path.join(root, "notes", "topic.md"), "# Flat\n", "utf8");
    writeFileSync(path.join(root, "notes", "topic", "topic.md"), "# Folder\n", "utf8");
    const binding = defaultFilesystemBinding(root, { packageRoot: root, now: () => "2026-07-15T12:20:00.000Z" });

    await assert.rejects(
      () => readAtRoot(binding, { path: path.join(root, "notes", "topic.md") }),
      /ambiguous markdown node/u,
    );
    assert.throws(
      () => readVaultNote({
        kind: "metroplat.knowledge-vault.note-read-request",
        vaultRoot: root,
        notePath: "notes/topic",
      }),
      /ambiguous markdown node/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("wikilink resolution treats simultaneous markdown node carriers as unresolved instead of selecting by order", () => {
  const workbench = vaultLinkWorkbench({
    "source.md": "[[target]]",
    "target.md": "# Target\n",
    "target/target.md": "# Target duplicate\n",
  });
  assert.equal(workbench.links[0].target, "target");
  assert.equal(workbench.links[0].resolvedKind, "unresolved");
  assert.equal(workbench.unresolved.length, 1);
});
