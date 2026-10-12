import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { platformOperationFamilyDescriptors } from "@red-cup-engineering/metroplat/catalog";
import { DEFAULT_METROPLAT_IDENTITY } from "@red-cup-engineering/metroplat/instance";
import { projectCliService, projectCliServiceWithReadiness } from "@red-cup-engineering/metroplat/surface";

const packageRoot = path.resolve(import.meta.dirname, "..");
const identity = Object.freeze({ id: "test:cli-named-instance", title: "Named CLI Test World", origin: "https://named-cli.example/" });

function scratch(t) {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-cli-identity-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // Respect the process data-root contract even when the temporary directory
  // happens to be inside a checkout.
  const dataRoot = path.join(root, "apps", "instance");
  mkdirSync(dataRoot, { recursive: true });
  return { root, dataRoot };
}

for (const project of [projectCliService, projectCliServiceWithReadiness]) {
  for (const named of [true, false]) {
    test(`${project.name} preserves ${named ? "named" : "default"} World identity`, async (t) => {
      const { dataRoot } = scratch(t);
      const selected = named ? identity : DEFAULT_METROPLAT_IDENTITY;
      const binding = defaultFilesystemBinding(dataRoot, { repositoryRoot: dataRoot });
      const surface = project(binding, [], selected.id, platformOperationFamilyDescriptors,
        named ? { instanceIdentity: selected } : undefined);
      assert.equal(surface.discovery.package, selected.id);
      const connect = surface.operations.find((operation) => operation.verb === "world-connect");
      const turn = await connect.execute({}, [], { invocation: { subject: "cli-identity-test" } });
      assert.equal(turn.kind, "metroplat.world.turn");
      assert.ok(turn.messages.some((text) => text.includes(`The plaza of ${selected.title},`)), JSON.stringify(turn.messages));
    });
  }
}

for (const selection of ["flag", "environment", "default identity", "no instance"]) {
  test(`the shipped CLI uses its installed World identity via ${selection}`, { timeout: 60_000 }, (t) => {
    const { root, dataRoot } = scratch(t);
    const instancePath = path.join(root, "instance.json");
    const named = selection === "flag" || selection === "environment";
    writeFileSync(instancePath, JSON.stringify({
      version: 1,
      instanceOf: "@red-cup-engineering/metroplat",
      ...(named ? { identity } : {}),
      operationSources: [],
      applications: [],
    }));
    const env = { ...process.env };
    // Ambient host settings must not select a real instance, data root, or
    // operation bundle in a process-boundary regression test.
    for (const key of Object.keys(env)) if (key.startsWith("METROPLAT_")) delete env[key];
    if (selection === "environment") env.METROPLAT_INSTANCE = instancePath;
    const args = ["scripts/metroplat.mjs", "--data-root", dataRoot,
      "--subject", "cli-identity-test", "--capabilities", "world-connect",
      ...(["environment", "no instance"].includes(selection) ? [] : ["--instance", instancePath]), "world-connect"];
    const result = spawnSync(process.execPath, [...process.execArgv.filter((flag) => !flag.startsWith("--test")), ...args], {
      cwd: packageRoot, env, input: "{}\n", encoding: "utf8", timeout: 60_000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    const turn = JSON.parse(result.stdout);
    assert.equal(turn.kind, "metroplat.world.turn");
    const title = named ? identity.title : DEFAULT_METROPLAT_IDENTITY.title;
    assert.ok(turn.messages.some((text) => text.includes(`The plaza of ${title},`)), JSON.stringify(turn.messages));
  });
}
