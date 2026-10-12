import assert from "node:assert/strict";

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { createOpsMcpGatewayApp } from "../src/app.mjs";
import { operations as holofoamOperations } from "@red-cup-engineering/holofoam/operations";
import { serveOpsMcpGateway } from "../scripts/serve.mjs";

const packageUrl = new URL("../", import.meta.url);

const oauth = {
  metadata: () => ({ issuer: "https://ops.561.group" }),
  registerClient: () => ({ client_id: "ops-browser-client" }),
  exchangeCode: () => ({ access_token: "browser-good", refresh_token: "server-only", token_type: "Bearer", expires_in: 3600 }),
  validateToken: (token) => ["good", "browser-good"].includes(token) ? { email: "operator@example.invalid" } : null,
  revoke: () => {},
};

const emptyLedgerReadings = Object.freeze({
  kind: "ledger-readings",
  readings: {
    balanceSheet: { kind: "ledger-report", report: "balance-sheet", journal: { path: "/data/main.beancount", format: "beancount" }, generatedAt: "2026-09-01T00:00:00.000Z", tree: { total: {}, children: {} } },
    incomeStatement: { kind: "ledger-report", report: "income-statement", journal: { path: "/data/main.beancount", format: "beancount" }, generatedAt: "2026-09-01T00:00:00.000Z", tree: { total: {}, children: {} } },
    reconcile: { kind: "ledger-report", report: "reconcile", journal: { path: "/data/main.beancount", format: "beancount" }, generatedAt: "2026-09-01T00:00:00.000Z", summary: { agreed: 0, mismatch: 0, "posted-only": 0, "asserted-only": 0, inactive: 0 }, rows: [] },
    stats: { kind: "ledger-report", report: "stats", journal: { path: "/data/main.beancount", format: "beancount" }, generatedAt: "2026-09-01T00:00:00.000Z", transactions: 0 },
    accounts: { kind: "ledger-report", report: "accounts", journal: { path: "/data/main.beancount", format: "beancount" }, generatedAt: "2026-09-01T00:00:00.000Z", accounts: [] },
  },
});

async function emptyMetroplatFetch(_url, options) {
  const { params } = JSON.parse(options.body);
  const name = params.name;
  const value = name === "agent-work-dispatch"
    ? { date: "2026-09-01", feed: "daily-claim-sessions", queue: [], coordination: "clear", coordinationCost: 0 }
    : name === "work-item"
      ? { date: "2026-09-01", feed: "daily-claim-sessions", roadmap: { nodes: [], milestones: [], relationObstructions: [] } }
      : name === "milestone"
        ? { date: "2026-09-01", milestones: {}, gap: {} }
        : name === "ledger-readings"
          ? emptyLedgerReadings
          : { kind: "ledger-report", report: params.arguments.input.report, journal: emptyLedgerReadings.readings.stats.journal, generatedAt: emptyLedgerReadings.readings.stats.generatedAt };
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: JSON.stringify(value) }] } }), {
    headers: { "content-type": "application/json" },
  });
}

test("application exposes public health/discovery and guards its configured operation registry", () => {
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
  }, { oauth, fetchImpl: async () => new Response() });
  const ids = app.resources.map((resource) => resource.id);
  assert.ok(ids.includes("oauth.register"));
  assert.ok(ids.includes("ops-mcp.oauth-protected-resource-path"));
  assert.ok(ids.includes("ops-mcp.health"));
  assert.ok(ids.includes("ops-mcp.proxy"));
  const health = app.resources.find((resource) => resource.id === "ops-mcp.health").handler();
  assert.equal(JSON.parse(health.body).resource, "https://ops.561.group/mcp");
});

test("an injected ActivityPub provider mounts its exact public routes before guarded routes", async () => {
  const requests = [];
  const activityPubProvider = {
    identifier: "ops",
    fetch: async (request) => {
      requests.push(request);
      return new Response(JSON.stringify({ id: "https://ops.561.group/actors/ops" }), {
        headers: { "content-type": "application/activity+json" },
      });
    },
  };
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
  }, { oauth, activityPubProvider, fetchImpl: async () => new Response() });
  const actorIndex = app.resources.findIndex((resource) => resource.id === "activitypub.actor");
  const proxyIndex = app.resources.findIndex((resource) => resource.id === "ops-mcp.proxy");
  assert.ok(actorIndex >= 0);
  assert.ok(actorIndex < proxyIndex);
  const response = await app.resources[actorIndex].handler({
    req: { method: "GET", url: "/actors/ops", headers: { host: "ops.561.group" } },
    url: new URL("https://ops.561.group/actors/ops"),
  });
  assert.equal(response.status, 200);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers.has("authorization"), false);
});

