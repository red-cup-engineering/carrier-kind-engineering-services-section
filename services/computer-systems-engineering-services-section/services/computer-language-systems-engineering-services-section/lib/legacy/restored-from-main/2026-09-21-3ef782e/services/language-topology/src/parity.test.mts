import test from "node:test";
import assert from "node:assert/strict";
import { articulate, cohomology, parse } from "./index.mjs";
import { load } from "@emsenn/language-algebra";
import type { CompiledBundle, RawBundle } from "@emsenn/language-algebra";

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
} satisfies RawBundle;

const english = load(baseRaw);
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
} satisfies RawBundle);

function firstParse(text: string, bundle: CompiledBundle = english) {
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  return parse(sentence, base, bundle);
}

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

test("cohomology reads parse conflicts and voids as obstruction classes", () => {
  const clean = cohomology(firstParse("The dog chased the cat."));
  assert.equal(clean.glued, true);
  assert.equal(clean.h0, 1);

  const uncertain = cohomology(firstParse("Wow, she watched the man with the telescope."));
  assert.ok(uncertain.h1 >= 1);
  assert.ok(uncertain.obstructions.some((o) => o.kind === "void" || o.kind === "conflict"));
});
