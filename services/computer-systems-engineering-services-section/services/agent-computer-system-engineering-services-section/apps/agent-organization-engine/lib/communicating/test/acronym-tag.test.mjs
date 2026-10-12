import { test } from "node:test";
import assert from "node:assert/strict";

import { admitCommunication, load, parseCommunicationForest } from "../src/index.mjs";

const baseMeta = { script: "Latin", direction: "ltr" };

// Defect fixture: tagging.mts lowercased every word before the closed-class
// lookup, so an all-caps acronym ("US", "IT") collided with an unrelated
// closed-class pronoun/preposition reading merely by lowercasing ("us"/"it").
// Real news sentences below (paraphrased from wire-style economics/tech
// reporting) exercise the case-aware lookup.
function bundle(overrides = {}) {
  return load({
    meta: { ...baseMeta, name: "Acronym Tag Test", code: "acronym-test" },
    lexicon: {
      determiners: ["the"],
      prepositions: ["on", "of"],
      pronouns: ["us", "it", "he"],
      conjunctions: overrides.conjunctions ?? [],
      auxiliaries: [],
      copula: [],
    },
    morphology: {
      suffixRules: [],
      numberSuffixPattern: "",
      verbFormRules: [
        { pattern: "^(raised|warned|imposes?|said|improving)$", tag: "base" },
      ],
      numberWords: [],
      irregularVerbs: {
        impose: { "3sg": "imposes", past: "imposed" },
        warn: { "3sg": "warns", past: "warned" },
      },
    },
    reference: { pronouns: {}, nameGender: {} },
    wordOrder: "SVO",
    grammar: {
      kind: "communicating.language-grammar-profile",
      wordOrder: "SVO",
      alignment: "nominative-accusative",
      headDirectionality: {
        determiner: "left",
        adjective: "left",
        subject: "left",
        object: "right",
        adposition: "left",
      },
      roleStrategies: [
        { relation: "nsubj", by: "position", direction: "left", distance: "nearest" },
        { relation: "dobj", by: "position", direction: "right", distance: "nearest" },
      ],
      morphology: { type: "isolating", caseMarking: "none", agreement: "weak" },
      segmentation: { sentenceBoundary: "punctuation", wordBoundary: "space" },
    },
    attachment: { determiner: "left", adjective: "left", subject: "left", object: "right" },
    segmentation: { sentenceTerminatorPattern: "[.!?]", abbreviations: [] },
  });
}

function tagsOf(text, compiled, surface) {
  const forest = parseCommunicationForest(admitCommunication(text), compiled);
  const word = forest.readings[0].parse.words.find((w) => w.text === surface);
  assert.ok(word, `expected a word "${surface}" in "${text}"`);
  return word.tags;
}

test("tag: the acronym 'US' (2+ all-caps letters) is never collapsed onto the pronoun reading of lowercase 'us'", () => {
  const compiled = bundle();
  const tags = tagsOf("The US imposed new tariffs on steel.", compiled, "US");
  assert.ok(!tags.includes("pron"), `expected "US" not tagged pron, got [${tags.join(", ")}]`);
});

test("tag: the acronym 'IT' (2+ all-caps letters) is never collapsed onto the pronoun reading of lowercase 'it'", () => {
  const compiled = bundle();
  const tags = tagsOf("IT staff warned of a major outage.", compiled, "IT");
  assert.ok(!tags.includes("pron"), `expected "IT" not tagged pron, got [${tags.join(", ")}]`);
  assert.ok(tags.includes("noun"), "an acronym with no other evidence floors to noun, same as any other unrecognized surface form");
});

test("tag: ordinary acronyms with no closed-class collision ('EU', 'ECB') still resolve to noun", () => {
  const compiled = bundle();
  assert.deepEqual(tagsOf("The ECB raised rates again.", compiled, "ECB"), ["noun"]);
  assert.deepEqual(tagsOf("The EU imposed new tariffs on steel.", compiled, "EU"), ["noun"]);
});

test("tag: an acronym IS looked up case-preserved first, and matches when the bundle lists it in its exact case", () => {
  const compiled = bundle({ conjunctions: ["AND"] });
  // lowercase "and" is not itself a listed conjunction, so only the case-preserved path can resolve this
  const tags = tagsOf("The US AND the EU imposed tariffs.", compiled, "AND");
  assert.deepEqual(tags, ["conj"]);
});

test("tag: sentence-initial capitalized ordinary words keep current behavior (unaffected — not all-caps)", () => {
  const compiled = bundle();
  const tags = tagsOf("The US imposed new tariffs on steel.", compiled, "The");
  assert.deepEqual(tags, ["det"]);
});

test("tag: he (lowercase closed-class pronoun) is unaffected by the acronym path", () => {
  const compiled = bundle();
  const tags = tagsOf("He warned of a major outage.", compiled, "He");
  assert.deepEqual(tags, ["pron"]);
});
