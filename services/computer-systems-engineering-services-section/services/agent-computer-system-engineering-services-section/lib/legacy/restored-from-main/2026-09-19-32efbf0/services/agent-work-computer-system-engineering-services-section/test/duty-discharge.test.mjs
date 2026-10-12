import assert from "node:assert/strict";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_REPAIR_SCRIPTS,
  buildDischargeInput,
  candidateSubjectPaths,
  classifyDutyScope,
  digestOfRepairOutput,
  dischargeReadyDuties,
  dischargeTextFor,
  evaluateDeterministicAcceptance,
  executeDeterministicDuty,
  planOrDischargeDuty,
  readyTaskDutiesOfDispatch,
  resolveSubjectPath,
  runDataCustodyHand,
  runExactDepsHand,
  subjectPathFromDutyText,
  walkDirectories,
} from "../src/duty-discharge.mjs";

const FAKE_BINDING = { dataRoot: "/fake/metroplat-root" };

test("one deterministic executor accepts two distinct result gates and refuses exit-zero output mismatch", async () => {
  const duty = { scope: "task:deterministic-json", intent: "intent-json" };
  const request = { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["--version"], directory: "/tmp", environment: null, input: null };
  const receipt = (stdout) => ({
    type: "JavascriptNodeCommandExecutionReceipt", version: 1,
    request, result: { status: 0, stdout, stderr: "", error: "", signal: null },
  });
  assert.deepEqual(evaluateDeterministicAcceptance({ kind: "command-exit-status", status: 0 }, receipt("v24\n")), { accepted: true });
  assert.deepEqual(evaluateDeterministicAcceptance({ kind: "exact-stdout", stdout: "canonical\n" }, receipt("canonical\n")), { accepted: true });
  const refused = await executeDeterministicDuty({
    duty,
    deterministicExecution: { operation: "canonical-json", request, acceptance: { kind: "exact-stdout", stdout: "canonical\n" } },
    apply: true,
    run: () => receipt("wrong\n"),
    admitDischargeFn: () => { throw new Error("must not discharge"); },
  });
  assert.equal(refused.status, "refused");
  assert.equal(refused.refusal.gate, "exact-stdout-mismatch");
});

test("deterministic execution plans without running and discharges only an accepted real node operation", async () => {
  const request = { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["--version"], directory: process.cwd(), environment: null, input: null };
  const binding = { operation: "node-version", request, acceptance: { kind: "command-exit-status", status: 0 } };
  let ran = false;
  const planned = await executeDeterministicDuty({ duty: { scope: "task:node-version", intent: "intent-node" }, deterministicExecution: binding, apply: false, run: () => { ran = true; } });
  assert.equal(planned.status, "planned");
  assert.equal(ran, false);
  const { executeJavascriptNodeCommand } = await import("@red-cup-engineering/execute-javascript-node-command-service");
  const applied = await executeDeterministicDuty({
    duty: { scope: "task:node-version", intent: "intent-node" }, deterministicExecution: binding, apply: true,
    run: executeJavascriptNodeCommand,
    admitDischargeFn: (_binding, discharge) => ({ status: "admitted", intent: discharge.intent, scope: discharge.scope }),
  });
  assert.equal(applied.status, "applied");
  assert.match(applied.receipt.result.stdout, /^v\d+/u);
});

