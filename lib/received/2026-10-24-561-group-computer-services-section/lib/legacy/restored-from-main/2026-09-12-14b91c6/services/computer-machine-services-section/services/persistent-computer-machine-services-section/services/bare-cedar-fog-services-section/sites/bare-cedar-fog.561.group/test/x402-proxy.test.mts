import assert from "node:assert/strict";
import test from "node:test";
import { x402Route } from "../src/x402-proxy.mjs";

test("x402Route routes a fixed compute path to the tollbooth port", () => {
  const route = x402Route("POST", "/compute/inference", "4022");
  assert.deepEqual(route, { port: 4022, upstreamPath: "/inference" });
});

test("x402Route routes a fixed brokerage path to the brokerage port", () => {
  const route = x402Route("GET", "/.well-known/brokerage-products", "4022", "", "4100");
  assert.deepEqual(route, { port: 4100, upstreamPath: "/.well-known/brokerage-products" });
});

test("x402Route routes a per-provider metered path to its configured port", () => {
  const route = x402Route("POST", "/x402/acme/invoke", "4022", "acme:9000");
  assert.deepEqual(route, { port: 9000, upstreamPath: "/x402/acme/invoke" });
});

test("x402Route rejects a metered write path used with GET", () => {
  assert.throws(() => x402Route("GET", "/x402/acme/invoke", "4022", "acme:9000"));
});

test("x402Route rejects a metered path for an unconfigured provider", () => {
  assert.throws(() => x402Route("POST", "/x402/nope/invoke", "4022", "acme:9000"));
});

test("x402Route rejects a path outside the contracted ingress", () => {
  assert.throws(() => x402Route("GET", "/unrelated", "4022", ""));
});
