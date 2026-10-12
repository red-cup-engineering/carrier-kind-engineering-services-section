import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, symlink, readlink, rename, rm, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import { planWorkspaceRelocation, planWorkspacePackageCollapse, relocateWorkspace, collapseWorkspacePackages } from "../src/becoming/doing/working/software-change/workspace-relocation.mjs";

let nextJournal = 0;
const execFileAsync = promisify(execFile);
const journalFor = (root) => path.join(root, `software-work-${++nextJournal}.jsonl`);
async function workspaceRoot(prefix) {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  await mkdir(path.join(root, "declared-owner"));
  await writeFile(path.join(root, "declared-owner/package.json"),
    JSON.stringify({ name: "example new package", softwareKind: "component" }));
  return root;
}
const placement = Object.freeze({ capability: "example-value", effect: "consumer reads the same exported value",
  carrier: "JavaScript module", ownerBefore: "example old package", ownerBeforeKind: "component",
  ownerAfter: "example new package", ownerAfterKind: "component",
  reason: "the new package is the earliest owner of this example capability", consumers: [],
  observation: "import the surviving consumer and read its exported value" });
async function recordedRelocation(request) {
  const journalPath = journalFor(request.repositoryRoot);
  await relocateWorkspace({ placement, ...request, action: "plan", actor: "test-actor", journalPath });
  return relocateWorkspace({ action: "apply", actor: "test-actor", journalPath });
}
async function recordedCollapse(request) {
  const journalPath = journalFor(request.repositoryRoot);
  await collapseWorkspacePackages({ placement, ...request, action: "plan", actor: "test-actor", journalPath });
  return collapseWorkspacePackages({ action: "apply", actor: "test-actor", journalPath });
}