test("a real canonical-json operation needs its exact canonical stdout", async () => {
  const script = 'import { canonicalJson } from "@red-cup-engineering/computer-data-engine/identity"; process.stdout.write(canonicalJson({z:[{b:2,a:1}],a:{d:false,c:true}})+"\\n");';
  // Resolve the real package dependency from this package, never the test
  // runner's ambient checkout root.
  const request = { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["--input-type=module", "--eval", script], directory: resolve(dirname(fileURLToPath(import.meta.url)), ".."), environment: null, input: null };
  const { executeJavascriptNodeCommand } = await import("@red-cup-engineering/execute-javascript-node-command-service");
  const result = await executeDeterministicDuty({
    duty: { scope: "task:canonical-json", intent: "intent-canonical-json" },
    deterministicExecution: { operation: "canonical-json", request, acceptance: { kind: "exact-stdout", stdout: '{"a":{"c":true,"d":false},"z":[{"a":1,"b":2}]}\n' } },
    apply: true, run: executeJavascriptNodeCommand,
    admitDischargeFn: (_binding, discharge) => ({ status: "admitted", intent: discharge.intent, scope: discharge.scope }),
  });
  assert.equal(result.status, "applied");
});

test("unsupported gates and a missing admission adapter refuse before the runner", async () => {
  const request = { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["--version"], directory: "/tmp", environment: null, input: null };
  let calls = 0;
  const run = () => { calls += 1; };
  const unsupported = await executeDeterministicDuty({ duty: { scope: "task:gate", intent: "gate" }, deterministicExecution: { operation: "node", request, acceptance: { kind: "anything" } }, apply: true, run, admitDischargeFn: () => ({}) });
  assert.equal(unsupported.status, "refused");
  const missing = await executeDeterministicDuty({ duty: { scope: "task:adapter", intent: "adapter" }, deterministicExecution: { operation: "node", request, acceptance: { kind: "command-exit-status", status: 0 } }, apply: true, run });
  assert.equal(missing.refusal.reason, "missing-discharge-admission");
  const malformedDuty = await executeDeterministicDuty({ duty: { scope: "task:missing-intent" }, deterministicExecution: { operation: "node", request, acceptance: { kind: "command-exit-status", status: 0 } }, apply: true, run, admitDischargeFn: () => ({}) });
  assert.equal(malformedDuty.refusal.reason, "invalid-duty-identity");
  assert.equal(calls, 0);
});

test("a receipt or rail admission that differs from the admitted binding never discharges", async () => {
  const request = { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["--version"], directory: "/expected", environment: null, input: null };
  const binding = { operation: "node-version", request, acceptance: { kind: "command-exit-status", status: 0 } };
  const mismatched = await executeDeterministicDuty({
    duty: { scope: "task:node-version", intent: "intent-node" }, deterministicExecution: binding, apply: true,
    run: () => ({ type: "JavascriptNodeCommandExecutionReceipt", version: 1, request: { ...request, directory: "/other" }, result: { status: 0, stdout: "v24\n" } }),
    admitDischargeFn: () => { throw new Error("must not discharge"); },
  });
  assert.equal(mismatched.refusal.reason, "malformed-command-receipt");
  const admissionRefusal = await executeDeterministicDuty({
    duty: { scope: "task:node-version", intent: "intent-node" }, deterministicExecution: binding, apply: true,
    run: () => ({ type: "JavascriptNodeCommandExecutionReceipt", version: 1, request, result: { status: 0, stdout: "v24\n" } }),
    admitDischargeFn: () => ({ kind: "metroplat.rpc.execution:obstruction", ok: false }),
  });
  assert.equal(admissionRefusal.status, "executed-not-discharged");
});

test("dischargeReadyDuties routes an admitted command before scope heuristics and needs a rail admission", async () => {
  const request = { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["--version"], directory: "/tmp", environment: null, input: null };
  const duty = {
    scope: "task:exact-deps-command", intent: "intent-command", state: "ready", text: "This must not select the repair hand.",
    deterministicExecution: { operation: "node-version", request, acceptance: { kind: "command-exit-status", status: 0 } },
  };
  let calls = 0;
  const run = () => {
    calls += 1;
    return { type: "JavascriptNodeCommandExecutionReceipt", version: 1, request, result: { status: 0, stdout: "v24\n", stderr: "", error: "", signal: null } };
  };
  const planned = await dischargeReadyDuties({ readout: { frontier: [duty] }, root: "/repo", binding: FAKE_BINDING, run });
  assert.equal(planned.duties[0].status, "planned");
  assert.equal(calls, 0);
  const applied = await dischargeReadyDuties({
    readout: { frontier: [duty] }, root: "/repo", binding: FAKE_BINDING, apply: true, run,
    admitDischargeFn: (_binding, discharge) => ({ status: "admitted", intent: discharge.intent, scope: discharge.scope }),
  });
  assert.equal(applied.duties[0].status, "applied");
  assert.equal(calls, 1);
});

