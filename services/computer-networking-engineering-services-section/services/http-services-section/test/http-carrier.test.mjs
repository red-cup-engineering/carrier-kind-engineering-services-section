import { createHttpServer } from "@red-cup-engineering/http-services-section/node-server";
import assert from "node:assert/strict";
import { request } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { negotiateType, negotiateEncoding, negotiateLanguage } from "../src/negotiation.mjs";
import { compress, decompress } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-coding";
import { parseCookieHeader, serializeCookieHeader } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/cookie";
import { parseRanges, multipartByterangesBody, multipartRangeBoundary } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/byte-range";
import { parseContentType } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-type";

test("HTTP field data determines the bytes received over a real connection", async () => {
  const body = Buffer.from("retained HTTP capability");
  const server = createHttpServer({ handle: async (req, res) => {
    try {
      const type = negotiateType(req.headers.accept, ["text/plain", "application/json"]);
      const coding = negotiateEncoding(req.headers["accept-encoding"], ["gzip", "identity"]);
      if (!type || !coding) { res.writeHead(406).end(); return; }
      assert.deepEqual(parseCookieHeader(req.headers.cookie), { session: "opaque;data" });
      const ranges = parseRanges(req.headers.range, body.length);
      let payload = body;
      let contentType = type;
      if (Array.isArray(ranges)) {
        const boundary = multipartRangeBoundary(body.length, ranges);
        payload = multipartByterangesBody(body, ranges, type, boundary);
        contentType = `multipart/byteranges; boundary=${boundary}`;
      }
      const encoded = await compress(Buffer.from(payload), coding);
      res.writeHead(ranges ? 206 : 200, { "content-type": contentType, "content-encoding": coding });
      res.end(encoded);
    } catch (error) { res.writeHead(500).end(String(error)); }
  } });
  server.listen(0, "::1");
  await once(server, "listening");
  const get = (headers) => new Promise((resolve, reject) => {
    const call = request({ host: "::1", port: server.address().port, headers: {
      accept: "text/*;q=0.5, application/json;q=0", "accept-encoding": "gzip", cookie: serializeCookieHeader({ session: "opaque;data" }), ...headers,
    } }, async response => {
      const chunks = [];
      for await (const chunk of response) chunks.push(chunk);
      resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) });
    });
    call.on("error", reject); call.end();
  });
  try {
    const response = await get({});
    assert.equal(response.status, 200);
    assert.equal(response.headers["content-type"], "text/plain");
    assert.deepEqual(await decompress(response.body, "gzip"), body);
    const partial = await get({ range: "bytes=0-2,9-12" });
    assert.equal(partial.status, 206);
    const boundary = parseContentType(partial.headers["content-type"]).params.boundary;
    assert.deepEqual(new Uint8Array(await decompress(partial.body, "gzip")), multipartByterangesBody(body, [{ start: 0, end: 2 }, { start: 9, end: 12 }], "text/plain", boundary));
    assert.equal((await get({ accept: "text/plain;q=0, application/json;q=0, */*;q=1" })).status, 406);
    assert.equal((await get({ "accept-encoding": "gzip;q=0, identity;q=0, *;q=1" })).status, 406);
    assert.equal(negotiateLanguage("en;q=0, *;q=1", ["en-US", "fr"]), "fr");
  } finally { await new Promise(resolve => server.close(resolve)); }
});
