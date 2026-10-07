import { test } from "node:test";
import assert from "node:assert/strict";

import { admitCommunication, load, parseCommunicationForest, read } from "../src/index.mjs";

const baseMeta = {
  script: "Latin",
  direction: "ltr",
};

// Defect fixture: "The cats chase the mouse." tagged "cats" as verb via the
// regular-3sg suffix rule and lost its noun reading, so "chase" never got its
// nsubj. Morphology must not argmax: a word matching both a noun-plural and a
// suffix-only 3sg reading is tagged BOTH, settled by arc evidence, never
// guessed (see charging.mts's POS-ambiguity block).
function bundle() {
  return load({
    meta: { ...baseMeta, name: "POS Ambiguity Test", code: "pos-ambiguity-test" },
    lexicon: {
      determiners: ["the"],
      prepositions: [],
      pronouns: ["she"],
      conjunctions: [],
      auxiliaries: [],
      copula: [],
    },
    morphology: {
      suffixRules: [],
      numberSuffixPattern: ".{2,}s$",
      verbFormRules: [
        // Regular 3sg present, same shape as the real English fiber's rule.
        { pattern: "^(?!.*(?:ous|less|ness)$).{2,}s$", tag: "3sg" },
      ],
      numberWords: [],
      irregularPlurals: { mouse: "mice" },
      irregularVerbs: {},
      verbStems: ["chase"],
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

test("a suffix-only 3sg word that also matches the noun-plural suffix is tagged BOTH noun and verb, never argmaxed", () => {
  const compiled = bundle();
  const words = wordsOf("The cats chase the mouse.", compiled);
  const cats = words.find((w) => w.text === "cats");

  assert.ok(cats, "the word was tokenized");
  assert.ok(cats.tags.includes("verb"), `expected "verb" in tags, got ${JSON.stringify(cats.tags)}`);
  assert.ok(cats.tags.includes("noun"), `expected "noun" in tags, got ${JSON.stringify(cats.tags)}`);
});

test("an nsubj arc landing on the ambiguous word settles it noun, and the true verb (from a verbStems bare-stem lexicon entry) bears the nsubj", () => {
  const compiled = bundle();
  const result = parseCommunicationForest(admitCommunication("The cats chase the mouse."), compiled).readings[0].parse;

  const chase = result.words.find((w) => w.text === "chase");
  assert.deepEqual(chase.tags, ["verb"], "a verbStems bare stem is unambiguous strong evidence, never dual-tagged");

  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  assert.equal(nsubj?.headText, "chase");
  assert.equal(nsubj?.depText, "cats");

  const posAnswer = result.answers.find((a) => a.question === "pos-ambiguity" && a.on === "cats");
  assert.equal(posAnswer?.status, "decided", "cats' noun/verb reading settles, it does not stay a void");
  assert.equal(posAnswer?.value, "active", "settled FALSE on is-verb: the noun reading won");

  const h = read("The cats chase the mouse.", compiled).cohomology;
  assert.equal(h.glued, true);
  assert.equal(h.h1, 0, "no unresolved obstructions once cats settles noun");
});

test("the word taking its own nsubj as head settles it verb, via the same dual-tag path", () => {
  const compiled = bundle();
  const result = parseCommunicationForest(admitCommunication("She dogs the cat."), compiled).readings[0].parse;

  const dogs = result.words.find((w) => w.text === "dogs");
  assert.ok(dogs.tags.includes("verb") && dogs.tags.includes("noun"), "dogs is dual-tagged the same way cats is");

  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  assert.equal(nsubj?.headText, "dogs");
  assert.equal(nsubj?.depText, "She");

  const posAnswer = result.answers.find((a) => a.question === "pos-ambiguity" && a.on === "dogs");
  assert.equal(posAnswer?.status, "decided");
  assert.equal(posAnswer?.value, "potential", "settled TRUE on is-verb: dogs took its own nsubj");
});

test("an ambiguous word with no arc evidence at all stays an unresolved valued question, surfaced as a void in h1 — never a silent guess", () => {
  const compiled = bundle();
  const h = read("Cats.", compiled).cohomology;

  const posVoid = h.underdetermined.find((o) => o.label === "pos-ambiguity" && o.on === "Cats");
  assert.ok(posVoid, `expected an unresolved pos-ambiguity obstruction, got ${JSON.stringify(h.underdetermined)}`);
  assert.equal(posVoid.value, "absurd");
  assert.ok(h.h1 >= 1);
});

test("irregularPlurals is keyed by the singular lemma: the singular itself stays sg, only the irregular plural surface form reads pl", () => {
  const compiled = bundle();
  const mouse = wordsOf("mouse", compiled)[0];
  const mice = wordsOf("mice", compiled)[0];

  assert.deepEqual(mouse.feats, ["sg"], `"mouse" (the map key) is singular, got ${JSON.stringify(mouse.feats)}`);
  assert.deepEqual(mice.feats, ["pl"], `"mice" (the map value) is plural, got ${JSON.stringify(mice.feats)}`);
});
