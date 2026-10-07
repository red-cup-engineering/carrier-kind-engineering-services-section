import assert from "node:assert/strict";
import test from "node:test";
import { send } from "../src/response.mjs";
import { sendProblem } from "../src/problem.mjs";

class FakeResponse {
  headers = new Map();
  statusCode = 200;
  body = undefined;
  hasHeader(name) { return this.headers.has(name.toLowerCase()); }
  setHeader(name, value) { this.headers.set(name.toLowerCase(), value); }
  getHeader(name) { return this.headers.get(name.toLowerCase()); }
  writeHead(status) { this.statusCode = status; return this; }
  end(body) { this.body = body; return this; }
}

function fakeReq(method = "GET") {
  return { method, headers: {} };
}

test("send requires an explicit now (no clock read)", async () => {
  await assert.rejects(send(fakeReq(), new FakeResponse(), { body: "hi" }), /now .* is required/);
});

test("send stamps the Date header from the caller-supplied now", async () => {
  const res = new FakeResponse();
  await send(fakeReq(), res, { body: "hi" }, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(res.getHeader("date"), "Thu, 01 Jan 2026 00:00:00 GMT");
  assert.equal(res.body.toString("utf8"), "hi");
});

test("sendProblem requires an explicit options.now (no clock read)", async () => {
  await assert.rejects(
    sendProblem(fakeReq(), new FakeResponse(), { status: 500, title: "boom" }),
    /options\.now .* is required/,
  );
});

test("sendProblem stamps the Date header from the caller-supplied options.now", async () => {
  const res = new FakeResponse();
  await sendProblem(fakeReq(), res, { status: 500, title: "boom" }, { now: new Date("2026-01-01T00:00:00.000Z") });
  assert.equal(res.getHeader("date"), "Thu, 01 Jan 2026 00:00:00 GMT");
  assert.equal(res.statusCode, 500);
});
