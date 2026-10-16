import test from "node:test";
import assert from "node:assert/strict";
import {
  capabilityActorResources,
  CAPABILITY_OUTBOX_PAGE_SIZE,
} from "../../src/market/capability-actor-resources.mjs";
import { CAPABILITY_MARKET, deriveCapabilityOutbox } from "../../src/capability-outbox.mjs";
import { listAddressedSenOutbox } from "@red-cup-engineering/activitypub-services-section/sen-outbox-client";

const origin = "https://market.example";
const actor = origin + "/actors/market";
const makeActivity = i => ({
  type: "Offer", actor, id: origin + "/activities/offer-" + i, to: "as:Public",
  object: { type: "Document", mediaType: "application/sen+cbor",
    name: "ni:///sha-256;" + "x".repeat(43), label: "offer-" + i, description: "Q".repeat(16000) },
});
const resources = activities => capabilityActorResources(activities, {
  name: "Site market", rails: { network: "eip155:8453", asset: "USDC" },
});
const get = (r, url) => r.find(x => x.match === new URL(url).pathname).handler({ url: new URL(url) });

test("a small exact outbox preserves inline Collection and its original actor/WebFinger identity", async () => {
  const a = makeActivity(1), r = resources([a]);
  const out = await (await get(r, actor + "/outbox")).json();
  assert.deepEqual(out.orderedItems, [a]);
  assert.equal(out.totalItems, 1);
  assert.equal(out.first, undefined);
  assert.equal((await get(r, actor + "/outbox?page=1")).status, 404);
  const card = await (await get(r, actor)).json();
  assert.equal(card.outbox, actor + "/outbox");
  assert.equal(card.attachment.href, origin + "/.well-known/agent-card.json");
  assert.equal((await get(r, origin + "/.well-known/webfinger?resource=acct%3Amarket%40market.example")).status, 200);
});

test("131 exact offers are traversable in finite, bounded ActivityPub pages without omissions or duplicates", async () => {
  const input = Array.from({ length: 131 }, (_, i) => makeActivity(i));
  const r = resources(input), collection = await (await get(r, actor + "/outbox")).json();
  assert.equal(collection.totalItems, 131);
  assert.equal(collection.orderedItems, undefined);
  assert.ok(collection.first.endsWith("?page=1"));
  let next = collection.first, all = [], count = 0;
  while (next) {
    const response = await get(r, next), body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.type, "OrderedCollectionPage");
    assert.equal(body.partOf, actor + "/outbox");
    assert.equal(body.id, next);
    assert.ok(body.orderedItems.length <= CAPABILITY_OUTBOX_PAGE_SIZE);
    assert.ok(new TextEncoder().encode(JSON.stringify(body)).byteLength < 210000);
    all.push(...body.orderedItems);
    next = body.next;
    count++;
    assert.ok(count <= 131);
  }
  assert.ok(count > 10);
  assert.deepEqual(all, input);
  assert.equal(new Set(all.map(x => x.id)).size, 131);
  assert.equal((await get(r, actor + "/outbox?page=999")).status, 404);
  for (const query of ["page=0", "page=-1", "page=1&page=2", "x=1", "page=1&x=1", "page=01"]) {
    assert.equal((await get(r, actor + "/outbox?" + query)).status, 400, query);
  }
});

test("private, foreign or duplicate SEN activities cannot enter the public seller actor", () => {
  const one = makeActivity(1);
  for (const other of [
    { ...makeActivity(2), actor: "https://foreign.example/actors/market" },
    { ...makeActivity(2), id: "https://foreign.example/activities/evil" },
    { ...makeActivity(2), id: one.id },
    { ...makeActivity(2), to: "https://buyer.example/actors/private" },
  ]) assert.throws(() => resources([one, other]), /nonpublic, foreign, duplicate or conflicting/);
  assert.deepEqual(resources([]), []);
});

test("the existing native SEN peer client receives all source-owned x402 Offers through paginated outbox", async () => {
  const offers = Array.from({ length: 40 }, (_, index) => ({
    sku: "ni:///sha-256;" + String(index).padStart(43, "A"),
    routeKey: "GET /v1/offers/" + index,
    markets: [CAPABILITY_MARKET],
    declaration: { listed: true, saleStatus: "available" },
    capabilityOffer({ network, asset, agentCard, expiresAt, coordinates }) {
      return {
        kind: "org.emsenn.capability-offer.v3", sku: this.sku,
        seller: "enterprise:territory-a", operation: "offer-" + index,
        price: { protocol: "x402", network, asset, amount: "10000" },
        agentCard, expiresAt, coordinates,
      };
    },
  }));
  const outbox = deriveCapabilityOutbox(offers, {
    origin, rails: { network: "eip155:8453", asset: "0x" + "1".repeat(40) },
    now: "2026-10-16T18:00:00.000Z",
  });
  const r = resources(outbox.map(x => x.activity));
  const fetcher = async url => get(r, url);
  const observed = await listAddressedSenOutbox({
    outboxUrl: actor + "/outbox",
    expectedActor: actor,
    expectedAgentCard: origin + "/.well-known/agent-card.json",
    recipient: "https://buyer.example/actors/consumer",
    fetcher,
    authorizeUrl: async () => {},
  });
  assert.equal(observed.length, offers.length);
  assert.deepEqual(observed.map(x => x.activityId), outbox.map(x => x.activity.id));
  assert.equal(new Set(observed.map(x => x.activityId)).size, offers.length);
});
