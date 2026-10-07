import assert from "node:assert/strict";
import test from "node:test";
import { parseSseByteStream } from "../../src/sse/parse-server-sent-event-byte-stream.mjs";

async function* chunksOf(pieces) {
  for (const piece of pieces) yield piece;
}

test("decodes SSE frames as byte chunks arrive, without waiting for the whole stream", async () => {
  const events = [];
  for await (const event of parseSseByteStream(chunksOf([
    "event: foo\ndata: ",
    "bar\n\n",
    "data: second\n\n",
  ]))) {
    events.push(event);
  }
  assert.deepEqual(events, [
    { data: "bar", event: "foo" },
    { data: "second" },
  ]);
});

test("decodes a final frame with no trailing blank line", async () => {
  const events = [];
  for await (const event of parseSseByteStream(chunksOf(["data: only"]))) {
    events.push(event);
  }
  assert.deepEqual(events, [{ data: "only" }]);
});

test("refuses an event past maxEventBytes instead of buffering it unbounded", async () => {
  await assert.rejects(async () => {
    for await (const _ of parseSseByteStream(chunksOf(["data: ", "x".repeat(32)]), { maxEventBytes: 8 })) {
      // draining is enough to trigger the bound
    }
  }, /exceeds 8 bytes/);
});
