import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { activityPubApplication, activityPubRouteManifest } from "@red-cup-engineering/activitypub-services-section/app";
import { startNativeApplication } from "@red-cup-engineering/computer-web-server/native-application";
import { enterpriseWebConfig } from "../src/instance-config.mjs";
import { createEnterpriseServicePlatform } from "../src/serve-instance.mjs";

const installed = {
  identity: { id: "example-dot", title: "Example Dot" },
  applications: [], schedules: [], capabilities: [],
  web: { companions: [], networkSources: [] },
};
const settings = {
  METROPLAT_REPOSITORY_ROOT: "/not-a-live-repository",
  METROPLAT_WEB_STATE_DIR: "/not-a-live-state",
  METROPLAT_DATA_ROOT: "/not-a-live-data-root",
  PUBLIC_BASE_URL: "https://example-dot.invalid",
  SESSION_SECRET: "fixture-only-not-a-secret",
  ACTIVITYPUB_ORIGIN: "https://example-dot.invalid",
  ACTIVITYPUB_IDENTIFIER: "example-dot",
  ACTIVITYPUB_ACTOR_NAME: "Example Dot",
  ACTIVITYPUB_ACTOR_SUMMARY: "Fixture",
  ACTIVITYPUB_KEYS_PATH: "/not-a-live-key-file",
  ACTIVITYPUB_PROJECTION_PORT: "18840",
  PORT: "18839",
};
const configure = (changes = {}) => enterpriseWebConfig(installed, "/fixture/instance.json", { ...settings, ...changes });
const until = async (predicate) => {
  const deadline = Date.now() + 5_000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("fixture condition timed out");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

test("projection config is opt-in, loopback-only and belongs to the host", () => {
  const config = configure();
  assert.deepEqual(config.activityPubProjection, { host: "127.0.0.1", port: 18840 });
  assert.equal(config.instance.name, "example-dot");
  assert.equal(config.activityPub.identifier, "example-dot");
  assert.equal(configure({ ACTIVITYPUB_PROJECTION_PORT: "" }).activityPubProjection, undefined);
  assert.equal(configure({ HOST: "::1" }).activityPubProjection.host, "127.0.0.1");
});

test("projection rejects invalid or colliding ports and public full-host binding before effects", () => {
  for (const port of ["0", "-1", "65536", "NaN", "1.5", "1e3", "Infinity"]) {
    assert.throws(() => configure({ ACTIVITYPUB_PROJECTION_PORT: port }), /ACTIVITYPUB_PROJECTION_PORT/);
  }
  for (const port of ["0", "-1", "65536", "NaN", "1.5"]) {
    assert.throws(() => configure({ PORT: port }), /PORT must be/);
  }
  assert.throws(() => configure({ ACTIVITYPUB_PROJECTION_PORT: "18839" }), /must differ/);
  for (const host of ["0.0.0.0", "::", "example.invalid", "localhost"]) {
    assert.throws(() => configure({ HOST: host }), /numeric loopback/);
  }
});

test("projection requires complete AP settings and matching canonical HTTPS origins", () => {
  assert.throws(() => configure({ ACTIVITYPUB_IDENTIFIER: "" }), /all-or-none/);
  for (const origin of ["https://other.invalid", "http://example-dot.invalid", "https://example-dot.invalid/path", "https://user:credential@example-dot.invalid"]) {
    assert.throws(() => configure({ ACTIVITYPUB_ORIGIN: origin }), /origin|https|HTTPS/);
  }
});

async function fixture(t, { projection = true, projectionPort = 0, start, makeEntrance, createProvider, closeProvider } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "feltos-ap-projection-"));
  const events = [];
  const requests = [];
  const listeners = [];
  const providers = [];
  let federations = 0;
  const entranceFactory = (_config, options) => {
    const provider = options.activityPubProvider;
    if (makeEntrance) makeEntrance(provider);
    return { app: { resources: [
      { id: "private.fixture", match: "/private", handler: () => new Response("full host only") },
      ...(provider ? activityPubApplication(provider).resources : []),
    ] } };
  };
  const platform = createEnterpriseServicePlatform({
    installed,
    config: {
      instance: { name: "example-dot", title: "Example Dot" },
      stateDir: directory, metroplatDataRoot: directory,
      host: "127.0.0.1", port: 0, upstreams: [],
      ...(projection ? { activityPubProjection: { host: "127.0.0.1", port: projectionPort } } : {}),
    },
    environment: {},
    services: {
      openMetroplatMcp: async () => ({ handle: async () => undefined, close: async () => events.push("metroplat.close") }),
      federateMcpServers: async () => {
        const index = ++federations;
        return { clients: new Map(), tools: [], unavailable: [], close: async () => events.push(`federation.${index}.close`) };
      },
      createEnterpriseEntrance: entranceFactory,
      activityPubProvider: async () => {
        const index = providers.length + 1;
        if (createProvider) await createProvider(index);
        const provider = {
          identifier: "example-dot", identifiers: ["example-dot"], routeCapabilities: { followers: true },
          fetch: async (request) => {
            requests.push({ url: request.url, method: request.method, host: request.headers.get("host"), body: await request.text() });
            return Response.json({ actor: "example-dot", provider: index });
          },
          federation: { startQueue: async () => events.push(`queue.${index}.start`) },
        };
        providers.push(provider);
        return { provider, close: async () => { events.push(`provider.${index}.close`); await closeProvider?.(index); } };
      },
      startNativeApplication: async (app, options) => {
        const isProjection = !app.resources.some((resource) => resource.id === "private.fixture");
        if (start) await start({ app, options, isProjection });
        const listener = await startNativeApplication(app, options);
        listeners.push({ ...listener, isProjection, app, options });
        return { ...listener, close: async () => { events.push(isProjection ? "projection.close" : "http.close"); await listener.close(); } };
      },
    },
  });
  t.after(async () => { await platform.close().catch(() => undefined); await rm(directory, { recursive: true, force: true }); });
  return { platform, events, requests, listeners, providers };
}

