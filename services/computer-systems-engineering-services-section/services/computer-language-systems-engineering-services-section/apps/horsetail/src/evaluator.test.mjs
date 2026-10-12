// evaluator.test.mjs — 40 proofs covering the Horsetail evaluator.
import assert from "node:assert/strict";
import test from "node:test";
import { world, run, step } from "./index.mjs";
import { isTop, isBottom, isAffirmed, isDenied, valueOf, seqFrom, readingOf } from "./value.mjs";
import { read, readAll, write } from "./reader.mjs";

// ── reader ────────────────────────────────────────────────────────────────────

test("reader: point literals", () => {
  const w = world();
  assert.equal(readingOf(run("t", w)), "potential");
  assert.equal(readingOf(run("f", w)), "active");
  assert.equal(readingOf(run("⊥", w)), "absurd");
  assert.equal(readingOf(run("⊤", w)), "stable");
  assert.equal(readingOf(run("bot", w)), "absurd");
  assert.equal(readingOf(run("top", w)), "stable");
});

test("reader: numbers", () => {
  const w = world();
  assert.equal(valueOf(run("42", w)), 42);
  assert.equal(valueOf(run("3.14", w)), 3.14);
  assert.equal(valueOf(run("-7", w)), -7);
});

test("reader: strings", () => {
  const w = world();
  assert.equal(valueOf(run('"hello"', w)), "hello");
  assert.equal(valueOf(run('"line\\nnewline"', w)), "line\nnewline");
});

test("reader: symbols", () => {
  const r = read("some-name");
  assert(r.kind === "sym");
  assert.equal(r.name, "some-name");
});

test("reader: cells", () => {
  const r = read("(foo bar baz)");
  assert(r.kind === "cell");
  assert.equal(r.items.length, 3);
});

test("reader: nested cells", () => {
  const r = read("(a (b c) d)");
  assert(r.kind === "cell");
  const inner = r.items[1];
  assert(inner?.kind === "cell");
  assert.equal(inner.items.length, 2);
});

test("reader: quote shorthand", () => {
  const r = read("'x");
  assert(r.kind === "cell");
  assert(r.items[0]?.kind === "sym" && r.items[0].name === "quote");
});

test("reader: write round-trips", () => {
  const forms = ["t", "f", "⊥", "⊤", "42", '"hello"', "some-sym", "(a b c)", "(a (b c))"];
  for (const src of forms) {
    assert.equal(write(read(src)), src, `round-trip failed for: ${src}`);
  }
});

// ── self-evaluating ───────────────────────────────────────────────────────────

test("eval: number self-evaluates", () => {
  assert.equal(valueOf(run("99", world())), 99);
});

test("eval: string self-evaluates", () => {
  assert.equal(valueOf(run('"world"', world())), "world");
});

test("eval: point literals self-evaluate", () => {
  const w = world();
  assert(isAffirmed(run("t", w)) && !isDenied(run("t", w)));
  assert(!isAffirmed(run("f", w)) && isDenied(run("f", w)));
  assert(isBottom(run("⊥", w)));
  assert(isTop(run("⊤", w)));
});

// ── define + lookup ───────────────────────────────────────────────────────────

test("eval: define and recall", () => {
  const w = world();
  run("(define x 42)", w);
  assert.equal(valueOf(run("x", w)), 42);
});

test("eval: define with fn shorthand", () => {
  const w = world();
  run("(define (double n) (+ n n))", w);
  assert.equal(valueOf(run("(double 21)", w)), 42);
});

test("eval: redefine overwrites in env", () => {
  const w = world();
  run("(define x 1)", w);
  run("(define x 2)", w);
  assert.equal(valueOf(run("x", w)), 2);
});

// ── fn + call ─────────────────────────────────────────────────────────────────

test("eval: fn creation and call", () => {
  const w = world();
  run("(define add (fn (a b) (+ a b)))", w);
  assert.equal(valueOf(run("(add 3 4)", w)), 7);
});

test("eval: fn closure captures env", () => {
  const w = world();
  run("(define x 10)", w);
  run("(define addX (fn (n) (+ n x)))", w);
  assert.equal(valueOf(run("(addX 5)", w)), 15);
});

test("eval: varargs fn", () => {
  const w = world();
  run("(define (first . args) (seq-head args))", w);
  assert.equal(valueOf(run("(first 1 2 3)", w)), 1);
});

