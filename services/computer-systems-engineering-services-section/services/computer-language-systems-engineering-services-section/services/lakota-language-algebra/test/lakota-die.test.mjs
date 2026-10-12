import test from "node:test";
import assert from "node:assert/strict";
import { load, read } from "@red-cup-engineering/communicating";

import { rawBundle } from "../src/bundle.mjs";
import { tokenize, tagText } from "../src/tag.mjs";

test("rawBundle carries the real Lakota fiber data", () => {
  assert.equal(rawBundle.meta.code, "lkt");
  assert.equal(rawBundle.wordOrder, "SOV");
  assert.equal(rawBundle.attachment.determiner, "right");
  assert.ok(rawBundle.morphology.suffixRules.length > 0);
});

test("tokenize strips the language's own sentence terminators", () => {
  assert.deepEqual(tokenize("Sunka kiŋ yawá."), ["Sunka", "kiŋ", "yawá"]);
});

test("tagText tags a closed-class word from the Lakota lexicon (postposed determiner)", () => {
  const result = tagText("Sunka kiŋ yawá.");
  const kin = result.sentences[0].words.find((word) => word.text === "kiŋ");
  assert.ok(kin.tags.includes("det"));
});

test("tagText tags a curated verb stem", () => {
  const result = tagText("Sunka kiŋ yawá.");
  const verb = result.sentences[0].words.find((word) => word.text === "yawá");
  assert.ok(verb.tags.includes("verb"));
});

test("tagText attaches the postposed determiner back to its noun", () => {
  const result = tagText("Sunka kiŋ yawá.");
  const det = result.sentences[0].arcs.find((arc) => arc.rel === "det");
  assert.equal(det.head, "Sunka");
  assert.equal(det.dependent, "kiŋ");
});

test("tagText is a deterministic function of (text, rawBundle)", () => {
  assert.deepEqual(tagText("Sunka kiŋ yawá."), tagText("Sunka kiŋ yawá."));
});

test("Lakota's offered reading is the canonical communicating projection", () => {
  const text = "Sunka kiŋ yawá.";
  const direct = read(text, load(rawBundle));
  const offered = tagText(text).sentences[0];
  assert.deepEqual(offered.words, direct.parse.words.map((word) => ({
    text: word.text, tags: word.tags, feats: word.feats, connected: word.connected, roles: word.roles,
  })));
  assert.deepEqual(offered.roles, direct.roles);
  assert.deepEqual(offered.cohomology, direct.cohomology);
});
