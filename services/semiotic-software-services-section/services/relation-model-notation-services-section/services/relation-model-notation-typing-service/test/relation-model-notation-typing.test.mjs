import assert from "node:assert/strict";
import test from "node:test";
import { ty, tm } from "@red-cup-engineering/relation-model-notation";
import {
  tyEqual, inferTy, checkTy, hasTy,
  termSize, termUses, isClosed,
} from "../src/index.mjs";

// ── 1. tyEqual — structural equality, including negative cases ─────────────

test("tyEqual: same shape, different object instances, is true", () => {
  assert.equal(tyEqual(ty.base(), ty.base()), true);
  assert.equal(tyEqual(ty.unit(), ty.unit()), true);
  assert.equal(
    tyEqual(ty.arrow(ty.base(), ty.unit()), ty.arrow(ty.base(), ty.unit())),
    true,
  );
  assert.equal(
    tyEqual(ty.prod(ty.list(ty.base()), ty.unit()), ty.prod(ty.list(ty.base()), ty.unit())),
    true,
  );
});

test("tyEqual: different tags are never equal", () => {
  assert.equal(tyEqual(ty.base(), ty.unit()), false);
  assert.equal(tyEqual(ty.prod(ty.base(), ty.base()), ty.list(ty.base())), false);
});

test("tyEqual: arrow/prod are order-sensitive, list element matters", () => {
  assert.equal(
    tyEqual(ty.arrow(ty.base(), ty.unit()), ty.arrow(ty.unit(), ty.base())),
    false,
  );
  assert.equal(tyEqual(ty.list(ty.base()), ty.list(ty.unit())), false);
});

// ── 2. inferTy/checkTy/hasTy on each of the 11 primitive forms ─────────────

// -- var: via context --

test("var: infers ctx[index], or null when out of range", () => {
  const ctx = [ty.base(), ty.arrow(ty.base(), ty.unit())];
  assert.deepEqual(inferTy(ctx, tm.var(0)), ty.base());
  assert.deepEqual(inferTy(ctx, tm.var(1)), ty.arrow(ty.base(), ty.unit()));
  assert.equal(inferTy(ctx, tm.var(2)), null);
  assert.equal(inferTy([], tm.var(0)), null);
});

// -- star: unit --

test("star: always infers unit", () => {
  assert.deepEqual(inferTy([], tm.star()), ty.unit());
  assert.equal(checkTy([], tm.star(), ty.unit()), true);
  assert.equal(checkTy([], tm.star(), ty.base()), false);
});

// -- mark: base --

test("mark: always infers base, regardless of payload", () => {
  assert.deepEqual(inferTy([], tm.mark("x")), ty.base());
  assert.deepEqual(inferTy([], tm.mark("anything at all")), ty.base());
});

// -- lam/app: arrow introduction and elimination --

test("lam: checkable (never inferable) against an arrow type, body checked under the extended context", () => {
  const identity = tm.lam(tm.var(0));
  assert.equal(inferTy([], identity), null); // "lam" has no inferTy case
  assert.equal(checkTy([], identity, ty.arrow(ty.base(), ty.base())), true);
  assert.equal(checkTy([], identity, ty.arrow(ty.unit(), ty.unit())), true);
  assert.equal(checkTy([], identity, ty.base()), false); // not an arrow type at all
});

test("app: bidirectional rule, branch 1 — fn-first inference via a context-bound arrow", () => {
  const ctx = [ty.arrow(ty.base(), ty.unit())];
  const term = tm.app(tm.var(0), tm.mark("m"));
  assert.deepEqual(inferTy(ctx, term), ty.unit());
  assert.equal(checkTy(ctx, term, ty.unit()), true);
  assert.equal(hasTy(ctx, term, ty.unit()), true);
});

test("app: branch 1 fails cleanly when the argument doesn't check against the domain", () => {
  const ctx = [ty.arrow(ty.base(), ty.unit())];
  const term = tm.app(tm.var(0), tm.star()); // star : unit, domain wants base
  assert.equal(inferTy(ctx, term), null);
  assert.equal(checkTy(ctx, term, ty.unit()), false);
});