test("eval: recursive fn", () => {
  const w = world();
  run("(define (fact n) (if (= n 0) 1 (* n (fact (- n 1)))))", w);
  assert.equal(valueOf(run("(fact 5)", w)), 120);
});

// ── let ───────────────────────────────────────────────────────────────────────

test("eval: let local bindings", () => {
  const w = world();
  assert.equal(valueOf(run("(let ((x 3) (y 4)) (+ x y))", w)), 7);
});

test("eval: let sequential bindings", () => {
  const w = world();
  assert.equal(valueOf(run("(let ((x 5) (y (* x 2))) y)", w)), 10);
});

// ── conditionals ──────────────────────────────────────────────────────────────

test("eval: if true branch", () => {
  assert.equal(valueOf(run("(if t 1 2)", world())), 1);
});

test("eval: if false branch", () => {
  assert.equal(valueOf(run("(if f 1 2)", world())), 2);
});

test("eval: if ⊤ runs both branches (knowledge-join)", () => {
  const r = run("(if ⊤ 1 2)", world());
  assert(isTop(r));
});

test("eval: when false returns ⊥", () => {
  assert(isBottom(run("(when f 42)", world())));
});

test("eval: cond first match wins", () => {
  const w = world();
  assert.equal(valueOf(run("(cond (f 1) (t 2) (t 3))", w)), 2);
});

// ── match ─────────────────────────────────────────────────────────────────────

test("eval: match wildcard", () => {
  assert.equal(valueOf(run("(match 99 (_ 42))", world())), 42);
});

test("eval: match binder", () => {
  assert.equal(valueOf(run("(match 7 (?n n))", world())), 7);
});

test("eval: match literal", () => {
  const w = world();
  assert.equal(valueOf(run('(match "hi" ("hi" 1) ("bye" 2))', w)), 1);
});

test("eval: match no-match returns ⊥", () => {
  assert(isBottom(run('(match "x" ("y" 1))', world())));
});

test("eval: match ⊤ subject runs arm and knowledge-combines TOP", () => {
  const w = world();
  // Build a ⊤ value and match on it
  const r = run("(match ⊤ (⊤ 99))", w);
  assert(isTop(r)); // ⊤ match: arm result combined with TOP
});

test("eval: match dotted-tail sequence pattern binds rest", () => {
  const w = world();
  const r = run("(match (seq 1 2 3 4) ((?h . ?t) h))", w);
  assert.equal(valueOf(r), 1);
});

test("eval: match dotted-tail captures tail as seq", () => {
  const w = world();
  // Note: ?t would bind name "t" which collides with the point-literal t; use ?rest
  const r = run("(match (seq 1 2 3) ((?h . ?rest) (seq-len rest)))", w);
  assert.equal(valueOf(r), 2); // tail has 2 elements
});

test("eval: match or pattern returns first success", () => {
  assert.equal(valueOf(run("(match 2 ((or 1 2 3) 99))", world())), 99);
});

test("eval: match and pattern requires all", () => {
  assert(isBottom(run("(match 5 ((and 5 6) 99))", world())));
  assert.equal(valueOf(run("(match 5 ((and 5 5) 99))", world())), 99);
});

// ── KB operations ─────────────────────────────────────────────────────────────

test("eval: assert + recall (2-arg)", () => {
  const w = world();
  run('(assert "socrates" "mortal")', w);
  const c = run('(recall "socrates" "mortal")', w);
  assert(isAffirmed(c));
});

test("eval: deny + recall returns active", () => {
  const w = world();
  run('(deny "sky" "green")', w);
  const c = run('(recall "sky" "green")', w);
  assert(isDenied(c) && !isAffirmed(c));
});

test("eval: assert + deny yields ⊤", () => {
  const w = world();
  run('(assert "sky" "blue")', w);
  run('(deny "sky" "blue")', w);
  const c = run('(recall "sky" "blue")', w);
  assert(isTop(c));
});

test("eval: recall of unknown cell is ⊥", () => {
  const c = run('(recall "nobody" "nothing")', world());
  assert(isBottom(c));
});

test("eval: assert 3-arg form", () => {
  const w = world();
  run('(assert "sky" "has" "blue")', w);
  const c = run('(recall "sky" "has" "blue")', w);
  assert(isAffirmed(c));
});

