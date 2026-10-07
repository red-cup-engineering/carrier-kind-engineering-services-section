import { test } from "node:test";
import assert from "node:assert/strict";

import { admitCommunication, load, parseCommunicationForest } from "../src/index.mjs";

const baseMeta = { script: "Latin", direction: "ltr" };

function bundle(overrides = {}) {
  return load({
    meta: { ...baseMeta, name: "Modality Test", code: "modality-test" },
    lexicon: {
      determiners: ["the"],
      prepositions: ["in"],
      pronouns: [],
      conjunctions: ["but", "and"],
      auxiliaries: ["may", "might", "could", "would", "should", "will", "shall"],
      copula: [],
    },
    morphology: {
      suffixRules: [],
      numberSuffixPattern: "",
      verbFormRules: [],
      numberWords: [],
      irregularVerbs: {
        say: { "3sg": "says", past: "said" },
        slow: { base: "slow" },
        remain: { base: "remain" },
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
      ],
      morphology: { type: "isolating", caseMarking: "none", agreement: "weak" },
      segmentation: { sentenceBoundary: "punctuation", wordBoundary: "space" },
    },
    attachment: { determiner: "left", adjective: "left", subject: "left", object: "right" },
    segmentation: { sentenceTerminatorPattern: "[.!?]", abbreviations: [] },
    ...(overrides.hedges !== undefined ? { hedges: overrides.hedges } : {}),
  });
}

function modalityOf(text, compiled) {
  const forest = parseCommunicationForest(admitCommunication(text), compiled);
  return forest.readings[0].parse.modality;
}

test("modality: closed-class modal auxiliaries are surfaced as auxiliaries, in reading order", () => {
  const compiled = bundle();
  const m = modalityOf("The economy would slow further but growth will remain volatile.", compiled);
  assert.deepEqual(m.auxiliaries, ["would", "will"]);
});

test("modality: 'will'/'shall' among the auxiliaries are read as future-marking; other modals are not", () => {
  const compiled = bundle();
  const m = modalityOf("The economy would slow further but growth will remain volatile.", compiled);
  assert.deepEqual(m.future, ["will"]);
});

test("modality: bundle.hedges surfaces hedge tokens found in the sentence", () => {
  const compiled = bundle({ hedges: ["likely", "possibly", "reportedly", "allegedly", "appears", "seems", "expected"] });
  const m = modalityOf("The economy would likely slow further, analysts said.", compiled);
  assert.deepEqual(m.hedges, ["likely"]);
});

test("modality: with no bundle.hedges, hedges stays empty and auxiliaries/future are unaffected", () => {
  const compiled = bundle();
  const m = modalityOf("The economy would likely slow further but growth will remain volatile.", compiled);
  assert.deepEqual(m.hedges, []);
  assert.deepEqual(m.auxiliaries, ["would", "will"]);
  assert.deepEqual(m.future, ["will"]);
});

test("modality: a sentence with no modal auxiliaries and no hedges reads all-empty", () => {
  const compiled = bundle({ hedges: ["likely"] });
  const m = modalityOf("Growth remains steady in the region.", compiled);
  assert.deepEqual(m, { hedges: [], future: [], auxiliaries: [] });
});
