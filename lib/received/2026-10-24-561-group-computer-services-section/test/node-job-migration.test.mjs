import "./support/deny-external-ports.mjs";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { scratchDirectory } from "./support/scratch.mjs";
import { resolve } from "node:path";
import test from "node:test";
import { nodeJobDeploymentRootsOf, nodeJobFindingsOf, nodeJobOperations, nodeJobSchedules } from "@561-group/561-group-computer-services-section/node-job-operation";
import { deploymentRootsOf } from "../src/deployment-roots.mjs";
import { nodeJobDeploymentSourcesOf } from "../src/node-job-instance.mjs";

const module = "@561-group/561-group-computer-services-section/node-job-operation";
const identity = { id: "fixture.561.group", title: "Fixture", origin: "https://fixture.561.group/" };
const source = (deployment, rest = {}) => ({ module, export: "nodeJobSchedules", configuration: { deployment, ...rest } });
async function fixture(run) {
  const root = scratchDirectory("group-job-migration-");
  const deployments = resolve(root, "group/deployments"), home = resolve(root, "home"), instance = resolve(root, "instance.json");
  const context = { deployments, home, environment: { METROPLAT_INSTANCE: instance }, instanceIdentity: identity };
  const manifest = (sources) => writeFileSync(instance, JSON.stringify({ version: 1, instanceOf: "@red-cup-engineering/metroplat", identity, operationSources: [], scheduleSources: sources }));
  const declare = (name, { machine = false, host = "remote-alias", directory = "lib/561-group/services/computer/services/jobs/app", jobs } = {}) => {
    const destination = machine ? resolve(root, `group/services/machine-a/data/records/machine-deployment-service-records/active/deployments/${name}`) : resolve(deployments, name);
    mkdirSync(resolve(destination, "deploy/jobs"), { recursive: true });
    writeFileSync(resolve(destination, "deploy/release.json"), JSON.stringify({ host, releaseRoot: `releases/${name}`, unit: { name: `${name}.service` } }));
    for (const job of jobs ?? [{ id: "demand", demand: true }, { id: "manual" }]) {
      writeFileSync(resolve(destination, `deploy/jobs/${job.id}.json`), JSON.stringify({ summary: "Fixture only", directory, node: ["never-run.mjs"], maxSeconds: 300, ...job }));
    }
    return destination;
  };
  const receipt = (name, job, value) => {
    const path = resolve(home, `releases/${name}/jobs/${job}.json`);
    mkdirSync(resolve(path, ".."), { recursive: true }); writeFileSync(path, JSON.stringify(value)); return path;
  };
  try { await run({ root, deployments, home, context, manifest, declare, receipt }); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

test("machine-owned and released layouts share discovery, including absent top-level collection", () => fixture(({ root, context, manifest, declare }) => {
  const machine = declare("machine", { machine: true }); manifest([source("machine")]);
  assert.deepEqual([...nodeJobDeploymentRootsOf(context)], [["machine", machine]]);
  const released = declare("released"); manifest([source("released"), source("machine")]);
  assert.deepEqual([...nodeJobDeploymentRootsOf(context)], [["released", released], ["machine", machine]]);
  mkdirSync(resolve(root, "group/deployments/not-a-deployment"), { recursive: true });
  assert.deepEqual([...deploymentRootsOf(context.deployments).keys()], ["released", "machine"]);
}));

test("duplicate released and machine-owned names fail instead of picking one", () => fixture(({ context, manifest, declare }) => {
  declare("own"); declare("own", { machine: true }); manifest([source("own")]);
  assert.throws(() => nodeJobDeploymentRootsOf(context), /more than one source definition/);
}));

test("the actual schedule caller shape carries explicit root and receipt context in installed data", () => fixture(({ deployments, home, declare }) => {
  declare("own", { machine: true });
  const [schedule] = nodeJobSchedules(source("own", { deployments, home }).configuration, { account: identity.id });
  assert.deepEqual(schedule.input, { deployment: "own", job: "demand" });
  assert.equal(schedule.demand, resolve(home, "releases/own/jobs/demand.json"));
  assert.throws(() => nodeJobSchedules({ deployment: "own" }, { account: identity.id }), /explicit absolute deployments/);
  assert.throws(() => nodeJobSchedules({ deployment: "own", deployments }, { account: identity.id }), /explicit absolute receipt home/);
  assert.throws(() => deploymentRootsOf("relative/deployments"), /explicit absolute/);
  assert.throws(() => nodeJobFindingsOf({ poster: "fixture", home, deploymentRoots: new Map([["own", "relative"]]) }), /absolute roots/);
}));

test("installed admission does not accept legacy module names or request-supplied context", () => fixture(({ context, manifest, declare }) => {
  declare("own");
  manifest([{ ...source("own"), module: "@561-group/group-operations/node-job-operation" }]);
  assert.throws(() => nodeJobDeploymentSourcesOf(context), /no job deployments/);
  manifest([source("own")]);
  assert.throws(() => nodeJobDeploymentSourcesOf({ ...context, environment: { METROPLAT_INSTANCE: "relative.json" } }), /installed instance/);
  const operation = nodeJobOperations().find(({ verb }) => verb === "node-job-run");
  assert.throws(() => operation.execute({ deployment: "own", job: "manual", ...context }), /installed instance/);
}));

test("receipt findings retain transport-independent selection, endings, scope, and six-line bounded tails", () => fixture(({ context, manifest, declare, receipt }) => {
  declare("own", { machine: true }); declare("unselected", { host: "local" }); manifest([source("own")]);
  const endedAt = "2026-10-14T12:00:00Z";
  receipt("unselected", "manual", { ok: false, result: "exit-code", endedAt, exit: { status: 9 } });
  const evidence = receipt("own", "demand", { ok: false, result: "timeout", endedAt, release: "fixture-release", tail: ["drop-1", "drop-2", "keep-1", "keep-2", "keep-3", "keep-4", "keep-5", "keep-6"] });
  const find = nodeJobOperations({}, context).find(({ verb }) => verb === "node-job-findings");
  const result = find.execute({ poster: "fixture" });
  assert.deepEqual(result.domain.tags, ["node-job-own-demand"]); assert.equal(result.openings.length, 1);
  const { opening } = result.openings[0];
  assert.match(opening.observation, /ran past its 300s limit/); assert.ok(!opening.observation.includes("drop-"));
  assert.match(opening.observation, /keep-6/); assert.deepEqual(opening.evidence, [evidence]);
  assert.deepEqual(opening.scope, ["section:services/computer/services/jobs"]);
  assert.ok(!result.evidence.includes("unselected")); assert.match(result.evidence, /own:manual=unrun/);
  for (const [kind, status, expected] of [["exit-code", 9, /exited 9/], ["signal", "TERM", /was killed by TERM/], ["core-dump", "SEGV", /was killed by SEGV/], ["unknown", null, /ended unknown/]]) {
    receipt("own", "demand", { ok: false, result: kind, endedAt, exit: { status }, tail: ["x".repeat(1000)] });
    const finding = find.execute({ poster: "fixture" }).openings[0].opening;
    assert.match(finding.observation, expected); assert.equal(finding.observation.length, 800);
  }
  receipt("own", "demand", { ok: true, result: "success", endedAt });
  assert.equal(find.execute({ poster: "fixture" }).openings.length, 0);
  const direct = nodeJobFindingsOf({ poster: "fixture", ...context });
  assert.ok(direct.domain.tags.includes("node-job-unselected-manual"), "direct all-root caller retains its declared broader domain");
}));

test("native runtime and state roots remain provider-owned explicit configuration", () => fixture(async ({ root, context, manifest, declare }) => {
  const runtimeRoot = declare("native");
  const stateRoot = resolve(root, "native-state");
  const configuration = { runtimeRoot, jobsDirectory: "deploy/jobs", stateRoot, unitPrefix: "native", artifact: "/gnu/store/fixture-native-runtime" };
  const [schedule] = nodeJobSchedules({ deployment: "native", jobConfiguration: configuration }, { account: identity.id });
  assert.equal(schedule.demand, resolve(stateRoot, "jobs/demand.json"));
  manifest([source("native", { jobConfiguration: configuration })]);
  mkdirSync(resolve(stateRoot, "jobs"), { recursive: true });
  writeFileSync(resolve(stateRoot, "jobs/demand.json"), JSON.stringify({ ok: true, result: "success", endedAt: "2026-10-14T12:00:00Z" }));
  const options = { environment: context.environment, instanceIdentity: identity };
  const operations = nodeJobOperations({}, options);
  const result = operations.find(({ verb }) => verb === "node-job-findings").execute({ poster: "fixture" });
  assert.deepEqual(result.domain.tags, ["node-job-native-demand"]);
  assert.match(result.evidence, /native:demand=success/);
  await assert.rejects(operations.find(({ verb }) => verb === "node-job-run").execute({ deployment: "native", job: "not-declared" }), /declares no job/);
  assert.throws(() => nodeJobSchedules({ deployment: "native", jobConfiguration: { ...configuration, stateRoot: "relative" } }, { account: identity.id }), /installed runtime and host state roots/);
  assert.throws(() => nodeJobSchedules({ deployment: "native", jobConfiguration: { ...configuration, jobsDirectory: "../escape" } }, { account: identity.id }), /runtime-relative/);
  assert.throws(() => nodeJobDeploymentRootsOf(options), /native job declarations/);
  manifest([source("native")]);
  const unbound = nodeJobOperations({}, options).find(({ verb }) => verb === "node-job-run");
  assert.throws(() => unbound.execute({ deployment: "native", job: "demand", jobConfiguration: configuration }), /explicit absolute deployments/);
}));
