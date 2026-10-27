import "./support/deny-external-ports.mjs";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { scratchDirectory } from "./support/scratch.mjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { installedMetroplatInstance } from "@red-cup-engineering/metroplat/instance";

// Exercise the selected, unmodified MetroPlat loader's actual two factory calls. Its
// first pass admits identity; its second passes that identity to operation factories.
test("the genuine installer binds schedules and both job verbs from one installed native declaration", async () => {
  const root = scratchDirectory("group-job-installer-");
  const originalExec = childProcess.execFile, calls = [];
  childProcess.execFile = (command, args, options, callback) => {
    calls.push({ command, args });
    assert.equal(command, "systemctl", "only the synthetic unit-state read is permitted");
    assert.deepEqual(args.slice(0, 4), ["--user", "show", "--property=ActiveState", "--value"]);
    callback(null, "active\n", "");
  };
  syncBuiltinESMExports();
  try {
    const runtimeRoot = resolve(root, "runtime"), stateRoot = resolve(root, "state"), instance = resolve(root, "instance.json");
    mkdirSync(resolve(runtimeRoot, "declared/jobs"), { recursive: true });
    for (const job of [{ id: "demand", demand: true }, { id: "manual" }]) {
      writeFileSync(resolve(runtimeRoot, `declared/jobs/${job.id}.json`), JSON.stringify({ summary: "Offline fixture", directory: "app", node: ["never-run.mjs"], ...job }));
    }
    const jobConfiguration = { runtimeRoot, jobsDirectory: "declared/jobs", stateRoot, unitPrefix: "fixture-native", artifact: "/gnu/store/fixture-native-runtime" };
    const module = "@561-group/561-group-computer-services-section/node-job-operation";
    const identity = { id: "fixture.561.group", title: "Native fixture", origin: "https://fixture.561.group/" };
    const declaration = { version: 1, instanceOf: "@red-cup-engineering/metroplat", identity,
      operationSources: [{ module, export: "nodeJobOperations" }],
      scheduleSources: [{ module, export: "nodeJobSchedules", configuration: { deployment: "own", jobConfiguration } }],
    };
    writeFileSync(instance, JSON.stringify(declaration));
    const moduleBasePath = fileURLToPath(new URL("../package.json", import.meta.url));
    const admitted = await installedMetroplatInstance(instance, null, {}, moduleBasePath);
    const installed = await installedMetroplatInstance(instance, {}, {
      environment: { METROPLAT_INSTANCE: instance }, instanceIdentity: admitted.identity,
    }, moduleBasePath);
    assert.deepEqual(installed.identity, identity);
    assert.equal(installed.schedules.length, 1);
    assert.equal(installed.schedules[0].demand, resolve(stateRoot, "jobs/demand.json"));
    assert.equal(installed.schedules[0].account, identity.id);
    const operations = installed.operationSources[0].operations;
    assert.deepEqual(operations.map(({ verb }) => verb), ["node-job-run", "node-job-findings"]);
    const find = operations.find(({ verb }) => verb === "node-job-findings");
    assert.deepEqual(find.execute({ poster: "fixture" }).domain.tags, []);
    mkdirSync(resolve(stateRoot, "jobs"), { recursive: true });
    const receipt = { ok: true, result: "success", endedAt: "2026-10-14T00:00:00Z", release: jobConfiguration.artifact };
    writeFileSync(resolve(stateRoot, "jobs/demand.json"), JSON.stringify(receipt));
    const measured = find.execute({ poster: "fixture" });
    assert.deepEqual(measured.domain.tags, ["node-job-own-demand"]);
    assert.equal(measured.openings.length, 0);
    const run = operations.find(({ verb }) => verb === "node-job-run");
    assert.throws(() => run.execute({ deployment: "unselected", job: "demand", jobConfiguration }), /not declared/);
    const running = await run.execute({ ...installed.schedules[0].input, jobConfiguration: { stateRoot: "/request-cannot-select" } });
    assert.equal(running.state, "running");
    assert.deepEqual(running.last, receipt);
    assert.equal(running.unit, "fixture-native-job-demand.service");
    assert.equal(calls.length, 1);
    // The installed declaration, not a second factory registry, controls both consumers.
    declaration.scheduleSources[0].configuration.jobConfiguration.stateRoot = "relative";
    writeFileSync(instance, JSON.stringify(declaration));
    await assert.rejects(installedMetroplatInstance(instance, null, {}, moduleBasePath), /installed runtime and host state roots/);
    assert.throws(() => find.execute({ poster: "fixture" }), /installed runtime and host state roots/);
    assert.equal(calls.length, 1);
  } finally {
    childProcess.execFile = originalExec; syncBuiltinESMExports();
    rmSync(root, { recursive: true, force: true });
  }
});
