import assert from "node:assert/strict";
import test from "node:test";

import { extractSenActivity } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { ACTIVITYSTREAMS_PUBLIC } from "@red-cup-engineering/activitypub-services-section/activitystreams";
import {
  CAPABILITY_MARKET, deriveCapabilityOutbox,
} from "../src/capability-outbox.mjs";

const origin = "https://seller.example";
const actor = `${origin}/actors/market`;
const card = `${origin}/.well-known/agent-card.json`;
const BASE = Object.freeze({ network: "eip155:8453", asset: "0x" + "1".repeat(40) });
const OTHER = Object.freeze({ network: "eip155:84532", asset: "0x" + "2".repeat(40) });
const start = "2026-10-16T14:00:00.000Z";
const later = "2026-10-17T14:00:00.000Z";

function offer({ seller = "enterprise:territory-a", listed = true, saleStatus = "available" } = {}) {
  return {
    sku: "ni:///sha-256;" + "A".repeat(43),
    routeKey: "GET /v1/territory/value",
    markets: [CAPABILITY_MARKET],
    declaration: { listed, saleStatus },
    capabilityOffer({ network, asset, agentCard, expiresAt, coordinates }) {
      return {
        kind: "org.emsenn.capability-offer.v3",
        sku: this.sku, seller, operation: "territory-value",
        price: { protocol: "x402", network, asset, amount: "10000" },
        agentCard, expiresAt, coordinates,
      };
    },
  };
}
function projection(offers, rails, now, previous = []) {
  return deriveCapabilityOutbox(offers, { origin, rails, now, previous });
}

test("same unchanged seller/rails retain the exact prior ActivityPub++ offer identity and object", () => {
  const first = projection([offer()], BASE, start);
  const repeated = projection([offer()], BASE, later, first);
  assert.strictEqual(repeated[0], first[0], "retained source-derived offer is not republished");
  assert.strictEqual(repeated[0].activity.id, first[0].activity.id);
  assert.equal(first[0].activity.object.mediaType, "application/sen+cbor");
  const opened = extractSenActivity(first[0].activity, {
    expectedActor: actor, expectedRecipient: ACTIVITYSTREAMS_PUBLIC, expectedAgentCard: card,
  });
  assert.equal(opened.cloudEvent.source, actor);
  assert.equal(opened.cloudEvent.time, start);
});

test("same SKU on different x402 settlement rails produces a NEW SEN offer", () => {
  const first = projection([offer()], BASE, start);
  const rotated = projection([offer()], OTHER, later, first);
  assert.equal(rotated.length, 1);
  assert.equal(rotated[0].sku, first[0].sku);
  assert.notEqual(rotated[0].activity.id, first[0].activity.id);
  assert.notEqual(rotated[0].activity.object.name, first[0].activity.object.name);
  const opened = extractSenActivity(rotated[0].activity, {
    expectedActor: actor, expectedRecipient: ACTIVITYSTREAMS_PUBLIC, expectedAgentCard: card,
  });
  assert.equal(opened.cloudEvent.time, later);
  assert.equal(rotated[0].activity.actor, actor);
});

test("Rendanheyi seller change cannot reuse the previous enterprise offer for the same SKU", () => {
  const first = projection([offer()], BASE, start);
  const successor = projection([offer({ seller: "enterprise:territory-b" })], BASE, later, first);
  assert.notEqual(successor[0].activity.id, first[0].activity.id);
  assert.notEqual(successor[0].activity.object.name, first[0].activity.object.name);
});

test("injected or corrupted previous ActivityPub evidence never becomes a cached current offer", () => {
  const first = projection([offer()], BASE, start);
  for (const alteration of [
    activity => { activity.actor = "https://foreign.example/actors/market"; },
    activity => { activity.object.name = "ni:///sha-256;" + "B".repeat(43); },
    activity => { activity.attachment.href = "https://foreign.example/card"; },
  ]) {
    const corrupted = structuredClone(first[0]);
    alteration(corrupted.activity);
    const fresh = projection([offer()], BASE, later, [corrupted]);
    assert.notStrictEqual(fresh[0], corrupted);
    const opened = extractSenActivity(fresh[0].activity, {
      expectedActor: actor, expectedRecipient: ACTIVITYSTREAMS_PUBLIC, expectedAgentCard: card,
    });
    assert.equal(opened.cloudEvent.time, later);
    assert.equal(fresh[0].activity.actor, actor);
  }
});

test("duplicate old identities, held/unlisted goods and expiry obey the real publisher", () => {
  const original = projection([offer()], BASE, start);
  assert.throws(() => projection([offer()], BASE, later, [original[0], original[0]]), /duplicate SKU/);
  assert.deepEqual(projection([offer({ listed: false }), offer({ saleStatus: "held" })], BASE, later), []);
  const renewed = projection([offer()], BASE, "2027-07-01T14:00:00.000Z", original);
  assert.notEqual(renewed[0].activity.id, original[0].activity.id);
  assert.ok(Date.parse(renewed[0].expiresAt) > Date.parse(original[0].expiresAt));
});
