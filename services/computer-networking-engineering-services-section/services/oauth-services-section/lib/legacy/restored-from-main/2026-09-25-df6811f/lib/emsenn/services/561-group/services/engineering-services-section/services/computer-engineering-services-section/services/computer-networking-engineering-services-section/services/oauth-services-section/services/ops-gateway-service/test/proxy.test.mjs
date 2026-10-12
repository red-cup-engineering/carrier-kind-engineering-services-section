import assert from "node:assert/strict";

import { Readable } from "node:stream";
import test from "node:test";
import { forwardHeaders, mcpGatewayProxyApp } from "../src/proxy.mjs";

test("request filtering removes credentials, hop-by-hop, and Connection-nominated headers", () => {
  const headers = forwardHeaders({
    authorization: "Bearer secret",
    connection: "keep-alive, x-private",
    host: "ops.561.group",
    "x-private": "remove-me",
    "x-request-id": "keep-me",
  });
  assert.deepEqual([...headers], [["x-request-id", "keep-me"]]);
});

test("request filtering strips inbound x-metroplat-subject and x-metroplat-gateway-token, case-insensitively", () => {
  const headers = forwardHeaders({
    "x-metroplat-subject": "spoofed-actor",
    "X-Metroplat-Gateway-Token": "spoofed-token",
    "x-request-id": "keep-me",
  });
  assert.deepEqual([...headers], [["x-request-id", "keep-me"]]);
});

function proxyResource(overrides = {}) {
  return mcpGatewayProxyApp("http://127.0.0.1:18811", {
    fetchImpl: async () => new Response(null, { status: 200 }),
    ...overrides,
  }).resources[0];
}

function getRequest(claims) {
  return {
    url: new URL("https://ops.561.group/mcp"),
    req: { method: "GET", headers: {} },
    signal: new AbortController().signal,
    claims,
  };
}

test("chat completions uses the existing proxy and preserves the authenticated actor", async () => {
  let observed;
  const resource = proxyResource({
    upstreamGatewayToken: "shared-secret",
    subjectOf: (ctx) => ctx.claims?.actor,
    fetchImpl: async (url, options) => {
      observed = { url: String(url), headers: options.headers, body: "" };
      for await (const part of options.body) observed.body += part;
      return new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
    },
  });
  assert.equal(resource.match("/v1/chat/completions"), true);
  assert.equal(resource.match("/v1/chat/completions/other"), false);
  const body = JSON.stringify({ model: "metroplat/bounded-inference", messages: [{ role: "user", content: "hello" }] });
  const response = await resource.handler({
    url: new URL("https://ops.561.group/v1/chat/completions"),
    claims: { actor: "machine_1" },
    signal: new AbortController().signal,
    req: Object.assign(Readable.from([body]), { method: "POST", headers: {
      authorization: "Bearer client-secret", "content-type": "application/json",
      "x-metroplat-subject": "spoofed", "x-metroplat-gateway-token": "spoofed",
    } }),
  });
  assert.equal(observed.url, "http://127.0.0.1:18811/v1/chat/completions");
  assert.equal(observed.body, body);
  assert.equal(observed.headers.get("authorization"), null);
  assert.equal(observed.headers.get("x-metroplat-subject"), "machine_1");
  assert.equal(observed.headers.get("x-metroplat-gateway-token"), "shared-secret");
  assert.equal(await response.text(), "data: [DONE]\n\n");
});

test("chat completions refuses an absent actor or upstream identity binding before fetching", async () => {
  for (const overrides of [{}, { upstreamGatewayToken: "shared-secret" }, { subjectOf: () => "machine_1" }]) {
    const resource = proxyResource({ ...overrides, fetchImpl: async () => assert.fail("must not fetch") });
    const request = getRequest({ actor: "machine_1" });
    request.url = new URL("https://ops.561.group/v1/chat/completions");
    const response = await resource.handler(request);
    assert.equal(response.status, 503);
    assert.equal(JSON.parse(response.body).error, "inference_identity_unavailable");
  }
});

