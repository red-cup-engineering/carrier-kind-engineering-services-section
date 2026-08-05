import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const relocateRepository = resolve(root, "scripts/relocate-a-git-repository.mjs");
const retireRepository = resolve(root, "scripts/retire-a-git-repository-to-legacy.mjs");
const rawGitEnvironment = { ...process.env, GIT_SERVICES_BIN: "/usr/bin/git", GIT_ALLOW_PROTOCOL: "file" };

test("relocate-a-git-repository moves a real pinned submodule between clean parents", () => {
  const scratch = mkdtempSync(resolve(tmpdir(), "relocate-submodule-"));
  try {
    const remote = resolve(scratch, "child.git"); const child = resolve(scratch, "child");
    const source = resolve(scratch, "source"); const destination = resolve(scratch, "destination");
    git(["init", "-q", "--bare", remote]); git(["clone", "-q", remote, child]);
    git(["-C", child, "config", "user.name", "Test"]); git(["-C", child, "config", "user.email", "test@example.invalid"]);
    writeFileSync(resolve(child, "child.txt"), "one\n"); git(["-C", child, "add", "child.txt"]); git(["-C", child, "commit", "-qm", "child"]); git(["-C", child, "push", "origin", "HEAD:main"]);
    for (const parent of [source, destination]) {
      git(["init", "-q", parent]); git(["-C", parent, "config", "user.name", "Test"]); git(["-C", parent, "config", "user.email", "test@example.invalid"]);
      writeFileSync(resolve(parent, "README"), "parent\n"); git(["-C", parent, "add", "README"]); git(["-C", parent, "commit", "-qm", "parent"]);
    }
    git(["-C", source, "-c", "protocol.file.allow=always", "submodule", "add", remote, "apps/child"]); git(["-C", source, "commit", "-qm", "add child"]);
    const pin = git(["-C", source, "rev-parse", "HEAD:apps/child"]).trim();
    const planned = command(relocateRepository, ["--source-repository", source, "--source-path", "apps/child", "--destination-repository", destination, "--destination-path", "apps/child"]);
    assert.equal(planned.status, 0, planned.stderr); assert.equal(JSON.parse(planned.stdout).source.pin, pin);
    const applied = command(relocateRepository, ["--source-repository", source, "--source-path", "apps/child", "--destination-repository", destination, "--destination-path", "apps/child", "--apply"]);
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(git(["-C", source, "ls-files", "--stage", "--", "apps/child"]).trim(), "");
    assert.match(git(["-C", destination, "ls-files", "--stage", "--", "apps/child"]), new RegExp(`^160000 ${pin} 0\\tapps/child\\n$`, "u"));
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

test("retire-a-git-repository-to-legacy requires an ISO date", () => {
  const rejected = command(retireRepository, ["--source-repository", "/tmp/a", "--source-path", "child", "--legacy-repository", "/tmp/b", "--date", "2026-8-3", "--name", "corpus"]);
  assert.equal(rejected.status, 64); assert.match(rejected.stderr, /YYYY-MM-DD/u);
});

function command(program, args) { return spawnSync(process.execPath, [program, ...args], { encoding: "utf8", env: rawGitEnvironment }); }
function git(args) { return execFileSync("/usr/bin/git", args, { encoding: "utf8", env: rawGitEnvironment }); }
