import test from "node:test";
import assert from "node:assert/strict";
import { articulate, parse } from "@emsenn/language-topology";
import { load } from "@emsenn/language-algebra";
import type { CompiledBundle, RawBundle } from "@emsenn/language-algebra";
import { grammaticality } from "./index.mjs";

const raw = {
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

const bundle = load(raw);

function firstParse(text: string, b: CompiledBundle = bundle) {
  const base = articulate(text, b);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  return parse(sentence, base, b);
}

test("grammaticality flags hard grammar failures separately from ambiguity", () => {
  assert.equal(grammaticality(firstParse("The dog chased the cat.")).status, "grammatical");
  const bad = grammaticality(firstParse("Of from."));
  assert.equal(bad.status, "ungrammatical");
  assert.ok(bad.violations.some((v) => v.kind === "stranded-preposition" || v.kind === "no-clause-root"));
});
