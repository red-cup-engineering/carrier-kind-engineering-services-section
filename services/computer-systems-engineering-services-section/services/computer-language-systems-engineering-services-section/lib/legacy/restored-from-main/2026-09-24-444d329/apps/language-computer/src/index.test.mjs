import test from "node:test";
import assert from "node:assert/strict";
import { read, settle, similarity } from "./index.mjs";

test("read composes every layer over one sentence", () => {
  const r = read("The dog chased the cat.");
  assert.equal(r.grammaticality.status, "grammatical");
  assert.equal(r.cohomology.glued, true);
  const frame = r.roles.find((f) => f.verb.toLowerCase() === "chased");
  assert.equal(frame?.agent, "dog");
  assert.equal(frame?.patient, "cat");
});

test("settle returns a parsed structure; similarity reads the sense graph", () => {
  assert.ok(settle("The cat slept.").words.length > 0);
  assert.equal(similarity("car", "automobile"), 1);
  assert.equal(similarity("dog", "unknown-xyz"), null);
});
