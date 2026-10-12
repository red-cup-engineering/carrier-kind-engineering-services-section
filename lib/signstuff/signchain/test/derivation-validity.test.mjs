import test from "node:test";
import assert from "node:assert/strict";
import { mark, token } from "@red-cup-engineering/signcell/utterance";
import { specializationMorphism } from "@red-cup-engineering/signcell/predication";
import { theoryOfData, derive, derivationValidity } from "../src/typed-theory.mjs";

function fixture() {
  const premise = token(mark("general"));
  const middle = token(mark("specialized"));
  const conclusion = token(mark("more-specialized"));
  const theory = theoryOfData([
    specializationMorphism(middle, premise),
    specializationMorphism(conclusion, middle),
  ]);
  return { premise, middle, conclusion, theory };
}

function derivation(theory, premise, conclusion) {
  const search = derive(theory, premise, conclusion);
  assert.equal(search.kind, "typedTheory.derivationSearch:witness");
  return search.derivation;
}

test("an empty identity derivation uses semantic coincidence, including transported carriers", () => {
  const { theory, premise } = fixture();
  const identity = derivation(theory, premise, JSON.parse(JSON.stringify(premise)));
  assert.equal(identity.steps.length, 0);
  assert.notEqual(identity.premise, identity.conclusion);
  assert.equal(derivationValidity(theory, identity).kind, "typedTheory.derivationCheck:witness");
});

test("empty steps cannot witness a distinct declared conclusion", () => {
  const { theory, premise, conclusion } = fixture();
  const identity = derivation(theory, premise, premise);
  const result = derivationValidity(theory, { ...identity, conclusion });
  assert.equal(result.kind, "typedTheory.derivation-obstruction");
  assert.equal(result.at, premise);
  assert.equal(result.conclusion, conclusion);
});

test("a valid prefix cannot claim the endpoint of a longer derivation", () => {
  const { theory, premise, middle, conclusion } = fixture();
  const complete = derivation(theory, premise, conclusion);
  const prefix = derivation(theory, premise, middle);
  assert.equal(complete.steps.length, 2);
  assert.equal(prefix.steps.length, 1);
  assert.equal(derivationValidity(theory, complete).kind, "typedTheory.derivationCheck:witness");
  assert.equal(derivationValidity(theory, prefix).kind, "typedTheory.derivationCheck:witness");
  const result = derivationValidity(theory, { ...prefix, conclusion });
  assert.equal(result.kind, "typedTheory.derivation-obstruction");
  assert.equal(result.at, middle);
  assert.equal(result.conclusion, conclusion);
});

test("an invalid earlier step retains its original obstruction evidence", () => {
  const { theory, premise, conclusion } = fixture();
  const complete = derivation(theory, premise, conclusion);
  const step = { ...complete.steps[0], premise: conclusion };
  const result = derivationValidity(theory, { ...complete, steps: [step, ...complete.steps.slice(1)] });
  assert.equal(result.kind, "typedTheory.derivation-obstruction");
  assert.equal(result.at, premise);
  assert.equal(result.step, step);
});
