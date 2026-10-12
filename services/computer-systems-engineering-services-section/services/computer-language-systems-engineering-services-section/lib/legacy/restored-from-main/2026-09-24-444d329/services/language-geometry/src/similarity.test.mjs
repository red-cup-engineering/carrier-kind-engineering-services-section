import test from "node:test";
import assert from "node:assert/strict";
import { similarity, hypernyms, commonAncestor, synonymsOf } from "./index.mjs";

test("ontology similarity is inspectable and honestly void for unknown words", () => {
  assert.equal(similarity("car", "automobile"), 1);
  assert.equal(similarity("dog", "cat"), 0.8);
  assert.equal(similarity("dog", "unknown-word"), null);
});

test("hypernym chains climb to the root entity", () => {
  assert.deepEqual(hypernyms("dog"), ["dog", "mammal", "animal", "organism", "entity"]);
  assert.equal(commonAncestor("dog", "rose"), "organism");
  assert.deepEqual(synonymsOf("car"), ["car", "automobile"]);
});