// ── threading ─────────────────────────────────────────────────────────────────

test("eval: -> thread-first", () => {
  const w = world();
  assert.equal(valueOf(run("(-> 1 (+ 2) (+ 3))", w)), 6);
});

test("eval: ->> thread-last", () => {
  const w = world();
  assert.equal(valueOf(run("(->> 10 (- 3))", w)), -7);
});

test("eval: -?> short-circuits on ⊥", () => {
  const w = world();
  run("(define (safe-head s) (seq-head s))", w);
  const r = run("(-?> ⊥ (+ 1))", w);
  assert(isBottom(r));
});

// ── arithmetic ────────────────────────────────────────────────────────────────

test("eval: arithmetic ops", () => {
  const w = world();
  assert.equal(valueOf(run("(+ 2 3)", w)), 5);
  assert.equal(valueOf(run("(- 10 4)", w)), 6);
  assert.equal(valueOf(run("(* 3 7)", w)), 21);
  assert.equal(valueOf(run("(/ 10 2)", w)), 5);
  assert.equal(valueOf(run("(% 10 3)", w)), 1);
});

test("eval: comparison ops", () => {
  const w = world();
  assert(isAffirmed(run("(= 1 1)", w)));
  assert(!isAffirmed(run("(= 1 2)", w)));
  assert(isAffirmed(run("(< 1 2)", w)));
  assert(!isAffirmed(run("(> 1 2)", w)));
});

// ── sequences ─────────────────────────────────────────────────────────────────

test("eval: seq construction and access", () => {
  const w = world();
  const r = run("(seq 1 2 3)", w);
  const items = seqFrom(r);
  assert(items !== null && items.length === 3);
  assert.equal(valueOf(items[0]), 1);
});

test("eval: seq-head and seq-tail", () => {
  const w = world();
  assert.equal(valueOf(run("(seq-head (seq 10 20 30))", w)), 10);
  const tail = seqFrom(run("(seq-tail (seq 10 20 30))", w));
  assert(tail !== null && tail.length === 2);
});

test("eval: range and sum", () => {
  const w = world();
  assert.equal(valueOf(run("(sum (range 5))", w)), 10);
});

test("eval: map over seq", () => {
  const w = world();
  run("(define (inc x) (+ x 1))", w);
  const r = seqFrom(run("(map inc (range 3))", w));
  assert(r !== null && r.length === 3);
  assert.equal(valueOf(r[0]), 1);
  assert.equal(valueOf(r[1]), 2);
  assert.equal(valueOf(r[2]), 3);
});

// ── error handling ────────────────────────────────────────────────────────────

test("eval: try catches raise", () => {
  const w = world();
  const r = run('(try (raise "oops") (catch e e))', w);
  assert.equal(valueOf(r), "oops");
});

test("eval: unhandled raise returns ⊤", () => {
  const w = world();
  const r = run('(try (raise "oops"))', w);
  assert(isTop(r));
});

// ── σ-dual value families ────────────────────────────────────────────────────

test("σ-dual: k-or (knowledge join) of t,f is ⊤", () => {
  assert(isTop(run("(k-or t f)", world())));
});

test("σ-dual: or (truth join) of t,f is t", () => {
  const r = run("(or t f)", world());
  assert(isAffirmed(r) && !isDenied(r));
});

test("σ-dual: k-and (knowledge meet) of t,f is ⊥", () => {
  assert(isBottom(run("(k-and t f)", world())));
});

test("σ-dual: and (truth meet) of t,f is f", () => {
  const r = run("(and t f)", world());
  assert(!isAffirmed(r) && isDenied(r));
});

// ── involutions ───────────────────────────────────────────────────────────────

test("involution: (not t) is f (truth flip)", () => {
  const r = run("(not t)", world());
  assert(!isAffirmed(r) && isDenied(r));
});

test("involution: (not f) is t", () => {
  const r = run("(not f)", world());
  assert(isAffirmed(r) && !isDenied(r));
});

test("involution: (conflate ⊥) is ⊤ (knowledge flip)", () => {
  assert(isTop(run("(conflate ⊥)", world())));
});

test("involution: (conflate ⊤) is ⊥", () => {
  assert(isBottom(run("(conflate ⊤)", world())));
});

// ── boolean projection ────────────────────────────────────────────────────────

