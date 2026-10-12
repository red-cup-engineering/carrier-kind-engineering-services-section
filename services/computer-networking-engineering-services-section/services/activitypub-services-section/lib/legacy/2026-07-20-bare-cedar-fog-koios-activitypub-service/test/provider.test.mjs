import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { MemoryKvStore } from "@fedify/fedify";
import { createActivityPubProvider, deliverActivity, importActorKeyPairs } from "../src/provider.mjs";
import { generateActorKeyMaterial } from "../src/keys.mjs";
import { invokeAcceptedArrivalHandler, serveActivityPubProvider } from "../src/server.mjs";

async function fixture() {
  return createActivityPubProvider({
    identifier: "metroplat",
    actorName: "Test Settlement",
    summary: "A sovereign settlement hiring an ActivityPub face.",
    keyPairs: await importActorKeyPairs(await generateActorKeyMaterial()),
    kv: new MemoryKvStore(),
    onActivity: async () => { throw new Error("unsigned activity reached the customer"); },
    listOutbox: async () => ({ items: [] }),
  });
}

test("Fedify derives WebFinger, actor, outbox, and NodeInfo from one customer contract", async () => {
  const provider = await fixture();
  const webfinger = await provider.fetch(new Request(
    "https://example.test/.well-known/webfinger?resource=acct:metroplat@example.test",
    { headers: { accept: "application/jrd+json" } },
  ));
  assert.equal(webfinger.status, 200);
  assert.equal((await webfinger.json()).links[0].href, "https://example.test/actors/metroplat");

  const actor = await provider.fetch(new Request("https://example.test/actors/metroplat", {
    headers: { accept: "application/activity+json" },
  }));
  assert.equal(actor.status, 200);
  const actorDocument = await actor.json();
  assert.equal(actorDocument.type, "Service");
  assert.equal(actorDocument.inbox, "https://example.test/actors/metroplat/inbox");
  assert.equal(actorDocument.endpoints.sharedInbox, "https://example.test/inbox");
  assert.equal(actorDocument.assertionMethod.length, 2);

  const outbox = await provider.fetch(new Request("https://example.test/actors/metroplat/outbox", {
    headers: { accept: "application/activity+json" },
  }));
  assert.equal(outbox.status, 200);
  assert.equal((await outbox.json()).type, "OrderedCollection");

  const nodeInfo = await provider.fetch(new Request("https://example.test/nodeinfo/2.1", {
    headers: { accept: "application/json" },
  }));
  assert.equal(nodeInfo.status, 200);
  assert.deepEqual((await nodeInfo.json()).protocols, ["activitypub"]);
});

test("an unsigned inbox POST is refused before the customer callback", async () => {
  const provider = await fixture();
  const response = await provider.fetch(new Request("https://example.test/actors/metroplat/inbox", {
    method: "POST",
    headers: { "content-type": "application/activity+json" },
    body: JSON.stringify({
      "@context": "https://www.w3.org/ns/activitystreams",
      id: "https://remote.test/activities/1",
      type: "Create",
      actor: "https://remote.test/actors/alice",
      object: { type: "Note", content: "unsigned" },
      to: "https://example.test/actors/metroplat",
    }),
  }));
  assert.equal(response.status, 401);
});

test("a verified arrival crosses only the customer's exact executable callback", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-arrival-handler-"));
  const handler = path.join(root, "handler.mjs");
  await writeFile(handler, `let body = ""; for await (const chunk of process.stdin) body += chunk; const value = JSON.parse(body); process.stdout.write(JSON.stringify({ type: value.type === "VerifiedActivityPubArrival" && value.protocolProvider === "@emsenn/activitypub-services-section" ? "Accept" : "Reject", object: { retained: true, actor: value.activity.actor } }));\n`);
  const response = invokeAcceptedArrivalHandler(handler, {
    recipient: "koios",
    jsonLd: { "@context": "https://www.w3.org/ns/activitystreams", type: "Create", actor: "https://clock.example/actors/clockkeeper" },
  });
  assert.equal(response.type, "Accept");
  assert.equal(response.object.actor, "https://clock.example/actors/clockkeeper");
  rmSync(root, { recursive: true, force: true });
});

