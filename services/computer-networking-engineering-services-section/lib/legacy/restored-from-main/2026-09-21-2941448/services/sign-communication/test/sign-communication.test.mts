import { chargeValue, joinKnowledgeValue } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransmit, communicate, createCommunicationChannel, createCommunicatingFace,
  createMessage, createUtterance, cloudEventFromUtterance, utteranceFromCloudEvent,
  admitCommunicationAction, conflateUtteranceClaims, legacyCommunicationContractMap,
  migrateIllocutionaryForce, performIllocution, translateMessage,
  witnessClaim, type SignChainPort, type SignCraftPort,
} from "../src/index.mts";

test("generic messages, faces, channels, translations, and illocutions are pure typed operations", () => {
  const message = createMessage({ id: "m1", topic: "weather", content: "fair", author: "a" });
  const face = createCommunicatingFace({ id: "a", capacity: 1 });
  const channel = createCommunicationChannel({ id: "room", capacity: 1 });
  assert.equal(message.ok && face.ok && channel.ok, true);
  if (!message.ok || !face.ok || !channel.ok) return;
  assert.equal(canTransmit(face.value, channel.value), true);
  assert.deepEqual(communicate(face.value, channel.value, message.value), { ok: true, value: message.value });
  assert.equal(performIllocution("assertion", message.value).force, "assertion");
  assert.equal(translateMessage(message.value, (value) => value.toUpperCase()).ok, true);
});

test("claim witnessing composes SignCraft and SignChain ports without copying their semantics", () => {
  let appended = 0;
  const craft: SignCraftPort = { admit: (input) => ({ ok: true, value: { kind: "sign.claim", ...input } }), conflate: (left, right) => ({ ok: true, value: { ...left, charge: joinKnowledgeValue(chargeValue(left.charge), chargeValue(right.charge)).name } }) };
  const chain: SignChainPort = { append: ({ claim }) => { appended += 1; return { ok: true, value: Object.freeze({ event: "e1", claim }) }; } };
  const result = witnessClaim(craft, chain, { subject: "sky", predicate: "is", object: "blue", charge: "potential" }, { author: "a", witness: "w" });
  assert.equal(result.ok, true);
  assert.equal(appended, 1);
});

test("utterances round-trip through canonical CloudEvents and delegate FOUR conflation", () => {
  const utterance = createUtterance({ token: "did:example:alice", claim: "rain" });
  assert.equal(utterance.ok, true);
  if (!utterance.ok) return;
  const event = cloudEventFromUtterance(utterance.value, "e1", "urn:example:test");
  assert.equal(event.ok, true);
  if (!event.ok) return;
  assert.deepEqual(utteranceFromCloudEvent(event.value), utterance);
  const craft: SignCraftPort = { admit: (input) => ({ ok: true, value: { kind: "sign.claim", ...input } }), conflate: (left, right) => ({ ok: true, value: { ...left, charge: joinKnowledgeValue(chargeValue(left.charge), chargeValue(right.charge)).name } }) };
  const both = conflateUtteranceClaims(craft, utterance.value, utterance.value, "says", "potential", "active");
  assert.equal(both.ok && both.value.charge, "stable");
});

test("action admission and illocution migration are closed typed contracts", () => {
  assert.equal(migrateIllocutionaryForce("assertive"), "assertion");
  assert.deepEqual(admitCommunicationAction({ action: "communicating.admit", actor: "alice", claim: "goal", force: "assertion" }), { ok: true, value: { kind: "sign.communication-action", action: "communicating.admit", actor: "alice", claim: "goal", force: "assertion" } });
});

test("contract map keeps language reading and evidence outside the generic provider", () => {
  assert.equal(legacyCommunicationContractMap.communicate, "sign-communication");
  assert.equal(legacyCommunicationContractMap.meme, "computer-data-engine/semantic-claim");
  assert.equal(legacyCommunicationContractMap.read, "language-fiber");
  assert.equal(legacyCommunicationContractMap.parseCommunication, "language-fiber");
});
