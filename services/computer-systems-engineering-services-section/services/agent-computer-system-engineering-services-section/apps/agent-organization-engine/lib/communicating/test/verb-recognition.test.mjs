import { test } from "node:test";
import assert from "node:assert/strict";

import { admitCommunication, load, parseCommunicationForest } from "../src/index.mjs";

const baseMeta = {
  script: "Latin",
  direction: "ltr",
};

// Defect 2 fixture: bare-present ("chase") and 3sg-present ("walks") are
// recognized only via a bundle-declared regular verbFormRules entry
// (morphology.verbFormRules with tag "3sg"/"base") — the engine does not
// hardcode any language's regular-verb morphology. Irregular pasts
// ("sat") are recognized via the fiber's own irregularVerbs paradigm
// table, mirroring the real English fiber's 62-entry table without
// depending on that package.
function bundle() {
  return load({
    meta: { ...baseMeta, name: "Verb Recognition Test", code: "verb-test" },
    lexicon: {
      determiners: ["the"],
      prepositions: ["to", "on"],
      pronouns: ["she"],
      conjunctions: [],
      auxiliaries: [],
      copula: [],
    },
    morphology: {
      suffixRules: [],
      numberSuffixPattern: "",
      verbFormRules: [
        { pattern: "^walks$", tag: "3sg" },
        { pattern: "^chase$", tag: "base" },
      ],
      numberWords: [],
      irregularVerbs: {
        sit: { "3sg": "sits", past: "sat", nonfin: "sitting" },
      },
    },
    reference: {
      pronouns: { she: { person: 3, number: "sg", gender: "f" } },
      nameGender: {},
    },
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
      morphology: {
        type: "isolating",
        caseMarking: "none",
        agreement: "weak",
      },
      segmentation: {
        sentenceBoundary: "punctuation",
        wordBoundary: "space",
      },
    },
    attachment: {
      determiner: "left",
      adjective: "left",
      subject: "left",
      object: "right",
    },
    segmentation: {
      sentenceTerminatorPattern: "[.!?]",
      abbreviations: [],
    },
  });
}

function wordsOf(text, compiled) {
  const forest = parseCommunicationForest(admitCommunication(text), compiled);
  return forest.readings[0].parse.words;
}

test("regular bare present ('chase') tags as verb with a 'base' feat, via a bundle-declared verbFormRules entry", () => {
  const compiled = bundle();
  const words = wordsOf("They chase the cat.", compiled);
  const chase = words.find((w) => w.text === "chase");

  assert.ok(chase, "the word was tokenized");
  assert.deepEqual(chase.tags, ["verb"]);
  assert.ok(chase.feats.includes("base"), `expected 'base' in feats, got ${JSON.stringify(chase.feats)}`);
});

test("regular 3sg present ('walks') tags as verb with a '3sg' feat, and nsubj forms — 'She walks to the store.'", () => {
  const compiled = bundle();
  const result = parseCommunicationForest(admitCommunication("She walks to the store."), compiled).readings[0].parse;
  const walks = result.words.find((w) => w.text === "walks");

  assert.ok(walks, "the word was tokenized");
  assert.deepEqual(walks.tags, ["verb"], "previously floored to ['noun']: no suffix rule matches 'walks'");
  assert.ok(walks.feats.includes("3sg"), `expected '3sg' in feats, got ${JSON.stringify(walks.feats)}`);

  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  assert.ok(nsubj, "nsubj arc did not form before this fix (walks tagged noun, not verb)");
  assert.equal(nsubj.depText, "She");
  assert.equal(nsubj.headText, "walks");
});

test("irregular past ('sat') tags as verb with a 'past' feat sourced from the fiber's irregularVerbs table — 'The cat sat on the mat.'", () => {
  const compiled = bundle();
  const result = parseCommunicationForest(admitCommunication("The cat sat on the mat."), compiled).readings[0].parse;
  const sat = result.words.find((w) => w.text === "sat");

  assert.ok(sat, "the word was tokenized");
  assert.deepEqual(sat.tags, ["verb"], "previously floored to ['noun']: 'sat' matches no -ed/-ing/-ize/-ify/-ate/-en suffix rule");
  assert.ok(sat.feats.includes("past"), `expected 'past' in feats, got ${JSON.stringify(sat.feats)}`);

  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  assert.ok(nsubj, "nsubj arc did not form before this fix (sat tagged noun, not verb)");
  assert.equal(nsubj.depText, "cat");
  assert.equal(nsubj.headText, "sat");
});

test("the irregularVerbs base lemma itself ('sit') tags as verb with a 'base' feat", () => {
  const compiled = bundle();
  const words = wordsOf("Dogs sit.", compiled);
  const sit = words.find((w) => w.text === "sit");

  assert.ok(sit, "the word was tokenized");
  assert.deepEqual(sit.tags, ["verb"]);
  assert.ok(sit.feats.includes("base"), `expected 'base' in feats, got ${JSON.stringify(sit.feats)}`);
});

// The subject-verb agreement question path (charging.mts) reads "3sg"/"base"
// verb feats and "sg"/"pl" subject feats off an nsubj arc; before this fix
// no fiber ever emitted "3sg"/"base", so the "agreement" question never
// appeared for any sentence in any fiber.
test("subject-verb agreement question fires once the verb carries a '3sg' feat and its subject an nsubj arc", () => {
  const compiled = bundle();
  const result = parseCommunicationForest(admitCommunication("She walks to the store."), compiled).readings[0].parse;

  const agreement = result.answers.find((a) => a.question === "agreement");
  assert.ok(agreement, "agreement question was unreachable before this fix in every fiber");
});