test("AOE relocation persists a proposal before mutation and witnesses the observed consumer", async (t) => {
  const root = await workspaceRoot("aoe-relocation-journal-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  await writeFile(path.join(root, "old/value.mjs"), "export const value = 7;\n");
  await writeFile(path.join(root, "consumer.mjs"), "export { value } from './old/value.mjs';\n");
  const journalPath = path.join(root, "relocation.jsonl");
  const input = { actor: "test-actor", repositoryRoot: root, journalPath,
    placement: { ...placement, consumers: ["consumer.mjs"] },
    replacements: [{ from: "old", to: "new" }], files: [{ path: "consumer.mjs", kind: "module" }] };
  const planned = await relocateWorkspace({ ...input, action: "plan" });
  assert.equal(planned.history.length, 1);
  assert.equal(planned.history[0].predicate, "aoe.software.proposed");
  const declared = planned.evidence.cells.find((cell) => cell.type === "aoe.software.placement.v2");
  assert.deepEqual(declared.content, input.placement);
  assert.ok(planned.evidence.graph.edges.some(({ edge }) => edge.predicate === "aoe.software.affects-consumer"));
  assert.equal(await readFile(path.join(root, "consumer.mjs"), "utf8"), "export { value } from './old/value.mjs';\n");
  const applied = await relocateWorkspace({ action: "apply", actor: input.actor, journalPath });
  assert.equal(applied.status, "applied");
  assert.deepEqual(applied.history.map((row) => row.predicate), ["aoe.software.proposed", "aoe.software.applied"]);
  assert.equal((await import(new URL("file://" + path.join(root, "consumer.mjs")))).value, 7);
  await assert.rejects(relocateWorkspace({ action: "apply", actor: input.actor, journalPath }), /unfinished work/);
});

test("AOE refuses a path move without a capability placement datum", async (t) => {
  const root = await workspaceRoot("aoe-placement-refusal-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  const journalPath = path.join(root, "relocation.jsonl");
  await assert.rejects(relocateWorkspace({ action: "plan", actor: "test-actor", repositoryRoot: root,
    journalPath, replacements: [{ from: "old", to: "new" }], files: [] }), TypeError);
  await assert.rejects(readFile(journalPath), { code: "ENOENT" });
  assert.ok((await lstat(path.join(root, "old"))).isDirectory());
});

test("AOE refuses to assign executable capability to an instance", async (t) => {
  const root = await workspaceRoot("aoe-instance-owner-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  const journalPath = path.join(root, "relocation.jsonl");
  await assert.rejects(relocateWorkspace({ action: "plan", actor: "test-actor", repositoryRoot: root,
    journalPath, placement: { ...placement, ownerAfter: "ops.561.group", ownerAfterKind: "instance" },
    replacements: [{ from: "old", to: "new" }], files: [] }), /ownerAfterKind|instance/);
  await assert.rejects(readFile(journalPath), { code: "ENOENT" });
  assert.ok((await lstat(path.join(root, "old"))).isDirectory());
});

test("AOE checks the receiving software declaration before planning and applying", async (t) => {
  const root = await workspaceRoot("aoe-owner-declaration-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  const journalPath = path.join(root, "relocation.jsonl");
  const request = { action: "plan", actor: "test-actor", repositoryRoot: root, journalPath, placement,
    replacements: [{ from: "old", to: "new" }], files: [] };
  await assert.rejects(relocateWorkspace({ ...request, placement: { ...placement, ownerAfterKind: "platform" } }),
    /receiving software owner kind differs/);
  await assert.rejects(readFile(journalPath), { code: "ENOENT" });
  const planned = await relocateWorkspace(request);
  assert.ok(planned.evidence.cells.some((cell) => cell.type === "aoe.software.artifact.v2" &&
    cell.content.kind === "software-owner-declaration"));
  await writeFile(path.join(root, "declared-owner/package.json"),
    JSON.stringify({ name: "example new package", softwareKind: "component", changed: true }));
  await assert.rejects(relocateWorkspace({ action: "apply", actor: "test-actor", journalPath }),
    /receiving software owner declaration changed/);
  assert.ok((await lstat(path.join(root, "old"))).isDirectory());
});

test("AOE relocation records an interrupted write as observation, and refuses stale input", async (t) => {
  const root = await workspaceRoot("aoe-relocation-recovery-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  await writeFile(path.join(root, "old/value.mjs"), "export const value = 7;\n");
  const journalPath = path.join(root, "relocation.jsonl");
  await relocateWorkspace({ action: "plan", actor: "test-actor", repositoryRoot: root, journalPath, placement,
    replacements: [{ from: "old", to: "new" }], files: [] });
  await writeFile(path.join(root, "old/value.mjs"), "export const value = 8;\n");
  await assert.rejects(relocateWorkspace({ action: "apply", actor: "test-actor", journalPath }), /source directory changed/);
  assert.equal((await readFile(journalPath, "utf8")).trim().split("\n").length, 1);
  await writeFile(path.join(root, "old/value.mjs"), "export const value = 7;\n");
  await rename(path.join(root, "old"), path.join(root, "new"));
  const observed = await relocateWorkspace({ action: "apply", actor: "test-actor", journalPath });
  assert.equal(observed.status, "observed");
  assert.deepEqual(observed.history.map((row) => row.predicate), ["aoe.software.proposed", "aoe.software.observed"]);
});

test("AOE relocation verifies rewritten content inside a moved directory", async (t) => {
  const root = await workspaceRoot("aoe-relocation-inside-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  await writeFile(path.join(root, "old/value.mjs"), "export const value = 7;\n");
  await writeFile(path.join(root, "old/package.json"), JSON.stringify({ dependencies: { value: "file:../old" } }));
  const journalPath = path.join(root, "relocation.jsonl");
  const plan = await relocateWorkspace({ action: "plan", actor: "test-actor", repositoryRoot: root, journalPath, placement,
    replacements: [{ from: "old", to: "new" }], files: [{ path: "old/package.json", kind: "json" }] });
  assert.equal(plan.edits, 1);
  const applied = await relocateWorkspace({ action: "apply", actor: "test-actor", journalPath });
  assert.equal(applied.status, "applied");
  assert.equal(JSON.parse(await readFile(path.join(root, "new/package.json"), "utf8")).dependencies.value, "file:./");
});

test("AOE package collapse witnesses a proposal, surviving consumer, and retired source", async (t) => {
  const root = await workspaceRoot("aoe-collapse-journal-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  await writeFile(path.join(root, "old/value.mjs"), "export const value = 7;\n");
  await writeFile(path.join(root, "consumer.mjs"), "export { value } from './old/value.mjs';\n");
  const journalPath = path.join(root, "collapse.jsonl");
  const input = { kind: "package-collapse", actor: "test-actor", repositoryRoot: root, journalPath,
    placement: { ...placement, consumers: ["consumer.mjs"] },
    mapping: { files: [{ from: "old/value.mjs", to: "new/value.mjs" }] },
    files: ["old/value.mjs", "consumer.mjs"], obsolete: ["old"] };
  const planned = await collapseWorkspacePackages({ ...input, action: "plan" });
  assert.equal(planned.history[0].predicate, "aoe.software.proposed");
  assert.equal(await readFile(path.join(root, "old/value.mjs"), "utf8"), "export const value = 7;\n");
  const applied = await collapseWorkspacePackages({ action: "apply", actor: "test-actor", journalPath });
  assert.equal(applied.status, "applied");
  assert.equal(applied.history[1].predicate, "aoe.software.applied");
  assert.equal((await import(new URL("file://" + path.join(root, "consumer.mjs")))).value, 7);
  await assert.rejects(readFile(path.join(root, "old/value.mjs")), { code: "ENOENT" });
});

test("AOE discovers package consumers and refuses an incomplete or stale retirement", async (t) => {
  const root = await workspaceRoot("aoe-consumer-closure-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  await writeFile(path.join(root, "old/value.mjs"), "export const value = 7;\n");
  await writeFile(path.join(root, "first.mjs"), "export { value } from 'old-package';\n");
  await writeFile(path.join(root, "second.mjs"), "import { value } from 'old-package'; export { value };\n");
  const journalPath = path.join(root, "collapse.jsonl");
  const request = { action: "plan", actor: "test-actor", repositoryRoot: root, journalPath, placement,
    mapping: { files: [{ from: "old/value.mjs", to: "new/value.mjs" }],
      packageExports: [{ specifier: "old-package", to: "new/value.mjs" }] },
    files: ["old/value.mjs", "first.mjs"], obsolete: ["old"] };
  await assert.rejects(collapseWorkspacePackages(request), /omits source-discovered consumers: second.mjs/);
  await assert.rejects(readFile(journalPath), { code: "ENOENT" });
  const planned = await collapseWorkspacePackages({ ...request, files: [...request.files, "second.mjs"] });
  assert.deepEqual(planned.evidence.cells.filter((cell) => cell.type === "aoe.software.consumer.v1")
    .map((cell) => cell.content.name).sort(), ["first.mjs", "second.mjs"]);
  assert.equal(planned.evidence.graph.edges.filter(({ edge }) => edge.predicate === "aoe.software.consumer-source").length, 2);
  await writeFile(path.join(root, "third.mjs"), "export { value } from 'old-package';\n");
  await assert.rejects(collapseWorkspacePackages({ action: "apply", actor: "test-actor", journalPath }),
    /new package consumers appeared after the proposal: third.mjs/);
  assert.equal(await readFile(path.join(root, "first.mjs"), "utf8"), "export { value } from 'old-package';\n");
  assert.ok((await lstat(path.join(root, "old"))).isDirectory());
});

test("AOE finds tracked and untracked package consumers in a Git worktree", async (t) => {
  const root = await workspaceRoot("aoe-git-consumers-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await execFileAsync("git", ["-C", root, "init", "-q"]);
  await writeFile(path.join(root, "tracked.mjs"), "export { value } from 'old-package';\n");
  await execFileAsync("git", ["-C", root, "add", "tracked.mjs"]);
  await writeFile(path.join(root, "untracked.mjs"), "export { value } from 'old-package';\n");
  await assert.rejects(planWorkspacePackageCollapse({ repositoryRoot: root,
    mapping: { packageExports: [{ specifier: "old-package", to: "new/value.mjs" }] },
    files: ["tracked.mjs"] }), /omits source-discovered consumers: untracked.mjs/);
});

test("moves capability contents and rewrites imports, file dependencies and symbolic consumers", async (t) => {
  const root = await workspaceRoot("capability-relocation-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"), { recursive: true });
  await writeFile(path.join(root, "old/value.mjs"), "export const value = 3;\n");
  await writeFile(path.join(root, "consumer.mjs"), "import { value } from './old/value.mjs';\nexport { value };\n");
  await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { value: "file:old" }, exports: { ".": "./consumer.mjs" } }));
  await symlink("old", path.join(root, "installed"));
  const request = { repositoryRoot: root, replacements: [{ from: "old", to: "data/value" }], files: [{ path: "consumer.mjs", kind: "module" }, { path: "package.json", kind: "json" }], symlinks: ["installed"] };
  const applied = await recordedRelocation(request);
  assert.deepEqual({ movedDirectories: applied.movedDirectories, rewrittenFiles: applied.rewrittenFiles,
    rewrittenSymlinks: applied.rewrittenSymlinks }, { movedDirectories: 1, rewrittenFiles: 2, rewrittenSymlinks: 1 });
  assert.equal(await readlink(path.join(root, "installed")), "data/value");
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.dependencies.value, "file:./data/value");
  assert.equal(pkg.exports["."], "./consumer.mjs");
  const result = await import(new URL("file://" + path.join(root, "consumer.mjs")));
  assert.equal(result.value, 3);
});

test("refuses changed consumers and destination collisions before moving", async (t) => {
  const root = await workspaceRoot("capability-relocation-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  await assert.rejects(planWorkspaceRelocation({ repositoryRoot: root, replacements: [{ from: "old", to: "old/nested" }], files: [] }), /destination lies inside a source/);
  await writeFile(path.join(root, "consumer.mjs"), "export * from './old/value.mjs';");
  const request = { repositoryRoot: root, replacements: [{ from: "old", to: "data/value" }], files: [{ path: "consumer.mjs", kind: "module" }] };
  const journalPath = journalFor(root);
  await relocateWorkspace({ ...request, action: "plan", actor: "test-actor", journalPath, placement });
  await writeFile(path.join(root, "consumer.mjs"), "export const concurrent = true;");
  await assert.rejects(relocateWorkspace({ action: "apply", actor: "test-actor", journalPath }), /source changed/);
  await mkdir(path.join(root, "data/value"), { recursive: true });
  await assert.rejects(planWorkspaceRelocation(request), /destination already exists/);
});

test("retires a selected package boundary after projecting mixed source and every selected consumer", async (t) => {
  const root = await workspaceRoot("package-collapse-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "packages/old/src"), { recursive: true });
  await mkdir(path.join(root, "apps"), { recursive: true });
  await writeFile(path.join(root, "packages/old/src/value.mts"), "export const value: number = new Set<string>().size + 7;\n");
  await writeFile(path.join(root, "packages/old/src/other.mjs"), "export const other = 9;\n");
  await writeFile(path.join(root, "apps/first.mjs"), "import { value } from 'old-package'; export { value };\n");
  await writeFile(path.join(root, "apps/second.mjs"), "import { other } from '../packages/old/src/other.mjs'; export { other };\n");
  const mapping = { files: [
    { from: "packages/old/src/value.mts", to: "data/values/value.mjs" },
    { from: "packages/old/src/other.mjs", to: "data/values/other.mjs" },
    { from: "apps/first.mjs", to: "apps/first.mjs" },
    { from: "apps/second.mjs", to: "apps/second.mjs" },
  ], packageExports: [{ specifier: "old-package", to: "data/values/value.mjs" }] };
  const request = { repositoryRoot: root, mapping, files: [
    { path: "packages/old/src/value.mts", eraseTypeScript: true }, { path: "packages/old/src/other.mjs" },
    { path: "apps/first.mjs" }, { path: "apps/second.mjs" },
  ], obsolete: ["packages/old"] };
  const dryRun = await collapseWorkspacePackages({ ...request, action: "dry-run", placement });
  assert.deepEqual({ projectedFiles: dryRun.projectedFiles, retiredPaths: dryRun.retiredPaths, dryRun: dryRun.dryRun }, { projectedFiles: 4, retiredPaths: 1, dryRun: true });
  assert.equal(dryRun.plan.transformations.length, 4);
  await assert.rejects(readFile(path.join(root, "data/values/value.mjs")));
  const applied = await recordedCollapse(request);
  assert.deepEqual({ projectedFiles: applied.projectedFiles, retiredPaths: applied.retiredPaths }, { projectedFiles: 4, retiredPaths: 1 });
  await assert.rejects(readFile(path.join(root, "packages/old/src/value.mts")));
  assert.equal((await import(new URL("file://" + path.join(root, "apps/first.mjs")))).value, 7);
  assert.equal((await import(new URL("file://" + path.join(root, "apps/second.mjs")))).other, 9);
  assert.equal(applied.history[1].predicate, "aoe.software.applied");
});

for (const change of ["edit", "add"]) test(`refuses retirement after a concurrent ${change} before writing consumers`, async (t) => {
  const root = await workspaceRoot("collapse-concurrent-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "old"));
  await writeFile(path.join(root, "old/value.mjs"), "export const value = 7;");
  const consumer = "export { value } from 'old-package';";
  await writeFile(path.join(root, "consumer.mjs"), consumer);
  if (change === "edit") await writeFile(path.join(root, "old/notes.md"), "first");
  const journalPath = journalFor(root);
  await collapseWorkspacePackages({ action: "plan", actor: "test-actor", journalPath, repositoryRoot: root, placement,
    mapping: { files: [{ from: "old/value.mjs", to: "data/value.mjs" }], packageExports: [{ specifier: "old-package", to: "data/value.mjs" }] },
    files: ["old/value.mjs", "consumer.mjs"], obsolete: ["old"],
  });
  await writeFile(path.join(root, "old/notes.md"), "new user information");
  await assert.rejects(collapseWorkspacePackages({ action: "apply", actor: "test-actor", journalPath }), /obsolete contents changed/);
  assert.equal(await readFile(path.join(root, "consumer.mjs"), "utf8"), consumer);
  assert.equal(await readFile(path.join(root, "old/notes.md"), "utf8"), "new user information");
  await assert.rejects(readFile(path.join(root, "data/value.mjs")));
});


test("rewrites consumers to a surviving public export without coupling their filesystem layouts", async (t) => {
  const root = await workspaceRoot("collapse-public-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "node_modules/data"), { recursive: true });
  await writeFile(path.join(root, "node_modules/data/package.json"), JSON.stringify({ type: "module", exports: { "./record": "./record.mjs" } }));
  await writeFile(path.join(root, "node_modules/data/record.mjs"), "export const value = 7;");
  await writeFile(path.join(root, "consumer.mjs"), "import { value } from 'retired-package'; export { value }; export const note = 'retired-package';");
  await recordedCollapse({ repositoryRoot: root, mapping: { packageExports: [{ specifier: "retired-package", to: "src/record.mjs", replacement: "data/record" }] }, files: ["consumer.mjs"] });
  const consumer = await import(new URL("file://" + path.join(root, "consumer.mjs")));
  assert.equal(consumer.value, 7);
  assert.equal(consumer.note, "retired-package");
});
test("projects JSDoc and declaration carrier imports while preserving data literals", async (t) => {
  const root = await workspaceRoot("collapse-types-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "consumer.mjs"), '/** @param {import("old-record").Row} row */\nexport const identity = row => row;\nexport const data = "old-record";');
  await writeFile(path.join(root, "consumer.d.mts"), 'export type Row = import("old-record").Row;');
  await recordedCollapse({ repositoryRoot: root, mapping: { packageExports: [{ specifier: "old-record", to: "src/row.mjs", replacement: "data/row" }] }, files: ["consumer.mjs", "consumer.d.mts"] });
  assert.match(await readFile(path.join(root, "consumer.mjs"), "utf8"), /import\("data\/row"\)/);
  assert.match(await readFile(path.join(root, "consumer.mjs"), "utf8"), /data = "old-record"/);
  assert.match(await readFile(path.join(root, "consumer.d.mts"), "utf8"), /import\("data\/row"\)/);
});


test("an already consolidated family is a no-op and can retire unused package metadata alone", async (t) => {
  const root = await workspaceRoot("collapse-no-op-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "value.mjs"), "export const value = 7;");
  const request = { repositoryRoot: root, mapping: {}, files: [] };
  const noOp = await recordedCollapse(request);
  assert.deepEqual({ projectedFiles: noOp.projectedFiles, retiredPaths: noOp.retiredPaths }, { projectedFiles: 0, retiredPaths: 0 });
  await writeFile(path.join(root, "obsolete-package.json"), '{"name":"unnecessary-package"}');
  const retirement = await recordedCollapse({ ...request, obsolete: ["obsolete-package.json"] });
  assert.deepEqual({ projectedFiles: retirement.projectedFiles, retiredPaths: retirement.retiredPaths }, { projectedFiles: 0, retiredPaths: 1 });
  assert.equal((await import(new URL("file://" + path.join(root, "value.mjs")))).value, 7);
  await assert.rejects(readFile(path.join(root, "obsolete-package.json")), { code: "ENOENT" });
});
