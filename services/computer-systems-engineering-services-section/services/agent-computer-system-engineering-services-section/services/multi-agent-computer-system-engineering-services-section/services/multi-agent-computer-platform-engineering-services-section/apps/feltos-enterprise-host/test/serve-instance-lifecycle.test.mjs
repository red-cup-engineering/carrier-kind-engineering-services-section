import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createEnterpriseServicePlatform, realizedFamilies } from "../src/serve-instance.mjs";

const until = async (predicate, milliseconds = 1_000) => {
  const expires = Date.now() + milliseconds;
  while (!predicate()) {
    if (Date.now() >= expires) throw new Error("condition was not reached before its deadline");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

test("health answers while an optional companion is still starting", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "feltos-host-lifecycle-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let finishCompanion;
  const companion = new Promise((resolve) => { finishCompanion = resolve; });
  const federation = () => Object.freeze({
    clients: new Map(),
    tools: Object.freeze([]),
    unavailable: Object.freeze([]),
    close: async () => undefined,
  });
  const platform = createEnterpriseServicePlatform({
    installed: {
      identity: { id: "test-metroplat", title: "Test MetroPlat" },
      applications: [],
      schedules: [],
      web: {
        companions: [{ module: "slow-companion", startMs: 500 }],
        networkSources: [],
      },
    },
    config: {
      instance: { name: "test-metroplat", title: "Test MetroPlat" },
      stateDir: directory,
      metroplatDataRoot: directory,
      agencyRoot: directory,
      repositoryRoot: directory,
      host: "127.0.0.1",
      port: 0,
      upstreams: [],
    },
    environment: {},
    services: {
      openMetroplatMcp: async () => ({ handle: async () => undefined, close: async () => undefined }),
      federateMcpServers: async () => federation(),
      createEnterpriseEntrance: () => ({ app: { resources: [] } }),
      startNativeApplication: async (app) => ({
        port: 0,
        health: () => app.resources.find((resource) => resource.match === "/healthz").handler(),
        close: async () => undefined,
      }),
      startCompanion: () => companion,
    },
  });

  const capabilities = await platform.start();
  assert.equal(platform.state(), "degraded");
  const response = await capabilities["http-listener"].health();
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.state, "degraded");
  assert.equal(health.phases["companion:slow-companion"].state, "pending");

  finishCompanion({ close: async () => undefined });
  await until(() => platform.state() === "ready");
  await platform.close();
});


test("probe family realization reports the admitted verb set independently of realization success", async () => {
  const calls = [];
  const result = await realizedFamilies({
    operations: [
      { verb: "public-http-json-observe" },
      { verb: "healthy-operation", realize: async () => calls.push("healthy") },
      { verb: "failing-operation", realize: async () => { throw new Error("cannot load"); } },
      { verb: "healthy-operation", realize: async () => calls.push("duplicate") },
      { realize: async () => calls.push("unnamed") },
    ],
  });

  assert.deepEqual(result.verbs, [
    "public-http-json-observe",
    "healthy-operation",
    "failing-operation",
  ]);
  assert.equal(result.realized, 3);
  assert.deepEqual(calls, ["healthy", "duplicate", "unnamed"]);
  assert.deepEqual(result.failed, [{ verb: "failing-operation", error: "cannot load" }]);
});
