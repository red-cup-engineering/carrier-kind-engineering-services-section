import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

import { manifest, settle } from "../src/index.mjs";

const corpusUrl = new URL("../corpus/agency-samples.jsonl", import.meta.url);
const samples = readFileSync(corpusUrl, "utf8")
  .trim()
  .split(/\r?\n/u)
  .map((line) => JSON.parse(line));

const derivationalSuffixes = new Set(["ai", "en", "um", "o", "e"]);
const vowels = new Set(["a", "e", "i", "o", "u"]);

function exactWordFromPattern(pattern) {
  const match = /^\^([a-z]+)\$$/u.exec(pattern);
  return match?.[1] ?? null;
}

function segment(word) {
  return word.replaceAll("sh", "S").split("");
}

function shape(word) {
  return segment(word).map((segmentText) =>
    vowels.has(segmentText.toLowerCase()) ? "V" : "C").join("");
}

function assertNoHeavyCluster(word) {
  const tokenShape = shape(word);
  assert.ok(!tokenShape.includes("CC"), `${word} should avoid consonant clusters: ${tokenShape}`);
  assert.ok(!tokenShape.includes("VV"), `${word} should avoid vowel clusters: ${tokenShape}`);
}

function assertRelConLangWordShape(word) {
  const parts = word.split("-");
  assert.equal(parts.length <= 2, true, `${word} should have at most one derivational suffix`);
  assertNoHeavyCluster(parts[0]);
  if (parts.length === 2) {
    assert.ok(derivationalSuffixes.has(parts[1]), `${word} should use a declared derivational suffix`);
  }
}

test("RelConLang built roots keep the CV or CVCV word-shape discipline", () => {
  for (const rule of manifest.bundle.morphology.rootPatternRules ?? []) {
    const word = exactWordFromPattern(rule.pattern);
    if (word === null) continue;
    assert.match(rule.template, /^C[aeiou]C[aeiou]$/u, `${word} template should be biconsonantal`);
    assertRelConLangWordShape(word);
  }
});

test("RelConLang corpus tokens stay in the declared small orthography", () => {
  for (const sample of samples) {
    for (const token of sample.text.toLowerCase().replace(/[.!?]/gu, "").split(/\s+/u)) {
      assert.match(token, /^[a-z-]+$/u, `${sample.id} token ${token} should be ASCII Latin`);
      assertRelConLangWordShape(token);
    }
  }
});

test("RelConLang derived verbs parse as verbs with aspect features", () => {
  const result = settle("mi ga ran-en do kelu.");
  const word = result.words.find((candidate) => candidate.text === "ran-en");
  assert.ok(word, "ran-en should be tokenized");
  assert.ok(word.tags.includes("verb"));
  assert.ok(word.feats.includes("process"));
  assert.ok(word.feats.includes("aspect:process"));
});
