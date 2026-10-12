import test from "node:test";
import assert from "node:assert/strict";
import { articulate, parse } from "@emsenn/language-topology";
import { load } from "@emsenn/language-algebra";
import type { CompiledBundle, RawBundle } from "@emsenn/language-algebra";
import { roles, linkEntity, refer } from "./index.mjs";

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
    suffixRules: [{ pattern: ".{2,}ed$", tag: "verb" }],
    numberSuffixPattern: ".{2,}s$",
    verbFormRules: [{ pattern: ".{2,}ed$", tag: "past" }],
    numberWords: [],
  },
  reference: { pronouns: {}, nameGender: {} },
  wordOrder: "SVO",
  attachment: { determiner: "left", adjective: "left", subject: "left", object: "right" },
  segmentation: { sentenceTerminatorPattern: "[.!?]", abbreviations: [] },
} satisfies RawBundle;

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
} satisfies RawBundle);

function firstParse(text: string, bundle: CompiledBundle = english) {
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