test("app: bidirectional rule, branch 2 — argTy-then-infer-lam-body fallback lets inferTy see through a literal lam", () => {
  // fn (`tm.lam`) is not itself inferable, but inferTy's app case pushes the
  // argument's type onto the context and infers the lam's body directly.
  const term = tm.app(tm.lam(tm.var(0)), tm.mark("m"));
  assert.equal(inferTy([], tm.lam(tm.var(0))), null); // confirm the fn alone is not inferable
  assert.deepEqual(inferTy([], term), ty.base());
});

test("app: checkTy's own fallback succeeds where inferTy fails entirely (fn is a nested lam whose body is itself a bare lam)", () => {
  // fn = λ_.λx.x — inferTy's branch 2 requires `inferTy([argTy, ...ctx], fn[1])`
  // to succeed directly, but fn[1] is ITSELF a bare lam, which has no inferTy
  // case, so inferTy(app(fn, arg)) is null. checkTy's separate app fallback
  // instead pushes the full expected type down through checkTy(fn, arrow(argTy,
  // type)), which recurses through both lams correctly.
  const fn = tm.lam(tm.lam(tm.var(0)));
  const term = tm.app(fn, tm.mark("a"));
  const type = ty.arrow(ty.base(), ty.base());
  assert.equal(inferTy([], term), null);
  assert.equal(checkTy([], term, type), true);
  assert.equal(hasTy([], term, type), true);
});

// -- pair/fst/snd: product rules --

test("pair/fst/snd: product introduction and both projections", () => {
  const p = tm.pair(tm.mark("a"), tm.star());
  assert.deepEqual(inferTy([], p), ty.prod(ty.base(), ty.unit()));
  assert.deepEqual(inferTy([], tm.fst(p)), ty.base());
  assert.deepEqual(inferTy([], tm.snd(p)), ty.unit());
  assert.equal(checkTy([], p, ty.prod(ty.base(), ty.unit())), true);
  assert.equal(checkTy([], p, ty.prod(ty.unit(), ty.unit())), false);
});

test("fst/snd of a non-product type infer to null", () => {
  assert.equal(inferTy([], tm.fst(tm.star())), null);
  assert.equal(inferTy([], tm.snd(tm.mark("x"))), null);
});

// -- coincide: base --

test("coincide: always infers base, regardless of what's compared", () => {
  assert.deepEqual(inferTy([], tm.coincide(tm.mark("a"), tm.mark("b"))), ty.base());
  assert.deepEqual(inferTy([], tm.coincide(tm.star(), tm.mark("z"))), ty.base());
});

// -- cond: matching branch types required --

test("cond: infers the shared branch type when then/else agree", () => {
  const term = tm.cond(tm.mark("held"), tm.mark("x"), tm.mark("y"));
  assert.deepEqual(inferTy([], term), ty.base());
  assert.equal(checkTy([], term, ty.base()), true);
});

test("cond: rejects mismatched branch types", () => {
  const term = tm.cond(tm.mark("held"), tm.star(), tm.mark("y")); // unit vs base
  assert.equal(inferTy([], term), null);
  assert.equal(checkTy([], term, ty.unit()), false);
  assert.equal(checkTy([], term, ty.base()), false);
});

// -- fold: accumulator-first/element-second convention, pinned against the
//    exact swapped-argument-order bug the source comment names --

test("fold: accumulator-first/element-second — combine : B -> A -> B typechecks (B=base, A=unit, deliberately non-coinciding)", () => {
  const ctx = [ty.list(ty.unit())]; // list : List(unit)
  const list = tm.var(0);
  const init = tm.mark("seed"); // base
  // combine = λacc.λelem. acc — ignores elem, correct shape B -> A -> B.
  const combine = tm.lam(tm.lam(tm.var(1)));
  const term = tm.fold(combine, init, list);
  assert.deepEqual(inferTy(ctx, term), ty.base());
  assert.equal(checkTy(ctx, term, ty.base()), true);
});