test("without an injected ActivityPub provider no ActivityPub route is mounted", () => {
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
  }, { oauth, fetchImpl: async () => new Response() });
  assert.equal(app.resources.some((resource) => resource.id.startsWith("activitypub.")), false);
});

test("configured ActivityPub shares the gateway listener and lifecycle", async (t) => {
  const stateDir = mkdtempSync(join(tmpdir(), "ops-app-activitypub-test-"));
  t.after(() => rmSync(stateDir, { recursive: true, force: true }));
  let providerConstructions = 0;
  let queueStarts = 0;
  let listenerStarts = 0;
  let serverCloses = 0;
  let providerCloses = 0;
  let installedTarget;
  let activityPubOptions;
  const activityPubProvider = {
    identifier: "ops",
    fetch: async () => new Response(),
    federation: { startQueue: async () => { queueStarts += 1; } },
  };
  const running = await serveOpsMcpGateway({
    environment: {},
    loadConfig: () => ({
      host: "127.0.0.1",
      port: 18807,
      publicBaseUrl: "https://ops.561.group",
      upstreamMcpUrl: "http://127.0.0.1:18811",
      allowedEmail: "operator@example.invalid",
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
      stateDir,
      activityPub: {
        origin: "https://ops.561.group",
        identifier: "ops",
        actorName: "561 Group Operations",
        summary: "Operations federation actor",
        keyPath: join(stateDir, "actor-keys.json"),
        statePath: join(stateDir, "activitypub.sqlite"),
      },
    }),
    createActivityPubProvider: async (options) => {
      providerConstructions += 1;
      activityPubOptions = options;
      return { provider: activityPubProvider, close: async () => { providerCloses += 1; } };
    },
    startServer: async (app) => {
      listenerStarts += 1;
      assert.ok(app.resources.some((resource) => resource.id === "activitypub.actor"));
      return { server: {}, port: 18807, close: async () => { serverCloses += 1; } };
    },
    installShutdown: (target) => { installedTarget = target; return { dispose() {} }; },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(providerConstructions, 1);
  assert.equal(typeof activityPubOptions.onActivity, "function");
  assert.equal(queueStarts, 1);
  assert.equal(listenerStarts, 1);
  assert.equal(installedTarget, running);
  await running.close();
  assert.equal(serverCloses, 1);
  assert.equal(providerCloses, 1);
});

test("without OPS_DATA_DIR configured, MetroPlat tasks mount but filesystem rooms do not", () => {
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
  }, { oauth, fetchImpl: async () => new Response() });
  const ids = app.resources.map((resource) => resource.id);
  assert.ok(!ids.includes("ops-control-plane.world"));
  assert.ok(!ids.includes("ops-control-plane.records"));
  assert.ok(ids.includes("ops-control-plane.tasks"));
  assert.ok(ids.includes("ops-control-plane.books"));
  assert.ok(ids.includes("ops-control-plane.books-view"));
  assert.ok(ids.includes("ops-control-plane.books-report"));
});

test("with OPS_DATA_DIR configured, /world and /records are mounted and bearer-gated exactly like /mcp", async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), "ops-app-control-plane-test-"));
  t.after(() => rmSync(dataDir, { recursive: true, force: true }));
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
    dataDir,
  }, { oauth, fetchImpl: emptyMetroplatFetch });
  const world = app.resources.find((resource) => resource.id === "ops-control-plane.world");
  assert.ok(world, "expected /world to be mounted");
  const denied = await world.handler({ req: { headers: {} } });
  assert.equal(denied.status, 401);
  assert.deepEqual(JSON.parse(denied.body), { error: "unauthorized", reason: "bearer token required" });
  const admitted = await world.handler({ req: { headers: { authorization: "Bearer good" } } });
  assert.deepEqual(JSON.parse(admitted.body), { stratum: "settled", entities: [] });
  assert.ok(app.resources.some((resource) => resource.id === "ops-control-plane.records"));
});

