import test from "node:test";
import assert from "node:assert/strict";
import { articulate, parse, tag } from "@561-group/language-topology";
import bundle from "./index.mjs";

test("language-parsing-lakota declares SOV and postposed attachment parameters", () => {
  assert.equal(bundle.wordOrder, "SOV");
  assert.equal(bundle.attachment.object, "left");
  assert.equal(bundle.attachment.determiner, "right");
  assert.equal(bundle.attachment.adjective, "right");
});

test("language-parsing-lakota tags curated closed classes and leaves prefixal morphology unfaked", () => {
  assert.ok(tag("kiŋ", bundle).includes("det"));
  assert.ok(tag("el", bundle).includes("prep"));
  assert.ok(tag("yawá", bundle).includes("verb"));
  assert.deepEqual(tag("wayawá", bundle), ["noun"]);
});

test("language-parsing-lakota postposed determiner attaches back to the noun", () => {
  const base = articulate("Sunka kiŋ yawá.", bundle);
  const sentence = base.spans.find((span) => span.tier === "sentence") ?? base.document;
  const parsed = parse(sentence, base, bundle);
  const det = parsed.arcs.find((arc) => arc.rel === "det");
  assert.equal(det?.headText, "Sunka");
  assert.equal(det?.depText, "kiŋ");
});
