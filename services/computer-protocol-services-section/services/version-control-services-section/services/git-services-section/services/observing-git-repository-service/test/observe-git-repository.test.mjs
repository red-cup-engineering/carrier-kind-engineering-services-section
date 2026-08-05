import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { observeGitRepository } from "../scripts/observe-git-repository.mjs";

const gitBin = "/usr/bin/git";

test("observeGitRepository reports branch, HEAD, and dirty status", async () => {
  const repository = await mkdtemp(join(tmpdir(), "observe-git-repository-"));
  try {
    git(repository, ["init", "-q", "-b", "main"]);
    await writeFile(join(repository, "tracked.txt"), "one\n");
    git(repository, ["add", "tracked.txt"]);
    git(repository, ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "initial"]);
    const clean = observeGitRepository({ repository, gitBin });
    assert.equal(clean.branch, "main");
    assert.equal(clean.clean, true);
    assert.match(clean.head, /^[0-9a-f]{40}$/u);

    await writeFile(join(repository, "tracked.txt"), "two\n");
    const dirty = observeGitRepository({ repository, gitBin });
    assert.equal(dirty.clean, false);
    assert.match(dirty.status, /tracked\.txt/u);
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

function git(cwd, args) {
  execFileSync(gitBin, args, { cwd, stdio: "ignore" });
}
