import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { startNativeActorService, nativeActorReadiness } from "../src/native-actor-service.mjs";

// Exercise the actual host composition and handlers, without loading unrelated owner packages.
// This is a focused port/ownership test, not a substitute for the native full-host suite.
const source = await readFile(process.env.HOST_SOURCE_UNDER_TEST ?? new URL("../src/serve-instance.mjs", import.meta.url), "utf8");
const executable = source.slice(0, source.indexOf("/** One FeltOS host executable")).replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "");
function fixture({ remoteFailure = false, mountFailure = false, actorFailure = false, probe = false, configured = true } = {}) {
  const capabilities = {}, events = [], entrances = [];
  let descriptors, runtimeOptions, queueResolve, queueReject;
  const queue = new Promise((resolve, reject) => { queueResolve = resolve; queueReject = reject; });
  const owner = {
    inbox: {},
    provider: { federation: { startQueue: (_unused, { signal }) => {
      events.push("queue-start");
      signal.addEventListener("abort", () => { events.push("queue-stop"); queueResolve(); }, { once: true });
      return queue;
    } } },
    close: async () => events.push("actor-close"),
  };
  const context = {
    EnterpriseExecutionWorker: class {},
    enterpriseOperationRuntime: options => { runtimeOptions = options; return { schedules: [], binding: {}, operationSources: [] }; },
    createCapabilityPlatform: ({ providers }) => {
      descriptors = providers;
      return { capabilities: () => capabilities, status: () => ({ state: "degraded", providers: {} }) };
    },
    startNativeActorService, nativeActorReadiness,
    createMcpClient: options => options,
    mcpInProcessTransport: handle => handle,
    reconcileDeclaredSchedules() {},
    inheritedListenFd: () => undefined,
    workPeersOf: () => [],
    activityPubApplication: provider => ({ provider }),
  };
  const compose = new Function(...Object.keys(context), executable + "\nreturn createEnterpriseServicePlatform;")(...Object.values(context));
  const environment = probe ? { METROPLAT_PROBE: "1", METROPLAT_PROBE_LISTEN: "127.0.0.1:10001" } : {};
  compose({
    installed: { identity: { id: "test" }, applications: [], web: {
      companions: [], networkSources: remoteFailure ? [{ factory: async () => { throw new Error("remote unavailable"); } }] : [],
    } },
    config: { instance: { name: "test", title: "test" }, upstreams: [], ...(configured ? { activityPub: {} } : {}), host: "127.0.0.1", port: 0 },
    environment,
    services: {
      openMetroplatMcp: async () => ({ handle() {}, operationSurface: async () => ({ operations: [] }) }),
      federateMcpServers: async () => ({ close: async () => events.push("remote-close") }),
      createEnterpriseEntrance: (_config, options) => {
        if (mountFailure && entrances.length > 0) throw new Error("remote mount failed");
        entrances.push(options);
        return { app: { resources: [{ match: "/actors/test", provider: options.activityPubProvider }] } };
      },
      startNativeApplication: async app => ({
        health: () => app.resources.find(resource => resource.match === "/healthz").handler(),
        actor: () => app.resources.find(resource => resource.match === "/actors/test").provider,
        close: async () => {},
      }),
      startCompanion: async () => {},
      activityPubProvider: async () => { if (actorFailure) throw new Error("actor unavailable"); return owner; },
      probeLinks: async () => ({ linked: 0, failed: [] }),
    },
  });
  const byName = name => descriptors.find(provider => provider.name === name);
  const start = async name => capabilities[name] = await byName(name).start(capabilities);
  return { capabilities, events, entrances, descriptors, byName, start, owner, reject: queueReject, runtimeOptions: () => runtimeOptions };
}

async function entrance(f) {
  await f.start("metroplat-host");
  await f.start("entrance");
  return f.start("http-listener");
}

test("missing required actor returns HTTP 503 even when supervisor reports degraded", async () => {
  const f = fixture();
  const listener = await entrance(f);
  const response = await listener.health();
  assert.equal(response.status, 503);
  const health = await response.json();
  assert.equal(health.ok, false);
  assert.equal(health.state, "failed");
});

test("local actor is required and precedes ingress; remote federation remains optional", () => {
  const f = fixture();
  assert.equal(f.byName("native-actor").optional, false);
  assert.equal(f.byName("federation").optional, true);
  assert.ok(f.descriptors.indexOf(f.byName("native-actor")) < f.descriptors.indexOf(f.byName("entrance")));
});

test("remote discovery failure cannot prevent or destroy local work admission", async () => {
  const f = fixture({ remoteFailure: true });
  await f.start("metroplat-host");
  const actor = await f.start("native-actor");
  try {
    await f.start("entrance");
    const listener = await f.start("http-listener");
    await assert.rejects(f.start("federation"), /remote unavailable/);
    assert.equal(f.runtimeOptions().activityPubProvider(), f.owner.provider);
    assert.equal(f.runtimeOptions().activityPubInbox(), f.owner.inbox);
    assert.equal(listener.actor(), f.owner.provider);
    assert.equal((await listener.health()).status, 200);
    assert.equal(f.events.includes("actor-close"), false);
  } finally { await actor.close(); }
});

test("remote mount failure resets to an entrance which retains the same local actor", async () => {
  const f = fixture({ mountFailure: true });
  await f.start("metroplat-host");
  const actor = await f.start("native-actor");
  try {
    await f.start("entrance");
    const listener = await f.start("http-listener");
    await assert.rejects(f.start("federation"), /remote mount failed/);
    assert.equal(listener.actor(), f.owner.provider);
    assert.deepEqual(f.events, ["queue-start", "remote-close"]);
  } finally { await actor.close(); }
});

test("closing remote federation never closes the actor it does not own", async () => {
  const f = fixture();
  await f.start("metroplat-host");
  const actor = await f.start("native-actor");
  try {
    await f.start("entrance");
    const remote = await f.start("federation");
    await f.byName("federation").close(remote);
    assert.deepEqual(f.events, ["queue-start", "remote-close"]);
    assert.equal(f.runtimeOptions().activityPubProvider(), f.owner.provider);
  } finally { await actor.close(); }
});

test("late queue failure fails live health and withdraws the unavailable runtime provider", async () => {
  const f = fixture();
  await f.start("metroplat-host");
  const actor = await f.start("native-actor");
  try {
    await f.start("entrance");
    const listener = await f.start("http-listener");
    f.reject(new Error("queue failed"));
    await Promise.resolve();
    const response = await listener.health();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).state, "failed");
    assert.equal(f.runtimeOptions().activityPubProvider(), undefined);
  } finally { await actor.close(); }
});

test("native owner failure rejects its required lifecycle step", async () => {
  const f = fixture({ actorFailure: true });
  await f.start("metroplat-host");
  await assert.rejects(f.start("native-actor"), /actor unavailable/);
});

test("probe and non-actor instances omit the native actor lifecycle", () => {
  assert.equal(fixture({ probe: true }).byName("native-actor"), undefined);
  assert.equal(fixture({ configured: false }).byName("native-actor"), undefined);
});
