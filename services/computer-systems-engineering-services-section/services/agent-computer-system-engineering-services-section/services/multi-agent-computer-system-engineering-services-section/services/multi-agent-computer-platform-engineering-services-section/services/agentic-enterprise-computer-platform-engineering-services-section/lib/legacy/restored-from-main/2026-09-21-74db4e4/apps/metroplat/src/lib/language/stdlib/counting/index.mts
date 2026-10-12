/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/metroplat/core/language/stdlib/counting` exports von Neumann naturals as RMN
 * terms.
 *
 * An metroplat Natural is the von Neumann ordinal `{ kind: "exactNumber.natural",
 * members: [naturals below it] }`. These rebuild metroplat's exact-number
 * serialization, differential-checked against `analysis.count`/`successor`.
 *
 * Product reading: exact natural-number construction is available as portable
 * term data. Counting can therefore appear inside reader terms and action
 * bodies without becoming an opaque TypeScript helper.
 */
import { type Tm, tm } from "../../ast/index.mts";
import { objectTerm, arrayTerm, stringTerm } from "../../reader/projecting/index.mts";

/** The von Neumann zero `{ kind: "exactNumber.natural", members: [] }`. */
export const natZeroTerm = objectTerm([
  ["kind", stringTerm("exactNumber.natural")],
  ["members", arrayTerm([])],
]);

/** The von Neumann successor `n ↦ n ∪ {n}`, as a term over a natural-term `n`.
 *
 *  `n` goes at the END of `members` (ascending order: `core/closure/analysis/
 *  exact-number.mts`'s `natLess`/`natLeq` iterate both naturals' members in
 *  lockstep until one exhausts, and finding the largest member takes the
 *  last one in iteration order — this is load-bearing, not cosmetic). There
 *  is no `append` primitive to reach for (see `tm.consArray`'s doc); "insert
 *  at the end" is `reverseArray(consArray(x, reverseArray(list)))` — reverse,
 *  cons onto the front, reverse back — the same two-pass cost `append` always
 *  had for this call, just composed from the two primitives that actually
 *  exist instead of a third one that didn't correspond to anything. */
export function successorTerm(n: Tm) {
  return objectTerm([
    ["kind", stringTerm("exactNumber.natural")],
    ["members", tm.reverseArray(tm.consArray(n, tm.reverseArray(tm.field("members", n))))],
  ]);
}

/** `λacc.λ_. successor(acc)` — the one step every fold-over-naturals reduces to;
 *  shared by `count` (folds a list) and `add` (folds a natural's own members). */
const successorStepTerm: Tm = tm.lam(tm.lam(successorTerm(tm.var(1))));

/** `count`: the natural whose value is a list's length — `fold (λacc.λ_. succ acc) 0`. */
export const countTerm = tm.lam(
  tm.fold(
    successorStepTerm,
    natZeroTerm,
    tm.var(0),
  ),
);

/**
 * `add`: `a + b` by primitive recursion on `b`, matching
 * `core/closure/analysis/exact-number.mts`'s `natAdd` (successor `a`, once per
 * member of `b`) exactly — but composed, not reimplemented: `b`'s own
 * `members` array already has exactly `b`'s value many entries, a von Neumann
 * natural's member count being its value, so folding the shared successor
 * step over `field("members", b)` needs no new primitive.
 */
export const natAddTerm = tm.lam(tm.lam(
  tm.fold(successorStepTerm, tm.var(1), tm.field("members", tm.var(0))),
));

/** `isZero`: a natural has no members — `coincide` against `natZero` suffices
 *  because the von Neumann encoding is canonical (equal value, equal JSON). */
export const natIsZeroTerm: Tm = tm.lam(tm.coincide(tm.var(0), natZeroTerm));

/**
 * `leq a b`: matches `core/closure/analysis/exact-number.mts`'s `natLeq` (`!membersExhaustFirst(b,a)`)
 * exactly, composed rather than reimplemented: fold over `a`'s members, carrying `(stillOk, remaining)`
 * where `remaining` is `b`'s own member spine; each step either pops one element off `remaining` (if
 * it isn't exhausted yet) or flips `stillOk` false and stays exhausted (once `remaining` hits `star`,
 * every later step re-detects `star` and re-sets the same false/`star` pair). `a ≤ b` iff `remaining`
 * never ran out before `a`'s own members did — exactly `!membersExhaustFirst(b, a)`.
 */
const natLeqStepTerm: Tm = tm.lam(tm.lam(
  tm.cond(
    tm.coincide(tm.snd(tm.var(1)), tm.star()),
    tm.pair(tm.bool(false), tm.star()),
    tm.pair(tm.fst(tm.var(1)), tm.snd(tm.snd(tm.var(1)))),
  ),
));

export const natLeqTerm: Tm = tm.lam(tm.lam(
  tm.fst(tm.fold(
    natLeqStepTerm,
    tm.pair(tm.bool(true), tm.snd(tm.field("members", tm.var(0)))),
    tm.field("members", tm.var(1)),
  )),
));

/** `less a b := ¬(leq b a)` — matches `natLess` (`membersExhaustFirst(a,b)`): `a`'s members run out
 *  strictly before `b`'s iff it is not the case that `b ≤ a`. */
export const natLessTerm: Tm = tm.lam(tm.lam(
  tm.cond(tm.app(tm.app(natLeqTerm, tm.var(0)), tm.var(1)), tm.bool(false), tm.bool(true)),
));
