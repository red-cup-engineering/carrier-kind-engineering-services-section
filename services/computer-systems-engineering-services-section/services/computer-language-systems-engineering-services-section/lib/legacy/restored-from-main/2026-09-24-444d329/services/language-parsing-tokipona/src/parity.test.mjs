import test from "node:test";
import assert from "node:assert/strict";
import { tag } from "@561-group/language-topology";
import bundle from "./index.mjs";

test("language-parsing-tokipona carries an isolating bundle with structural particles", () => {
  assert.equal(bundle.wordOrder, "SVO");
  assert.equal(bundle.raw.morphology.suffixRules.length, 0);
  assert.equal(bundle.raw.lexicon.copula.length, 0);
  assert.ok(tag("li", bundle).includes("det"));
  assert.ok(tag("e", bundle).includes("det"));
});

test("language-parsing-tokipona content words honestly fall to the noun morphology floor", () => {
  assert.deepEqual(tag("soweli", bundle), ["noun"]);
  assert.deepEqual(tag("moku", bundle), ["noun"]);
  assert.deepEqual(tag("kili", bundle), ["noun"]);
});
