import assert from "node:assert/strict";
import test from "node:test";
import { compress, decompress, compressStream, decompressStream, supportedCompressionCodings, parseContentEncoding, isCoding, isCompressionCoding, type Coding } from "../src/code-http-content-coding.mts";

test("round-trips every supported HTTP compression coding", async () => {
  const body = Buffer.from("atomic HTTP content coding ".repeat(100));
  for (const coding of supportedCompressionCodings()) {
    assert.deepEqual(await decompress(await compress(body, coding), coding), body);
  }
  assert.equal(await compress(body, "identity"), body);
  assert.equal(await decompress(body, "identity"), body);
});

test("parses request codings in application order and rejects unsupported tokens", async () => {
  assert.deepEqual(parseContentEncoding([" GZIP, identity", "BR"]), ["gzip", "br"]);
  for (const header of [undefined, null, "", "identity", ", ,"]) assert.deepEqual(parseContentEncoding(header), []);
  assert.ok(Object.isFrozen(parseContentEncoding("gzip")));
  assert.ok(isCoding("identity"));
  assert.ok(!isCompressionCoding("identity"));
  assert.ok(!isCoding("GZIP"));
  assert.throws(() => parseContentEncoding("gzip, unknown"), { name: "TypeError", message: "unsupported request content-encoding: unknown" });
  let encoded = Buffer.from("stacked content coding".repeat(100));
  const body = encoded;
  for (const coding of parseContentEncoding("gzip, br")) encoded = await compress(encoded, coding);
  for (const coding of [...parseContentEncoding("gzip, br")].reverse()) encoded = await decompress(encoded, coding);
  assert.deepEqual(encoded, body);
});

test("unsupported encodings never silently become identity and corrupt streams reject", async () => {
  const body = Buffer.from("not compressed");
  const unsupported = "unknown" as Coding;
  assert.throws(() => compressStream(unsupported), RangeError);
  assert.throws(() => decompressStream(unsupported), RangeError);
  await assert.rejects(compress(body, unsupported), RangeError);
  await assert.rejects(decompress(body, unsupported), RangeError);
  for (const coding of supportedCompressionCodings()) await assert.rejects(decompress(body, coding));
});