test("dischargeReadyDuties counts a failed command against its apply limit", async () => {
  const request = { type: "JavascriptNodeCommandExecutionRequest", version: 1, command: "node", arguments: ["--version"], directory: "/tmp", environment: null, input: null };
  const duty = (scope, stdout) => Object.freeze({ scope, intent: "intent-limit", state: "ready", deterministicExecution: Object.freeze({ operation: scope, request, acceptance: Object.freeze({ kind: "exact-stdout", stdout }) }) });
  let calls = 0;
  const result = await dischargeReadyDuties({
    readout: { frontier: [duty("task:first", "first\n"), duty("task:second", "second\n")] }, root: "/repo", binding: FAKE_BINDING, apply: true, limit: 1,
    run: () => { calls += 1; return { type: "JavascriptNodeCommandExecutionReceipt", version: 1, request, result: { status: 0, stdout: "wrong\n", stderr: "", error: "", signal: null } }; },
    admitDischargeFn: () => { throw new Error("a failed gate must not admit"); },
  });
  assert.equal(calls, 1);
  assert.equal(result.duties[0].status, "refused");
  assert.equal(result.duties[1].status, "planned");
  assert.equal(result.ok, false);
});

test("classifyDutyScope routes task:exact-deps-* and task:data-custody-* to their repair scripts", () => {
  assert.deepEqual(classifyDutyScope("task:exact-deps-pkg-a"), { repairScript: "exact-deps", subject: "pkg-a" });
  assert.deepEqual(classifyDutyScope("task:data-custody-section-x"), { repairScript: "data-custody", subject: "section-x" });
});

test("classifyDutyScope recognizes observation-only task scopes with no repair script (a datum, not an error)", () => {
  assert.deepEqual(classifyDutyScope("task:import-stratification-pkg-c"), { repairScript: null, subject: "pkg-c" });
  assert.deepEqual(classifyDutyScope("task:checkout-bound-unit-local-rogue-service"), { repairScript: null, subject: "local-rogue-service" });
  assert.deepEqual(classifyDutyScope("task:systemd-failed-local-verdaccio-service"), { repairScript: null, subject: "local-verdaccio-service" });
});

test("classifyDutyScope reports no repair script and no captured subject for everything else", () => {
  assert.deepEqual(classifyDutyScope("task:github-actions-house-registry-access"), { repairScript: null, subject: undefined });
  assert.deepEqual(classifyDutyScope("plan:2026-09-03-core-stability"), { repairScript: null, subject: undefined });
});

test("subjectPathFromDutyText recovers the (path: ...) suffix, or undefined when absent", () => {
  assert.equal(subjectPathFromDutyText("package.json for pkg-a has 1 violation(s). Repair: ... (path: pkg-a)"), "pkg-a");
  assert.equal(subjectPathFromDutyText("data/ under section-x is bad. Repair: ... (path: services/section-x)"), "services/section-x");
  assert.equal(subjectPathFromDutyText("no path here"), undefined);
  assert.equal(subjectPathFromDutyText(undefined), undefined);
});

test("resolveSubjectPath prefers the recorded text path over scanning", () => {
  const result = resolveSubjectPath({
    repairScript: "exact-deps",
    subject: "pkg-a",
    text: "... (path: services/pkg-a)",
    root: "/repo",
    candidatesFn: () => { throw new Error("must not scan when the text already names a path"); },
  });
  assert.deepEqual(result, { subjectPath: "/repo/services/pkg-a", source: "text" });
});

