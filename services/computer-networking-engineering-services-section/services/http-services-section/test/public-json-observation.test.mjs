import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PUBLIC_JSON_MAX_BYTES,
  observePublicJson,
} from "../src/public-json-observation.mjs";

const fixedClock = () => "2026-10-05T00:00:00.000Z";
const allow = async () => {};

function jsonResponse(body, { status = 200, url = "https://example.test/data.json", headers = {} } = {}) {
  const text = JSON.stringify(body);
  const response = new Response(text, {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

test("observes valid public JSON without assigning caller conformance", async () => {
  const result = await observePublicJson(
    { url: "https://example.test/data.json" },
    {
      fetchImpl: async () => jsonResponse({ merchant: { legalBody: "emsenn" } }),
      boundary: { authorize: allow },
      clock: fixedClock,
    },
  );
  assert.equal(result.state, "observed");
  assert.equal(result.reason, "public-json-observed");
  assert.equal(result.httpStatus, 200);
  assert.deepEqual(result.body, { merchant: { legalBody: "emsenn" } });
});

test("passes the public-network policy purpose and follows its authorized transport", async () => {
  const seen = [];
  const result = await observePublicJson(
    { url: "https://example.test/data.json" },
    {
      fetchImpl: async (url) => jsonResponse({ ok: true }, { url }),
      boundary: {
        authorize: async (url, context) => seen.push({ url: url.href, context }),
      },
      clock: fixedClock,
    },
  );
  assert.equal(result.state, "observed");
  assert.deepEqual(seen, [{
    url: "https://example.test/data.json",
    context: { purpose: "public-json-observation", redirect: 0 },
  }]);
});

test("a non-success response remains unknown", async () => {
  const result = await observePublicJson(
    { url: "https://example.test/data.json" },
    {
      fetchImpl: async () => jsonResponse({ error: true }, { status: 403 }),
      boundary: { authorize: allow },
      clock: fixedClock,
    },
  );
  assert.equal(result.state, "unknown");
  assert.equal(result.reason, "http-non-success");
  assert.equal(result.httpStatus, 403);
});

test("a network or policy error remains unknown and exposes no body", async () => {
  const result = await observePublicJson(
    { url: "https://example.test/data.json" },
    {
      fetchImpl: async () => { throw new TypeError("fetch failed"); },
      boundary: { authorize: allow },
      clock: fixedClock,
    },
  );
  assert.equal(result.state, "unknown");
  assert.equal(result.reason, "request-or-policy-error");
  assert.equal(result.body, null);
});

test("invalid JSON remains unknown", async () => {
  const response = new Response("not json", { status: 200 });
  Object.defineProperty(response, "url", { value: "https://example.test/data.json" });
  const result = await observePublicJson(
    { url: "https://example.test/data.json" },
    {
      fetchImpl: async () => response,
      boundary: { authorize: allow },
      clock: fixedClock,
    },
  );
  assert.equal(result.state, "unknown");
  assert.equal(result.reason, "invalid-json");
});

test("content-length larger than the bound is not read", async () => {
  const result = await observePublicJson(
    { url: "https://example.test/data.json", maxBytes: 16 },
    {
      fetchImpl: async () => jsonResponse({ a: "this is too large" }, { headers: { "content-length": "100" } }),
      boundary: { authorize: allow },
      clock: fixedClock,
    },
  );
  assert.equal(result.state, "unknown");
  assert.equal(result.reason, "body-too-large");
});

test("actual body size is bounded even when content-length is absent", async () => {
  const large = { value: "x".repeat(64) };
  const response = new Response(JSON.stringify(large), { status: 200 });
  Object.defineProperty(response, "url", { value: "https://example.test/data.json" });
  const result = await observePublicJson(
    { url: "https://example.test/data.json", maxBytes: 16 },
    {
      fetchImpl: async () => response,
      boundary: { authorize: allow },
      clock: fixedClock,
    },
  );
  assert.equal(result.state, "unknown");
  assert.equal(result.reason, "body-too-large");
});

test("request bounds are enforced before transport", async () => {
  await assert.rejects(
    () => observePublicJson({ url: "https://example.test/data.json", timeoutMs: 0 }),
    /timeoutMs/u,
  );
  await assert.rejects(
    () => observePublicJson({ url: "https://example.test/data.json", maxBytes: DEFAULT_PUBLIC_JSON_MAX_BYTES * 9 }),
    /maxBytes/u,
  );
});
