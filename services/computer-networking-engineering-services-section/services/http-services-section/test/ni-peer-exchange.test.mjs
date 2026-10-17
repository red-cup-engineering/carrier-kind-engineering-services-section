import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { createContentAddressedSpace } from "@red-cup-engineering/immutable-content-custody-service/space";
import { niResource } from "../src/ni.mjs";
import { createNiPeerReceiver } from "../src/ni-peer.mjs";

function spaces(t) {
  const rootA = mkdtempSync(join(tmpdir(), "ni-host-a-"));
  const rootB = mkdtempSync(join(tmpdir(), "ni-host-b-"));
  t.after(() => { rmSync(rootA, { recursive: true, force: true }); rmSync(rootB, { recursive: true, force: true }); });
  return {
    producer: createContentAddressedSpace({
      root: rootA, durableRoot: rootA, namespaces: ["engineering/source"],
    }),
    consumer: createContentAddressedSpace({
      root: rootB, durableRoot: rootB, namespaces: ["science/l-space"],
    }),
  };
}

test("two physical original content spaces exchange an NI via the existing authorized HTTP resource", async t => {
  const { producer, consumer } = spaces(t);
  const code = Buffer.from("export const chuAndSheaf = true;\n");
  const source = await producer.retain(code, { mediaType: "text/javascript" });
  await producer.bind({ name: "engineering/source", expected: null, ni: source.ni });
  let network = 0, senderChecks = 0, receiverChecks = 0;
  const route = niResource(producer, {
    maximumResponseBytes: 1024,
    canRead: (_ctx, ni) => { senderChecks++; return ni === source.ni; },
  });
  const fetchImpl = async (url, options) => {
    network++;
    assert.equal(new URL(url).origin, "https://original-peer.example");
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "manual", "use original redirect-refusing HTTP code");
    const request = new Request(url, options);
    return route.handler({ request, receivingActor: "authorized-fixture-peer" });
  };
  const receive = createNiPeerReceiver({
    peerOrigin: "https://original-peer.example",
    contentSpace: consumer, fetchImpl,
    canReceive: (_ctx, ni) => { receiverChecks++; return ni === source.ni; },
  });
  assert.equal(await consumer.get(source.ni), null);
  const result = await receive.receive(source.ni, {});
  assert.equal(result.kind, "ni.peer-receiving.v1");
  assert.equal(result.ni, source.ni);
  assert.equal(result.byteLength, code.byteLength);
  assert.equal(result.durable, true);
  assert.deepEqual((await consumer.get(source.ni)).bytes, code);
  assert.equal(consumer.resolve("science/l-space"), null,
    "receiving a byte object must not invent an interpreted namespace binding");
  assert.deepEqual([network,senderChecks,receiverChecks], [1,1,1]);
  const replay = await receive.receive(source.ni, {});
  assert.equal(replay.durable, true, "exact duplicate publication receives native strict barriers");
  assert.deepEqual((await consumer.get(source.ni)).bytes, code);
  assert.equal(producer.resolve("engineering/source"), source.ni,
    "transport never changes the sender's Plan9-style named root");
});

test("absent receiving authority makes no provider request or local changes", async t => {
  const { consumer } = spaces(t);
  let fetches = 0;
  const receiver = createNiPeerReceiver({
    peerOrigin: "https://peer.example", contentSpace: consumer,
    canReceive: () => false,
    fetchImpl: async () => { fetches++; return new Response(null,{status:200}); },
  });
  const ni = makeNiUri(Uint8Array.of(1,2));
  await assert.rejects(() => receiver.receive(ni, {}), /not admitted to receive/);
  assert.equal(fetches, 0);
  assert.equal(await consumer.get(ni), null);
  await assert.rejects(() => receiver.receive("sha256:fake", {}), /canonical raw-byte NI/);
  assert.equal(fetches, 0);
});