test("with an upstream gateway token and a machine claim, both metroplat headers are set to the actor", async () => {
  let observedHeaders;
  const resource = proxyResource({
    fetchImpl: async (_url, options) => { observedHeaders = options.headers; return new Response(null, { status: 200 }); },
    upstreamGatewayToken: "shared-secret",
    subjectOf: (ctx) => ctx.claims?.actor,
  });
  await resource.handler(getRequest({ actor: "machine_1", client_id: "machine_1" }));
  assert.equal(observedHeaders.get("x-metroplat-subject"), "machine_1");
  assert.equal(observedHeaders.get("x-metroplat-gateway-token"), "shared-secret");
});

test("with an upstream gateway token and an email claim, subjectOf yields no actor and neither header is set", async () => {
  let observedHeaders;
  const resource = proxyResource({
    fetchImpl: async (_url, options) => { observedHeaders = options.headers; return new Response(null, { status: 200 }); },
    upstreamGatewayToken: "shared-secret",
    subjectOf: (ctx) => ctx.claims?.actor,
  });
  await resource.handler(getRequest({ email: "operator@example.invalid" }));
  assert.equal(observedHeaders.get("x-metroplat-subject"), null);
  assert.equal(observedHeaders.get("x-metroplat-gateway-token"), null);
});

test("without an upstream gateway token, neither metroplat header is set even for a machine claim", async () => {
  let observedHeaders;
  const resource = proxyResource({
    fetchImpl: async (_url, options) => { observedHeaders = options.headers; return new Response(null, { status: 200 }); },
    subjectOf: (ctx) => ctx.claims?.actor,
  });
  await resource.handler(getRequest({ actor: "machine_1", client_id: "machine_1" }));
  assert.equal(observedHeaders.get("x-metroplat-subject"), null);
  assert.equal(observedHeaders.get("x-metroplat-gateway-token"), null);
});

test("proxy preserves path, query, body, status, headers, and streaming response", async () => {
  let observed;
  const fetchImpl = async (url, options) => {
    observed = { url: String(url), options };
    let body = "";
    for await (const chunk of options.body) body += chunk;
    observed.body = body;
    const encoder = new TextEncoder();
    return new Response(Readable.toWeb(Readable.from([
      encoder.encode("event: message\n"),
      encoder.encode("data: ok\n\n"),
    ])), {
      status: 202,
      headers: {
        "content-type": "text/event-stream",
        connection: "x-upstream-private",
        "x-upstream-private": "remove-me",
        "x-visible": "yes",
      },
    });
  };
  const resource = mcpGatewayProxyApp("http://127.0.0.1:18811", { fetchImpl }).resources[0];
  const signal = new AbortController().signal;
  const reply = await resource.handler({
    url: new URL("https://ops.561.group/mcp/session?cursor=7"),
    req: Object.assign(Readable.from(["request-body"]), {
      method: "POST",
      headers: { authorization: "Bearer secret", "content-type": "application/json", "x-trace": "trace" },
    }),
    signal,
  });
  assert.ok(reply instanceof Response);
  assert.equal(observed.url, "http://127.0.0.1:18811/mcp/session?cursor=7");
  assert.equal(observed.options.signal, signal);
  assert.equal(observed.options.headers.get("authorization"), null);
  assert.equal(observed.options.headers.get("x-trace"), "trace");
  assert.equal(observed.body, "request-body");
  assert.equal(reply.status, 202);
  assert.equal(reply.headers.get("x-upstream-private"), null);
  assert.equal(reply.headers.get("x-visible"), "yes");
  assert.equal(await reply.text(), "event: message\ndata: ok\n\n");
});

test("proxy maps upstream failure to bounded 502 without leaking the error", async () => {
  const resource = mcpGatewayProxyApp("http://127.0.0.1:18811", {
    fetchImpl: async () => { throw new Error("secret upstream detail"); },
  }).resources[0];
  const reply = await resource.handler({
    url: new URL("https://ops.561.group/mcp"),
    req: { method: "GET", headers: {} },
    signal: new AbortController().signal,
  });
  assert.equal(reply.status, 502);
  assert.doesNotMatch(reply.body, /secret upstream detail/);
  assert.equal(JSON.parse(reply.body).error, "bad_gateway");
});
