import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { compress } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/content-coding";
import { negotiateEncoding as negotiate } from "../src/negotiation.mjs";
import { negotiateEncoding } from "../src/negotiation.mjs";
import { readBody } from "../src/body/read-http-request-body.mjs";

test("negotiation is shared and stacked request content codings decode", async () => {
  assert.equal(negotiateEncoding, negotiate);
  assert.equal(negotiateEncoding("", ["gzip"]), null);
  const plain = Buffer.from('{"shared":"http"}');
  const encoded = await compress(await compress(plain, "gzip"), "br");
  const request = (body, encoding) => Object.assign(Readable.from([body]), { headers: { "content-encoding": encoding } });
  const decoded = await readBody(request(encoded, " GZIP, BR"));
  assert.deepEqual(Buffer.from(decoded), plain);
  await assert.rejects(readBody(request(encoded, "unknown")), /unsupported request content-encoding: unknown/);
  await assert.rejects(readBody(request(encoded, "gzip, br"), { maxBytes: 4, maxEncodedBytes: 1024 }), /decoded request body exceeded/);
});