test("resolveSubjectPath scans for a candidate when the text carries no path, and resolves a unique match", () => {
  const result = resolveSubjectPath({
    repairScript: "data-custody",
    subject: "section-x",
    text: undefined,
    root: "/repo",
    candidatesFn: ({ repairScript, subject, root }) => {
      assert.equal(repairScript, "data-custody");
      assert.equal(subject, "section-x");
      assert.equal(root, "/repo");
      return ["/repo/services/section-x"];
    },
  });
  assert.deepEqual(result, { subjectPath: "/repo/services/section-x", source: "scan" });
});

test("resolveSubjectPath refuses with the candidate list when the scan is ambiguous", () => {
  const result = resolveSubjectPath({ repairScript: "exact-deps", subject: "pkg-a", text: undefined, root: "/repo", candidatesFn: () => ["/repo/a/pkg-a", "/repo/b/pkg-a"] });
  assert.deepEqual(result, { refusal: { reason: "ambiguous-subject", subject: "pkg-a", candidates: ["/repo/a/pkg-a", "/repo/b/pkg-a"] } });
});

test("resolveSubjectPath refuses when the scan finds nothing", () => {
  const result = resolveSubjectPath({ repairScript: "exact-deps", subject: "ghost", text: undefined, root: "/repo", candidatesFn: () => [] });
  assert.deepEqual(result, { refusal: { reason: "no-candidate-found-for-subject", subject: "ghost" } });
});

test("walkDirectories skips node_modules and .git while walking", () => {
  const tree = {
    "/root": [{ name: "pkg", isDirectory: () => true }, { name: "node_modules", isDirectory: () => true }, { name: ".git", isDirectory: () => true }, { name: "file.txt", isDirectory: () => false }],
    "/root/pkg": [],
  };
  const dirs = walkDirectories("/root", { listDirFn: (dir) => tree[dir] ?? [] });
  assert.deepEqual(dirs.slice().sort(), ["/root", "/root/pkg"]);
});

test("candidateSubjectPaths filters exact-deps candidates to directories carrying a package.json", () => {
  const candidates = candidateSubjectPaths({
    repairScript: "exact-deps",
    subject: "pkg-a",
    root: "/repo",
    dirsFn: () => ["/repo/x/pkg-a", "/repo/y/pkg-a", "/repo/z/pkg-b"],
    existsFn: (p) => p === "/repo/x/pkg-a/package.json",
  });
  assert.deepEqual(candidates, ["/repo/x/pkg-a"]);
});

test("readyTaskDutiesOfDispatch keeps only ready task: scopes off the union frontier", () => {
  const dispatch = {
    frontier: [
      { scope: "task:exact-deps-pkg-a", state: "ready" },
      { scope: "task:data-custody-section-x", state: "blocked" },
      { scope: "plan:2026-09-03-core-stability", state: "ready" },
      { scope: "task:systemd-failed-local-x", state: "ready" },
    ],
  };
  const duties = readyTaskDutiesOfDispatch(dispatch);
  assert.deepEqual(duties.map((d) => d.scope), ["task:exact-deps-pkg-a", "task:systemd-failed-local-x"]);
});

test("readyTaskDutiesOfDispatch collapses a scope that appears once per agent-frontier into one entry", () => {
  const dispatch = {
    frontier: [
      { scope: "task:exact-deps-pkg-a", state: "ready", agent: "actor:abc" },
      { scope: "task:exact-deps-pkg-a", state: "ready", agent: "executive-officer-to-the-leader" },
    ],
  };
  const duties = readyTaskDutiesOfDispatch(dispatch);
  assert.equal(duties.length, 1);
  assert.equal(duties[0].scope, "task:exact-deps-pkg-a");
});

