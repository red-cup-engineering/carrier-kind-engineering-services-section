import assert from "node:assert/strict";
import test from "node:test";
import { projectSenActivity } from "../src/sen-activity.mjs";
import { admitSenActivityHistory, readSenActivityHistory, supportFromSenActivityHistory } from "../src/sen-history.mjs";
import { admitJsonDocument, identifyJsonDocument } from "../src/sen-json-document.mjs";
import { ACTIVITYSTREAMS_PUBLIC } from "../src/activitystreams.mjs";

const origin = "https://source.example/", actor = `${origin}actors/source`, card = `${origin}.well-known/agent-card.json`;
const objectBytes = identifyJsonDocument({ type: "WorldMove", locus: "village-office", move: "inspect" }).bytes;
const project = (type) => projectSenActivity({ type, origin, identifier: "source", recipient: ACTIVITYSTREAMS_PUBLIC, objectBytes, agentCard: card, eventTime: "2026-07-29T12:00:00.000Z" });
const admit = (type, observedAt) => admitSenActivityHistory(project(type), { expectedActor: actor, expectedRecipient: ACTIVITYSTREAMS_PUBLIC, expectedAgentCard: card, observedAt });

test("typed ActivityPub(CloudEvent(A2A(SEN))) receipts knowledge-join into FOUR", () => {
  const positive = admit("Offer", "2026-07-29T12:00:01.000Z");
  const negative = admit("Reject", "2026-07-29T12:00:02.000Z");
  assert.equal(positive.receipt.standards.cloudEventsSpecversion, "1.0");
  assert.equal(positive.receipt.standards.a2aRole, "ROLE_AGENT");
  assert.equal(positive.receipt.standards.a2aPartMediaType, "application/sen+cbor");
  assert.equal(readSenActivityHistory([positive])[0].support.value, "potential");
  assert.equal(readSenActivityHistory([negative])[0].support.value, "active");
  const held = readSenActivityHistory([positive, negative]);
  assert.equal(held.length, 1);
  assert.deepEqual(held[0].support, { positive: true, negative: true, value: "stable" });
  assert.equal(supportFromSenActivityHistory([], positive.receipt.objectNi).value, "absurd");
});

test("history reads receipts and canonical bytes, never recursively discovered lookalikes", () => {
  const admitted = admit("Create", "2026-07-29T12:00:01.000Z");
  assert.throws(() => readSenActivityHistory([{ receiptNi: admitted.receiptNi, receiptBytes: admitted.receiptBytes, objectBytes: Buffer.from("not SEN") }]), /canonical SEN identity/u);
  assert.throws(() => readSenActivityHistory([{ nested: admitted }]), /must name its receipt/u);
});

test("SEN JSON documents preserve tagged booleans as booleans", () => {
  const value = { flag: true, disabled: false, mark: "true" };
  assert.deepEqual(admitJsonDocument(identifyJsonDocument(value).bytes).value, value);
});
