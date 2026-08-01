import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { promisify } from "node:util";
import test from "node:test";

const execute = promisify(execFile);
const root = "/home/emsenn/info";
const ingress = join(root, "lib/emsenn/services/561-group/services/red-cup-engineering/services/software-services-section/services/software-development-services-section/services/version-control-services-section/services/git-services-section/scripts/git-services");

async function fixture() {
  const directory = await mkdtemp(join(root, ".git-services-lane-"));
  await execute("/usr/bin/git", ["init", "-q"], { cwd: directory });
  await execute("/usr/bin/git", ["config", "user.email", "test@example.invalid"], { cwd: directory });
  await execute("/usr/bin/git", ["config", "user.name", "Test"], { cwd: directory });
  await writeFile(join(directory, "tracked.txt"), "before\n");
  await execute("/usr/bin/git", ["add", "tracked.txt"], { cwd: directory });
  await execute("/usr/bin/git", ["commit", "-qm", "fixture"], { cwd: directory });
  await writeFile(join(directory, "tracked.txt"), "after\n");
  return directory;
}

test("read-only ingress bypasses the serialized mutation lane", async () => {
  const directory = await fixture();
  try {
    const result = await execute(ingress, ["status", "--short"], { cwd: directory });
    assert.match(result.stdout, /tracked\.txt/);
    const source = await readFile(ingress, "utf8");
    const readFace = source.slice(source.indexOf("run_git()"), source.indexOf('if [ "$command_name" = diff ]'));
    assert.doesNotMatch(readFace, /flock/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("an old unwitnessed index lock is reclaimed only by the admitted mutation", async () => {
  const directory = await fixture();
  try {
    const lock = join(directory, ".git", "index.lock");
    await writeFile(lock, "orphan\n");
    const past = new Date(Date.now() - 301_000);
    await utimes(lock, past, past);
    const result = await execute(ingress, ["add", "--", "tracked.txt"], { cwd: directory });
    assert.match(result.stderr, /reclaimed witnessed orphan index lock/);
    assert.equal((await execute("/usr/bin/git", ["diff", "--cached", "--name-only"], { cwd: directory })).stdout.trim(), "tracked.txt");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("a recent unwitnessed index lock is deferred rather than treated as stale", async () => {
  const directory = await fixture();
  try {
    const lock = join(directory, ".git", "index.lock");
    await writeFile(lock, "still settling\n");
    await assert.rejects(() => execute(ingress, ["add", "--", "tracked.txt"], { cwd: directory }), (error) => {
      assert.equal(error.code, 75); assert.match(error.stderr, /unwitnessed index lock is only/); return true;
    });
    await execute("/usr/bin/test", ["-e", lock]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("a live index lock is witnessed and never deleted", async () => {
  const directory = await fixture();
  const lock = join(directory, ".git", "index.lock");
  const holder = spawn(process.execPath, ["--input-type=module", "--eval", "import { openSync } from 'node:fs'; openSync(process.argv[1], 'w'); process.stdout.write('ready'); setInterval(() => {}, 1000);", lock], { stdio: ["ignore", "pipe", "inherit"] });
  try {
    await once(holder.stdout, "data");
    await assert.rejects(() => execute(ingress, ["add", "--", "tracked.txt"], { cwd: directory }), (error) => {
      assert.equal(error.code, 75); assert.match(error.stderr, /live index lock witnessed/); return true;
    });
    await execute("/usr/bin/test", ["-e", lock]);
  } finally {
    holder.kill("SIGTERM"); await once(holder, "exit"); await rm(directory, { recursive: true, force: true });
  }
});
