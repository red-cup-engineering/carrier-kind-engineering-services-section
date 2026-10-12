import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { MemoryKvStore } from "@fedify/fedify";
import { senPart } from "@red-cup-engineering/a2a-services-section/sen-part";
import { createActivityPubProvider, importActorKeyPairs } from "../src/provider.mjs";
import { extractSenActivity, projectSenActivity } from "../src/sen-activity.mjs";
import { generateActorKeyMaterial } from "../src/keys.mjs";
import { identifyJsonDocument } from "../src/sen-json-document.mjs";
import { loadActivityPubOutbox } from "../src/outbox-store.mjs";
import { ACTIVITYSTREAMS_PUBLIC } from "../src/activitystreams.mjs";

async function fixture({ legacyListInbox } = {}) {
  return createActivityPubProvider({
    identifier: "metroplat",
    actorName: "Test Settlement",
    summary: "A sovereign settlement hiring an ActivityPub face.",
    keyPairs: await importActorKeyPairs(await generateActorKeyMaterial()),
    kv: new MemoryKvStore(),
    onActivity: async () => { throw new Error("unsigned activity reached the customer"); },
    authorizeInbox: ({ request }) => request.headers.get("authorization") === "Bearer test-client-token-with-at-least-32-characters",
    ...(legacyListInbox === undefined ? {} : { listInbox: legacyListInbox }),
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

test("a customer may bind the actor to one stable cell identity and sovereign controller", async () => {
  const cell = `ni:///sha-256;${"A".repeat(43)}`;
  const controller = "did:pkh:eip155:5615610:0x1111111111111111111111111111111111111111";
  const provider = createActivityPubProvider({
    identifier: "bound-cell",
    actorName: "Bound Cell",
    summary: "A cell with explicit identity bindings.",
    cell,
    controller,
    keyPairs: await importActorKeyPairs(await generateActorKeyMaterial()),
    kv: new MemoryKvStore(),
    onActivity: async () => {},
    authorizeInbox: async () => false,
    listInbox: async () => ({ items: [], totalItems: 0 }),
    listOutbox: async () => ({ items: [] }),
  });
  const response = await provider.fetch(new Request("https://example.test/actors/bound-cell", {
    headers: { accept: "application/activity+json" },
  }));
  const actor = await response.json();
  assert.deepEqual(actor.attachment.map(({ name, value }) => ({ name, value })), [
    { name: "Capability Cell", value: cell },
    { name: "Controller", value: controller },
  ]);
  const brokenKeyPairs = await importActorKeyPairs(await generateActorKeyMaterial());
  assert.throws(() => createActivityPubProvider({
    identifier: "broken",
    actorName: "Broken",
    summary: "Missing controller.",
    cell,
    keyPairs: brokenKeyPairs,
    onActivity: async () => {},
    authorizeInbox: async () => false,
    listInbox: async () => ({ items: [], totalItems: 0 }),
    listOutbox: async () => ({ items: [] }),
  }), /controller/u);
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

test("a standard ActivityStreams Link carries canonical SEN bytes and names the A2A task face", async () => {
  const bytes = identifyJsonDocument({ type: "TestOffer", sequence: 1 }).bytes;
  const projected = projectSenActivity({ type: "Offer", origin: "https://supplier.example/", identifier: "supplier", recipient: "https://customer.example/actors/customer", objectBytes: bytes, agentCard: "https://supplier.example/.well-known/agent-card.json" });
  const transported = await (await import("@fedify/vocab")).Activity.fromJsonLd(projected).then((activity) => activity.toJsonLd({ format: "compact" }));
  const extracted = extractSenActivity(transported, { expectedActor: "https://supplier.example/actors/supplier", expectedRecipient: "https://customer.example/actors/customer", expectedAgentCard: "https://supplier.example/.well-known/agent-card.json" });
  assert.deepEqual(extracted.objectBytes, bytes);
  assert.match(extracted.objectNi, /^ni:\/\/\/sha-256;/u);
  assert.equal(extracted.a2aMessage.role, "ROLE_AGENT");
  assert.equal(extracted.a2aMessage.parts.length, 1);
  assert.equal(extracted.a2aMessage.parts[0].metadata.ni, extracted.objectNi);
  assert.equal(JSON.stringify(transported).includes("embedded-in-a2a-data"), false);
  assert.equal(JSON.stringify(transported).includes("application/sen+json"), false);
  assert.throws(() => extractSenActivity({ ...transported, object: { ...transported.object, name: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" } }, { expectedActor: transported.actor, expectedRecipient: "https://customer.example/actors/customer" }), /do not match/);
});

test("the cone preserves only supplied real A2A extensions and forgets exactly to the same SEN bytes", () => {
  const bytes = identifyJsonDocument({ type: "CapabilityResult", reference: "urn:authority:one" }).bytes;
  const message = {
    messageId: "urn:a2a:capability-result:one",
    role: "ROLE_AGENT",
    parts: [senPart(bytes, "result.sen.cbor")],
    metadata: { capabilityOperation: { protocol: "captp", target: "urn:authority:one", method: "invoke", answer: "urn:answer:one" } },
    extensions: ["urn:captp:operation:v1"]
  };
  const projected = projectSenActivity({ type: "Create", origin: "https://supplier.example/", identifier: "supplier", recipient: ACTIVITYSTREAMS_PUBLIC, objectBytes: bytes, agentCard: "https://supplier.example/.well-known/agent-card.json", a2aMessage: message });
  const extracted = extractSenActivity(projected, { expectedActor: "https://supplier.example/actors/supplier", expectedRecipient: ACTIVITYSTREAMS_PUBLIC, expectedAgentCard: "https://supplier.example/.well-known/agent-card.json" });
  assert.deepEqual(extracted.objectBytes, bytes);
  assert.deepEqual(extracted.a2aMessage.metadata.capabilityOperation, message.metadata.capabilityOperation);
  assert.deepEqual(extracted.a2aMessage.extensions, message.extensions);
});

test("an addressed Create may carry one exact A2A ROLE_USER work message", () => {
  const bytes = identifyJsonDocument({ type: "CloudRunReconciliationRequest", sequence: 1 }).bytes;
  const message = {
    messageId: "urn:a2a:cloud-run-work:one", role: "ROLE_USER",
    parts: [senPart(bytes, "work.sen.cbor")],
    metadata: { optionalInnerCarriers: ["ucan", "x402", "captp"] }, extensions: ["urn:ucan:invocation:v1"],
  };
  const projected = projectSenActivity({ type: "Create", origin: "https://customer.example/", identifier: "customer", recipient: "https://provider.example/actors/gcloud", objectBytes: bytes, agentCard: "https://customer.example/.well-known/agent-card.json", a2aMessage: message, a2aRole: "ROLE_USER" });
  const extracted = extractSenActivity(projected, { expectedActor: "https://customer.example/actors/customer", expectedRecipient: "https://provider.example/actors/gcloud", expectedAgentCard: "https://customer.example/.well-known/agent-card.json" });
  assert.equal(extracted.a2aMessage.role, "ROLE_USER");
  assert.deepEqual(extracted.objectBytes, bytes);
  assert.deepEqual(extracted.a2aMessage.metadata.optionalInnerCarriers, ["ucan", "x402", "captp"]);
});

test("the generic provider loads a customer-authored durable outbox", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-outbox-"));
  const outboxPath = path.join(root, "outbox.json");
  try {
    const projected = projectSenActivity({
      type: "Offer",
      origin: "https://supplier.example/",
      identifier: "supplier",
      recipient: "https://www.w3.org/ns/activitystreams#Public",
      objectBytes: identifyJsonDocument({ type: "TestOffer" }).bytes,
      agentCard: "https://supplier.example/.well-known/agent-card.json",
    });
    await writeFile(outboxPath, `${JSON.stringify([projected])}\n`);
    const listOutbox = await loadActivityPubOutbox(outboxPath);
    assert.equal((await listOutbox({})).items.length, 1);
    assert.equal((await listOutbox({ cursor: "next" })).items.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("inbox history is absent without an explicitly injected bounded index and never scans custody", async () => {
  let scans = 0;
  const provider = await fixture({ legacyListInbox: async () => { scans += 1; return { items: [], totalItems: 0 }; } });
  const refused = await provider.fetch(new Request("https://example.test/actors/metroplat/inbox", {
    headers: { accept: "application/activity+json" },
  }));
  assert.equal(refused.status, 401);
  assert.match(refused.headers.get("www-authenticate"), /^Bearer /u);

  const admitted = await provider.fetch(new Request("https://example.test/actors/metroplat/inbox", {
    headers: { accept: "application/activity+json", authorization: "Bearer test-client-token-with-at-least-32-characters" },
  }));
  assert.equal(admitted.status, 404);
  assert.equal(scans, 0);
});
