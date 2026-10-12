import test from "node:test";
import assert from "node:assert/strict";
import { load, read } from "@red-cup-engineering/communicating";

import { rawBundle } from "../src/bundle.mjs";
import { tokenize, tagText } from "../src/tag.mjs";
import { invoke, solicit } from "../src/english-die.mjs";
import { ACTIVITYSTREAMS_CONTEXT } from "@red-cup-engineering/activitypub-services-section/activitystreams";

const ACTOR = "urn:ame:english-language-algebra";

function solicitation(text) {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT, type: "Offer", target: ACTOR,
    object: { type: "ServiceSolicitation", sourceActivity: { id: "urn:activity:test", object: { content: text } } },
  };
}

test("solicit() is pure — no IO, returns a value instead of writing it", () => {
  const { value, code } = solicit(solicitation("The teacher graded the exam."));
  assert.equal(code, 0);
  assert.equal(value.type, "Offer");
  assert.equal(value.object.type, "ExecutableServiceOffer");
});

test("solicit() rejects a malformed activity instead of throwing", () => {
  const { value, code } = solicit({ type: "NotAnOffer" });
  assert.equal(code, 2);
  assert.equal(value.type, "Reject");
});

test("invoke() checks the real postcondition instead of trusting tagText blindly", () => {
  const offerResponse = solicit(solicitation("The teacher graded the exam.")).value;
  const offer = offerResponse;
  const acceptance = {
    "@context": ACTIVITYSTREAMS_CONTEXT, type: "Accept", target: ACTOR,
    object: {
      type: "ServiceContract",
      offer,
      capability: {
        type: "Capability", holder: ACTOR, invocationTarget: ACTOR,
        parentOffer: offer.id,
        attenuation: { requestDigest: offer.object.requestDigest },
        allowedActions: ["invoke-service"],
      },
    },
  };
  const { value, code } = invoke(acceptance, "2026-08-01T00:00:00.000Z");
  assert.equal(code, 0);
  assert.equal(value.type, "Accept");
  assert.equal(typeof value.object.settled, "boolean");
  assert.equal(typeof value.object.totalObstructionBits, "number");
  assert.ok(value.object.sentences[0].cohomology, "cohomology reading must survive to the response, not be discarded");
});

test("rawBundle carries the real English fiber data", () => {
  assert.equal(rawBundle.meta.code, "en");
  assert.equal(rawBundle.wordOrder, "SVO");
  assert.ok(rawBundle.morphology.suffixRules.length > 0);
  assert.ok(rawBundle.lexicon.determiners.includes("the"));
});

test("tokenize strips the language's own sentence terminators", () => {
  assert.deepEqual(tokenize("The teacher graded the exam."), ["The", "teacher", "graded", "the", "exam"]);
});

test("tagText tags a closed-class word from the English lexicon (determiner)", () => {
  const result = tagText("The teacher graded the exam.");
  const the = result.sentences[0].words.find((word) => word.text === "The");
  assert.ok(the.tags.includes("det"));
});

test("tagText tags an open-class word by suffix morphology (past-tense -ed)", () => {
  const result = tagText("The teacher graded the exam.");
  const graded = result.sentences[0].words.find((word) => word.text === "graded");
  assert.ok(graded.tags.includes("verb"));
  assert.ok(graded.feats.includes("past"));
});

test("tagText is a deterministic function of (text, rawBundle)", () => {
  assert.deepEqual(tagText("The teacher graded the exam."), tagText("The teacher graded the exam."));
});

test("tagText runs the real pipeline: SVO subject/object arcs and roles for a clean past-tense sentence", () => {
  const result = tagText("The teacher graded the exam.");
  const frame = result.sentences[0].roles.find((candidate) => candidate.verb === "graded");
  assert.equal(frame.agent, "teacher");
  assert.equal(frame.patient, "exam");
});

test("English's offered reading is the canonical communicating projection", () => {
  const text = "The teacher graded the exam.";
  const direct = read(text, load(rawBundle));
  const offered = tagText(text).sentences[0];
  assert.deepEqual(offered.words, direct.parse.words.map((word) => ({
    text: word.text, tags: word.tags, feats: word.feats, connected: word.connected, roles: word.roles,
  })));
  assert.deepEqual(offered.roles, direct.roles);
  assert.deepEqual(offered.cohomology, direct.cohomology);
});