test("fold: swapping to element-first/accumulator-second (the foldr-style A -> B -> B convention) does NOT typecheck when A and B don't coincide — pins the exact bug the source comment warns silently passes only when element and accumulator types happen to coincide", () => {
  const ctx = [ty.list(ty.unit())]; // list : List(unit), so A = unit
  const list = tm.var(0);
  const init = tm.mark("seed"); // B = base
  // combine2 = λx.λy. y — this genuinely typechecks as unit -> base -> base
  // (the foldr/element-first convention), but the source's typing rule
  // requires base -> unit -> base (accumulator-first). Since A (unit) and B
  // (base) do NOT coincide here, the swap must be caught rather than
  // accidentally accepted.
  const combine2 = tm.lam(tm.lam(tm.var(0)));
  assert.equal(checkTy([], combine2, ty.arrow(ty.unit(), ty.arrow(ty.base(), ty.base()))), true);
  const term = tm.fold(combine2, init, list);
  assert.equal(inferTy(ctx, term), null);
  assert.equal(checkTy(ctx, term, ty.base()), false);
});

test("fold: rejects a non-list third argument, and propagates a failed init/element check", () => {
  assert.equal(inferTy([], tm.fold(tm.lam(tm.lam(tm.var(0))), tm.star(), tm.mark("not-a-list"))), null);
  const ctx = [ty.list(ty.base())];
  const badCombine = tm.lam(tm.lam(tm.star())); // returns unit, not the required base
  assert.equal(inferTy(ctx, tm.fold(badCombine, tm.mark("seed"), tm.var(0))), null);
});

// ── 3. field type-checks; append does NOT — the exact gap the source names ─

test("field (from the grammar package) type-checks under this rule: a constant-accumulator search over an already-list-typed assoc spine", () => {
  // `object` must genuinely have type `list(prod(KeyTy, base))` — only a
  // context-bound variable can carry that, since no term-former in this
  // grammar synthesizes a `list` type structurally.
  const ctx = [ty.list(ty.prod(ty.base(), ty.base()))];
  const object = tm.var(0);
  const compiled = tm.field("k", object);
  assert.equal(compiled[0], "fold");
  assert.deepEqual(inferTy(ctx, compiled), ty.base());
  assert.equal(checkTy(ctx, compiled, ty.base()), true);
  assert.equal(hasTy(ctx, compiled, ty.base()), true);
});

test("tm.append does NOT type-check under this rule (the field/append gap the source comment calls out by name)", () => {
  // A small concrete append term over base-typed marks, built the same way
  // the grammar package's own append tests build one — no context needed,
  // fully closed.
  function arrayOf(tag, elements) {
    return tm.pair(tm.mark(tag), elements.reduceRight((tail, elem) => tm.pair(elem, tail), tm.star()));
  }
  const left = arrayOf("left-tag", [tm.mark("a"), tm.mark("b")]);
  const right = arrayOf("right-tag", [tm.mark("c")]);
  const appended = tm.append(left, right);
  assert.equal(appended[0], "fold");
  assert.equal(inferTy([], appended), null);
  assert.equal(checkTy([], appended, ty.base()), false);
  assert.equal(checkTy([], appended, ty.list(ty.base())), false);
  assert.equal(checkTy([], appended, ty.prod(ty.base(), ty.unit())), false);
  assert.equal(hasTy([], appended, ty.prod(ty.base(), ty.unit())), false);
});

test("reverseArray (append's own building block) is likewise untypeable: it always returns a pair-spine `prod`, never a `list`, so fold's own list-position check can never be satisfied by it", () => {
  function arrayOf(tag, elements) {
    return tm.pair(tm.mark(tag), elements.reduceRight((tail, elem) => tm.pair(elem, tail), tm.star()));
  }
  const array = arrayOf("t", [tm.mark("e0"), tm.mark("e1")]);
  assert.equal(inferTy([], tm.reverseArray(array)), null);
});

// ── 4. termSize, termUses, isClosed ─────────────────────────────────────────

test("termSize: leaves are size 1", () => {
  assert.equal(termSize(tm.var(0)), 1);
  assert.equal(termSize(tm.star()), 1);
  assert.equal(termSize(tm.mark("x")), 1);
});

test("termSize: single-child forms are 1 + child size", () => {
  const child = tm.mark("x");
  assert.equal(termSize(tm.lam(child)), 1 + termSize(child));
  assert.equal(termSize(tm.fst(child)), 1 + termSize(child));
  assert.equal(termSize(tm.snd(child)), 1 + termSize(child));
});

