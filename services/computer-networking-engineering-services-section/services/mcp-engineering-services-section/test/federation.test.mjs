import assert from "node:assert/strict";
import test from "node:test";
import { federateMcpServers } from "../src/federation.mjs";
import { createMcpServer } from "../src/server.mjs";

function scheduledTimers() {
  const active = new Set();
  const delays = [];
  return {
    active,
    delays,
    setTimer(fn, delay) {
      const timer = { fn, unref() {} };
      active.add(timer);
      delays.push(delay);
      return timer;
    },
    clearTimer(timer) { active.delete(timer); },
    async runNext() {
      const timer = active.values().next().value;
      assert.ok(timer, "a retry is scheduled");
      active.delete(timer);
      timer.fn();
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

function listingClient(answers, { callTool } = {}) {
  let lists = 0;
  let closed = 0;
  return {
    get lists() { return lists; },
    get closed() { return closed; },
    async listTools() {
      const answer = answers[lists++];
      if (answer instanceof Error) throw answer;
      return answer;
    },
    callTool: callTool ?? (async () => ({ content: [{ type: "text", text: "ok" }] })),
    reset() {},
    async close() { closed += 1; },
  };
}

test("a late upstream is retried, publishes its tools, and emits tools/list_changed", async () => {
  const timers = scheduledTimers();
  const client = listingClient([
    new Error("not listening"),
    new Error("still starting"),
    { tools: [{ name: "search", description: "Search." }] },
  ]);
  const stable = listingClient([{ tools: [{ name: "ping" }] }]);
  const federation = await federateMcpServers([{ prefix: "host", client: stable }, { prefix: "lspace", client }], timers);
  assert.deepEqual(federation.tools.map((tool) => tool.name), ["host_ping"]);
  assert.deepEqual(timers.delays, [1_000]);

  const server = createMcpServer({ name: "front", version: "1", toolSources: [federation.tools] });
  const notifications = [];
  server.onNotification((notification) => notifications.push(notification));
  const initialized = await server.handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  assert.equal(initialized.result.capabilities.tools.listChanged, true);

  const empty = await server.handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.deepEqual(empty.result.tools.map((tool) => tool.name), ["host_ping"]);
  assert.deepEqual(timers.delays, [1_000, 2_000]);
  await timers.runNext();

  assert.deepEqual(federation.tools.map((tool) => tool.name), ["host_ping", "lspace_search"]);
  assert.deepEqual(notifications, [{ jsonrpc: "2.0", method: "notifications/tools/list_changed" }]);
  const listed = await server.handleMessage({ jsonrpc: "2.0", id: 3, method: "tools/list" });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ["host_ping", "lspace_search"]);
  await federation.close();
});

test("availability moves a suspect upstream to alive with a higher incarnation", async () => {
  const timers = scheduledTimers();
  let time = 10;
  const observations = [];
  const client = listingClient([new Error("warming up"), { tools: [{ name: "fetch" }] }]);
  const federation = await federateMcpServers([{ prefix: "garden", client }], {
    ...timers,
    now: () => time,
    onObservation: (observation) => observations.push(observation),
  });
  assert.deepEqual(federation.availability(), [{ prefix: "garden", reading: "suspect", incarnation: 0, since: 10, reason: "warming up" }]);

  time = 20;
  await federation.tools.refresh();
  assert.deepEqual(federation.availability(), [{ prefix: "garden", reading: "alive", incarnation: 1, since: 20 }]);
  assert.deepEqual(observations.map(({ reading, incarnation }) => [reading, incarnation]), [["suspect", 0], ["alive", 1]]);
  assert.ok(Object.isFrozen(federation.availability()));
  assert.ok(Object.isFrozen(federation.availability()[0]));
  await federation.close();
});

test("a suspect upstream reads dead after the suspicion window", async () => {
  const timers = scheduledTimers();
  let time = 100;
  const client = listingClient([new Error("connection refused")]);
  const federation = await federateMcpServers([{ prefix: "late", client }], {
    ...timers,
    suspicionWindowMs: 10,
    now: () => time,
  });
  assert.equal(federation.availability()[0].reading, "suspect");
  time = 111;
  assert.deepEqual(federation.availability(), [{ prefix: "late", reading: "dead", incarnation: 0, since: 111, reason: "connection refused" }]);
  await federation.close();
});

test("close cancels every federation retry timer", async () => {
  const timers = scheduledTimers();
  const first = listingClient([new Error("down")]);
  const second = listingClient([new Error("also down")]);
  const federation = await federateMcpServers([{ prefix: "one", client: first }, { prefix: "two", client: second }], timers);
  assert.equal(timers.active.size, 2);
  await federation.close();
  assert.equal(timers.active.size, 0);
  assert.equal(first.closed, 1);
  assert.equal(second.closed, 1);
});

test("a failed federated call reports the upstream liveness reading and reason", async () => {
  let time = 0;
  const timers = scheduledTimers();
  const client = listingClient([{ tools: [{ name: "search" }] }], { callTool: async () => { throw new Error("socket closed"); } });
  const federation = await federateMcpServers([{ prefix: "garden", client }], {
    ...timers,
    suspicionWindowMs: 5,
    now: () => time,
  });
  await assert.rejects(federation.tools[0].handler({}), (error) => error.reading === "suspect" && error.reason === "socket closed");
  time = 6;
  await assert.rejects(federation.tools[0].handler({}), (error) => error.code === "upstream_dead" && error.message === "garden is dead: socket closed");
  await federation.close();
});
