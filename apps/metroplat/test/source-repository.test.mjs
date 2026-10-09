import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { configuredSourceRepository } from "../src/source-repository.mjs";
const git = (root, ...args) => { const r = spawnSync("git", args, { cwd: root, encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
function fixture(context) {
  const root = mkdtempSync(path.join(tmpdir(), "source-custody-")); context.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, "init", "--initial-branch=main"); git(root, "config", "user.name", "Fixture"); git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "remote", "add", "origin", "git@github.com:example/root.git"); writeFileSync(path.join(root, "source.txt"), "source"); git(root, "add", "."); git(root, "commit", "-m", "base");
  return root;
}
test("source ownership accepts only the configured root and initialized exact gitlink", context => {
  const root = fixture(context); const owner = "git@github.com:example/root.git";
  assert.deepEqual(configuredSourceRepository(root), { repository: realpathSync(root), sourceRepository: owner });
  assert.throws(() => configuredSourceRepository(root, "/arbitrary/path"), /not configured/);
  const child = path.join(root, "child"); mkdirSync(child); git(child, "init", "--initial-branch=main"); git(child, "config", "user.name", "Fixture"); git(child, "config", "user.email", "fixture@example.invalid");
  writeFileSync(path.join(child, "source.txt"), "child"); git(child, "add", "."); git(child, "commit", "-m", "child"); git(child, "remote", "add", "origin", "git@github.com:example/child.git");
  writeFileSync(path.join(root, ".gitmodules"), '[submodule "child"]\npath = child\nurl = git@github.com:example/child.git\n');
  git(root, "add", ".gitmodules"); git(root, "update-index", "--add", "--cacheinfo", `160000,${git(child, "rev-parse", "HEAD")},child`); git(root, "commit", "-m", "gitlink");
  assert.deepEqual(configuredSourceRepository(root, "git@github.com:example/child.git"), { repository: realpathSync(child), sourceRepository: "git@github.com:example/child.git" });
  git(child, "remote", "set-url", "origin", "git@github.com:example/wrong.git");
  assert.throws(() => configuredSourceRepository(root, "git@github.com:example/child.git"), /does not match/);
});
test("configured paths cannot escape their owner or substitute ordinary directories", context => {
  const root = fixture(context);
  writeFileSync(path.join(root, ".gitmodules"), '[submodule "escape"]\npath = ../escape\nurl = git@github.com:example/escape.git\n');
  assert.throws(() => configuredSourceRepository(root, "git@github.com:example/escape.git"), /escapes/);
  writeFileSync(path.join(root, ".gitmodules"), '[submodule "ordinary"]\npath = ordinary\nurl = git@github.com:example/ordinary.git\n');
  mkdirSync(path.join(root, "ordinary"));
  assert.throws(() => configuredSourceRepository(root, "git@github.com:example/ordinary.git"), /not a Git-owned gitlink/);
});