test("machine tasks stay bearer-only while the HTML task view starts browser induction", async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), "ops-app-control-plane-test-"));
  t.after(() => rmSync(dataDir, { recursive: true, force: true }));
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
    dataDir,
  }, { oauth, fetchImpl: emptyMetroplatFetch });
  const tasks = app.resources.find((resource) => resource.id === "ops-control-plane.tasks");
  assert.ok(tasks, "expected /tasks to be mounted");
  const denied = await tasks.handler({ req: { headers: {} } });
  assert.equal(denied.status, 401);
  const admitted = await tasks.handler({ req: { headers: { authorization: "Bearer good" } } });
  assert.deepEqual(JSON.parse(admitted.body), {
    source: "metroplat-mcp",
    date: "2026-09-01",
    feed: "daily-claim-sessions",
    tasks: [],
    milestones: [],
    roadmapMilestones: [],
    relationObstructions: [],
    coordination: "clear",
    coordinationCost: 0,
  });
  const view = app.resources.find((resource) => resource.id === "ops-control-plane.tasks-view");
  assert.ok(view, "expected /tasks/view to be mounted");
  const deniedView = await view.handler({ req: { headers: {} }, url: new URL("https://ops.561.group/tasks/view") });
  assert.equal(deniedView.status, 303);
  assert.equal(deniedView.headers.location, "/login");
  for (const id of ["ops-control-plane.businesses", "ops-control-plane.businesses-view"]) {
    const room = app.resources.find(resource => resource.id === id);
    assert.ok(room);
    const reply = await room.handler({ req: { headers: { accept: "text/html" } }, url: new URL("https://ops.561.group/businesses/view") });
    assert.equal(reply.status, 303);
    assert.equal(reply.headers.location, "/login");
  }
});

test("machine books stay bearer-only while the HTML books view starts browser induction like /tasks/view", async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), "ops-app-control-plane-test-"));
  t.after(() => rmSync(dataDir, { recursive: true, force: true }));
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
    dataDir,
  }, { oauth, fetchImpl: emptyMetroplatFetch });
  const books = app.resources.find((resource) => resource.id === "ops-control-plane.books");
  assert.ok(books, "expected /books to be mounted");
  const denied = await books.handler({ req: { headers: {} } });
  assert.equal(denied.status, 401);
  const admitted = await books.handler({ req: { headers: { authorization: "Bearer good" } } });
  assert.equal(JSON.parse(admitted.body).source, "metroplat-mcp");

  const report = app.resources.find((resource) => resource.id === "ops-control-plane.books-report");
  assert.ok(report, "expected /books/report to be mounted");
  const deniedReport = await report.handler({ req: { headers: {} }, url: new URL("https://ops.561.group/books/report?report=stats") });
  assert.equal(deniedReport.status, 401);

  const view = app.resources.find((resource) => resource.id === "ops-control-plane.books-view");
  assert.ok(view, "expected /books/view to be mounted");
  const deniedView = await view.handler({ req: { headers: {} }, url: new URL("https://ops.561.group/books/view") });
  assert.equal(deniedView.status, 303);
  assert.equal(deniedView.headers.location, "/login");
});

test("without OPS_DATA_DIR configured, /tasks and /tasks/view remain mounted from MetroPlat", () => {
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
  }, { oauth, fetchImpl: async () => new Response() });
  const ids = app.resources.map((resource) => resource.id);
  assert.ok(ids.includes("ops-control-plane.tasks"));
  assert.ok(ids.includes("ops-control-plane.tasks-view"));
});

