import assert from "node:assert/strict";

import test from "node:test";
import { serveOpsMcpStdioBridge } from "../scripts/serve-ops-gateway-stdio.mjs";

class FakeUnauthorizedError extends Error {
  constructor(code) {
    super(`fake streamable http error: ${code}`);
    this.code = code;
  }
}

const ENVIRONMENT = { OPS_MCP_ORIGIN: "https://ops.561.group", OPS_MCP_CLIENT_ID: "machine_1", OPS_MCP_CLIENT_SECRET: "s3cret" };
const tokenFetch = () => async () => new Response(JSON.stringify({ access_token: "tok-1", expires_in: 3600 }), { status: 200 });
const tick = async (n = 6) => { for (let i = 0; i < n; i += 1) await new Promise((resolve) => setImmediate(resolve)); };

function stubLocalTransport() {
  let onmessage;
  const sent = [];
  return {
    sent,
    start: async () => {},
    close: async () => {},
    send: async (message) => { sent.push(message); },
    get onmessage() { return onmessage; },
    set onmessage(fn) { onmessage = fn; },
    emit(message) { onmessage?.(message); },
  };
}

/** A remote that records sends and can answer them through its own onmessage hook. */
function stubRemote({ onSend } = {}) {
  const remote = {
    sends: [],
    closes: 0,
    start: async () => {},
    close: async () => { remote.closes += 1; },
    send: async (message) => {
      remote.sends.push(message);
      await onSend?.(message, remote);
    },
  };
  return remote;
}

/** Fake timers: every scheduled timeout is kept and fired by hand. */
function fakeTimers() {
  const timers = new Map();
  let next = 0;
  return {
    setTimeoutImpl: (fn, ms) => { next += 1; timers.set(next, { fn, ms }); return next; },
    clearTimeoutImpl: (id) => { timers.delete(id); },
    fire(id) { const t = timers.get(id); timers.delete(id); t?.fn(); },
    fireAll() { for (const id of [...timers.keys()]) this.fire(id); },
    get size() { return timers.size; },
  };
}

test("serveOpsMcpStdioBridge requires client id and secret", async () => {
  await assert.rejects(
    () => serveOpsMcpStdioBridge({ environment: {}, fetchImpl: async () => { throw new Error("must not fetch"); } }),
    /OPS_MCP_CLIENT_ID and OPS_MCP_CLIENT_SECRET are required/,
  );
});

test("serveOpsMcpStdioBridge refuses a non-positive request timeout", async () => {
  await assert.rejects(
    () => serveOpsMcpStdioBridge({ environment: { ...ENVIRONMENT, OPS_MCP_REQUEST_TIMEOUT_MS: "0" }, fetchImpl: tokenFetch() }),
    /OPS_MCP_REQUEST_TIMEOUT_MS must be a positive number/,
  );
});

