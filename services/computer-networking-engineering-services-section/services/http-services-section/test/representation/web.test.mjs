import test from "node:test";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { formResponse, strongEntityTag } from "../../src/representation/web.mjs";
const request = (headers = {}, method = "GET") => new Request("https://example.test/value", { headers, method });
const representation = { body: "ordinary artifact delivery ".repeat(100), type: "text/plain", etag: true, lastModified: new Date("2026-01-01T00:00:00Z") };
test("selected encoding has its own validator and conditional request semantics", async () => {
  const identity = await formResponse(request(), representation);
  const encoded = await formResponse(request({ "accept-encoding": "gzip" }), representation);
  assert.notEqual(encoded.headers.get("etag"), identity.headers.get("etag"));
  assert.equal(gunzipSync(new Uint8Array(await encoded.arrayBuffer())).toString(), representation.body);
  assert.match(encoded.headers.get("vary"), /Accept-Encoding/);
  assert.equal((await formResponse(request({ "accept-encoding": "gzip", "if-none-match": encoded.headers.get("etag") }), representation)).status, 304);
  assert.equal((await formResponse(request({ "if-none-match": encoded.headers.get("etag") }), representation)).status, 200);
});
test("precondition precedence follows RFC9110 and unsafe methods never use modified-since", async () => {
  const etag = await strongEntityTag(representation.body);
  assert.equal((await formResponse(request({ "if-match": etag, "if-unmodified-since": "Thu, 01 Jan 1970 00:00:00 GMT" }), representation)).status, 200);
  assert.equal((await formResponse(request({ "if-match": '"other"', "if-none-match": etag }), representation)).status, 412);
  assert.equal((await formResponse(request({ "if-none-match": '"other"', "if-modified-since": "Fri, 01 Jan 2027 00:00:00 GMT" }), representation)).status, 200);
  assert.equal((await formResponse(request({ "if-modified-since": "Fri, 01 Jan 2027 00:00:00 GMT" }, "POST"), representation)).status, 200);
  assert.equal((await formResponse(request({ "if-none-match": "*" }, "POST"), { body: "existing" })).status, 412);
});
test("GET byte ranges and multipart share portable wire codec while HEAD ignores Range", async () => {
  const repr = { body: new Uint8Array([0,255,1,128]), type: "application/octet-stream", etag: '"binary"' };
  const single = await formResponse(request({range:"bytes=0-1"}),repr); assert.equal(single.status,206); assert.deepEqual([...new Uint8Array(await single.arrayBuffer())],[0,255]);
  const multi = await formResponse(request({range:"bytes=0-1,3-3"}),repr); assert.equal(multi.status,206); assert.match(multi.headers.get("content-type"),/multipart\/byteranges/); assert.ok((await multi.arrayBuffer()).byteLength>4);
  const unsatisfied = await formResponse(request({range:"bytes=9-10"}),repr); assert.equal(unsatisfied.status,416); assert.equal(unsatisfied.headers.get("content-range"),"bytes */4");
  assert.equal((await formResponse(request({range:"bytes=0-1","if-range":'"other"'}),repr)).status,200);
  const head = await formResponse(request({range:"bytes=0-1"},"HEAD"),repr); assert.equal(head.status,200); assert.equal(head.body,null); assert.equal(head.headers.get("content-length"),"4");
});
test("bodyless responses and media coding refusals remain lawful", async () => {
  for (const status of [204,205,304]) { const response = await formResponse(request({"accept-encoding":"identity;q=0"}),{status,body:"ignored"});assert.equal(response.status,status);assert.equal(response.body,null); }
  const unavailable = await formResponse(request({"accept-encoding":"identity;q=0, gzip;q=0, deflate;q=0"}),representation);assert.equal(unavailable.status,406);
  const noTransform = await formResponse(request({"accept-encoding":"gzip, identity;q=0"}),{...representation,cacheControl:"public, no-transform"});assert.equal(noTransform.status,406);
});
test("streamed representations start without whole-body buffering and cancellation reaches producer", async () => {
  let cancelled = false; let streamController;
  const source = new ReadableStream({start(controller){streamController=controller;controller.enqueue(new TextEncoder().encode("first"));},cancel(){cancelled=true;}});
  const response = await formResponse(request(),{body:source,type:"text/plain",etag:'"stream-version"'});
  assert.equal(response.headers.get("etag"),'"stream-version"');
  const reader=response.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),"first");
  await reader.cancel();assert.equal(cancelled,true);
});
