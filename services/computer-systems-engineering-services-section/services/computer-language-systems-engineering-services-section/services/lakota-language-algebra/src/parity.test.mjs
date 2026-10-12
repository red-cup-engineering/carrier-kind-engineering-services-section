import test from "node:test";
import assert from "node:assert/strict";
import { load, read } from "@red-cup-engineering/communicating";
import { rawBundle } from "./bundle.mjs";
import { rawBundle as typedRawBundle } from "./bundle.mjs";

const bundle = load(rawBundle);

test("runtime and typed Lakota bundle carriers agree", () => {
  assert.deepEqual(rawBundle, typedRawBundle);
});

test("language-parsing-lakota declares SOV and postposed attachment parameters", () => {
  assert.equal(bundle.wordOrder, "SOV");
  assert.equal(bundle.attachment.object, "left");
  assert.equal(bundle.attachment.determiner, "right");
  assert.equal(bundle.attachment.adjective, "right");
});

test("language-parsing-lakota tags curated closed classes and leaves prefixal morphology unfaked", () => {
  assert.ok(read("kiŋ", bundle).parse.words[0]?.tags.includes("det"));
  assert.ok(read("el", bundle).parse.words[0]?.tags.includes("prep"));
  assert.ok(read("yawá", bundle).parse.words[0]?.tags.includes("verb"));
  assert.deepEqual(read("wayawá", bundle).parse.words[0]?.tags, ["noun"]);
});

test("language-parsing-lakota postposed determiner attaches back to the noun", () => {
  const parsed = read("Sunka kiŋ yawá.", bundle).parse;
  const det = parsed.arcs.find((arc) => arc.rel === "det");
  assert.equal(det?.headText, "Sunka");
  assert.equal(det?.depText, "kiŋ");
});