test("termSize: two-child forms are 1 + left + right", () => {
  const a = tm.mark("a");
  const b = tm.star();
  assert.equal(termSize(tm.app(a, b)), 1 + termSize(a) + termSize(b));
  assert.equal(termSize(tm.pair(a, b)), 1 + termSize(a) + termSize(b));
  assert.equal(termSize(tm.coincide(a, b)), 1 + termSize(a) + termSize(b));
});

test("termSize: three-child forms (cond, fold) sum all three, recursively through a nested term", () => {
  const combine = tm.lam(tm.lam(tm.pair(tm.var(0), tm.var(1))));
  const init = tm.star();
  const list = tm.mark("l");
  const foldTerm = tm.fold(combine, init, list);
  assert.equal(termSize(foldTerm), 1 + termSize(combine) + termSize(init) + termSize(list));

  const test_ = tm.mark("t");
  const then = tm.pair(tm.star(), tm.star());
  const otherwise = tm.mark("o");
  const condTerm = tm.cond(test_, then, otherwise);
  assert.equal(termSize(condTerm), 1 + termSize(test_) + termSize(then) + termSize(otherwise));
});

test("termUses: collects every distinct tag reachable, sorted, deduping repeats", () => {
  assert.deepEqual(termUses(tm.star()), ["star"]);
  const term = tm.app(tm.lam(tm.var(0)), tm.mark("x"));
  assert.deepEqual(termUses(term), ["app", "lam", "mark", "var"]);
});

test("termUses: a term touching all 11 forms reports exactly those 11 tags, sorted, and is frozen", () => {
  const kitchenSink = tm.fold(
    tm.lam(tm.app(tm.var(0), tm.mark("m"))),
    tm.cond(
      tm.coincide(tm.star(), tm.star()),
      tm.fst(tm.pair(tm.star(), tm.star())),
      tm.snd(tm.pair(tm.star(), tm.star())),
    ),
    tm.var(0),
  );
  const uses = termUses(kitchenSink);
  assert.deepEqual(uses, [
    "app", "coincide", "cond", "fold", "fst", "lam", "mark", "pair", "snd", "star", "var",
  ]);
  assert.equal(Object.isFrozen(uses), true);
});

test("isClosed: a bare top-level var is free (not closed)", () => {
  assert.equal(isClosed(tm.var(0)), false);
  assert.equal(isClosed(tm.var(5)), false);
});

test("isClosed: a var bound by its own immediate lam is closed", () => {
  assert.equal(isClosed(tm.lam(tm.var(0))), true);
});

test("isClosed: a var escaping one binder (referring one level further out) is not closed", () => {
  assert.equal(isClosed(tm.lam(tm.var(1))), false);
});

test("isClosed: nested binders — depth tracks correctly across two lams (var(1) inside a double lam is bound by the immediately-enclosing lam, not free)", () => {
  assert.equal(isClosed(tm.lam(tm.lam(tm.var(1)))), true);
  // var(2) inside the same double lam escapes both binders — not closed.
  assert.equal(isClosed(tm.lam(tm.lam(tm.var(2)))), false);
  // three deep: var(2) is bound by the outermost of the three lams.
  assert.equal(isClosed(tm.lam(tm.lam(tm.lam(tm.var(2))))), true);
  assert.equal(isClosed(tm.lam(tm.lam(tm.lam(tm.var(3))))), false);
});

test("isClosed: each branch of a multi-child form is checked at the same depth independently (one free branch is enough to make the whole term open)", () => {
  assert.equal(isClosed(tm.pair(tm.lam(tm.var(0)), tm.var(0))), false); // right branch free
  assert.equal(isClosed(tm.pair(tm.lam(tm.var(0)), tm.lam(tm.var(0)))), true); // both closed
  assert.equal(
    isClosed(tm.cond(tm.mark("t"), tm.lam(tm.var(0)), tm.var(0))),
    false, // else-branch free
  );
});

test("isClosed: star and mark are always closed regardless of depth", () => {
  assert.equal(isClosed(tm.lam(tm.lam(tm.lam(tm.star())))), true);
  assert.equal(isClosed(tm.mark("x")), true);
});
