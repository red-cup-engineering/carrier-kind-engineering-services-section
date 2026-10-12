import test from "node:test";
import assert from "node:assert/strict";
import { articulate, parse, roles, tag } from "@561-group/language-topology";
import bundle from "./index.mjs";

function firstParse(text) {
  const base = articulate(text, bundle);
  const sentence = base.spans.find((span) => span.tier === "sentence") ?? base.document;
  return parse(sentence, base, bundle);
}

test("language-parsing-latin declares free order and role-by-case with no articles", () => {
  assert.equal(bundle.wordOrder, "free");
  assert.equal(bundle.roleBy, "case");
  assert.equal(bundle.raw.lexicon.determiners.length, 0);
});

test("language-parsing-latin tags nominative, accusative, and verb endings", () => {
  assert.ok(tag("puella", bundle).includes("noun"));
  assert.ok(tag("servum", bundle).includes("noun"));
  assert.ok(tag("amat", bundle).includes("verb"));
});

test("language-parsing-latin role-by-case beats object-first order", () => {
  const frame = roles(firstParse("Juliam Marcus amat.")).find((candidate) => candidate.verb === "amat");
  assert.equal(frame?.agent, "Marcus");
  assert.equal(frame?.patient, "Juliam");
});
