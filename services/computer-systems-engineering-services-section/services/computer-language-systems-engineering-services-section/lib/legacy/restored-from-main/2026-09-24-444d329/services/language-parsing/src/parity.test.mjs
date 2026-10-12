import test from "node:test";
import assert from "node:assert/strict";
import {
  articulate,
  cohomology,
  grammaticality,
  linkEntity,
  load,
  parse,
  refer,
  roles,
  similarity,
} from "./index.mjs";

const baseRaw = {
  meta: { name: "Test", code: "x-test", script: "Latin", direction: "ltr" },
  lexicon: {
    determiners: ["the"],
    prepositions: ["by", "with", "in", "to", "of", "from"],
    pronouns: ["it"],
    conjunctions: ["and"],
    auxiliaries: [],
    copula: [],
  },
  morphology: {
    suffixRules: [
      { pattern: ".{2,}ed$", tag: "verb" },
    ],
    numberSuffixPattern: ".{2,}s$",
    verbFormRules: [{ pattern: ".{2,}ed$", tag: "past" }],
    numberWords: [],
  },
  reference: { pronouns: {}, nameGender: {} },
  wordOrder: "SVO",
  attachment: { determiner: "left", adjective: "left", subject: "left", object: "right" },
  segmentation: { sentenceTerminatorPattern: "[.!?]", abbreviations: [] },
};

const english = load(baseRaw);
const latin = load({
  ...baseRaw,
  wordOrder: "free",
  roleBy: "case",
  lexicon: { ...baseRaw.lexicon, determiners: [] },
  morphology: {
    ...baseRaw.morphology,
    suffixRules: [
      { pattern: ".{2,}t$", tag: "verb" },
      { pattern: ".{2,}us$", tag: "noun" },
      { pattern: ".{2,}am$", tag: "noun" },
    ],
  },
});
const lakota = load({
  ...baseRaw,
  lexicon: { ...baseRaw.lexicon, determiners: ["kiŋ"] },
  morphology: {
    ...baseRaw.morphology,
    suffixRules: [{ pattern: "^(yawá)$", tag: "verb" }],
    numberSuffixPattern: "",
    verbFormRules: [],
  },
  wordOrder: "SOV",
  attachment: { determiner: "right", adjective: "right", subject: "left", object: "left" },
});

function firstParse(text, bundle = english) {
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  return parse(sentence, base, bundle);
}

test("semantic roles use parser word ids, not positional placeholders", () => {
  const parsed = firstParse("The dog chased the cat.");
  const frame = roles(parsed).find((r) => r.verb.toLowerCase() === "chased");
  assert.equal(frame?.agent, "dog");
  assert.equal(frame?.patient, "cat");
});

test("Latin roleBy case beats word order", () => {
  const parsed = firstParse("Juliam Marcus amat.", latin);
  const frame = roles(parsed).find((r) => r.verb.toLowerCase() === "amat");
  assert.equal(frame?.agent, "Marcus");
  assert.equal(frame?.patient, "Juliam");
});

test("postposed Lakota determiners attach right-to-left", () => {
  const parsed = firstParse("Sunka kiŋ yawá.", lakota);
  const det = parsed.arcs.find((a) => a.rel === "det");
  assert.equal(det?.headText, "Sunka");
  assert.equal(det?.depText, "kiŋ");
});

test("empty number suffix patterns do not make every noun plural", () => {
  const parsed = firstParse("Sunka kiŋ yawá.", lakota);
  const sunka = parsed.words.find((w) => w.text === "Sunka");
  assert.ok(!sunka?.feats.includes("pl"));
});

test("settled specialization still propagates charges", () => {
  const parsed = firstParse("The dog chased the cat.");
  const dog = parsed.words.find((w) => w.text === "dog");
  assert.equal(dog?.connected, "decided");
});

test("entity linking keeps nil, linked, and ambiguous states distinct", () => {
  assert.equal(linkEntity("Nope").status, "nil");
  const org = linkEntity("Apple", "ORG");
  assert.equal(org.status, "linked");
  assert.equal(org.entity, "apple-co");
  const ambiguous = linkEntity("Apple");
  assert.equal(ambiguous.status, "ambiguous");
  assert.deepEqual([...ambiguous.candidates].sort(), ["apple-co", "apple-fruit"]);
  assert.equal(ambiguous.charge.value, "stable");
});

test("reference resolution reports resolved, ambiguous, and void pronouns", () => {
  const resolved = refer(firstParse("The dog chased the cat and it slept."));
  assert.equal(resolved.resolutions[0]?.anaphor, "it");
  assert.equal(resolved.resolutions[0]?.status, "ambiguous");
  assert.deepEqual(resolved.resolutions[0]?.candidates, ["dog", "cat"]);

  const voided = refer(firstParse("It slept."));
  assert.equal(voided.resolutions[0]?.status, "void");
});

test("ontology similarity is inspectable and honestly void for unknown words", () => {
  assert.equal(similarity("car", "automobile"), 1);
  assert.equal(similarity("dog", "cat"), 0.8);
  assert.equal(similarity("dog", "unknown-word"), null);
});

test("cohomology reads parse conflicts and voids as obstruction classes", () => {
  const clean = cohomology(firstParse("The dog chased the cat."));
  assert.equal(clean.glued, true);
  assert.equal(clean.h0, 1);

  const uncertain = cohomology(firstParse("Wow, she watched the man with the telescope."));
  assert.ok(uncertain.h1 >= 1);
  assert.ok(uncertain.obstructions.some((o) => o.kind === "void" || o.kind === "conflict"));
});

test("grammaticality flags hard grammar failures separately from ambiguity", () => {
  assert.equal(grammaticality(firstParse("The dog chased the cat.")).status, "grammatical");
  const bad = grammaticality(firstParse("Of from."));
  assert.equal(bad.status, "ungrammatical");
  assert.ok(bad.violations.some((v) => v.kind === "stranded-preposition" || v.kind === "no-clause-root"));
});
