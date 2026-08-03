import assert from "node:assert/strict";
import test from "node:test";
import { tm } from "@red-cup-engineering/relation-model-notation";
import { arrayTerm, jsonToTerm, termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { step, dev, normalize, evaluate, evaluateRunTerm } from "../src/index.mjs";
// Track A's expected values below were originally proven byte-for-byte
// identical to the real, compiled metroplat build of the module this package
// ports, via a live differential comparison against that dist file — the
// load-bearing evidence that the port is behaviorally identical to the
// running legacy engine, not merely structurally similar. That evidence is
// preserved in this package's own commit history; metroplat has since been
// deleted, so these tests now assert the same hard-coded expected values
// directly instead of re-deriving them from a live comparison.

// =============================================================================
// Track A — hard-coded expectations, previously proven identical to
// metroplat's real compiled dist build (see commit history for the diff).
// =============================================================================

// ── A1. CHL-core-only terms: var/lam/app/pair/fst/snd/star ─────────────────

const identity = tm.lam(tm.var(0));
const constTrue = tm.lam(tm.lam(tm.var(1)));

const chlCoreBattery = [
  // bare forms
  tm.var(0),
  tm.star(),
  tm.mark("x"),
  identity,
  // a single beta-redex
  tm.app(identity, tm.mark("payload")),
  // a stuck application (fn not a lam) — no top redex, only congruence
  tm.app(tm.var(0), tm.mark("arg")),
  // nested beta-redexes: reducing the outer exposes another already-present one
  tm.app(tm.app(constTrue, tm.mark("a")), tm.mark("b")),
  // pair / fst / snd, including a redex under a projection
  tm.pair(tm.mark("l"), tm.mark("r")),
  tm.fst(tm.pair(tm.mark("l"), tm.mark("r"))),
  tm.snd(tm.pair(tm.mark("l"), tm.mark("r"))),
  tm.fst(tm.pair(tm.app(identity, tm.mark("l")), tm.mark("r"))),
  // TWO independently-reducible redexes in the same term at once — this is
  // where step's non-determinism (it must return BOTH one-step reducts) and
  // dev's "all current redexes at once" behavior (it must fire BOTH in a
  // single call) actually get exercised.
  tm.pair(tm.app(identity, tm.mark("left")), tm.app(identity, tm.mark("right"))),
  // THREE independently-reducible redexes, nested two levels deep
  tm.pair(
    tm.app(identity, tm.mark("x")),
    tm.pair(tm.app(identity, tm.mark("y")), tm.app(identity, tm.mark("z"))),
  ),
  // nested pair/fst/snd combination
  tm.fst(tm.snd(tm.pair(tm.star(), tm.pair(tm.app(identity, tm.mark("deep")), tm.mark("other"))))),
];

test("Track A / step: the two-independent-redex pair returns exactly two one-step reducts", () => {
  const twoRedexes = tm.pair(tm.app(identity, tm.mark("left")), tm.app(identity, tm.mark("right")));
  const mine = step(twoRedexes);
  assert.equal(mine.length, 2);
  assert.deepEqual(mine, [
    tm.pair(tm.mark("left"), tm.app(identity, tm.mark("right"))),
    tm.pair(tm.app(identity, tm.mark("left")), tm.mark("right")),
  ]);
});

test("Track A / dev: firing every present redex of a multi-redex term in one call", () => {
  const twoRedexes = tm.pair(tm.app(identity, tm.mark("left")), tm.app(identity, tm.mark("right")));
  assert.deepEqual(dev(twoRedexes), tm.pair(tm.mark("left"), tm.mark("right")));
});

test("Track A / normalize and evaluate: evaluate agrees with normalize across the CHL-core battery", () => {
  for (const term of chlCoreBattery) {
    assert.deepEqual(evaluate(term), normalize(term));
  }
});

// ── A2. domain-extension terms: mark/coincide/cond/fold ────────────────────

test("Track A / coincide: settles matching pairs to true, mismatching pairs to false, and reduces both sides under a redex before comparing", () => {
  const matching = tm.coincide(tm.mark("x"), tm.mark("x"));
  const mismatching = tm.coincide(tm.mark("x"), tm.mark("y"));
  const underRedex = tm.coincide(tm.app(identity, tm.mark("x")), tm.mark("x"));
  assert.deepEqual(normalize(matching), tm.bool(true));
  assert.deepEqual(normalize(mismatching), tm.bool(false));
  assert.deepEqual(normalize(underRedex), tm.bool(true));
});

test("Track A / cond: dispatches on a settled boolean test, including when the test itself needs reduction first", () => {
  const settledTrue = tm.cond(tm.bool(true), tm.mark("then"), tm.mark("else"));
  const settledFalse = tm.cond(tm.bool(false), tm.mark("then"), tm.mark("else"));
  const testUnderRedex = tm.cond(
    tm.coincide(tm.app(identity, tm.mark("x")), tm.mark("x")),
    tm.mark("then"),
    tm.mark("else"),
  );
  assert.deepEqual(normalize(settledTrue), tm.mark("then"));
  assert.deepEqual(normalize(settledFalse), tm.mark("else"));
  assert.deepEqual(normalize(testUnderRedex), tm.mark("then"));
});

test("Track A / cond+coincide chain shaped like tm.charge/tm.negate's own chargeCase dispatch: negate is an involution across every charge name", () => {
  // negate is an involution: held/denied swap, unknown/contested are fixed points
  assert.deepEqual(normalize(tm.negate(tm.charge("held"))), tm.charge("denied"));
  assert.deepEqual(normalize(tm.negate(tm.charge("denied"))), tm.charge("held"));
  assert.deepEqual(normalize(tm.negate(tm.charge("unknown"))), tm.charge("unknown"));
  assert.deepEqual(normalize(tm.negate(tm.charge("contested"))), tm.charge("contested"));
});

test("Track A / fold over a real array-encoded list built via arrayTerm: empty, singleton, and multi-element lists", () => {
  // combine = λacc.λelem. pair(elem, acc) — builds a reversed cons chain, the
  // simplest combine whose output is easy to eyeball for a sanity check.
  const combine = tm.lam(tm.lam(tm.pair(tm.var(0), tm.var(1))));
  const emptyList = arrayTerm([]);
  const oneItemList = arrayTerm([tm.mark("x")]);
  const threeItemList = arrayTerm([tm.mark("x"), tm.mark("y"), tm.mark("z")]);

  assert.deepEqual(normalize(tm.fold(combine, tm.star(), emptyList)), tm.star());
  assert.deepEqual(normalize(tm.fold(combine, tm.star(), oneItemList)), tm.pair(tm.mark("x"), tm.star()));
  // sanity: reversed cons chain over [x, y, z] is pair(z, pair(y, pair(x, star)))
  assert.deepEqual(
    normalize(tm.fold(combine, tm.star(), threeItemList)),
    tm.pair(tm.mark("z"), tm.pair(tm.mark("y"), tm.pair(tm.mark("x"), tm.star()))),
  );
});

test("Track A / fold via tm.field/tm.append (fold compositions built in the grammar layer)", () => {
  const object = jsonToTerm({ a: "alpha", b: "beta", c: "gamma" });
  const fieldTerm = tm.field("b", object);
  assert.equal(termToJson(normalize(fieldTerm)), "beta");

  // tm.mark's payload is decoded by termToJson via JSON.parse (see
  // markString/parse in the projecting package) — a bare numeral string like
  // "1" therefore decodes back out as the NUMBER 1, not the string "1". Using
  // numeral marks here doubles as a reminder of that decoding rule, not a
  // string round trip.
  const left = arrayTerm([tm.mark("1"), tm.mark("2")]);
  const right = arrayTerm([tm.mark("3"), tm.mark("4")]);
  const appended = tm.append(left, right);
  assert.deepEqual(termToJson(normalize(appended)), [1, 2, 3, 4]);
});

// ── A3. evaluateRunTerm: JSON round-tripped through a small runTerm ────────

test("Track A / evaluateRunTerm: an identity runTerm round-trips JSON input", () => {
  const runTerm = tm.lam(tm.var(0));
  const inputs = [
    null,
    true,
    false,
    42,
    "hello",
    [1, 2, 3],
    { a: 1, b: [2, 3], c: { d: "nested" } },
  ];
  for (const input of inputs) {
    const mine = evaluateRunTerm(runTerm, input);
    assert.deepEqual(mine, input);
  }
});

test("Track A / evaluateRunTerm: a field-projecting runTerm returns the projected field", () => {
  const runTerm = tm.lam(tm.field("name", tm.var(0)));
  const input = { name: "held", other: [1, 2, 3] };
  assert.equal(evaluateRunTerm(runTerm, input), "held");
});

// =============================================================================
// Track B — hand-verified against RelMath/CurryHowardLambekQuartet.lean's own
// `dev` definition, for the CHL-core fragment only (var/lam/app/pair/fst/snd/
// star — Lean's `Tm` has no mark/coincide/cond/fold, so this comparison is
// scoped to terms built from those 7 forms exactly).
//
// Lean's `dev` (RelMath/CurryHowardLambekQuartet.lean, around line 567):
//
//   def dev : Tm → Tm
//     | var n => var n
//     | star => star
//     | lam t => lam (dev t)
//     | app (lam t) u => inst (dev t) (dev u)
//     | app t u => app (dev t) (dev u)
//     | pair t u => pair (dev t) (dev u)
//     | fst (pair a b) => dev a
//     | fst t => fst (dev t)
//     | snd (pair a b) => dev b
//     | snd t => snd (dev t)
//
// and `inst t u := subst (sub0 u) t` where `sub0 u 0 = u`, `sub0 u (n+1) = var n`
// (RelMath/CurryHowardLambekQuartet.lean, `subst`/`sub0`/`inst`, around lines
// 143-159). The ported JS `dev`/`inst` (src/index.mjs) is checked below against
// expected terms computed by hand, tracing this exact Lean definition — not by
// running the JS and eyeballing the output, and not by running a Lean toolchain.
// =============================================================================

test("Track B / dev: (λx. x) (λy. y) — a single top-level beta-redex, no other redexes present", () => {
  // term = app (lam (var 0)) (lam (var 0))
  // Lean: app (lam t) u => inst (dev t) (dev u), with t = var 0, u = lam (var 0)
  //   dev t = dev (var 0) = var 0            [dev's `var n => var n` case]
  //   dev u = dev (lam (var 0)) = lam (dev (var 0)) = lam (var 0)   [`lam` case, body already a var]
  //   inst (var 0) (lam (var 0)) = subst (sub0 (lam (var 0))) (var 0)
  //                               = (sub0 (lam (var 0))) 0
  //                               = lam (var 0)                    [sub0 u 0 = u]
  // so dev(term) = lam (var 0) — i.e. the identity function survives unchanged,
  // exactly what beta-reducing (λx.x)(λy.y) should produce.
  const term = tm.app(tm.lam(tm.var(0)), tm.lam(tm.var(0)));
  const expected = tm.lam(tm.var(0));
  assert.deepEqual(dev(term), expected);
});

test("Track B / dev: pair(app(λ.x, v5), app(λ.x, v7)) — two independently-reducible redexes, both fired by ONE dev call (not iteratively)", () => {
  // term = pair (app (lam (var 0)) (var 5)) (app (lam (var 0)) (var 7))
  // Lean: pair t u => pair (dev t) (dev u) — dev recurses into BOTH branches
  // independently and returns their results paired, i.e. both branches'
  // redexes are resolved within this single top-level call to dev.
  //   dev (app (lam (var 0)) (var 5)):
  //     app (lam t) u => inst (dev t) (dev u), t = var 0, u = var 5
  //     dev t = var 0, dev u = var 5
  //     inst (var 0) (var 5) = (sub0 (var 5)) 0 = var 5
  //   => var 5
  //   dev (app (lam (var 0)) (var 7)) => var 7, by the identical computation
  // so dev(term) = pair (var 5) (var 7).
  //
  // Contrast with `step`, which is single-redex non-deterministic: it must
  // offer the two reducts SEPARATELY (reduce the left OR the right, not both),
  // which is exactly what distinguishes dev's simultaneous "complete
  // development" from step's one-redex-at-a-time relation.
  const left = tm.app(tm.lam(tm.var(0)), tm.var(5));
  const right = tm.app(tm.lam(tm.var(0)), tm.var(7));
  const term = tm.pair(left, right);

  const expectedDev = tm.pair(tm.var(5), tm.var(7));
  assert.deepEqual(dev(term), expectedDev);

  const expectedStepReducts = [
    tm.pair(tm.var(5), right),
    tm.pair(left, tm.var(7)),
  ];
  assert.deepEqual(step(term), expectedStepReducts);
});

test("Track B / dev: fst(pair(app(λ.x, v9), star)) — the fst-pair rule dev's ONLY the selected branch, discarding the other branch's work entirely", () => {
  // term = fst (pair (app (lam (var 0)) (var 9)) star)
  // Lean: fst (pair a b) => dev a  — note this is `dev a`, not `dev (fst (pair (dev a) (dev b)))`
  // or any variant that also computes dev b: the non-selected branch (`star`
  // here) is never touched at all, by the literal shape of the Lean equation.
  //   a = app (lam (var 0)) (var 9)
  //   dev a: app (lam t) u => inst (dev t) (dev u), t = var 0, u = var 9
  //     dev t = var 0, dev u = var 9, inst (var 0) (var 9) = var 9
  // so dev(term) = var 9.
  const term = tm.fst(tm.pair(tm.app(tm.lam(tm.var(0)), tm.var(9)), tm.star()));
  const expected = tm.var(9);
  assert.deepEqual(dev(term), expected);
});

test("Track B / dev: fst(snd(pair(star, pair(app(λ.x, v4), v8)))) — dev does NOT chase a redex it just created one level up", () => {
  // term = fst (snd (pair star (pair (app (lam (var 0)) (var 4)) (var 8))))
  // Top form is `fst t` where t = snd (...) — t is NOT syntactically `pair _ _`
  // (it's a `snd`), so Lean's `fst t => fst (dev t)` case applies (not the
  // `fst (pair a b) => dev a` case) — dev only pattern-matches on the term's
  // OWN top constructor as written, never on what that subterm reduces to.
  //   dev t = dev (snd (pair star (pair (app (lam (var 0)) (var 4)) (var 8))))
  //   the argument of this snd IS syntactically `pair a b` with
  //     a = star, b = pair (app (lam (var 0)) (var 4)) (var 8)
  //   so Lean's `snd (pair a b) => dev b` applies:
  //     dev b = dev (pair (app (lam (var 0)) (var 4)) (var 8))
  //           = pair (dev (app (lam (var 0)) (var 4))) (dev (var 8))
  //     dev (app (lam (var 0)) (var 4)) = inst (var 0) (var 4) = var 4  [as above]
  //     dev (var 8) = var 8
  //   => dev b = pair (var 4) (var 8)
  //   so dev t = pair (var 4) (var 8)
  // and dev(term) = fst (dev t) = fst (pair (var 4) (var 8))
  //
  // Crucially this is NOT var 4: `fst (pair (var 4) (var 8))` is now itself a
  // present redex (fst applied to a syntactic pair), but this single call to
  // dev already returned before reaching it — it fired every redex that was
  // present in the ORIGINAL term, not redexes its own rewriting exposed
  // afterward. `normalize`, by contrast, would keep going and collapse this
  // all the way to `var 4` — that distinction is the entire point of `dev`
  // versus `normalize`, and this is the concrete case that pins it down.
  const term = tm.fst(tm.snd(tm.pair(
    tm.star(),
    tm.pair(tm.app(tm.lam(tm.var(0)), tm.var(4)), tm.var(8)),
  )));
  const expectedDev = tm.fst(tm.pair(tm.var(4), tm.var(8)));
  assert.deepEqual(dev(term), expectedDev);

  // normalize on the SAME term goes the rest of the way, confirming dev really
  // did stop one step short of full normal form here.
  assert.deepEqual(normalize(term), tm.var(4));
});
