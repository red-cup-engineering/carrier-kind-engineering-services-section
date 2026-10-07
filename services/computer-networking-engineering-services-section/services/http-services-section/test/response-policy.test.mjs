import assert from "node:assert/strict";
import test from "node:test";
import { ensureDateHeader } from "../src/response-policy.mjs";

class FakeResponse {
  headers = new Map();
  hasHeader(name) { return this.headers.has(name.toLowerCase()); }
  setHeader(name, value) { this.headers.set(name.toLowerCase(), value); }
  getHeader(name) { return this.headers.get(name.toLowerCase()); }
}

test("ensureDateHeader requires an explicit now (no clock read)", () => {
  const res = new FakeResponse();
  assert.throws(() => ensureDateHeader(res), /now .* is required/);
});

test("ensureDateHeader renders the caller-supplied now as an RFC 7231 HTTP-date, and never overwrites an existing Date header", () => {
  const res = new FakeResponse();
  ensureDateHeader(res, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(res.getHeader("Date"), "Thu, 01 Jan 2026 00:00:00 GMT");
  ensureDateHeader(res, new Date("2030-01-01T00:00:00.000Z"));
  assert.equal(res.getHeader("Date"), "Thu, 01 Jan 2026 00:00:00 GMT");
});

test("ensureDateHeader also accepts milliseconds-since-epoch (Date.now())", () => {
  const res = new FakeResponse();
  ensureDateHeader(res, Date.parse("2026-06-15T12:00:00.000Z"));
  assert.equal(res.getHeader("Date"), "Mon, 15 Jun 2026 12:00:00 GMT");
});