test("runExactDepsHand plans without writing, and applies + gates when apply is true", async () => {
  const manifest = { name: "pkg-a", version: "1.0.0", dependencies: { "left-pad": "^1.0.0" } };
  const writes = [];
  const fakeReadRegistryPackageImpl = async () => ({ reachable: true, found: true, packument: { versions: { "1.0.5": {} } } });
  const readManifest = async (path) => {
    if (path.endsWith("package-lock.json")) throw Object.assign(new Error("no lockfile in this fixture"), { code: "ENOENT" });
    return writes.length > 0 ? writes.at(-1)[1] : JSON.stringify(manifest);
  };

  const planned = await runExactDepsHand({
    subjectPath: "/repo/pkg-a",
    apply: false,
    readFileImpl: readManifest,
    writeFileImpl: async (p, text) => writes.push([p, text]),
    readRegistryPackageImpl: fakeReadRegistryPackageImpl,
  });
  assert.equal(writes.length, 0);
  assert.equal(planned.detail.rewrites.length, 1);
  assert.deepEqual(planned.changedPaths, []);

  const applied = await runExactDepsHand({
    subjectPath: "/repo/pkg-a",
    apply: true,
    readFileImpl: readManifest,
    writeFileImpl: async (p, text) => writes.push([p, text]),
    readRegistryPackageImpl: fakeReadRegistryPackageImpl,
  });
  assert.equal(writes.length, 1);
  assert.equal(applied.ok, true);
  assert.deepEqual(applied.changedPaths, ["/repo/pkg-a/package.json"]);
  assert.equal(applied.gateEvidence, "checker:dependencySpecificationViolations=0");
});

test("runExactDepsHand records package-lock.json when the shared pin operation repairs lock-root ranges", async () => {
  const result = await runExactDepsHand({
    subjectPath: "/repo/pkg-a",
    apply: true,
    readFileImpl: async () => JSON.stringify({ name: "pkg-a", version: "1.0.0", dependencies: {} }),
    pinExactDependenciesFn: async () => ({
      packages: [{ rewrites: [], lockRootRewrites: [{ name: "ajv" }, { name: "ajv-formats" }], violationsAfter: 0 }],
    }),
  });
  assert.deepEqual(result.changedPaths, ["/repo/pkg-a/package-lock.json"]);
  assert.match(dischargeTextFor({ repairScript: "exact-deps", repairResult: result }), /Pinned 2 dependency specification/u);
});

test("runDataCustodyHand plans without applying, and reports the gate offender count when applied", () => {
  const planned = runDataCustodyHand({
    subjectPath: "/repo/section-x",
    apply: false,
    checkFn: () => ({ root: "/repo/section-x", dataDirectory: "/repo/section-x/data" }),
    migrateFn: (dataDir, { apply }) => {
      assert.equal(dataDir, "/repo/section-x/data");
      assert.equal(apply, false);
      return { dataDir, rows: [{ entry: "notes", classification: "records", destination: "data/records/notes" }], refusals: [], applied: null, offendersAfter: null, ok: true };
    },
  });
  assert.deepEqual(planned.changedPaths, []);

  const applied = runDataCustodyHand({
    subjectPath: "/repo/section-x",
    apply: true,
    checkFn: () => ({ root: "/repo/section-x", dataDirectory: "/repo/section-x/data" }),
    migrateFn: () => ({
      dataDir: "/repo/section-x/data",
      rows: [{ entry: "notes", classification: "records", destination: "data/records/notes" }],
      refusals: [],
      applied: [{ entry: "notes", classification: "records", method: "fs-rename", destination: "data/records/notes" }],
      offendersAfter: 0,
      ok: true,
    }),
  });
  assert.equal(applied.ok, true);
  assert.deepEqual(applied.changedPaths, ["/repo/section-x/data/records/notes"], "must not double the data/ path segment");
  assert.equal(applied.gateEvidence, "checker:checkDataCustodyDirectory-offenders=0");
});

