import { test } from "node:test";
import assert from "node:assert/strict";

import { load } from "../src/index.mjs";

const baseMeta = {
  script: "Latin",
  direction: "ltr",
};

function bundle(overrides = {}) {
  return load({
    meta: { ...baseMeta, name: "Copula Tag Test", code: "cop-test" },
    lexicon: {
      determiners: [],
      prepositions: [],
      pronouns: [],
      conjunctions: [],
      auxiliaries: [],
      copula: ["shi"],
      ...(overrides.lexicon ?? {}),
    },
    morphology: {
      suffixRules: [],
      numberSuffixPattern: "",
      verbFormRules: [],
      numberWords: [],
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
      roleStrategies: [],
      morphology: {
        type: "isolating",
        caseMarking: "none",
        agreement: "none",
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

// Defect 1: closedClassTags() checked det/prep/pron/conj/aux but never the
// bundle's copula set, so a word correctly listed as a fiber's copula
// floored to ["noun"] instead of surfacing a "cop" tag. Named case: the
// Mandarin fiber's 是 (romanized here as "shi" — the engine is script-
// agnostic, so a Latin-script fixture exercises the exact same code path).
test("closedClassTags: a word listed only in the bundle's copula set surfaces a 'cop' tag, not 'noun'", () => {
  const compiled = bundle();

  assert.equal(compiled.isCopula("shi"), true, "isCopula already recognized the word before this fix");
  assert.deepEqual(compiled.closedClassTags("shi"), ["cop"]);
});

test("closedClassTags: a word absent from every closed class still returns no tags (unrelated behavior unchanged)", () => {
  const compiled = bundle();
  assert.deepEqual(compiled.closedClassTags("unknown-word"), []);
});

// English's "is" is listed in both auxiliaries and copula (as the real
// English fiber bundle does); aux is checked first, so existing "aux"
// tagging for such words is preserved unchanged by this fix.
test("closedClassTags: a word in both auxiliaries and copula keeps tagging as 'aux' (no regression)", () => {
  const compiled = bundle({
    lexicon: {
      determiners: [],
      prepositions: [],
      pronouns: [],
      conjunctions: [],
      auxiliaries: ["is"],
      copula: ["is"],
    },
  });

  assert.deepEqual(compiled.closedClassTags("is"), ["aux"]);
});