async function unusedPort() {
  const socket = createNetServer();
  await new Promise((resolve, reject) => socket.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = socket.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

test("the Node service uses persistent customer keys and SQLite protocol state", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-provider-"));
  const keyPath = path.join(root, "keys.json");
  const statePath = path.join(root, "fedify.sqlite");
  const port = await unusedPort();
  await writeFile(keyPath, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  const service = await serveActivityPubProvider({
    origin: `http://127.0.0.1:${port}`,
    identifier: "metroplat",
    actorName: "Test Settlement",
    summary: "A sovereign settlement hiring an ActivityPub face.",
    keyPath,
    statePath,
    hostname: "127.0.0.1",
    port,
    onActivity: async () => {},
    listOutbox: async () => ({ items: [] }),
  });
  try {
    let response;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/actors/metroplat`, {
          headers: { accept: "application/activity+json" },
        });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    assert.ok(response);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, `http://127.0.0.1:${port}/actors/metroplat`);
  } finally {
    await service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("one customer-authored activity is signed, delivered, verified, and handed to the receiving customer", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-delivery-"));
  const senderPort = await unusedPort();
  const receiverPort = await unusedPort();
  const senderOrigin = `http://127.0.0.1:${senderPort}`;
  const receiverOrigin = `http://127.0.0.1:${receiverPort}`;
  const senderMaterial = await generateActorKeyMaterial();
  const receiverMaterial = await generateActorKeyMaterial();
  const senderKeys = path.join(root, "sender-keys.json");
  const receiverKeys = path.join(root, "receiver-keys.json");
  await writeFile(senderKeys, JSON.stringify(senderMaterial), { mode: 0o600 });
  await writeFile(receiverKeys, JSON.stringify(receiverMaterial), { mode: 0o600 });
  let arrival;
  const senderService = await serveActivityPubProvider({
    origin: senderOrigin,
    identifier: "clockkeeper",
    actorName: "Clockkeeper",
    summary: "A clocked pulse provider.",
    keyPath: senderKeys,
    statePath: path.join(root, "sender.sqlite"),
    hostname: "127.0.0.1",
    port: senderPort,
    queue: null,
    onActivity: async () => {},
    listOutbox: async () => ({ items: [] }),
  });
  const receiverService = await serveActivityPubProvider({
    origin: receiverOrigin,
    identifier: "koios",
    actorName: "Koios News",
    summary: "A news enterprise receiving a clocked demand.",
    keyPath: receiverKeys,
    statePath: path.join(root, "receiver.sqlite"),
    hostname: "127.0.0.1",
    port: receiverPort,
    allowPrivateAddress: true,
    queue: null,
    onActivity: async (value) => { arrival = value; },
    listOutbox: async () => ({ items: [] }),
  });
  try {
    const deliveryProvider = createActivityPubProvider({
      origin: senderOrigin,
      identifier: "clockkeeper",
      actorName: "Clockkeeper",
      summary: "A clocked pulse provider.",
      keyPairs: await importActorKeyPairs(senderMaterial),
      onActivity: async () => {},
      listOutbox: async () => ({ items: [] }),
    });
    const activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${senderOrigin}/activities/pulse-1`,
      type: "Create",
      actor: `${senderOrigin}/actors/clockkeeper`,
      target: `${receiverOrigin}/actors/koios`,
      object: { type: "Note", content: "pulse" },
    };
    const receipt = await deliverActivity(deliveryProvider, {
      activity,
      recipient: `${receiverOrigin}/actors/koios`,
      inbox: `${receiverOrigin}/actors/koios/inbox`,
    });
    assert.equal(receipt.type, "Accept");
    assert.equal(receipt.object.delivered, true);
    assert.equal(arrival?.jsonLd?.id, activity.id);
    assert.equal(arrival?.jsonLd?.actor, activity.actor);
  } finally {
    await Promise.all([senderService.close(), receiverService.close()]);
    rmSync(root, { recursive: true, force: true });
  }
});