test("browser session admits shared readings while MCP mutations remain bearer-only", async () => {
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group",
    upstreamMcpUrl: "http://127.0.0.1:18811",
    allowedEmail: "operator@example.invalid",
  }, { oauth, fetchImpl: emptyMetroplatFetch });
  const resource = (id) => app.resources.find((candidate) => candidate.id === id);
  const login = resource("ops-browser.login-google").handler({ req: { headers: {} } });
  const authorization = new URL(login.headers.location);
  const callbackUrl = new URL("https://ops.561.group/auth/callback");
  callbackUrl.searchParams.set("code", "one-use-code");
  callbackUrl.searchParams.set("state", authorization.searchParams.get("state"));
  const flowCookie = login.headers["set-cookie"].split(";", 1)[0];
  const callback = resource("ops-browser.callback").handler({ req: { headers: { cookie: flowCookie } }, url: callbackUrl });
  const sessionCookie = callback.headers["set-cookie"][1].split(";", 1)[0];

  const html = await resource("ops-control-plane.tasks-view").handler({
    req: { headers: { cookie: sessionCookie } },
    url: new URL("https://ops.561.group/tasks/view"),
  });
  assert.equal(html.status ?? 200, 200);
  assert.match(html.body, /data-tufte/);
  assert.equal((await resource("ops-control-plane.tasks").handler({ req: { headers: { cookie: sessionCookie } } })).status ?? 200, 200);
  assert.equal((await resource("ops-mcp.proxy").handler({ req: { headers: { cookie: sessionCookie } } })).status, 401);

  const booksHtml = await resource("ops-control-plane.books-view").handler({
    req: { headers: { cookie: sessionCookie } },
    url: new URL("https://ops.561.group/books/view"),
  });
  assert.equal(booksHtml.status ?? 200, 200);
  assert.match(booksHtml.body, /Ledger books/);
  assert.equal((await resource("ops-control-plane.books").handler({ req: { headers: { cookie: sessionCookie } } })).status ?? 200, 200);
});

test("Cold Red Gate unit retains loopback, dependency, secret-file, and filesystem boundaries", async () => {
  const unit = await readFile(new URL("content/deployment/systemd-user/cold-red-gate/ops-gateway.service", packageUrl), "utf8");
  for (const required of [
    "Requires=metroplat.service",
    "After=network-online.target metroplat.service",
    "Environment=HOST=127.0.0.1",
    "Environment=UPSTREAM_MCP_URL=http://127.0.0.1:18811",
    "EnvironmentFile=%h/.config/561-group/ops-gateway.env",
    "NoNewPrivileges=yes",
    "ProtectSystem=strict",
    "UMask=0077",
  ]) assert.match(unit, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(unit, /infography-mcp\.service/);
  assert.doesNotMatch(unit, /GOOGLE_CLIENT_SECRET=/);
  assert.doesNotMatch(unit, /OPS_MCP_ALLOWED_EMAIL=/);
});

test("configured Holofoam operations require bearer admission and preserve an admitted replay chain", async () => {
  const state = new Map();
  const descriptors = Object.values(holofoamOperations);
  const { app } = createOpsMcpGatewayApp({
    publicBaseUrl: "https://ops.561.group", upstreamMcpUrl: "http://127.0.0.1:18811", allowedEmail: "operator@example.invalid",
  }, { oauth, fetchImpl: async () => new Response(), pureOperations: descriptors });
  const listed = app.resources.find((resource) => resource.id === "ops-pure-operations.list");
  const execute = app.resources.find((resource) => resource.id === "ops-pure-operations.execute");
  assert.equal((await listed.handler({ req: { headers: {} } })).status, 401);
  const headers = { authorization: "Bearer good" };
  const catalogue = await listed.handler({ req: { headers } });
  assert.deepEqual(JSON.parse(catalogue.body).operations.map(({ id }) => id), descriptors.map(({ id }) => id));
  const call = async (id, input) => {
    const response = await execute.handler({ params: { encodedId: id }, req: { headers, async *[Symbol.asyncIterator]() { yield JSON.stringify(input); } } });
    assert.equal(response.status ?? 200, 200);
    return JSON.parse(response.body).result;
  };
  const admitted = await call("holofoam.admit", { spec: { config: { population: 2 } } });
  const stepped = await call("holofoam.step", { checkpoint: admitted.checkpoint, count: 2 });
  const observed = await call("holofoam.observe", { checkpoint: stepped.checkpoint });
  const compared = await call("holofoam.fork-compare", { checkpoint: stepped.checkpoint, count: 1 });
  assert.equal(observed.organism.id, 0);
  assert.equal(compared.baseline.summary.tick, 3);
});
