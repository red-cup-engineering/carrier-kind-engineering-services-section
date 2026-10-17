import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { niWellKnownPath } from "@red-cup-engineering/uri-services-section/ni-uri";
import { createContentAddressedSpace } from "@red-cup-engineering/immutable-content-custody-service/space";
import { niResource } from "../src/ni.mjs";

test("an actual strict NI content space serves private exact bytes across independent HTTP readers", async t => {
  const root = mkdtempSync(join(tmpdir(), "shared-ni-http-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const namespaces = ["science/l-space", "engineering/source"];
  const writer = createContentAddressedSpace({ root, durableRoot: root, namespaces });
  const bytes = Buffer.from("Wang+Chu", "utf8");
  const record = await writer.retain(bytes, { mediaType: "text/plain" });
  assert.equal(record.durable, true);
  await writer.bind({ name: "science/l-space", expected: null, ni: record.ni });
  const reader = createContentAddressedSpace({ root, durableRoot: root, namespaces });
  assert.equal(reader.resolve("science/l-space"), record.ni);

  let headCalls = 0, rangeCalls = 0, checks = 0;
  const shared = Object.freeze({
    kind: reader.kind,
    async head(ni) { headCalls++; return reader.head(ni); },
    async range(ni, interval) { rangeCalls++; return reader.range(ni, interval); },
  });
  const route = niResource(shared, {
    maximumResponseBytes: 4,
    canRead: async (ctx, ni) => { checks++; return ctx.receivedCapability === ni; },
  });
  const makeContext = (granted, init) => ({
    request: new Request("https://ni.example.test" + niWellKnownPath(record.ni), init),
    receivedCapability: granted ? record.ni : undefined,
  });
  const privateRequest = await route.handler(makeContext(false));
  assert.equal(privateRequest.status, 404);
  assert.equal(headCalls, 0, "denied observer never probes private original bytes");
  assert.equal(rangeCalls, 0);
  assert.equal(privateRequest.headers.get("cache-control"), "no-store");

  const tooLarge = await route.handler(makeContext(true));
  assert.equal(tooLarge.status, 413, "large full response requires bounded ranges");
  assert.equal(rangeCalls, 0);
  const head = await route.handler(makeContext(true, { method: "HEAD" }));
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), String(bytes.length));
  assert.equal(head.headers.get("cache-control"), "private, no-store");
  const range = await route.handler(makeContext(true, { headers: { range: "bytes=2-5" } }));
  assert.equal(range.status, 206);
  assert.equal(range.headers.get("content-range"), "bytes 2-5/" + bytes.length);
  assert.equal(await range.text(), "ng+C");
  assert.equal(rangeCalls, 1);
  const unchanged = await route.handler(makeContext(true, {
    headers: { "if-none-match": head.headers.get("etag") },
  }));
  assert.equal(unchanged.status, 304);
  assert.equal(rangeCalls, 1, "ETag reading does not read the full source again");
  assert.ok(checks >= 5, "all selected private requests require explicit per-NI admission");

  const old = await writer.get(record.ni);
  assert.deepEqual(old.bytes, bytes);
  assert.equal(reader.resolve("engineering/source"), null,
    "another name is never guessed from byte identity");
});

test("private space refuses mounting without host admission and public cache policy", () => {
  const space = Object.freeze({
    kind: "semiotic-content.addressed-space.v1",
    head: async () => null,
    range: async () => null,
  });
  assert.throws(() => niResource(space), /host-authorized per-NI reader/);
  assert.throws(() => niResource(space, { canRead: true }), /host function/);
  assert.throws(() => niResource(space, { canRead: () => true, cacheControl: "public, max-age=31536000" }), /publicly cached/);
  assert.throws(() => niResource(space, { canRead: () => true, maximumResponseBytes: 0 }), /positive and finite/);
  assert.throws(() => niResource({ head: () => null }), /head and read\/range/);
});

test("an empty source has an original NI and transfers as an ordinary zero-length response", async t => {
  const root = mkdtempSync(join(tmpdir(), "empty-ni-http-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const space = createContentAddressedSpace({ root, durableRoot: root, namespaces: [] });
  const empty = await space.retain(Buffer.alloc(0));
  const route = niResource(space, { canRead: (ctx, ni) => ctx.accepted === ni });
  const request = new Request("https://ni.example.test" + niWellKnownPath(empty.ni));
  const response = await route.handler({ request, accepted: empty.ni });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-length"), "0");
  assert.equal(await response.arrayBuffer().then(buffer => buffer.byteLength), 0);
});

test("range projections refuse truncated storage instead of sending a shorter 206 representation", async () => {
  const bytes = Uint8Array.from([0x01,0x02,0x03]);
  const ni = "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const store = {
    async head() { return { ni, size: 3, mediaType: "application/octet-stream" }; },
    async range() { return bytes.subarray(0, 1); },
  };
  const route = niResource(store, { maximumResponseBytes: 1024 });
  const req = new Request("https://ni.example.test" + niWellKnownPath(ni), { headers: { range: "bytes=0-2" } });
  await assert.rejects(route.handler({ request: req }), /missing or truncated byte range/);
});
