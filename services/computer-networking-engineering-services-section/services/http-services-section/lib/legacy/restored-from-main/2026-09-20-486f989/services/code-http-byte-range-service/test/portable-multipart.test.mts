import assert from "node:assert/strict";
import test from "node:test";
import { multipartByterangesBody, multipartRangeBoundary } from "../src/code-http-byte-range.mts";
test("portable multipart range assembly preserves exact bytes and binary content", () => {
  const body = new Uint8Array([0, 255, 1, 128]);
  const ranges = [{start: 0, end: 1}, {start: 3, end: 3}];
  const boundary = multipartRangeBoundary(body.length, ranges);
  assert.equal(boundary, "web-server-343a302d312c332d33");
  const actual = multipartByterangesBody(body, ranges, "application/octet-stream", boundary);
  const expected = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/octet-stream\r\nContent-Range: bytes 0-1/4\r\n\r\n`), Buffer.from([0,255]),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\nContent-Range: bytes 3-3/4\r\n\r\n`), Buffer.from([128]), Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  assert.equal(Buffer.isBuffer(actual), false); assert.deepEqual([...actual], [...expected]);
});
