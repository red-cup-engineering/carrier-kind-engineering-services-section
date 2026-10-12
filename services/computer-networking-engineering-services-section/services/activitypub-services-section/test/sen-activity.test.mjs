import assert from "node:assert/strict";
import test from "node:test";

import { semanticBytes } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { encodeRelationalValue } from "@red-cup-engineering/signgraph/relational-value";

import { SEN_MEDIA_TYPE, extractSenActivity, materializeSenActivity, projectSenActivity, senActivityObjectBytes } from "../src/sen-activity.mjs";
import { ACTIVITYSTREAMS_PUBLIC } from "../src/activitystreams.mjs";

const OBJECT_KIND = "org.emsenn.capability-offer.v3";
const ORIGIN = "https://bare-cedar-fog.561.group";
const IDENTIFIER = "paid-value-chain-gateway";
const AGENT_CARD = "https://bare-cedar-fog.561.group/actors/paid-value-chain-gateway";

const OFFER = Object.freeze({
  kind: OBJECT_KIND,
  provider: "urn:ame:paid-value-chain-gateway",
  operation: "derive-territory-readout",
  price: { protocol: "x402", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", amount: "80000", network: "eip155:8453" },
  expiresAt: "2027-09-08T00:00:00.000Z",
});

test("senActivityObjectBytes produces bytes this module's own projection admits", () => {
  const bytes = senActivityObjectBytes({ objectKind: OBJECT_KIND, value: OFFER });
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 0);
  const activity = projectSenActivity({
    type: "Offer",
    origin: ORIGIN,
    identifier: IDENTIFIER,
    recipient: ACTIVITYSTREAMS_PUBLIC,
    objectBytes: bytes,
    agentCard: AGENT_CARD,
  });
  assert.equal(activity.type, "Offer");
  assert.equal(activity.actor, `${ORIGIN}/actors/${IDENTIFIER}`);
  assert.equal(activity.to, ACTIVITYSTREAMS_PUBLIC);
  assert.equal(activity.object.mediaType, SEN_MEDIA_TYPE);
  assert.match(activity.object.name, /^ni:\/\/\/sha-256;/u);
});

test("the produced bytes round-trip back out of the projection unchanged", () => {
  const bytes = senActivityObjectBytes({ objectKind: OBJECT_KIND, value: OFFER });
  const activity = projectSenActivity({
    type: "Offer",
    origin: ORIGIN,
    identifier: IDENTIFIER,
    recipient: ACTIVITYSTREAMS_PUBLIC,
    objectBytes: bytes,
    agentCard: AGENT_CARD,
  });
  const extracted = extractSenActivity(activity, {
    expectedActor: `${ORIGIN}/actors/${IDENTIFIER}`,
    expectedRecipient: ACTIVITYSTREAMS_PUBLIC,
    expectedAgentCard: AGENT_CARD,
  });
  assert.deepEqual(Buffer.from(extracted.objectBytes), Buffer.from(bytes));
  assert.equal(extracted.type, "Offer");
});

test("the same value produces the same bytes, so a republished offer keeps its identity", () => {
  const first = senActivityObjectBytes({ objectKind: OBJECT_KIND, value: OFFER });
  const second = senActivityObjectBytes({ objectKind: OBJECT_KIND, value: structuredClone(OFFER) });
  assert.deepEqual(Buffer.from(first), Buffer.from(second));
});

test("a different object kind produces different bytes", () => {
  const asOffer = senActivityObjectBytes({ objectKind: OBJECT_KIND, value: OFFER });
  const asOther = senActivityObjectBytes({ objectKind: "org.emsenn.something-else.v1", value: OFFER });
  assert.notDeepEqual(Buffer.from(asOffer), Buffer.from(asOther));
});

test("senActivityObjectBytes refuses a missing or empty object kind", () => {
  assert.throws(() => senActivityObjectBytes({ value: OFFER }), /nonempty semantic object kind/u);
  assert.throws(() => senActivityObjectBytes({ objectKind: "", value: OFFER }), /nonempty semantic object kind/u);
  assert.throws(() => senActivityObjectBytes(), /nonempty semantic object kind/u);
});

test("the SEN CBOR ascribe form is refused by this boundary, for every value", () => {
  for (const value of [{ a: 1, b: "x" }, OFFER, { nested: { deep: [1, 2, 3] } }]) {
    const encoded = encodeRelationalValue(value);
    const ascribed = semanticBytes(["ascribe", encoded.type, encoded.term]);
    assert.throws(
      () => projectSenActivity({
        type: "Offer",
        origin: ORIGIN,
        identifier: IDENTIFIER,
        recipient: ACTIVITYSTREAMS_PUBLIC,
        objectBytes: ascribed,
        agentCard: AGENT_CARD,
      }),
      /requires canonical SEN bytes/u,
      "the ascribe form must not be mistaken for an admitted encoding",
    );
  }
});

test("materializeSenActivity accepts the produced bytes too", async () => {
  const activity = await materializeSenActivity({
    type: "Offer",
    origin: ORIGIN,
    identifier: IDENTIFIER,
    recipient: ACTIVITYSTREAMS_PUBLIC,
    objectBytes: senActivityObjectBytes({ objectKind: OBJECT_KIND, value: OFFER }),
    agentCard: AGENT_CARD,
  });
  assert.equal(activity.constructor.name, "Offer");
});
