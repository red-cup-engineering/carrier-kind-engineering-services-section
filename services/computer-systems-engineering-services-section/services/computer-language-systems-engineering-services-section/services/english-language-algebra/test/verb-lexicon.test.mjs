// verb-lexicon.test.mjs — exercises @lenticule-science/communicating@0.0.5's
// verb-lexicon path (irregularVerbs table + regular verbFormRules) and its
// copula-precedence fix, wired against the real English bundle.
import test from "node:test";
import assert from "node:assert/strict";

import { rawBundle } from "../src/bundle.mjs";
import { load, read, roles } from "@red-cup-engineering/communicating";

const bundle = load(rawBundle);
const parse = (text) => read(text, bundle).parse;

test("regular 3sg present tense (\"walks\") tags verb and forms an nsubj arc", () => {
  const result = parse("She walks to the store.");
  const walks = result.words.find((w) => w.text === "walks");
  assert.ok(walks?.tags.includes("verb"));
  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  assert.equal(nsubj?.headText, "walks");
  assert.equal(nsubj?.depText, "She");
});

test("irregular past tense (\"sat\", from morphology.irregularVerbs) tags verb and forms an nsubj arc", () => {
  const result = parse("The cat sat on the mat.");
  const sat = result.words.find((w) => w.text === "sat");
  assert.ok(sat?.tags.includes("verb"));
  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  assert.equal(nsubj?.headText, "sat");
  assert.equal(nsubj?.depText, "cat");
});

test("a copula sentence (\"is\") surfaces cop, not aux, now that the bundle no longer double-lists \"be\" forms", () => {
  const result = parse("The dog is loud.");
  const is = result.words.find((w) => w.text === "is");
  assert.deepEqual(is?.tags, ["cop"]);
});

test("agent/patient roles now resolve for a present-tense sentence via the regular 3sg path", () => {
  const result = parse("She walks to the store.");
  const frame = roles(result).find((r) => r.verb === "walks");
  assert.equal(frame?.agent, "She");
});

test("DEFECT FIXED: \"The cats chase the mouse.\" no longer mistags \"cats\" as the sole verb — chase (a verbStems bare stem) bears the nsubj, and cats settles noun", () => {
  const result = parse("The cats chase the mouse.");

  const chase = result.words.find((w) => w.text === "chase");
  assert.deepEqual(chase?.tags, ["verb"]);

  const cats = result.words.find((w) => w.text === "cats");
  assert.ok(cats?.tags.includes("verb") && cats?.tags.includes("noun"), "cats is dual-tagged, not argmaxed");

  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  assert.equal(nsubj?.headText, "chase");
  assert.equal(nsubj?.depText, "cats");

  const posAnswer = result.answers.find((a) => a.question === "pos-ambiguity" && a.on === "cats");
  assert.equal(posAnswer?.status, "decided", "cats' noun/verb reading settles from arc evidence, it does not stay a void");
  assert.equal(posAnswer?.value, "active", "settled FALSE on is-verb: the noun reading won");
});
