import test from "node:test";
import assert from "node:assert/strict";
import {
  fuse, implies, leqTruth, joinTruth,
  TRUE, FALSE, TOP, BOTTOM,
} from "./index.mjs";
import type { GrammaticalCharge } from "./index.mjs";

const FOUR: readonly GrammaticalCharge[] = [BOTTOM, FALSE, TRUE, TOP];
const eq = (a: GrammaticalCharge, b: GrammaticalCharge) => a.value === b.value;

test("⊙/⇒ are adjoint: a ⊙ b ≤_t c  ⇔  a ≤_t (b ⇒ c)  (all 64 triples)", () => {
  for (const a of FOUR) for (const b of FOUR) for (const c of FOUR) {
    assert.equal(
      leqTruth(fuse(a, b), c),
      leqTruth(a, implies(b, c)),
      `adjunction failed at a=${a.value} b=${b.value} c=${c.value}`,
    );
  }
});

test("fuse is a commutative monoid with unit TRUE", () => {
  for (const a of FOUR) {
    assert.ok(eq(fuse(TRUE, a), a), `unit failed: TRUE ⊙ ${a.value}`);
    for (const b of FOUR) {
      assert.ok(eq(fuse(a, b), fuse(b, a)), `commutativity ${a.value},${b.value}`);
      for (const c of FOUR) {
        assert.ok(eq(fuse(fuse(a, b), c), fuse(a, fuse(b, c))), `associativity`);
      }
    }
  }
});

test("named grammar cases: FALSE absorbs under ⊙; TRUE passes through ⇒", () => {
  for (const b of FOUR) assert.ok(eq(fuse(FALSE, b), FALSE), `FALSE ⊙ ${b.value} ≠ FALSE`);
  for (const c of FOUR) assert.ok(eq(implies(TRUE, c), c), `TRUE ⇒ ${c.value} ≠ ${c.value}`);
});

test("leqTruth orders the truth axis: active <_t {absurd,stable} <_t potential", () => {
  assert.ok(leqTruth(FALSE, BOTTOM) && leqTruth(BOTTOM, TRUE));
  assert.ok(leqTruth(FALSE, TOP) && leqTruth(TOP, TRUE));
  assert.ok(!leqTruth(BOTTOM, TOP) && !leqTruth(TOP, BOTTOM)); // incomparable middle
  // joinTruth is the ≤_t lub
  assert.equal(joinTruth(FALSE, TRUE).value, TRUE.value);
});