test("runDataCustodyHand does not double the data/ segment on a purge row", () => {
  const applied = runDataCustodyHand({
    subjectPath: "/repo/section-y",
    apply: true,
    checkFn: () => ({ root: "/repo/section-y", dataDirectory: "/repo/section-y/data" }),
    migrateFn: () => ({
      dataDir: "/repo/section-y/data",
      rows: [
        { entry: "cache", classification: "state", destination: "data/state/cache" },
        { entry: "empty-dir", classification: "purge", destination: null },
      ],
      refusals: [],
      applied: [
        { entry: "cache", classification: "state", method: "fs-rename", destination: "data/state/cache" },
        { entry: "empty-dir", classification: "purge", method: "rmdir", destination: null },
      ],
      offendersAfter: 0,
      ok: true,
    }),
  });
  assert.deepEqual(applied.changedPaths, ["/repo/section-y/data/state/cache", "/repo/section-y/data/empty-dir"]);
  assert.ok(applied.changedPaths.every((path) => !path.includes("data/data")));
});

test("dischargeTextFor and buildDischargeInput name what changed and carry the gate/changed-path/digest evidence", () => {
  const repairResult = { ok: true, changedPaths: ["/repo/pkg-a/package.json"], detail: { rewrites: [{ name: "left-pad", to: "1.0.5" }], violationsAfter: 0 }, gateEvidence: "checker:dependencySpecificationViolations=0" };
  const text = dischargeTextFor({ repairScript: "exact-deps", repairResult });
  assert.match(text, /Pinned 1 dependency specification/u);

  const input = buildDischargeInput({ duty: { scope: "task:exact-deps-pkg-a", intent: "checkout-health-work-intents-2026-09-03" }, repairScript: "exact-deps", repairResult, producer: { id: "test-producer", revision: "0.0.0" } });
  assert.equal(input.kind, "metroplat.work.discharge");
  assert.equal(input.id, "discharge-task:exact-deps-pkg-a");
  assert.equal(input.intent, "checkout-health-work-intents-2026-09-03");
  assert.equal(input.scope, "task:exact-deps-pkg-a");
  assert.deepEqual(input.producer, { id: "test-producer", revision: "0.0.0" });
  assert.ok(input.evidence.includes("checker:dependencySpecificationViolations=0"));
  assert.ok(input.evidence.includes("changed-path:/repo/pkg-a/package.json"));
  assert.ok(input.evidence.some((e) => e.startsWith("repair-output-digest:sha256:")));
  assert.equal(digestOfRepairOutput(repairResult.detail).length, 64);
});

test("planOrDischargeDuty returns a no-repair-script datum for an unrouted scope, without resolving a subject or calling a repair script", async () => {
  const result = await planOrDischargeDuty({
    duty: { scope: "task:github-actions-house-registry-access", intent: "some-intent" },
    root: "/repo",
    apply: true,
    binding: FAKE_BINDING,
    resolveFn: () => { throw new Error("must not resolve a subject for a no-repair-script scope"); },
    repairScripts: { "exact-deps": () => { throw new Error("must not run a repair script"); } },
  });
  assert.equal(result.status, "no-repair-script");
  assert.equal(result.kind, null);
  assert.deepEqual(result.datum, { scope: "task:github-actions-house-registry-access", reason: "no-repair-script" });
});

test("planOrDischargeDuty names the recognized-but-no-hand kind for import-stratification and checkout-bound-unit scopes", async () => {
  const importResult = await planOrDischargeDuty({
    duty: { scope: "task:import-stratification-pkg-c", intent: "some-intent" },
    root: "/repo",
    apply: true,
    binding: FAKE_BINDING,
    resolveFn: () => { throw new Error("must not resolve a subject"); },
  });
  assert.equal(importResult.status, "no-repair-script");
  assert.equal(importResult.kind, "import-stratification");

  const boundResult = await planOrDischargeDuty({
    duty: { scope: "task:checkout-bound-unit-local-rogue-service", intent: "some-intent" },
    root: "/repo",
    apply: true,
    binding: FAKE_BINDING,
    resolveFn: () => { throw new Error("must not resolve a subject"); },
  });
  assert.equal(boundResult.status, "no-repair-script");
  assert.equal(boundResult.kind, "checkout-bound-unit");
});

