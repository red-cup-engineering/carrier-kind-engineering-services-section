import test from "node:test";
import assert from "node:assert/strict";
import { articulate, parse, tag } from "@561-group/language-topology";
import bundle from "./index.mjs";

function firstParse(text: string) {
  const base = articulate(text, bundle);
  const sentence = base.spans.find((span) => span.tier === "sentence") ?? base.document;
  return parse(sentence, base, bundle);
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
  assert.ok(tag("The", bundle).includes("det"));
  assert.ok(tag("teacher", bundle).includes("noun"));
  assert.ok(tag("graded", bundle).includes("verb"));
});
