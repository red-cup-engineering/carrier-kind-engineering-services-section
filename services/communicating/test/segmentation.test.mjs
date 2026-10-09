import { test } from "node:test";
import assert from "node:assert/strict";

import { load } from "../src/index.mjs";
import { articulate, tokenizeWithBundle } from "../src/speaking/listening/parsing/articulating.mjs";

const baseMeta = {
  script: "Latin",
  direction: "ltr",
};

function bundle(overrides = {}) {
  return load({
    meta: { ...baseMeta, name: "Segmentation Test", code: "seg-test", ...(overrides.meta ?? {}) },
    lexicon: {
      determiners: [],
      prepositions: [],
      pronouns: [],
      conjunctions: [],
      auxiliaries: [],
      copula: [],
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
        wordBoundary: overrides.wordBoundary ?? "space",
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
    ...(overrides.segment === undefined ? {} : { segment: overrides.segment }),
  });
}

// (c) — no bundle segment, wordBoundary !== "script": today's regex tokenizer, unchanged.
test("tokenizeWithBundle: no segment hook and wordBoundary 'space' falls back to the default regex tokenizer", () => {
  const compiled = bundle({ wordBoundary: "space" });
  const words = tokenizeWithBundle("alice saw bob's dog.", 0, compiled);

  assert.deepEqual(words.map((w) => w.text), ["alice", "saw", "bob's", "dog"]);
  assert.deepEqual(words.map((w) => w.tier), ["word", "word", "word", "word"]);
  for (const w of words) {
    assert.equal("alice saw bob's dog.".slice(w.start, w.end), w.text, "span offsets round-trip through the source text");
  }
  assert.equal(compiled.segment, undefined, "no segment hook was supplied");
});

// (b) — no bundle segment, wordBoundary === "script": one Span per letter/mark/number char.
test("tokenizeWithBundle: wordBoundary 'script' with no segment hook tokenizes per character", () => {
  const compiled = bundle({ wordBoundary: "script" });
  const text = "ab cd";
  const words = tokenizeWithBundle(text, 0, compiled);

  assert.deepEqual(words.map((w) => w.text), ["a", "b", "c", "d"]);
  assert.deepEqual(words.map((w) => [w.start, w.end]), [[0, 1], [1, 2], [3, 4], [4, 5]]);
  for (const w of words) {
    assert.equal(text.slice(w.start, w.end), w.text);
  }
});

// (a) — bundle segment hook supplied: takes precedence (even over wordBoundary: "script"),
// and each returned word is located sequentially from the previous match's end.
test("tokenizeWithBundle: a bundle segment hook overrides tokenization and offsets are located sequentially", () => {
  const compiled = bundle({
    wordBoundary: "script",
    segment: (text) => text.split(" ").filter((w) => w.length > 0),
  });
  const text = "the cat sat on the mat";
  const words = tokenizeWithBundle(text, 0, compiled);

  assert.deepEqual(words.map((w) => w.text), ["the", "cat", "sat", "on", "the", "mat"]);
  // the repeated word "the" must resolve to its SECOND occurrence, not the first again.
  const [first, , , , second] = words;
  assert.equal(first.start, 0);
  assert.equal(first.end, 3);
  assert.equal(second.start, text.lastIndexOf("the"));
  assert.equal(second.end, text.lastIndexOf("the") + "the".length);
  for (const w of words) {
    assert.equal(text.slice(w.start, w.end), w.text, "span offsets round-trip through the source text");
  }
});

test("tokenizeWithBundle: a bundle segment hook honors a non-zero base offset", () => {
  const compiled = bundle({ segment: (text) => text.split(" ") });
  const words = tokenizeWithBundle("foo bar", 10, compiled);

  assert.deepEqual(words.map((w) => [w.text, w.start, w.end]), [
    ["foo", 10, 13],
    ["bar", 14, 17],
  ]);
});

test("tokenizeWithBundle: a segment hook returning a substring not present in the clause is skipped, not mis-located", () => {
  const compiled = bundle({ segment: () => ["alpha", "not-there", "beta"] });
  const words = tokenizeWithBundle("alpha beta", 0, compiled);

  assert.deepEqual(words.map((w) => w.text), ["alpha", "beta"]);
});

// end-to-end: the bundle's segment hook is threaded all the way through articulate().
test("articulate: a bundle segment hook is threaded through the full span pipeline", () => {
  const compiled = bundle({ segment: (text) => text.split(" ") });
  const result = articulate("the cat sat.", compiled);
  const words = result.spans.filter((s) => s.tier === "word");

  assert.deepEqual(words.map((w) => w.text), ["the", "cat", "sat."]);
  for (const w of words) {
    assert.equal(result.text.slice(w.start, w.end), w.text);
  }
});

// end-to-end: wordBoundary: "script" with no segment hook is threaded through articulate() too.
test("articulate: wordBoundary 'script' with no segment hook is threaded through the full span pipeline", () => {
  const compiled = bundle({ wordBoundary: "script" });
  const result = articulate("hi.", compiled);
  const words = result.spans.filter((s) => s.tier === "word");

  assert.deepEqual(words.map((w) => w.text), ["h", "i"]);
});

// load()/compile.mts: the optional field passes through unchanged, and stays absent when unsupplied.
test("load: a raw bundle's segment hook passes through unchanged onto the compiled bundle", () => {
  const segment = (text) => text.split(" ");
  const withSegment = bundle({ segment });
  const withoutSegment = bundle();

  assert.equal(withSegment.segment, segment, "the exact function reference is passed through unchanged");
  assert.equal(withoutSegment.segment, undefined, "absent segment stays absent (existing behavior)");
});