test("planOrDischargeDuty in plan mode never calls the repair script with apply:true and never discharges", async () => {
  let repairApply;
  const result = await planOrDischargeDuty({
    duty: { scope: "task:exact-deps-pkg-a", intent: "intent-1", text: "... (path: pkg-a)" },
    root: "/repo",
    apply: false,
    binding: FAKE_BINDING,
    repairScripts: { "exact-deps": async ({ apply }) => { repairApply = apply; return { ok: true, changedPaths: [], detail: { rewrites: [], violationsAfter: 0 }, gateEvidence: "checker:dependencySpecificationViolations=0" }; } },
    admitDischargeFn: () => { throw new Error("must not discharge in plan mode"); },
  });
  assert.equal(repairApply, false);
  assert.equal(result.status, "planned");
  assert.equal(result.subjectPath, "/repo/pkg-a");
});

test("planOrDischargeDuty refuses (never discharges) when the post-apply gate still reports violations", async () => {
  const result = await planOrDischargeDuty({
    duty: { scope: "task:exact-deps-pkg-a", intent: "intent-1", text: "... (path: pkg-a)" },
    root: "/repo",
    apply: true,
    binding: FAKE_BINDING,
    repairScripts: { "exact-deps": async () => ({ ok: false, changedPaths: [], detail: { rewrites: [], violationsAfter: 1 }, gateEvidence: "checker:dependencySpecificationViolations=1" }) },
    admitDischargeFn: () => { throw new Error("must not discharge when the gate fails"); },
  });
  assert.equal(result.status, "refused");
  assert.equal(result.refusal.reason, "gate-failed");
});

test("planOrDischargeDuty applies, gates green, then discharges with the built input", async () => {
  const calls = [];
  const result = await planOrDischargeDuty({
    duty: { scope: "task:exact-deps-pkg-a", intent: "intent-1", text: "... (path: pkg-a)" },
    root: "/repo",
    apply: true,
    binding: FAKE_BINDING,
    repairScripts: { "exact-deps": async () => ({ ok: true, changedPaths: ["/repo/pkg-a/package.json"], detail: { rewrites: [{ name: "left-pad", to: "1.0.5" }], violationsAfter: 0 }, gateEvidence: "checker:dependencySpecificationViolations=0" }) },
    admitDischargeFn: (binding, discharge) => {
      calls.push({ binding, discharge });
      return { kind: "metroplat.work.discharge-admission", discharge: discharge.id, intent: discharge.intent, scope: discharge.scope, appended: 1, status: "admitted" };
    },
  });
  assert.equal(result.status, "applied");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].binding, FAKE_BINDING);
  assert.equal(calls[0].discharge.scope, "task:exact-deps-pkg-a");
  assert.equal(result.admission.status, "admitted");
});

test("dischargeReadyDuties applies only up to --limit, leaving the rest planned", async () => {
  const duties = [
    { scope: "task:exact-deps-pkg-a", intent: "intent-1", text: "... (path: pkg-a)" },
    { scope: "task:exact-deps-pkg-b", intent: "intent-1", text: "... (path: pkg-b)" },
  ];
  const appliedFlags = [];
  const result = await dischargeReadyDuties({
    readout: { frontier: duties.map((duty) => ({ ...duty, state: "ready" })) },
    root: "/repo",
    binding: FAKE_BINDING,
    apply: true,
    limit: 1,
    planOrDischargeFn: async ({ duty, apply }) => {
      appliedFlags.push(apply);
      return { scope: duty.scope, intent: duty.intent, kind: "exact-deps", status: apply ? "applied" : "planned" };
    },
  });
  assert.deepEqual(appliedFlags, [true, false]);
  assert.deepEqual(result.duties.map((d) => d.status), ["applied", "planned"]);
  assert.equal(result.ok, true);
  assert.equal(result.kind, "metroplat.monitoring.checkout-health.duty-discharge");
});

