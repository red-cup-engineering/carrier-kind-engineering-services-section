import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, chmodSync, existsSync, renameSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { configuredWorkSourceRepository } from "@red-cup-engineering/metroplat/source-repository";
import { carrierWorkspaces, releaseCarrierWorktree, pruneRetiredWorktreeRoot } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/carrier/workspace";

const dialect = { name: "source-fixture", label: "Source fixture" };
const git = (cwd, ...args) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } });
  assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
};
const runner = async request => {
  assert.equal(request.command, "git", "no package installation or provider execution");
  const result = spawnSync("git", request.arguments, { cwd: request.directory, encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } });
  return { result: { status: result.status, stdout: result.stdout, stderr: result.stderr, error: result.error?.message ?? "" } };
};
function fixture(context) {
  const root = mkdtempSync(path.join(tmpdir(), "host-source-workspaces-"));
  context.after(() => { try { chmodSync(path.join(root, "release"), 0o755); } catch {} rmSync(root, { recursive: true, force: true }); });
  const make = name => {
    const origin = path.join(root, name + ".git"), checkout = path.join(root, name);
    mkdirSync(origin); git(origin, "init", "--bare", "--initial-branch=main");
    mkdirSync(checkout); git(checkout, "init", "--initial-branch=main");
    git(checkout, "config", "user.name", "Fixture"); git(checkout, "config", "user.email", "fixture@example.invalid");
    writeFileSync(path.join(checkout, "owner.txt"), name); git(checkout, "add", "."); git(checkout, "commit", "-m", "seed");
    git(checkout, "remote", "add", "origin", origin); git(checkout, "push", "origin", "main");
    return { checkout, origin };
  };
  const a = make("a"), b = make("b");
  const environment = { METROPLAT_SOURCE_FIXTURE_WORKTREES: path.join(root, "tasks") };
  const policy = owner => carrierWorkspaces(dialect, { repository: owner.checkout,
    repositoryOf: spec => configuredWorkSourceRepository(owner.checkout, spec),
    environment, commandRunner: runner, effectsOf: () => "read-only" });
  return { root, a, b, policy };
}

test("an immutable release is refused before any source effect, with the missing custody binding explicit", context => {
  const { root, a } = fixture(context), release = path.join(root, "release");
  mkdirSync(release); writeFileSync(path.join(release, "pnpm-workspace.yaml"), "packages: []\n"); chmodSync(release, 0o555);
  assert.throws(() => configuredWorkSourceRepository(release, { item: { sourceRepository: a.origin } }), /configured writable Git source custody is unavailable/);
});
test("source-bound work requires the admitted exact configured owner", context => {
  const { a, b } = fixture(context);
  assert.throws(() => configuredWorkSourceRepository(a.checkout, { item: {} }), /admitted work sourceRepository or explicit source-free method is required/);
  assert.throws(() => configuredWorkSourceRepository(a.checkout, { item: { sourceRepository: b.origin } }), /custody is unavailable/);
  assert.equal(configuredWorkSourceRepository(a.checkout, { item: { sourceRepository: a.origin } }).sourceRepository, a.origin);
  git(a.checkout, "remote", "set-url", "origin", b.origin);
  assert.throws(() => configuredWorkSourceRepository(a.checkout, { item: { sourceRepository: a.origin } }), /custody is unavailable/);
});
test("production and independent receiving open only the original source owner", async context => {
  const { a, b, policy } = fixture(context);
  for (const [owner, receiving] of [[a, false], [b, true]]) {
    const item = { sourceRepository: owner.origin, ...(receiving ? { proposal: { sourceRepository: owner.origin } } : {}) };
    const spec = { id: receiving ? "receive-b" : "produce-a", item, receiving }, carrier = policy(owner);
    const workspace = await carrier.open(spec);
    assert.equal(readFileSync(path.join(workspace, "owner.txt"), "utf8"), owner === a ? "a" : "b");
    await carrier.close({ ...spec, workspace, session: { ok: true } });
  }
});
test("receiving refuses absent or changed obligation owner without opening another checkout", context => {
  const { a, b } = fixture(context);
  assert.throws(() => configuredWorkSourceRepository(a.checkout, { receiving: true, item: { sourceRepository: a.origin, proposal: {} } }), /sourceRepository is unresolved/);
  assert.throws(() => configuredWorkSourceRepository(b.checkout, { receiving: true, item: { sourceRepository: b.origin, proposal: { sourceRepository: a.origin } } }), /no longer matches/);
  assert.throws(() => configuredWorkSourceRepository(a.checkout, { receiving: true, item: { proposal: { sourceRepository: a.origin } } }), /no longer matches/);
});
test("resume preserves same-owner work and rejects reusing its directory for another owner", async context => {
  const { a, b, policy } = fixture(context);
  const aSpec = { id: "same-allocation", item: { sourceRepository: a.origin }, receiving: false };
  const first = policy(a), workspace = await first.open(aSpec);
  writeFileSync(path.join(workspace, "unfinished.txt"), "retain");
  assert.equal(await first.open(aSpec), workspace);
  assert.equal(readFileSync(path.join(workspace, "unfinished.txt"), "utf8"), "retain");
  await assert.rejects(policy(b).open({ ...aSpec, item: { sourceRepository: b.origin } }), /belongs to another source repository/);
  assert.equal(readFileSync(path.join(workspace, "owner.txt"), "utf8"), "a");
});



