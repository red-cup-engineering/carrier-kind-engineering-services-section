import test from "node:test";
import assert from "node:assert/strict";
import { load, read } from "@red-cup-engineering/communicating";
import { rawBundle } from "./bundle.mjs";
import { rawBundle as typedRawBundle } from "./bundle.mjs";

const bundle = load(rawBundle);

test("runtime and typed Toki Pona bundle carriers agree", () => {
  assert.deepEqual(rawBundle, typedRawBundle);
});

test("language-parsing-tokipona carries an isolating bundle with structural particles", () => {
  assert.equal(bundle.wordOrder, "SVO");
  assert.equal(bundle.raw.morphology.suffixRules.length, 0);
  assert.equal(bundle.raw.lexicon.copula.length, 0);
  assert.ok(read("li", bundle).parse.words[0]?.tags.includes("det"));
  assert.ok(read("e", bundle).parse.words[0]?.tags.includes("det"));
});

test("language-parsing-tokipona content words honestly fall to the noun morphology floor", () => {
  assert.deepEqual(read("soweli", bundle).parse.words[0]?.tags, ["noun"]);
  assert.deepEqual(read("moku", bundle).parse.words[0]?.tags, ["noun"]);
  assert.deepEqual(read("kili", bundle).parse.words[0]?.tags, ["noun"]);
});