test("fixed peer origin, bounded byte budget, and original NI identity refuse foreign effects", async t => {
  const { consumer } = spaces(t);
  const ni = makeNiUri(Uint8Array.of(1,2,3,4));
  const source = (fetchImpl, max = 8) => createNiPeerReceiver({
    peerOrigin:"https://peer.example",contentSpace:consumer,maximumBytes:max,
    canReceive:()=>true,fetchImpl,
  });
  for (const bad of [
    "http://peer.example", "https://peer.example/not-root",
    "https://user:secret@peer.example/", "https://peer.example/?ni=forged",
  ]) assert.throws(() => createNiPeerReceiver({
    peerOrigin:bad,contentSpace:consumer,canReceive:()=>true,fetchImpl:async()=>null,
  }), /origin must be exact/);
  const corrupted = source(async () => new Response(Uint8Array.of(0xff,0xfe), {status:200}));
  await assert.rejects(() => corrupted.receive(ni,{}), /do not have the requested original NI/);
  assert.equal(await consumer.get(ni),null);
  const redirect = source(async () => new Response(null, {status:302,headers:{location:"https://other.invalid/"}}));
  await assert.rejects(() => redirect.receive(ni,{}), /redirect refused/);
  const fakeCompression = source(async () => new Response(Uint8Array.of(1,2,3,4), {
    status:200,headers:{"content-encoding":"gzip"},
  }));
  await assert.rejects(() => fakeCompression.receive(ni,{}), /encoded\/transformed/);
  const over = source(async () => new Response(Uint8Array.of(1,2,3,4), {status:200}),2);
  await assert.rejects(() => over.receive(ni,{}), /exceeds the installed byte budget/);
  const incomplete = source(async () => new Response(Uint8Array.of(1,2,3,4), {
    status:200,headers:{"content-length":"8"},
  }));
  await assert.rejects(() => incomplete.receive(ni,{}), /differs from HTTP declaration/);
  assert.equal(await consumer.get(ni),null);
  assert.throws(() => createNiPeerReceiver({peerOrigin:"https://peer.example",
    contentSpace:consumer,canReceive:()=>true,fetchImpl:async()=>null,maximumBytes:0}),
    /positive safe integer/);
});

test("empty raw byte objects travel with their own NI and no payload substitution", async t => {
  const { producer, consumer } = spaces(t);
  const source = await producer.retain(new Uint8Array(0));
  const ni = source.ni;
  const route = niResource(producer,{canRead:(_ctx,name)=>name===ni});
  const receiver = createNiPeerReceiver({
    peerOrigin:"https://empty-peer.example",
    contentSpace:consumer,
    canReceive:(_ctx,name)=>name===ni,
    fetchImpl:(url,opts)=>route.handler({request:new Request(url,opts)}),
  });
  const received = await receiver.receive(ni,{});
  assert.equal(received.byteLength,0);
  assert.equal((await consumer.get(ni)).bytes.byteLength,0);
});


test("one NI can be received across code and science without overwriting an existing local media presentation", async t => {
  const { producer, consumer } = spaces(t);
  const bytes = Buffer.from("same exact bytes, different attributed uses");
  const source = await producer.retain(bytes, { mediaType: "text/javascript" });
  const existing = await consumer.retain(bytes, { mediaType: "text/plain" });
  assert.equal(existing.ni, source.ni);
  assert.equal((await consumer.get(source.ni)).mediaType, "text/plain");

  let transfers = 0;
  const route = niResource(producer, { canRead: (_ctx, ni) => ni === source.ni });
  const receiver = createNiPeerReceiver({
    peerOrigin: "https://code-peer.example",
    contentSpace: consumer,
    canReceive: (_ctx, ni) => ni === source.ni,
    fetchImpl: (url, opts) => {
      transfers++;
      return route.handler({ request: new Request(url, opts) });
    },
  });
  const received = await receiver.receive(source.ni, {});
  assert.equal(received.durable, true,
    "the original strict writer repeats its actual file-and-ancestry barriers");
  assert.equal(received.ni, source.ni);
  assert.equal(transfers, 1);
  const retained = await consumer.get(source.ni);
  assert.deepEqual(retained.bytes, bytes);
  assert.equal(retained.mediaType, "text/plain",
    "remote code interpretation must not replace the local first-writer's media");
  assert.equal((await producer.get(source.ni)).mediaType, "text/javascript");
});

test("the peer does not use a malformed local presentation as authority to publish bytes", async () => {
  const bytes = Uint8Array.of(0x01);
  const ni = makeNiUri(bytes);
  let published = 0;
  const receiver = createNiPeerReceiver({
    peerOrigin: "https://peer.example",
    contentSpace: {
      kind: "semiotic-content.addressed-space.v1",
      async head() { return { ni, size: 1, mediaType: "text/plain\\r\\nforged" }; },
      async get() { return null; },
      async retain() { published++; throw Error("unadmitted write"); },
    },
    canReceive: () => true,
    fetchImpl: async () => new Response(bytes, { status: 200 }),
  });
  await assert.rejects(() => receiver.receive(ni, {}),
    /retained original presentation is inconsistent/);
  assert.equal(published, 0);
});