test("a 401 from the remote transport forces one token refresh and retries the send", async () => {
  const tokenBodies = [
    { access_token: "tok-1", expires_in: 3600 },
    { access_token: "tok-2", expires_in: 3600 },
  ];
  let tokenCalls = 0;
  const fetchImpl = async () => {
    const body = tokenBodies[tokenCalls];
    tokenCalls += 1;
    return new Response(JSON.stringify(body), { status: 200 });
  };
  let resolveSecondSend;
  const secondSend = new Promise((resolve) => { resolveSecondSend = resolve; });
  const remote = stubRemote({ onSend: (message, self) => { if (self.sends.length === 1) throw new FakeUnauthorizedError(401); resolveSecondSend(); } });
  const localTransport = stubLocalTransport();
  const timers = fakeTimers();
  const bridge = await serveOpsMcpStdioBridge({ environment: ENVIRONMENT, fetchImpl, localTransport, remoteTransportFactory: () => remote, ...timers });

  assert.equal(tokenCalls, 1, "the bridge fetches an initial token before serving");
  localTransport.emit({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  await secondSend;
  assert.equal(remote.sends.length, 2, "the message is retried once after a 401");
  assert.equal(tokenCalls, 2, "a 401 forces exactly one extra token fetch");
  assert.equal(remote.closes, 0, "a 401 never resets the remote session");
  await bridge.close();
});

test("a non-401 send failure resets the remote session, retries once, and then answers the local client with a JSON-RPC error", async () => {
  const remote = stubRemote({ onSend: (message) => { if (message.method === "tools/list") throw new Error("boom, upstream refused"); } });
  const localTransport = stubLocalTransport();
  const timers = fakeTimers();
  const originalWrite = process.stderr.write;
  const stderrChunks = [];
  process.stderr.write = (chunk) => { stderrChunks.push(String(chunk)); return true; };
  try {
    const bridge = await serveOpsMcpStdioBridge({ environment: ENVIRONMENT, fetchImpl: tokenFetch(), localTransport, remoteTransportFactory: () => remote, ...timers });
    localTransport.emit({ jsonrpc: "2.0", id: 7, method: "tools/list" });
    await tick();
    assert.equal(remote.sends.filter((m) => m.method === "tools/list").length, 2, "exactly one retry after the reset");
    assert.equal(remote.closes, 1, "the stale remote session is closed once");
    assert.equal(localTransport.sent.length, 1, "the local client receives exactly one answer");
    const answer = localTransport.sent[0];
    assert.equal(answer.id, 7);
    assert.equal(answer.error.code, -32000);
    assert.match(answer.error.message, /ops remote refused tools\/list: boom, upstream refused/);
    assert.equal(answer.error.data.kind, "ops-mcp-stdio:remote-send-failed");
    assert.ok(stderrChunks.some((chunk) => chunk.includes("stdin -> remote failed") && chunk.includes("boom")));
    assert.equal(timers.size, 0, "the request's timer is cleared once it is answered");
    await bridge.close();
  } finally {
    process.stderr.write = originalWrite;
  }
});

test("a non-401 send failure never replays a mutating tools/call with uncertain delivery", async () => {
  const remotes = [];
  const factory = () => {
    const remote = stubRemote({ onSend: (message) => {
      if (message.method === "tools/call") throw new Error("connection dropped after delivery became uncertain");
    } });
    remotes.push(remote);
    return remote;
  };
  const localTransport = stubLocalTransport();
  const timers = fakeTimers();
  const originalWrite = process.stderr.write;
  process.stderr.write = () => true;
  try {
    const bridge = await serveOpsMcpStdioBridge({ environment: ENVIRONMENT, fetchImpl: tokenFetch(), localTransport, remoteTransportFactory: factory, ...timers });
    localTransport.emit({ jsonrpc: "2.0", id: 8, method: "tools/call", params: { name: "structured-work-intent-admit", arguments: {} } });
    await tick();
    assert.equal(remotes[0].sends.filter((message) => message.method === "tools/call").length, 1);
    assert.equal(remotes.length, 2, "the bridge still repairs the session for the next request");
    assert.equal(remotes[1].sends.filter((message) => message.method === "tools/call").length, 0);
    assert.equal(localTransport.sent.length, 1);
    assert.match(localTransport.sent[0].error.message, /delivery status is uncertain/);
    assert.equal(localTransport.sent[0].error.data.kind, "ops-mcp-stdio:remote-send-failed");
    await bridge.close();
  } finally {
    process.stderr.write = originalWrite;
  }
});

test("a tools/list metadata downgrade removes a formerly read-only tool from replay eligibility", async () => {
  const remotes = [];
  let listing = 0;
  const factory = () => {
    const remote = stubRemote({ onSend: async (message, self) => {
      if (message.method === "tools/list") {
        listing += 1;
        self.onmessage({ jsonrpc: "2.0", id: message.id, result: { tools: [{ name: "changed-tool", annotations: { readOnlyHint: listing === 1 } }] } });
      }
      if (message.method === "tools/call") throw new Error("delivery uncertain");
    } });
    remotes.push(remote);
    return remote;
  };
  const localTransport = stubLocalTransport();
  const timers = fakeTimers();
  const originalWrite = process.stderr.write;
  process.stderr.write = () => true;
  try {
    const bridge = await serveOpsMcpStdioBridge({ environment: ENVIRONMENT, fetchImpl: tokenFetch(), localTransport, remoteTransportFactory: factory, ...timers });
    localTransport.emit({ jsonrpc: "2.0", id: 20, method: "tools/list" });
    localTransport.emit({ jsonrpc: "2.0", id: 21, method: "tools/list" });
    await tick();
    localTransport.emit({ jsonrpc: "2.0", id: 22, method: "tools/call", params: { name: "changed-tool", arguments: {} } });
    await tick();
    assert.equal(remotes[0].sends.filter((message) => message.method === "tools/call").length, 1);
    assert.equal(remotes[1].sends.filter((message) => message.method === "tools/call").length, 0);
    assert.match(localTransport.sent.at(-1).error.message, /delivery status is uncertain/);
    await bridge.close();
  } finally {
    process.stderr.write = originalWrite;
  }
});

test("a request the remote never answers is answered locally with a timeout error, and the remote session is reset with the cached initialize replayed", async () => {
  const remotes = [];
  const factory = () => {
    const remote = stubRemote({
      onSend: async (message, self) => {
        // Only the fresh session answers the bridge's own replayed initialize; nothing answers the client's tools/call.
        if (message.method === "initialize" && typeof message.id === "string" && message.id.startsWith("ops-gateway-stdio:initialize:")) {
          await tick(1);
          self.onmessage({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "fake", version: "0" } } });
        }
      },
    });
    remotes.push(remote);
    return remote;
  };
  const localTransport = stubLocalTransport();
  const timers = fakeTimers();
  const originalWrite = process.stderr.write;
  process.stderr.write = () => true;
  try {
    const bridge = await serveOpsMcpStdioBridge({ environment: { ...ENVIRONMENT, OPS_MCP_REQUEST_TIMEOUT_MS: "5000" }, fetchImpl: tokenFetch(), localTransport, remoteTransportFactory: factory, ...timers });
    const initializeParams = { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "harness", version: "1" } };
    localTransport.emit({ jsonrpc: "2.0", id: 1, method: "initialize", params: initializeParams });
    await tick();
    remotes[0].onmessage({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "fake", version: "0" } } });
    localTransport.emit({ jsonrpc: "2.0", method: "notifications/initialized" });
    localTransport.emit({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "structured-work-intent-admit", arguments: {} } });
    await tick();
    assert.equal(localTransport.sent.length, 1, "the initialize response reached the client");
    assert.equal(timers.size, 1, "one timer is pending: the unanswered tools/call");

    timers.fireAll();
    await tick(12);

    assert.equal(localTransport.sent.length, 2, "the client receives the timeout answer");
    const answer = localTransport.sent[1];
    assert.equal(answer.id, 2);
    assert.equal(answer.error.code, -32001);
    assert.match(answer.error.message, /did not answer tools\/call within 5000ms/);
    assert.deepEqual(answer.error.data, { kind: "ops-mcp-stdio:remote-timeout", method: "tools/call", timeoutMs: 5000 });
    assert.equal(remotes.length, 2, "a fresh remote transport was opened");
    assert.equal(remotes[0].closes, 1, "the stale remote was closed");
    const replayed = remotes[1].sends.find((m) => m.method === "initialize");
    assert.ok(replayed, "the cached initialize is replayed on the fresh session");
    assert.deepEqual(replayed.params, initializeParams);
    assert.ok(remotes[1].sends.some((m) => m.method === "notifications/initialized"), "the initialized notification follows");
    assert.ok(!localTransport.sent.some((m) => typeof m.id === "string" && m.id.startsWith("ops-gateway-stdio:initialize:")), "the bridge's own initialize answer never reaches the client");

    localTransport.emit({ jsonrpc: "2.0", id: 3, method: "tools/list" });
    await tick();
    assert.ok(remotes[1].sends.some((m) => m.id === 3), "the next request goes to the fresh session");
    await bridge.close();
  } finally {
    process.stderr.write = originalWrite;
  }
});
