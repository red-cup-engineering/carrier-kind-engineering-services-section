import test from "node:test";
import assert from "node:assert/strict";
import {
  cellOf,
  specializationInferenceMorphism,
  converseInferenceMorphism,
  inferenceMorphismIdentity,
  inferenceRules,
} from "../src/typed-theory.mjs";

test("cellOf builds a (subject, predicate, object) cell", () => {
  const cell = cellOf("s", "p", "o");
  assert.deepEqual(cell, { subject: "s", predicate: "p", object: "o" });
});

test("inferenceMorphismIdentity: a morphism is identical to itself", () => {
  const judgment = inferenceMorphismIdentity(specializationInferenceMorphism, specializationInferenceMorphism);
  assert.equal(judgment.kind, "typedTheory.inferenceMorphismIdentity:witness");
});

test("inferenceMorphismIdentity: distinct morphism kinds are not identical", () => {
  const judgment = inferenceMorphismIdentity(specializationInferenceMorphism, converseInferenceMorphism);
  assert.equal(judgment.kind, "typedTheory.inferenceMorphismIdentity-obstruction");
});

test("inferenceRules: a cell witness yields three rules (converse, subject- and object-projection)", () => {
  const rules = inferenceRules([cellOf("s", "p", "o")]);
  assert.equal(rules.length, 3);
  assert.deepEqual(new Set(rules.map((rule) => rule.trace.morphisms[0].kind)), new Set([
    "typedTheory.inferenceMorphism.converse",
    "typedTheory.inferenceMorphism.subjectProjection",
    "typedTheory.inferenceMorphism.objectProjection",
  ]));
});
