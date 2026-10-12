import test from "node:test";
import assert from "node:assert/strict";
import { articulate, parse, render } from "./index.mjs";
import { load } from "@emsenn/language-algebra";
import type { RawBundle, CompiledBundle } from "@emsenn/language-algebra";

const raw: RawBundle = {
  meta: { name: "Test", code: "x-test", script: "Latin", direction: "ltr" },
  lexicon: {
    determiners: ["the"], prepositions: ["with", "of"], pronouns: ["it"],
    conjunctions: ["and"], auxiliaries: [], copula: [],
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
};
const bundle: CompiledBundle = load(raw);

function settle(text: string) {
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  return parse(sentence, base, bundle);
}

test("codec law 1 — determinism: parse is a function (byte-identical repeats)", () => {
  assert.deepEqual(settle("The dog chased the cat."), settle("The dog chased the cat."));
});

test("codec law 2 — render is a faithful, deterministic presentation (not an inverse)", () => {
  const p = settle("The dog chased the cat.");
  // deterministic: same structure → identical view
  assert.equal(render(p), render(p));
  // faithful: every settled arc appears in the presentation
  for (const arc of p.arcs) {
    assert.ok(
      render(p).includes(arc.headText) && render(p).includes(arc.depText),
      `render dropped arc ${arc.rel}:${arc.headText}->${arc.depText}`,
    );
  }
});
