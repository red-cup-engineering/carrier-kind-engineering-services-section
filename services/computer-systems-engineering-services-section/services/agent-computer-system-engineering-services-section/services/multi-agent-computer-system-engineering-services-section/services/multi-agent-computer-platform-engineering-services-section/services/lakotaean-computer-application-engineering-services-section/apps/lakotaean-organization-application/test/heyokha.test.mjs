import { test } from "node:test";
import assert from "node:assert/strict";
import {
  markHeyokha,
  heldAtTop,
  laxIdempotence,
} from "../dist/index.mjs";

test("markHeyokha holds a conduct-cell at ⊤ (Íŋyaŋ), virtue-exempt", () => {
  const mark = markHeyokha("ride-against-the-direction");
  assert.equal(mark.kind, "organizing-as-lakota.heyokha-mark");
  assert.equal(mark.bearer, "ride-against-the-direction");
  assert.equal(mark.heldAt, "stable");
  assert.equal(mark.aspect, "Íŋyaŋ");
  assert.equal(mark.virtueExempt, true);
  // grounded by tobtob-kin's wakȟáŋ-mark at the stable (⊤) charge.
  assert.equal(mark.wakhan.kind, "organizing-as-lakota.wakhan-mark");
  assert.equal(mark.wakhan.atCharge, "stable");
  assert.equal(mark.wakhan.aspect, "Íŋyaŋ");
  assert.ok(Object.isFrozen(mark));
});

test("heldAtTop counts the deliberately-held-⊤ cells", () => {
  const marks = [markHeyokha("a"), markHeyokha("b"), markHeyokha("c")];
  assert.equal(heldAtTop(marks), 3);
  assert.equal(heldAtTop([]), 0);
});

test("laxIdempotence(0): strict idempotence, paraconsistency lost", () => {
  const lax = laxIdempotence(0);
  assert.equal(lax.kind, "organizing-as-lakota.lax-idempotence");
  assert.equal(lax.incumbent, 0);
  assert.equal(lax.nonTrivialTwoCell, false);
  assert.equal(lax.paraconsistent, false);
  assert.equal(lax.regime, "strict");
  assert.ok(Object.isFrozen(lax));
});

test("laxIdempotence(2): non-trivial 2-cell, paraconsistent, aperiodic", () => {
  const lax = laxIdempotence(2);
  assert.equal(lax.incumbent, 2);
  assert.equal(lax.nonTrivialTwoCell, true);
  assert.equal(lax.paraconsistent, true);
  assert.equal(lax.regime, "aperiodic");
});

test("the iff: paraconsistency tracks heyókȟa-presence exactly", () => {
  // Heyókȟa-presence ⟺ paraconsistency, at every incumbency count.
  for (const n of [0, 1, 2, 7]) {
    const lax = laxIdempotence(n);
    assert.equal(lax.paraconsistent, n > 0);
    assert.equal(lax.nonTrivialTwoCell, lax.paraconsistent);
    assert.equal(lax.regime, n > 0 ? "aperiodic" : "strict");
  }
});
