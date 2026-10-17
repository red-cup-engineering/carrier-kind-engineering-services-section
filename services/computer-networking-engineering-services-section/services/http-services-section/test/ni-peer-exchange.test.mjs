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
      async head() { return { ni, size: 1, mediaType: "text/plain\r\nforged" }; },
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


// These are two physically distinct original immutable stores. In-process
// fetch is only the transport, and delegates to the real host-authorized
// RFC 6920 route rather than fabricating object bytes or duplicate hashes.
async function collectionFixture(t) {
  const { producer, consumer } = spaces(t);
  const wang = await producer.retain(Buffer.from("wang: north=blue;east=red\n"),
    { mediaType: "text/plain" });
  const bead = await producer.retain(Buffer.from([0, 1, 1, 0]),
    { mediaType: "application/octet-stream" });
  const inner = await producer.retainTree([
    { name: "beads", ni: bead.ni }, { name: "wang", ni: wang.ni },
  ]);
  const root = await producer.retainTree([
    { name: "echo", ni: bead.ni }, { name: "materials", ni: inner.ni },
  ]);
  const addresses = new Set([root.ni, inner.ni, wang.ni, bead.ni]);
  return { producer, consumer, wang, bead, inner, root, addresses };
}

test("a complete nested Wang-and-bead Merkle space crosses TWO hosts and becomes a source-owned named root", async t => {
  const source = await collectionFixture(t);
  const { producer, consumer, wang, bead, inner, root, addresses } = source;
  const sourceCalls = [], receivingCalls = [], bindingCalls = [];
  const route = niResource(producer, {
    maximumResponseBytes: 128 * 1024,
    canRead: (_ctx, ni) => {
      sourceCalls.push(ni);
      return addresses.has(ni);
    },
  });
  const receiver = createNiPeerReceiver({
    peerOrigin: "https://material-peer.example", contentSpace: consumer,
    canReceive: (_ctx, ni) => { receivingCalls.push(ni); return addresses.has(ni); },
    canBind: (_ctx, { name, expected, ni }) => {
      bindingCalls.push({ name, expected, ni });
      return name === "science/l-space" && expected === null && ni === root.ni;
    },
    fetchImpl: (url, options) => {
      assert.equal(options.redirect, "manual");
      assert.equal(new URL(url).origin, "https://material-peer.example");
      return route.handler({ request: new Request(url, options) });
    },
  });
  const result = await receiver.receiveTree(root.ni, { actor: "authorized-reader" },
    { name: "science/l-space", expected: null });
  assert.equal(result.kind, "ni.peer-tree-receiving.v1");
  assert.equal(result.rootNi, root.ni);
  assert.equal(result.objectCount, 4, "same bead bytes are retained only once");
  assert.equal(result.treeCount, 2);
  assert.equal(result.durable, true);
  assert.deepEqual(result.publication, {
    name: "science/l-space", before: null, published: true,
  });
  assert.equal(consumer.resolve("science/l-space"), root.ni);
  assert.deepEqual((await consumer.atPath("science/l-space",
    ["materials", "wang"])).bytes, Buffer.from("wang: north=blue;east=red\n"));
  assert.deepEqual((await consumer.atPath("science/l-space",
    ["materials", "beads"])).bytes, Buffer.from([0, 1, 1, 0]));
  assert.deepEqual((await consumer.atPath("science/l-space",
    ["echo"])).bytes, Buffer.from([0, 1, 1, 0]));
  assert.equal((await consumer.readTree(root.ni)).entries.length, 2);
  assert.equal((await consumer.readTree(inner.ni)).entries.length, 2);
  assert.equal((await consumer.get(wang.ni)).mediaType, "application/octet-stream",
    "remote text MIME does not become local first-writer authority");
  assert.equal((await consumer.get(bead.ni)).mediaType, "application/octet-stream");
  assert.equal(sourceCalls.length, 4);
  assert.equal(receivingCalls.length, 4);
  assert.deepEqual(new Set(sourceCalls), addresses);
  assert.deepEqual(new Set(receivingCalls), addresses);
  assert.equal(bindingCalls.length, 2, "the original root's mutable step remains independently authorized");
  assert.equal(producer.resolve("engineering/source"), null,
    "receiving a whole tree never invents the sender's named root");
  const repeat = await receiver.receiveTree(root.ni, { actor: "authorized-reader" },
    { name: "science/l-space", expected: root.ni })
    .catch(error => error);
  assert.ok(repeat instanceof Error,
    "a different binding claim cannot reuse the original named authorization");
});

