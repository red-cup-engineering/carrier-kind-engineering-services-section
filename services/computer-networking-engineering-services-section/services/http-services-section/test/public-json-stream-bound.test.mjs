import test from "node:test";
import assert from "node:assert/strict";
import { observePublicJson } from "../src/public-json-observation.mjs";

const request = { url: "https://fixture.invalid/data", maxBytes: 8, timeoutMs: 100 };
const clock = () => "2026-10-07T03:32:00.000Z";
const boundary = { authorize: async () => {} };
const finalUrl = "https://fixture.invalid/final-data";
function responseFor(stream, options) {
  const response = new Response(stream, options);
  Object.defineProperty(response, "url", { value: finalUrl });
  return response;
}
function assertUnknownIdentity(result) {
  assert.equal(result.kind, "red-cup.http.public-json-observation");
  assert.equal(result.state, "unknown");
  assert.equal(result.requestedUrl, request.url);
  assert.equal(result.url, finalUrl);
  assert.equal(result.observedAt, clock());
  assert.equal(result.httpStatus, 200);
  assert.equal(result.body, null);
}

for (const contentLength of [undefined, "8"]) {
  test(`over-limit stream stops at first excess chunk (content-length ${contentLength ?? "absent"})`, async () => {
    let produced = 0, cancelled = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (produced === 20) controller.close();
        else {
          produced++;
          controller.enqueue(new Uint8Array(8).fill(32));
        }
      },
      cancel() { cancelled++; },
    }, { highWaterMark: 0 });
    const headers = contentLength === undefined ? {} : { "content-length": contentLength };
    const result = await observePublicJson(request, {
      fetchImpl: async () => responseFor(stream, { headers }), boundary, clock,
    });
    assertUnknownIdentity(result);
    assert.equal(result.reason, "body-too-large");
    assert.equal(result.httpStatus, 200);
    assert.equal(result.body, null);
    assert.equal(produced, 2, "must stop after the first over-limit chunk");
    assert.equal(cancelled, 1);
    assert.equal(stream.locked, false);
  });
}

test("Content-Length refusal cancels the unread response without pulling it", async () => {
  let produced = 0, cancelled = 0;
  const stream = new ReadableStream({
    pull(controller) { produced++; controller.enqueue(new Uint8Array(8)); },
    cancel() { cancelled++; },
  }, { highWaterMark: 0 });
  const result = await observePublicJson(request, {
    fetchImpl: async () => responseFor(stream, { headers: { "content-length": "100" } }),
    boundary, clock,
  });
  assertUnknownIdentity(result);
  assert.equal(result.reason, "body-too-large");
  assert.equal(result.detail, "content-length 100 exceeds maxBytes 8");
  assert.equal(result.body, null);
  assert.equal(produced, 0);
  assert.equal(cancelled, 1);
});

test("exact byte limit still admits a valid JSON body", async () => {
  const bytes = new TextEncoder().encode('{"ok":true}');
  let step = 0, cancelled = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (step === 0) controller.enqueue(bytes.slice(0, 3));
      else if (step === 1) controller.enqueue(bytes.slice(3));
      else controller.close();
      step++;
    },
    cancel() { cancelled++; },
  }, { highWaterMark: 0 });
  const result = await observePublicJson({ ...request, maxBytes: bytes.byteLength }, {
    fetchImpl: async () => responseFor(stream), boundary, clock,
  });
  assert.equal(result.state, "observed");
  assert.deepEqual(result.body, { ok: true });
  assert.equal(cancelled, 0);
});

test("stream failure stays unknown and exposes no partial body", async () => {
  const stream = new ReadableStream({ start(controller) { controller.error(new Error("fixture body failure")); } });
  const result = await observePublicJson(request, {
    fetchImpl: async () => responseFor(stream), boundary, clock,
  });
  assertUnknownIdentity(result);
  assert.equal(result.reason, "body-read-error");
  assert.equal(result.body, null);
});


test("stalled body times out, cancels its producer, and preserves body-read-error identity", async () => {
  let cancelled = 0, controller;
  const stream = new ReadableStream({
    start(value) { controller = value; },
    cancel() { cancelled++; },
  }, { highWaterMark: 0 });
  const observation = observePublicJson({ ...request, timeoutMs: 15 }, {
    fetchImpl: async () => responseFor(stream), boundary, clock,
  });
  let timer;
  const deadline = new Promise(resolve => { timer = setTimeout(() => resolve(null), 500); });
  try {
    const result = await Promise.race([observation, deadline]);
    assert.notEqual(result, null, "body collection must honor the supplied timeout");
    assertUnknownIdentity(result);
    assert.equal(result.reason, "body-read-error");
    assert.equal(cancelled, 1);
    assert.equal(stream.locked, false);
  } finally {
    clearTimeout(timer);
    try { controller.error(new Error("fixture cleanup")); } catch {}
    await observation;
  }
});