test("dischargeReadyDuties --kind restricts the run to duties of exactly that repair script, leaving other-kind duties out entirely", async () => {
  const duties = [
    { scope: "task:exact-deps-pkg-a", intent: "intent-1", state: "ready" },
    { scope: "task:data-custody-section-x", intent: "intent-1", state: "ready" },
    { scope: "task:systemd-failed-local-x", intent: "intent-1", state: "ready" },
  ];
  const seenScopes = [];
  const result = await dischargeReadyDuties({
    readout: { frontier: duties },
    root: "/repo",
    binding: FAKE_BINDING,
    apply: false,
    kind: "exact-deps",
    planOrDischargeFn: async ({ duty }) => { seenScopes.push(duty.scope); return { scope: duty.scope, intent: duty.intent, kind: "exact-deps", status: "planned" }; },
  });
  assert.deepEqual(seenScopes, ["task:exact-deps-pkg-a"]);
  assert.deepEqual(result.duties.map((d) => d.scope), ["task:exact-deps-pkg-a"]);
});

test("dischargeReadyDuties reports ok:false when any duty refused", async () => {
  const result = await dischargeReadyDuties({
    readout: { frontier: [{ scope: "task:exact-deps-ghost", intent: "intent-1", state: "ready" }] },
    root: "/repo",
    binding: FAKE_BINDING,
    apply: false,
    planOrDischargeFn: async () => ({ scope: "task:exact-deps-ghost", status: "refused", refusal: { reason: "no-candidate-found-for-subject", subject: "ghost" } }),
  });
  assert.equal(result.ok, false);
});

test("dischargeReadyDuties honors an explicit --scope filter", async () => {
  const duties = [
    { scope: "task:exact-deps-pkg-a", intent: "intent-1", state: "ready" },
    { scope: "task:data-custody-section-x", intent: "intent-1", state: "ready" },
  ];
  const result = await dischargeReadyDuties({
    readout: { frontier: duties },
    root: "/repo",
    binding: FAKE_BINDING,
    scope: "task:data-custody-section-x",
    planOrDischargeFn: async ({ duty }) => ({ scope: duty.scope, status: "planned" }),
  });
  assert.deepEqual(result.duties.map((d) => d.scope), ["task:data-custody-section-x"]);
});

test("dischargeReadyDuties end-to-end (real routing, no mocks) reports no-repair-script data for observation-only duties", async () => {
  const duties = [
    { scope: "task:import-stratification-pkg-c", intent: "intent-1", state: "ready" },
    { scope: "task:checkout-bound-unit-local-rogue-service", intent: "intent-1", state: "ready" },
    { scope: "task:systemd-failed-local-stale.service", intent: "intent-1", state: "ready" },
  ];
  const result = await dischargeReadyDuties({
    readout: { frontier: duties },
    root: "/repo",
    binding: FAKE_BINDING,
    apply: true,
  });
  assert.equal(result.ok, true, "a no-repair-script datum is not a refusal");
  assert.deepEqual(result.duties.map((d) => d.status), ["no-repair-script", "no-repair-script", "no-repair-script"]);
  assert.deepEqual(result.duties.map((d) => d.kind), ["import-stratification", "checkout-bound-unit", "systemd-failed"]);
});

test("DEFAULT_REPAIR_SCRIPTS wires exact-deps and data-custody to their real repair-script functions", () => {
  assert.equal(DEFAULT_REPAIR_SCRIPTS["exact-deps"], runExactDepsHand);
  assert.equal(DEFAULT_REPAIR_SCRIPTS["data-custody"], runDataCustodyHand);
});
