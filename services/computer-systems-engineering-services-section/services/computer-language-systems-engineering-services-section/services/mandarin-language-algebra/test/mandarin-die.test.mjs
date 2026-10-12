import test from "node:test";
import assert from "node:assert/strict";
import { load, read } from "@red-cup-engineering/communicating";

import { rawBundle } from "../src/bundle.mjs";
import { tokenize, tagText } from "../src/tag.mjs";

test("rawBundle carries the real Mandarin fiber data", () => {
  assert.equal(rawBundle.meta.code, "cmn");
  assert.equal(rawBundle.meta.script, "Han");
  assert.equal(rawBundle.wordOrder, "SVO");
  assert.equal(rawBundle.attachment.determiner, "left");
  assert.equal(typeof rawBundle.segment, "function");
  assert.ok(rawBundle.morphology.rootPatternRules.length > 0);
});

test("tokenize engages the dictionary segmenter, not per-character or regex tokenization", () => {
  assert.deepEqual(tokenize("我喜欢学习"), ["我", "喜欢", "学习"]);
  assert.deepEqual(tokenize("你好吗"), ["你好", "吗"]);
});

test("tokenize excludes the sentence's own terminator (not a word-class character)", () => {
  assert.deepEqual(tokenize("我喜欢学习。"), ["我", "喜欢", "学习"]);
  assert.deepEqual(tokenize("你好吗？"), ["你好", "吗"]);
});

test("tagText tags a closed-class preposition (coverb) and attaches its object", () => {
  const result = tagText("他在中国。");
  const zai = result.sentences[0].words.find((word) => word.text === "在");
  assert.ok(zai.tags.includes("prep"));
  const pobj = result.sentences[0].arcs.find((arc) => arc.rel === "pobj");
  assert.equal(pobj.head, "在");
  assert.equal(pobj.dependent, "中国");
});

test("tagText tags a curated classifier with its measure-word feature", () => {
  const result = tagText("这本书。");
  const ben = result.sentences[0].words.find((word) => word.text === "本");
  assert.ok(ben.tags.includes("classifier"));
  assert.ok(ben.feats.includes("measure-word"));
});

test("tagText attaches the preposed determiner back to its noun", () => {
  const result = tagText("这本书。");
  const det = result.sentences[0].arcs.find((arc) => arc.rel === "det");
  assert.equal(det.head, "书");
  assert.equal(det.dependent, "这");
});

test("tagText is a deterministic function of (text, rawBundle)", () => {
  assert.deepEqual(tagText("他在中国。"), tagText("他在中国。"));
});

test("Mandarin's offered reading is the canonical communicating projection", () => {
  const text = "他在中国。";
  const direct = read(text, load(rawBundle));
  const offered = tagText(text).sentences[0];
  assert.deepEqual(offered.words, direct.parse.words.map((word) => ({
    text: word.text, tags: word.tags, feats: word.feats, connected: word.connected, roles: word.roles,
  })));
  assert.deepEqual(offered.roles, direct.roles);
  assert.deepEqual(offered.cohomology, direct.cohomology);
});