test("immutable Merkle descendants transfer without authorizing any mutable name by default", async t => {
  const { producer, consumer, root, addresses, wang } = await collectionFixture(t);
  const route = niResource(producer, { canRead: (_ctx, ni) => addresses.has(ni) });
  const receiver = createNiPeerReceiver({
    peerOrigin: "https://original-peer.example", contentSpace: consumer,
    canReceive: (_ctx, ni) => addresses.has(ni),
    fetchImpl: (url, options) => route.handler({ request: new Request(url, options) }),
  });
  const result = await receiver.receiveTree(root.ni, {});
  assert.equal(result.objectCount, 4);
  assert.equal(Object.hasOwn(result, "publication"), false);
  assert.equal(consumer.resolve("science/l-space"), null);
  assert.deepEqual((await consumer.get(wang.ni)).bytes, Buffer.from("wang: north=blue;east=red\n"));
  assert.deepEqual((await consumer.readTree(root.ni)).entries.map(x => x.name),
    ["echo", "materials"]);
});

test("denied Merkle child never reaches remote GET, receives no root, and never advances a name", async t => {
  const { producer, consumer, root, wang, addresses } = await collectionFixture(t);
  let reads = 0, denied = 0, bindCalls = 0;
  const route = niResource(producer, { canRead: (_ctx, ni) => addresses.has(ni) });
  const receiver = createNiPeerReceiver({
    peerOrigin: "https://original-peer.example", contentSpace: consumer,
    canReceive: (_ctx, ni) => {
      if (ni === wang.ni) { denied++; return false; }
      return addresses.has(ni);
    },
    canBind: () => { bindCalls++; return true; },
    fetchImpl: (url, options) => {
      assert.equal(new URL(url).pathname.includes(wang.ni.split(";")[1]), false);
      reads++;
      return route.handler({ request: new Request(url, options) });
    },
  });
  await assert.rejects(receiver.receiveTree(root.ni, {},
    { name: "science/l-space", expected: null }), /not admitted to receive/);
  assert.equal(denied, 1);
  assert.ok(reads > 0, "admitted siblings can have lawful immutable custody");
  assert.equal(consumer.resolve("science/l-space"), null);
  assert.equal(await consumer.get(root.ni), null);
  assert.equal(await consumer.get(wang.ni), null);
  assert.equal(bindCalls, 1, "no publication occurs after a descendant is denied");

  let forbiddenReads = 0;
  const deniedBind = createNiPeerReceiver({
    peerOrigin: "https://original-peer.example", contentSpace: consumer,
    canReceive: () => true, canBind: () => false,
    fetchImpl: async () => { forbiddenReads++; throw Error("no transport without binding authority"); },
  });
  await assert.rejects(deniedBind.receiveTree(root.ni, {},
    { name: "science/l-space", expected: null }), /not admitted to publish/);
  assert.equal(forbiddenReads, 0);
});

