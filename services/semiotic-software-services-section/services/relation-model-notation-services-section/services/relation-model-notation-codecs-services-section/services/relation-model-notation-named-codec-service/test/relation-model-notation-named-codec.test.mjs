import assert from "node:assert/strict";
import test from "node:test";
import { tm } from "@red-cup-engineering/relation-model-notation";
import { evaluate } from "@red-cup-engineering/relation-model-notation-eval";
import { stringTerm } from "@red-cup-engineering/relation-model-notation-json-codec";
import {
  namedString, namedArray, namedObject, namedBool, namedGenerator,
  compileNamedRmn, parseNamedRmn,
  canonicalNamedRmn, digestNamedRmn,
} from "../src/index.mjs";
// Every export below was originally differentially tested against the real,
// compiled metroplat build of the module this package was split out of
// (metroplat's reader/index.mts bundled the admission gate and this
// named-surface codec together; this package is the codec half). That
// evidence is preserved in this package's own commit history; metroplat has
// since been deleted, so these tests now assert the same hard-coded expected
// values directly instead of re-deriving them from a live comparison.

// =============================================================================
// Named-surface syntax.
// =============================================================================

// ── Builders — checking they build the expected pair/mark/star shapes exactly. ──

test("namedString: compiles to the same opaque mark the json-codec's own stringTerm builds for the same value", () => {
  assert.deepEqual(compileNamedRmn(namedString("hello")), stringTerm("hello"));
});

test("namedArray: builds a mark-tagged pair spine over the given (possibly open) items, terminated by star", () => {
  const items = [["var", "x"], ["star"]];
  const tagMark = namedArray([])[1]; // ["mark", canonicalBytes(arrayTag)] — reused so this test doesn't hard-code canonicalBytes' own output
  assert.deepEqual(namedArray(items), ["pair", tagMark, ["pair", ["var", "x"], ["pair", ["star"], ["star"]]]]);
});

test("namedObject: sorts entries deterministically by key, regardless of input order", () => {
  const entries = [["b", ["star"]], ["a", ["var", "x"]]];
  const mine = namedObject(entries);
  assert.equal(mine[0], "pair");
  assert.equal(mine[1][0], "mark");
  // Confirm the sort actually happened: "a" sorts before "b" in the spine,
  // regardless of input order. mine = ["pair", tagMark, list]; list's first
  // cons cell is ["pair", firstEntry, restList]; firstEntry is
  // ["pair", ["mark", <canonical "a">], value].
  const list = mine[2];
  const firstEntry = list[1];
  assert.deepEqual(firstEntry[2], ["var", "x"]);
});

test("namedBool: charge-sugar encoding for both true and false", () => {
  assert.deepEqual(namedBool(true), ["charge", "held"]);
  assert.deepEqual(namedBool(false), ["charge", "denied"]);
});

test("namedGenerator: builds a bare mark for each of the four generator names", () => {
  for (const name of ["specialization", "converse", "subjectProjection", "objectProjection"]) {
    assert.deepEqual(namedGenerator(name), ["mark", name]);
  }
});

test("namedGenerator: rejects a name that is not one of the four generators", () => {
  assert.throws(() => namedGenerator("not-a-generator"), TypeError);
});

// ── compileNamedRmn — the single most important behavioral test in this
//    module: confirm resolveByFca's "innermost binder wins" claim concretely.
//    An outer binder named "x" and an inner binder ALSO named "x" are BOTH
//    in scope at the point the innermost lambda's body resolves "x" — only
//    the "take the last match scanning from the end" tie-break inside
//    resolveByFca picks the inner one. If that tie-break were wrong (e.g.
//    picked the outer one, or picked arbitrarily), this compiles to
//    `["lam", ["lam", ["var", 1]]]` instead of the correct
//    `["lam", ["lam", ["var", 0]]]`, and the two nested lambdas would
//    silently swap which value the body actually uses. ──

test("compileNamedRmn: shadowing — nested binders BOTH named \"x\"; the inner var resolves to the INNERMOST (closer) binder, not the outer one", () => {
  const shadowed = ["lam", "x", ["lam", "x", ["var", "x"]]];
  const compiled = compileNamedRmn(shadowed);
  // de Bruijn index 0 at that depth means "the nearest enclosing binder" —
  // i.e. the inner lambda's own parameter, confirming innermost-wins.
  assert.deepEqual(compiled, ["lam", ["lam", ["var", 0]]]);
});

