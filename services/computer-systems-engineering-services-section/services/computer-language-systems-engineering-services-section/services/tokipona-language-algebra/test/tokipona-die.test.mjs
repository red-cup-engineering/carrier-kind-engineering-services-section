import test from "node:test";
import assert from "node:assert/strict";
import { load, read } from "@red-cup-engineering/communicating";

import { rawBundle } from "../src/bundle.mjs";
import { tokenize, tagText } from "../src/tag.mjs";

test("rawBundle carries the real Toki Pona fiber data", () => {
  assert.equal(rawBundle.meta.code, "tok");
  assert.equal(rawBundle.wordOrder, "SVO");
  assert.equal(rawBundle.attachment.subject, "left");
  assert.equal(rawBundle.attachment.object, "right");
  assert.equal(rawBundle.morphology.suffixRules.length, 0); // isolating: no morphology at all
  assert.equal(rawBundle.lexicon.copula.length, 0); // li is the predicate marker; no inflected "to be"
});

test("tokenize strips the language's own sentence terminators", () => {
  assert.deepEqual(tokenize("mi moku e kili."), ["mi", "moku", "e", "kili"]);
});

test("tagText tags the structural particles as closed-class determiners (filed there for lack of a particle class)", () => {
  const result = tagText("mi moku e kili.");
  const li = result.sentences[0].words.find((word) => word.text === "e");
  assert.ok(li.tags.includes("det"));
});

test("tagText honestly floors open-class content words to noun (no suffix morphology exists to say otherwise)", () => {
  const result = tagText("mi moku e kili.");
  const moku = result.sentences[0].words.find((word) => word.text === "moku");
  const kili = result.sentences[0].words.find((word) => word.text === "kili");
  assert.deepEqual(moku.tags, ["noun"]);
  assert.deepEqual(kili.tags, ["noun"]);
});

test("tagText is a deterministic function of (text, rawBundle)", () => {
  assert.deepEqual(tagText("mi moku e kili."), tagText("mi moku e kili."));
});

test("Toki Pona's offered reading is the canonical communicating projection", () => {
  const text = "mi moku e kili.";
  const direct = read(text, load(rawBundle));
  const offered = tagText(text).sentences[0];
  assert.deepEqual(offered.words, direct.parse.words.map((word) => ({
    text: word.text, tags: word.tags, feats: word.feats, connected: word.connected, roles: word.roles,
  })));
  assert.deepEqual(offered.roles, direct.roles);
  assert.deepEqual(offered.cohomology, direct.cohomology);
});
