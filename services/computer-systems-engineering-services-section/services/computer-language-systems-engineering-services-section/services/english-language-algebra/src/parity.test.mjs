import test from "node:test";
import assert from "node:assert/strict";
import { load, read } from "@red-cup-engineering/communicating";
import { rawBundle } from "./bundle.mjs";
import { rawBundle as typedRawBundle } from "./bundle.mjs";

const bundle = load(rawBundle);

test("runtime and typed English bundle carriers agree", () => {
  assert.deepEqual(rawBundle, typedRawBundle);
});

function firstParse(text) {
  return read(text, bundle).parse;
}

test("language-parsing-english parses SVO subject and object arcs", () => {
  const parsed = firstParse("The teacher graded the exam.");
  const nsubj = parsed.arcs.find((arc) => arc.rel === "nsubj");
  const dobj = parsed.arcs.find((arc) => arc.rel === "dobj");
  assert.equal(nsubj?.headText, "graded");
  assert.equal(nsubj?.depText, "teacher");
  assert.equal(dobj?.headText, "graded");
  assert.equal(dobj?.depText, "exam");
});

test("language-parsing-english bundle tags reference English words", () => {
  assert.ok(firstParse("The").words[0]?.tags.includes("det"));
  assert.ok(firstParse("teacher").words[0]?.tags.includes("noun"));
  assert.ok(firstParse("graded").words[0]?.tags.includes("verb"));
});