test("boolean: t projects to t", () => {
  const r = run("(boolean t)", world());
  assert(isAffirmed(r) && !isDenied(r));
});

test("boolean: ⊤ projects to f (honest collapse, not silent)", () => {
  const r = run("(boolean ⊤)", world());
  assert(!isAffirmed(r) && isDenied(r));
});

test("boolean: ⊥ projects to f", () => {
  const r = run("(boolean ⊥)", world());
  assert(!isAffirmed(r));
});

// ── when / unless ─────────────────────────────────────────────────────────────

test("eval: when true runs body", () => {
  assert.equal(valueOf(run("(when t 42)", world())), 42);
});

test("eval: unless false runs body", () => {
  assert.equal(valueOf(run("(unless f 99)", world())), 99);
});

test("eval: unless true returns ⊥", () => {
  assert(isBottom(run("(unless t 99)", world())));
});

// ── defmacro ──────────────────────────────────────────────────────────────────

test("eval: defmacro defines and expands", () => {
  const w = world();
  run("(defmacro inc1 (n) (+ n 1))", w);
  assert.equal(valueOf(run("(inc1 5)", w)), 6);
});

test("eval: macroexpand-all returns expanded form", () => {
  const w = world();
  run("(defmacro inc1 (n) (+ n 1))", w);
  const r = run("(macroexpand-all '(inc1 5))", w);
  assert(isAffirmed(r));  // an affirmed code value
});

// ── n-ary arithmetic ──────────────────────────────────────────────────────────

test("arith: n-ary addition (+ 1 2 3 4)", () => {
  assert.equal(valueOf(run("(+ 1 2 3 4)", world())), 10);
});

test("arith: n-ary multiplication (* 2 3 4)", () => {
  assert.equal(valueOf(run("(* 2 3 4)", world())), 24);
});

test("arith: unary negation (- 5) is -5", () => {
  assert.equal(valueOf(run("(- 5)", world())), -5);
});

test("arith: n-ary subtraction (- 10 3 2)", () => {
  assert.equal(valueOf(run("(- 10 3 2)", world())), 5);
});

test("arith: value equality (= 3 3) on strings", () => {
  assert(isAffirmed(run('(= "hi" "hi")', world())));
  assert(isDenied(run('(= "hi" "bye")', world())));
});

// ── values / let-values ───────────────────────────────────────────────────────

test("eval: values packs multiple values", () => {
  const w = world();
  const r = run("(values 1 2 3)", w);
  const items = seqFrom(r);
  assert(items !== null && items.length === 3);
  assert.equal(valueOf(items[0]), 1);
  assert.equal(valueOf(items[2]), 3);
});

test("eval: let-values destructures positionally", () => {
  const w = world();
  assert.equal(valueOf(run("(let-values (((a b) (values 10 20))) (+ a b))", w)), 30);
});

// ── safe-recall-chain ─────────────────────────────────────────────────────────

test("eval: ?. returns value of a known claim (null-safe recall)", () => {
  // ?. is a null-safe single-hop recall: valueAt(subj, key), short-circuits ⊥
  const w = world();
  run('(assert "sky" "blue")', w);
  assert(isAffirmed(run('(?. "sky" "blue")', w)));
});

test("eval: ?. returns ⊥ on missing hop", () => {
  const w = world();
  assert(isBottom(run('(?. "nobody" "nothing")', w)));
});

// ── both: constructing ⊤ ─────────────────────────────────────────────────────

test("eval: both asserts and denies, yielding ⊤", () => {
  const w = world();
  const r = run('(both "sky" "colour")', w);
  assert(isTop(r));
});

test("eval: both 3-arg form also yields ⊤", () => {
  const w = world();
  const r = run('(both "realm" "has" "peace")', w);
  assert(isTop(r));
});

// ── modal □/◇ ─────────────────────────────────────────────────────────────────

test("modal: must preserves t", () => {
  const w = world();
  assert.equal(readingOf(run("(must t)", w)), "potential");
});

test("modal: may preserves ⊥", () => {
  const w = world();
  assert.equal(readingOf(run("(may ⊥)", w)), "absurd");
});

test("modal: should returns a valid value", () => {
  const w = world();
  const value = readingOf(run("(should t)", w));
  assert(["potential", "active", "absurd", "stable"].includes(value));
});

