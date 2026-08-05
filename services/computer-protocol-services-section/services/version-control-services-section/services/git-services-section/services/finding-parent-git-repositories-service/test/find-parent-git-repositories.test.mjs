import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { findParentGitRepositories } from "../scripts/find-parent-git-repositories.mjs";

test("findParentGitRepositories returns nested repositories from inner to outer", async () => {
  const root = await mkdtemp(join(tmpdir(), "find-parent-git-repositories-"));
  const top = join(root, "top");
  const child = join(top, "services", "child");
  const target = join(child, "src", "file.mjs");
  try {
    await mkdir(join(top, ".git"), { recursive: true });
    await mkdir(join(child, ".git"), { recursive: true });
    await mkdir(join(child, "src"), { recursive: true });
    await writeFile(target, "export {};\n");
    await writeFile(join(top, ".gitmodules"), '[submodule "services/child"]\n\tpath = services/child\n\turl = https://example.invalid/child.git\n');
    const repositories = findParentGitRepositories({ path: target, top });
    assert.deepEqual(repositories, [
      { repository: child, parent: top, submodulePath: "services/child" },
      { repository: top, parent: null, submodulePath: null },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("findParentGitRepositories refuses an undeclared nested repository", async () => {
  const root = await mkdtemp(join(tmpdir(), "find-parent-git-repositories-refusal-"));
  const top = join(root, "top");
  const child = join(top, "child");
  try {
    await mkdir(join(top, ".git"), { recursive: true });
    await mkdir(join(child, ".git"), { recursive: true });
    assert.throws(() => findParentGitRepositories({ path: child, top }), /has no \.gitmodules/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
