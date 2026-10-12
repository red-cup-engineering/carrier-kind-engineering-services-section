import test from "node:test";
import assert from "node:assert/strict";
import { load, read } from "@red-cup-engineering/communicating";
import { rawBundle } from "./bundle.mjs";
import { rawBundle as typedRawBundle } from "./bundle.mjs";

const bundle = load(rawBundle);

test("runtime and typed Latin bundle carriers agree", () => {
  assert.deepEqual(rawBundle, typedRawBundle);
});

function firstParse(text) {
  return read(text, bundle).parse;
}

test("language-parsing-latin declares free order and role-by-case with no articles", () => {
  assert.equal(bundle.wordOrder, "free");
  assert.equal(bundle.roleBy, "case");
  assert.equal(bundle.raw.lexicon.determiners.length, 0);
});

test("language-parsing-latin tags nominative, accusative, and verb endings", () => {
  assert.ok(firstParse("puella").words[0]?.tags.includes("noun"));
  assert.ok(firstParse("servum").words[0]?.tags.includes("noun"));
  assert.ok(firstParse("amat").words[0]?.tags.includes("verb"));
});

test("language-parsing-latin role-by-case beats object-first order", () => {
  const frame = read("Juliam Marcus amat.", bundle).roles.find((candidate) => candidate.verb === "amat");
  assert.equal(frame?.agent, "Marcus");
  assert.equal(frame?.patient, "Juliam");
});
