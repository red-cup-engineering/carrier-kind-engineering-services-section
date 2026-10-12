import { test } from "node:test";
import assert from "node:assert/strict";
import { wicozani } from "../dist/index.mjs";

test("wicozani reads a clean kin seed as a structural, non-aggregate quiescence", () => {
  const w = wicozani("tatanka|kin-of\nmakha|kin-of");

  assert.equal(w.kind, "organizing-as-lakota.wicozani");
  assert.equal(Object.isFrozen(w), true);

  // wičhózani is structural, never a sum over separable dimensions
  assert.equal(w.structural, true);
  assert.equal(w.aggregate, false);

  // the four conditions are read off the substrate as numbers
  assert.equal(typeof w.h1, "number");
  assert.equal(typeof w.persistentContradiction, "number");
  assert.equal(typeof w.persistentUnsettled, "number");
  assert.ok(w.persistentContradiction >= 0);
  assert.ok(w.persistentUnsettled >= 0);

  // quiescence is the algebra's verdict: H¹ = 0 with no persistent ⊤
  assert.equal(typeof w.quiescent, "boolean");
  assert.equal(w.quiescent, w.h1 === 0 && w.persistentContradiction === 0);
});

test("wicozani's persistentContradiction gates quiescence", () => {
  const w = wicozani("tatanka|kin-of");
  // a persistent ⊤ (unrepaired contradiction) can never be quiescent
  if (w.persistentContradiction > 0) {
    assert.equal(w.quiescent, false);
  }
  // and quiescence implies a clean H¹
  if (w.quiescent) {
    assert.equal(w.h1, 0);
    assert.equal(w.persistentContradiction, 0);
  }
});
