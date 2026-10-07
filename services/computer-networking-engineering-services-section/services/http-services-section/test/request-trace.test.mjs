import assert from "node:assert/strict";
import test from "node:test";
import { traceRequest } from "../src/request-trace.mjs";

function fakeReq() {
  return { method: "get", url: "/x", httpVersion: "1.1", socket: { remoteAddress: "127.0.0.1" }, headers: { "x-a": "1" } };
}

test("traceRequest requires an explicit clock (no clock read)", () => {
  assert.throws(() => traceRequest(fakeReq()), /now .* is required/);
});

test("traceRequest stamps every entry with the injected clock's value", () => {
  const trace = traceRequest(fakeReq(), () => 12345);
  assert.ok(trace.entries.length > 0);
  assert.ok(trace.entries.every((entry) => entry.t === "12345"));
});