test("untrusted type/canonical data and bounded transfer refuse before any false root settlement", async t => {
  const { producer, consumer, root, addresses } = await collectionFixture(t);
  const malformed = await producer.retain(Buffer.from("{ \"unclosed\" :\n"),
    { mediaType: "application/vnd.561.content-tree+json" });
  const route = niResource(producer, { canRead: () => true });
  const receiver = options => createNiPeerReceiver({
    peerOrigin: "https://bounded-peer.example", contentSpace: consumer,
    canReceive: () => true,
    fetchImpl: (url, input) => route.handler({ request: new Request(url, input) }),
    ...options,
  });
  await assert.rejects(receiver().receiveTree(malformed.ni, {}), /content tree/);
  assert.equal(await consumer.get(malformed.ni), null);
  assert.equal(consumer.resolve("science/l-space"), null);
  await assert.rejects(receiver({ maximumTreeObjects: 2 }).receiveTree(root.ni, {}),
    /object limit/);
  await assert.rejects(receiver({ maximumTreeDepth: 1 }).receiveTree(root.ni, {}),
    /depth limit/);
  await assert.rejects(receiver({ maximumTransferBytes: 100 }).receiveTree(root.ni, {}),
    /byte budget/);
  assert.equal(await consumer.get(root.ni), null,
    "all failed transfers must leave root publication absent");
  assert.equal(consumer.resolve("science/l-space"), null);
  assert.ok(addresses.has(root.ni));
});

test("a stale local named frontier refuses after transferable immutable bytes, without overwriting the winner", async t => {
  const { producer, consumer, root, addresses } = await collectionFixture(t);
  const old = await consumer.retainTree([]);
  await consumer.bind({ name: "science/l-space", expected: null, ni: old.ni });
  const route = niResource(producer, { canRead: (_ctx, ni) => addresses.has(ni) });
  const receiver = createNiPeerReceiver({
    peerOrigin: "https://original-peer.example", contentSpace: consumer,
    canReceive: (_ctx, ni) => addresses.has(ni),
    canBind: (_ctx, { name, ni }) => name === "science/l-space" && ni === root.ni,
    fetchImpl: (url, options) => route.handler({ request: new Request(url, options) }),
  });
  await assert.rejects(receiver.receiveTree(root.ni, {},
    { name: "science/l-space", expected: null }), /changed before publication/);
  assert.equal(consumer.resolve("science/l-space"), old.ni,
    "no false receive receipt and no mutable overwrite of the original name");
  assert.equal((await consumer.readTree(root.ni)).entries.length, 2,
    "immovable authenticated bytes may still be retained independently");
});


test("Merkle name publication uses a single data-only snapshot across asynchronous authority and network", async t => {
  const { producer, consumer, root, addresses } = await collectionFixture(t);
  const route = niResource(producer, { canRead: (_ctx, ni) => addresses.has(ni) });
  const mutable = { name: "science/l-space", expected: null };
  let grants = 0, fetches = 0, accessorCalls = 0;
  const receiver = createNiPeerReceiver({
    peerOrigin: "https://material-peer.example", contentSpace: consumer,
    canReceive: (_ctx, ni) => addresses.has(ni),
    canBind: (_ctx, proposal) => {
      grants++;
      assert.equal(Object.isFrozen(proposal), true,
        "every host grant sees the same immutable candidate proposal");
      assert.equal(proposal.name, "science/l-space");
      assert.equal(proposal.expected, null);
      if (grants === 1) mutable.name = "operations/forged";
      return proposal.ni === root.ni;
    },
    fetchImpl: (url, options) => {
      fetches++;
      return route.handler({ request: new Request(url, options) });
    },
  });

  const getter = { expected: null };
  Object.defineProperty(getter, "name", {
    enumerable: true,
    get() { accessorCalls++; return "science/l-space"; },
  });
  await assert.rejects(receiver.receiveTree(root.ni, {}, getter), /plain own data fields/);
  assert.equal(accessorCalls, 0, "calling code never evaluates attacker-controlled name accessors");
  assert.equal(grants, 0);
  assert.equal(fetches, 0, "unadmitted proposal never starts a transfer");

  const receipt = await receiver.receiveTree(root.ni, {}, mutable);
  assert.equal(receipt.durable, true);
  assert.deepEqual(receipt.publication, {
    name: "science/l-space", before: null, published: true,
  });
  assert.equal(grants, 2, "both grant decisions received the original immutable proposal");
  assert.equal(consumer.resolve("science/l-space"), root.ni);
  assert.equal(mutable.name, "operations/forged",
    "the caller can mutate its own object but not the committed root identity");
});