test("compileNamedRmn: shadowing evaluates correctly — applying the shadowed function to two different marks returns the INNER argument, confirming resolution picked the inner binder not just structurally but semantically", () => {
  const shadowed = ["lam", "x", ["lam", "x", ["var", "x"]]];
  const compiled = compileNamedRmn(shadowed);
  // (lam x. lam x. x) outerArg innerArg  ==>  innerArg, if and only if the
  // body's "x" really is bound by the inner lambda.
  const applied = tm.app(tm.app(compiled, tm.mark("outer-value")), tm.mark("inner-value"));
  const settled = evaluate(applied);
  assert.deepEqual(settled, tm.mark("inner-value"));
});

test("compileNamedRmn: a genuinely non-trivial NamedTm (nested lam/var/app/pair with shadowing) evaluates to the expected value", () => {
  // (lam x. lam y. lam x. pair (var x) (var y)) A B C
  //   -> innermost x (bound to C) paired with y (bound to B)
  const surface = [
    "lam", "x", ["lam", "y", ["lam", "x",
      ["pair", ["var", "x"], ["var", "y"]],
    ]],
  ];
  const compiled = compileNamedRmn(surface);

  const applied = tm.app(
    tm.app(tm.app(compiled, tm.mark("A")), tm.mark("B")),
    tm.mark("C"),
  );
  const settled = evaluate(applied);
  assert.deepEqual(settled, tm.pair(tm.mark("C"), tm.mark("B")));
});

test("compileNamedRmn: without shadowing (two distinct names), resolution is unaffected — a sanity control alongside the shadowing tests", () => {
  const surface = ["lam", "a", ["lam", "b", ["var", "a"]]];
  const compiled = compileNamedRmn(surface);
  assert.deepEqual(compiled, ["lam", ["lam", ["var", 1]]]);
});

test("compileNamedRmn: throws on an unbound variable", () => {
  const surface = ["var", "nowhere"];
  assert.throws(() => compileNamedRmn(surface), TypeError);
});

// ── namedOfCompiled / canonicalNamedRmn (reverse direction) — round-trip a
//    compiled term back to named surface / canonical JSON. (namedOfCompiled
//    itself is not exported; canonicalNamedRmn and digestNamedRmn are the
//    exported surface over it.) ──

test("canonicalNamedRmn: the round-tripped named form uses positional placeholder names ($0, $1, ...), never the original source names", () => {
  const shadowed = ["lam", "x", ["lam", "x", ["var", "x"]]];
  const compiled = compileNamedRmn(shadowed);
  const canonical = canonicalNamedRmn(compiled);
  const parsed = JSON.parse(canonical);
  assert.deepEqual(parsed, ["lam", "$0", ["lam", "$1", ["var", "$1"]]]);
});

test("digestNamedRmn: two structurally different compiled terms produce different digests", () => {
  const a = compileNamedRmn(["lam", "x", ["var", "x"]]);
  const b = compileNamedRmn(["lam", "x", ["lam", "y", ["var", "x"]]]);
  assert.notEqual(digestNamedRmn(a), digestNamedRmn(b));
});

// ── parseNamedRmn — end-to-end on JSON-encoded named surface. ──

test("parseNamedRmn: end-to-end parses a small JSON-encoded named surface, compiles it, and admits it", () => {
  const source = JSON.stringify(["app", ["lam", "x", ["var", "x"]], ["mark", "payload"]]);
  const term = parseNamedRmn(source);
  assert.deepEqual(term, tm.app(tm.lam(tm.var(0)), tm.mark("payload")));
  assert.deepEqual(evaluate(term), tm.mark("payload"));
});

test("parseNamedRmn: throws when the compiled result is not closed and well-typed", () => {
  // "x" free in the top-level surface — compiles to an open var.
  const source = JSON.stringify(["var", "unbound"]);
  assert.throws(() => parseNamedRmn(source), TypeError);
});