// ── cond ⊤-awareness + _ alias ───────────────────────────────────────────────

test("eval: cond _ is an else alias", () => {
  const w = world();
  assert.equal(valueOf(run("(cond (f 1) (_ 99))", w)), 99);
});

test("eval: cond ⊤ test accumulates and continues", () => {
  // A ⊤ test runs its arm (combined with ⊤) and falls through; a subsequent t arm returns combined.
  const w = world();
  const r = run("(cond (⊤ 1) (t 2))", w);
  assert(isTop(r)); // result is held (⊤) because the ⊤ test contributed
});

test("eval: cond ⊤ only (no t clause) returns accumulated ⊤ arm", () => {
  const w = world();
  const r = run("(cond (⊤ 42))", w);
  assert(isTop(r));
});

// ── gensym prefix ─────────────────────────────────────────────────────────────

test("eval: gensym no-arg returns a unique string", () => {
  const w = world();
  const a = valueOf(run("(gensym)", w));
  const b = valueOf(run("(gensym)", w));
  assert.equal(typeof a, "string");
  assert.notEqual(a, b);
});

test("eval: gensym with prefix embeds prefix in the name", () => {
  const w = world();
  const g = valueOf(run('(gensym "myvar")', w));
  assert(typeof g === "string" && g.includes("myvar"));
});

// ── convenience aliases ───────────────────────────────────────────────────────

test("eval: counter-fact is an alias for deny (3-arg triple)", () => {
  const w = world();
  run('(counter-fact "moon" "shines" "light")', w);
  assert(isDenied(run('(recall "moon" "shines" "light")', w)));
});

test("eval: believe? is an alias for recall", () => {
  const w = world();
  run('(assert "star" "bright")', w);
  assert(isAffirmed(run('(believe? "star" "bright")', w)));
});

test("eval: yes is an alias for boolean", () => {
  const w = world();
  assert(isAffirmed(run("(yes t)", w)));
  assert(isDenied(run("(yes f)", w)));
});

test("eval: case dispatches like match", () => {
  const w = world();
  assert.equal(valueOf(run("(case 2 (1 \"one\") (2 \"two\") (3 \"three\"))", w)), "two");
});

test("eval: assoc and dissoc are assert/deny sugar for triples", () => {
  const w = world();
  run('(assoc "city" "pop" 1000)', w);
  assert(isAffirmed(run('(recall "city" "pop" 1000)', w)));
  run('(dissoc "city" "pop" 1000)', w);
  assert(isTop(run('(recall "city" "pop" 1000)', w)));
});

test("reader: bottom is an alias for ⊥", () => {
  const w = world();
  assert(isBottom(run("bottom", w)));
});

test("reader: true literal is an affirmed boolean-witness value", () => {
  const w = world();
  const r = run("true", w);
  assert(isAffirmed(r) && !isDenied(r));
  assert.equal(valueOf(r), true);
});

test("reader: false literal is an affirmed value with false witness", () => {
  const w = world();
  const r = run("false", w);
  assert(isAffirmed(r) && !isDenied(r));
  assert.equal(valueOf(r), false);
});

test("str=: n-ary — all-equal returns t", () => {
  const w = world();
  assert(isAffirmed(run('(str= "a" "a" "a")', w)));
});

test("str=: n-ary — mismatch returns f", () => {
  const w = world();
  assert(isDenied(run('(str= "a" "a" "b")', w)));
});

test("str=: vacuous (1 arg) returns t", () => {
  const w = world();
  assert(isAffirmed(run('(str= "x")', w)));
});

test("str: object value uses JSON.stringify", () => {
  const w = world();
  const r = run('(str (seq 1 2))', w);
  assert(isAffirmed(r));
  const s = valueOf(r);
  assert(typeof s === "string" && s.includes("1") && s.includes("2"), `got: ${s}`);
});

test("arith: < vacuous (1 arg) returns t", () => {
  const w = world();
  assert(isAffirmed(run("(< 5)", w)));
});

test("arith: > vacuous (0 args) returns t", () => {
  const w = world();
  assert(isAffirmed(run("(>)", w)));
});

test("eval: keys returns section for a subject", () => {
  const w = world();
  run('(assert "lake" "deep")', w);
  const r = run('(keys "lake")', w);
  assert(isAffirmed(r));
});