test("same provider serves finite AP routes while private host routes remain unreachable", async (t) => {
  const run = await fixture(t);
  await Promise.all([run.platform.start(), run.platform.start()]);
  await until(() => run.platform.state() === "ready");
  const capability = run.platform.capabilities().federation;
  assert.equal(capability.activityPub.provider, run.providers[0]);
  assert.equal(run.providers.length, 1);
  const projection = run.listeners.find((listener) => listener.isProjection);
  const full = run.listeners.find((listener) => !listener.isProjection);
  assert.equal(projection.options.host, "127.0.0.1");
  assert.equal(capability.activityPubProjection.port, projection.port);
  assert.deepEqual(projection.app.resources.map((resource) => resource.route), activityPubRouteManifest(run.providers[0]).map((route) => route.route));
  const base = `http://127.0.0.1:${projection.port}`;
  for (const route of ["/", "/healthz", "/mcp", "/private", "/sign-in", "/login/password", "/people", "/tasks", "/oauth/token", "/oauth/register", "/arrivals", "/settlement/holdings", "/actors/other/inbox", "/actors/example-dot/inbox/private", "/actors/example-dot/posts/one/two"]) {
    assert.equal((await fetch(base + route)).status, 404, route);
  }
  assert.equal(run.requests.length, 0, "forbidden requests never reach the provider");
  const body = '{"type":"fixture-only"}';
  // A tunnel forwards HTTP with the original Host. Node fetch may replace a
  // supplied Host, so exercise the actual incoming wire with node:http.
  const status = await new Promise((resolve, reject) => {
    const outgoing = request(base + "/actors/example-dot/inbox", { method: "POST", headers: { host: "example-dot.invalid", "content-type": "application/activity+json" } }, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
    outgoing.once("error", reject);
    outgoing.end(body);
  });
  assert.equal(status, 200);
  assert.equal(run.requests[0].host, "example-dot.invalid");
  assert.equal(run.requests[0].body, body);
  const actor = await fetch(`http://127.0.0.1:${full.port}/actors/example-dot`);
  assert.deepEqual(await actor.json(), { actor: "example-dot", provider: 1 });
  assert.equal((await fetch(`http://127.0.0.1:${full.port}/private`)).status, 200);
  const health = await fetch(`http://127.0.0.1:${full.port}/healthz`);
  assert.equal((await health.json()).phases.federation.state, "started");
  await Promise.all([run.platform.close(), run.platform.close()]);
  assert.equal(run.events.filter((event) => event === "projection.close").length, 1);
  assert.equal(run.events.filter((event) => event === "provider.1.close").length, 1);
  assert.ok(run.events.indexOf("projection.close") < run.events.indexOf("provider.1.close"));
  await assert.rejects(fetch(base + "/actors/example-dot"));
  // The OS can reuse the closed listener, without duplicating the actor/provider.
  const rebound = await startNativeApplication(activityPubApplication(run.providers[0]), { host: "127.0.0.1", port: projection.port });
  await rebound.close();
});

test("without opt-in no second listener is opened", async (t) => {
  const run = await fixture(t, { projection: false });
  await run.platform.start();
  await until(() => run.platform.state() === "ready");
  assert.equal(run.listeners.length, 1);
  assert.equal(run.platform.capabilities().federation.activityPubProjection, undefined);
});

test("occupied loopback port is supervised and releases the old provider before retry succeeds", async (t) => {
  const occupied = await startNativeApplication({ resources: [] }, { host: "127.0.0.1", port: 0 });
  t.after(() => occupied.close());
  const run = await fixture(t, { projectionPort: occupied.port });
  await run.platform.start();
  await until(() => run.platform.providerStates().federation.state === "retrying");
  assert.equal(run.platform.state(), "degraded");
  assert.equal(run.platform.capabilities().federation, undefined);
  assert.match(run.platform.providerStates().federation.lastError.message, /EADDRINUSE/);
  assert.deepEqual(run.events.filter((event) => /provider|queue/.test(event)), ["provider.1.close"]);
  await occupied.close();
  await until(() => run.platform.state() === "ready");
  assert.equal(run.providers.length, 2);
  assert.equal(run.listeners.filter((listener) => listener.isProjection).length, 1);
  await run.platform.close();
  assert.equal(run.events.filter((event) => event === "provider.1.close").length, 1);
  assert.equal(run.events.filter((event) => event === "provider.2.close").length, 1);
});

test("closing while the provider starts drains a late projection once without restarting", async (t) => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const run = await fixture(t, { createProvider: () => pending });
  await run.platform.start();
  const closing = run.platform.close();
  release();
  await closing;
  assert.equal(run.platform.state(), "closed");
  assert.equal(run.events.filter((event) => event === "projection.close").length, 1);
  assert.equal(run.events.filter((event) => event === "provider.1.close").length, 1);
  assert.ok(run.events.indexOf("projection.close") < run.events.indexOf("provider.1.close"));
});

test("failure after binding removes stale routes and closes the projection before its provider", async (t) => {
  const run = await fixture(t, { makeEntrance: (provider) => { if (provider) throw new Error("fixture entrance failed"); } });
  await run.platform.start();
  await until(() => run.platform.providerStates().federation.state === "retrying");
  await run.platform.close();
  assert.equal(run.events.filter((event) => event === "projection.close").length, 1);
  assert.equal(run.events.filter((event) => event === "provider.1.close").length, 1);
  assert.ok(run.events.indexOf("projection.close") < run.events.indexOf("provider.1.close"));
  assert.equal(run.platform.capabilities().federation, undefined);
});

test("provider close failure still releases federation and the full listener", async (t) => {
  const run = await fixture(t, { closeProvider: () => { throw new Error("fixture close failed"); } });
  await run.platform.start();
  await until(() => run.platform.state() === "ready");
  await assert.rejects(run.platform.close(), /platform capability release failed/);
  assert.equal(run.platform.state(), "closed");
  assert.equal(run.events.filter((event) => event === "provider.1.close").length, 1);
  assert.ok(run.events.includes("federation.2.close"));
  assert.ok(run.events.includes("http.close"));
});
