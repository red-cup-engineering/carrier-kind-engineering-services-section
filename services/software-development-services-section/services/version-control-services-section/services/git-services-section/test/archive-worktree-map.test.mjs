import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { mapArchiveWorktrees } from "../src/map-archive-worktrees.mjs";

test("maps working-tree archives to their nearest Git marker without dropping metadata", async () => {
  const root = mkdtempSync(resolve(tmpdir(), "archive-worktree-map-"));
  try {
    mkdirSync(resolve(root, ".git", "refs", "archive"), { recursive: true });
    mkdirSync(resolve(root, "lib", "legacy", "corpus", "archive"), { recursive: true });
    mkdirSync(resolve(root, "nested", ".git"), { recursive: true });
    mkdirSync(resolve(root, "nested", "content", "_archive"), { recursive: true });
    const report = await mapArchiveWorktrees(root);
    const byPath = Object.fromEntries(report.archives.map((entry) => [entry.path, entry]));
    assert.equal(byPath[".git/refs/archive"].legacyState, "git-metadata");
    assert.equal(byPath["lib/legacy/corpus/archive"].worktree, root);
    assert.equal(byPath["lib/legacy/corpus/archive"].legacyState, "inside-legacy");
    assert.equal(byPath["nested/content/_archive"].worktree, resolve(root, "nested"));
    assert.equal(byPath["nested/content/_archive"].legacyState, "outside-legacy");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
