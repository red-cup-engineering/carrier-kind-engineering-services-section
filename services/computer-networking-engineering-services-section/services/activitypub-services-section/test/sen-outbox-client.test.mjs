import assert from "node:assert/strict";
import test from "node:test";
import { listAddressedSenOutbox } from "../src/sen-outbox-client.mjs";
import { projectSenActivity } from "../src/sen-activity.mjs";
import { identifyJsonDocument } from "../src/sen-json-document.mjs";
import { ACTIVITYSTREAMS_PUBLIC } from "../src/activitystreams.mjs";

const bytes = identifyJsonDocument({ type: "TestOffer", sequence: 1 }).bytes, actor = "https://board.example/actors/board", card = "https://board.example/.well-known/agent-card.json", recipient = "https://supplier.example/actors/supplier";
const envelope = (to) => projectSenActivity({ type: "Offer", origin: "https://board.example/", identifier: "board", recipient: to, objectBytes: bytes, agentCard: card });
const fetcherFor = (orderedItems) => async () => ({ ok: true, json: async () => ({ type: "OrderedCollection", orderedItems }) });

test("outbox observation admits public and exact-recipient SEN activities only", async () => {
  const publicEnvelope = envelope(ACTIVITYSTREAMS_PUBLIC), privateEnvelope = envelope(recipient);
  const result = await listAddressedSenOutbox({ outboxUrl: `${actor}/outbox`, expectedActor: actor, expectedAgentCard: card, recipient, fetcher: fetcherFor([publicEnvelope, privateEnvelope, envelope("https://other.example/actors/supplier")]) });
  assert.equal(result.length, 2);
  assert(result.every(({ objectBytes }) => Buffer.from(objectBytes).equals(bytes)));
  assert.deepEqual(result.map(({ activityId }) => activityId), [publicEnvelope.id, privateEnvelope.id]);
});

test("outbox observation refuses an addressed activity without a durable identity", async () => {
  const activity = { ...envelope(ACTIVITYSTREAMS_PUBLIC) };
  delete activity.id;
  await assert.rejects(
    listAddressedSenOutbox({ outboxUrl: `${actor}/outbox`, expectedActor: actor, expectedAgentCard: card, recipient, fetcher: fetcherFor([activity]) }),
    /activity identity must be an absolute URL/
  );
});
