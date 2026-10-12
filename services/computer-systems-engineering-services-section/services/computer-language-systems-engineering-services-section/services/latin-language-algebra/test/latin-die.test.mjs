import test from "node:test";
import assert from "node:assert/strict";
import { load, read } from "@red-cup-engineering/communicating";

import { rawBundle } from "../src/bundle.mjs";
import { tokenize, tagText } from "../src/tag.mjs";

test("rawBundle carries the real Latin fiber data", () => {
  assert.equal(rawBundle.meta.code, "la");
  assert.equal(rawBundle.wordOrder, "free");
  assert.equal(rawBundle.roleBy, "case");
  assert.ok(rawBundle.morphology.suffixRules.length > 0);
});

test("tokenize strips the language's own sentence terminators", () => {
  assert.deepEqual(tokenize("Puella rosam amat."), ["Puella", "rosam", "amat"]);
});

test("tagText tags a closed-class word from the Latin lexicon (conjunction)", () => {
  const result = tagText("Et puella currit.");
  const et = result.sentences[0].words.find((word) => word.text === "Et");
  assert.ok(et.tags.includes("conj"));
});

test("tagText tags an open-class word by suffix morphology (nominative -a)", () => {
  const result = tagText("Puella currit.");
  assert.ok(result.sentences[0].words[0].tags.includes("noun"));
  assert.ok(result.sentences[0].words[0].feats.includes("case:nom"));
});

test("tagText is a deterministic function of (text, rawBundle)", () => {
  assert.deepEqual(tagText("Puella amat."), tagText("Puella amat."));
});

test("tagText runs the real pipeline: case beats surface word order for nsubj/dobj", () => {
  const result = tagText("Puellam Marcus amat.");
  const frame = result.sentences[0].roles.find((candidate) => candidate.verb === "amat");
  assert.equal(frame.agent, "Marcus");
  assert.equal(frame.patient, "Puellam");
});

test("Latin's offered reading is the canonical communicating projection", () => {
  const text = "Puellam Marcus amat.";
  const direct = read(text, load(rawBundle));
  const offered = tagText(text).sentences[0];
  assert.deepEqual(offered.words, direct.parse.words.map((word) => ({
    text: word.text, tags: word.tags, feats: word.feats, connected: word.connected, roles: word.roles,
  })));
  assert.deepEqual(offered.roles, direct.roles);
  assert.deepEqual(offered.cohomology, direct.cohomology);
});