test("historical recovery uses retained worktree custody and holds only genuinely unresolved owners", async context => {
  const { a, b, policy } = fixture(context), carrier = policy(a);
  const spec = { id: "stable-allocation-id", item: { sourceRepository: a.origin }, receiving: false };
  assert.throws(() => carrier.verify(spec), /execution owner is unresolved/);
  const workspace = await carrier.open(spec);
  assert.equal(carrier.verify(spec).sourceRepository, a.origin, "an older session's actual retained worktree is sufficient");
  assert.throws(() => carrier.verify({ ...spec, item: { ...spec.item, execution: { sourceRepository: b.origin } } }), /differs from its admitted obligation/);
  await carrier.close({ ...spec, workspace, session: { ok: true } });
  assert.equal(carrier.verify({ ...spec, item: { ...spec.item, execution: { sourceRepository: a.origin } } }).sourceRepository, a.origin,
    "the exact native execution witness preserves terminal readback after cleanup");
  assert.throws(() => carrier.verify(spec), /execution owner is unresolved/);
});


test("invalid source admission has no retired-workspace cleanup effects", async context => {
  const { root, a } = fixture(context), retired = path.join(root, "retired");
  mkdirSync(retired);
  let calls = 0;
  const carrier = carrierWorkspaces(dialect, { repository: a.checkout, retired: [retired],
    repositoryOf: () => { throw new Error("source admission refused"); },
    commandRunner: request => { calls++; return runner(request); } });
  await assert.rejects(carrier.open({ id: "refused", item: {} }), /source admission refused/);
  assert.equal(calls, 0);
  assert.equal(existsSync(path.join(retired, ".retired")), false);
});
test("failed-retention cleanup cannot consume another source owner's work or recovery marker", async context => {
  const { root, a, b, policy } = fixture(context), environment = { METROPLAT_SOURCE_FIXTURE_WORKTREES: path.join(root, "tasks") };
  const aSpec = { id: "failed-a", item: { sourceRepository: a.origin } }, bSpec = { id: "failed-b", item: { sourceRepository: b.origin } };
  const aw = await policy(a).open(aSpec), bw = await policy(b).open(bSpec);
  await releaseCarrierWorktree(dialect, { cwd: b.checkout, workspace: bw, taskId: bSpec.id, failed: true, keep: 10, environment, commandRunner: runner });
  await releaseCarrierWorktree(dialect, { cwd: a.checkout, workspace: aw, taskId: aSpec.id, failed: true, keep: 0, environment, commandRunner: runner });
  assert.equal(existsSync(aw), false); assert.equal(existsSync(bw), true);
  assert.equal(existsSync(path.join(root, "tasks", "failed-b.kept")), true);
  await releaseCarrierWorktree(dialect, { cwd: b.checkout, workspace: bw, taskId: bSpec.id, failed: true, keep: 0, environment,
    commandRunner: async () => { throw new Error("removal refused"); } });
  assert.equal(existsSync(path.join(root, "tasks", "failed-b.kept")), true, "failed removal retains the same-owner recovery marker");
});
test("retired mixed-owner roots never mark foreign work reconciled", async context => {
  const { root, a, b, policy } = fixture(context);
  const aw = await policy(a).open({ id: "retired-a", item: { sourceRepository: a.origin } });
  const bw = await policy(b).open({ id: "retired-b", item: { sourceRepository: b.origin } });
  const retired = path.join(root, "tasks");
  const removed = await pruneRetiredWorktreeRoot({ root: retired, repository: a.checkout, commandRunner: runner, now: Date.now() + 1000, grace: 0, kept: 0 });
  assert.deepEqual(removed, ["retired-a"]); assert.equal(existsSync(aw), false); assert.equal(existsSync(bw), true);
  assert.equal(existsSync(path.join(retired, ".retired")), false);
});


test("an explicit source-free service method runs in private read-only scratch without Git", async context => {
  const { root } = fixture(context);
  const retired = path.join(root, "retired-no-source"); mkdirSync(retired);
  const repositoryOf = spec => configuredWorkSourceRepository("/unused-release", spec, {
    operationOf: verb => verb === "compute-fixture" ? { effects: { class: "pure" } } : undefined,
  });
  const carrier = carrierWorkspaces(dialect, { repository: "/unused-release", repositoryOf,
    environment: { METROPLAT_SOURCE_FIXTURE_WORKTREES: path.join(root, "scratch-tasks") },
    effectsOf: () => "read-only", retired: [retired], commandRunner: () => { throw new Error("no source-free Git effect"); } });
  const spec = { id: "service-duty", item: { requiresCapabilities: ["compute-fixture"] }, receiving: false };
  const workspace = await carrier.open(spec);
  assert.equal(existsSync(path.join(workspace, ".git")), false);
  assert.equal(existsSync(path.join(retired, ".retired")), false);
  assert.equal(carrier.verify(spec).mode, "no-source");
  await carrier.close({ ...spec, workspace, session: { ok: true } });
  assert.equal(existsSync(workspace), false);
});
test("source-free mode never grants unknown capabilities or writable session effects", async context => {
  const { root } = fixture(context);
  assert.throws(() => configuredWorkSourceRepository("/unused", { item: { requiresCapabilities: ["duty-worktree-open"] } }), /sourceRepository is required/);
  assert.throws(() => configuredWorkSourceRepository("/unused", { item: { requiresCapabilities: ["unknown"] } }), /semantics are not established/);
  const carrier = carrierWorkspaces(dialect, { repository: "/unused", repositoryOf: spec => configuredWorkSourceRepository("/unused", spec),
    environment: { METROPLAT_SOURCE_FIXTURE_WORKTREES: path.join(root, "scratch-tasks") }, effectsOf: () => "repository-write" });
  await assert.rejects(carrier.open({ id: "unsafe", item: { requiresCapabilities: [] } }), /require read-only effects/);
  assert.equal(existsSync(path.join(root, "scratch-tasks", "unsafe")), false);
});


test("source-free workspace refuses a symlinked parent both before creation and before cleanup", async context => {
  const { root } = fixture(context), taskRoot = path.join(root, "plain-tasks"), outside = path.join(root, "outside");
  mkdirSync(outside); symlinkSync(outside, taskRoot, "dir");
  const carrier = carrierWorkspaces(dialect, { repositoryOf: spec => configuredWorkSourceRepository("/unused", spec),
    environment: { METROPLAT_SOURCE_FIXTURE_WORKTREES: taskRoot }, effectsOf: () => "read-only" });
  const spec = { id: "plain-task", item: { requiresCapabilities: [] }, receiving: false };
  await assert.rejects(carrier.open(spec), /parents must be real directories/);
  assert.equal(existsSync(path.join(outside, spec.id)), false);
  rmSync(taskRoot); const workspace = await carrier.open(spec);
  assert.match(carrier.rule(spec), /private read-only task scratch/);
  renameSync(taskRoot, taskRoot + "-held"); mkdirSync(path.join(outside, spec.id));
  writeFileSync(path.join(outside, spec.id, "keep.txt"), "keep"); symlinkSync(outside, taskRoot, "dir");
  await assert.rejects(carrier.close({ ...spec, workspace, session: { ok: true } }), /parents must be real directories/);
  assert.equal(readFileSync(path.join(outside, spec.id, "keep.txt"), "utf8"), "keep");
});
test("a source-free allocation cannot replace or clean a retained source worktree", async context => {
  const { root, a, policy } = fixture(context), id = "cross-mode";
  const source = policy(a), workspace = await source.open({ id, item: { sourceRepository: a.origin } });
  const plain = carrierWorkspaces(dialect, { repositoryOf: spec => configuredWorkSourceRepository("/unused", spec),
    environment: { METROPLAT_SOURCE_FIXTURE_WORKTREES: path.join(root, "tasks") }, effectsOf: () => "read-only" });
  const spec = { id, item: { requiresCapabilities: [] } };
  await assert.rejects(plain.open(spec), /cannot reuse a Git worktree/);
  await assert.rejects(plain.close({ ...spec, workspace, session: { ok: true } }), /cannot reuse a Git worktree/);
  assert.equal(readFileSync(path.join(workspace, "owner.txt"), "utf8"), "a");
});
