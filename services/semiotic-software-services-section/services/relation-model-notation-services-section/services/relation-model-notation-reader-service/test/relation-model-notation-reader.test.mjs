import assert from "node:assert/strict";
import test from "node:test";
import { tm } from "@red-cup-engineering/relation-model-notation";
import {
  RMN_JSON,
  isRelationalTerm, parseRmn, settleRmn,
  extractRelationalScripts, htmlIsRelational, settleRelationalHtml,
  sessionIsRelational, settleRelationalSession,
  namedString, namedArray, namedObject, namedBool, namedGenerator,
  compileNamedRmn, parseNamedRmn,
  canonicalNamedRmn, digestNamedRmn,
} from "../src/index.mjs";
// The real, compiled metroplat build of the module this package ports. Every
// exported value is differentially tested against this exact dist file —
// this is the load-bearing evidence that the port is behaviorally identical,
// not merely structurally similar.
import * as dist from "../../../../../../software-development-services-section/services/javascript-services-section/lib/legacy/metroplat/dist/src/lib/language/reader/index.mjs";

// =============================================================================
// 1. Admission gate — isRelationalTerm / parseRmn / settleRmn.
// =============================================================================

// A closed term that is inferable directly: `inferTy` has no case for a bare
// `lam` (it is checkable, not inferable, in this bidirectional typer), so a
// positive fixture needs an `app` whose function position is a `lam` — the
// one path `inferTy`'s "app" case takes to bootstrap a type for a lambda
// from its argument's inferred type. This is the identity function applied
// to a mark, which both infers (base type) and carries a real redex.
const closedWellTypedTerm = tm.app(tm.lam(tm.var(0)), tm.mark("payload"));

test("isRelationalTerm: accepts a closed, well-typed term", () => {
  assert.equal(isRelationalTerm(closedWellTypedTerm), true);
});

test("isRelationalTerm: rejects an open term (a free de Bruijn variable)", () => {
  assert.equal(isRelationalTerm(tm.var(0)), false);
});

test("isRelationalTerm: rejects a closed but ill-typed term (fst of a unit, not a pair)", () => {
  const illTyped = tm.fst(tm.star());
  assert.equal(isRelationalTerm(illTyped), false);
});

test("isRelationalTerm: rejects plain JSON data — an object is data, not a morphism", () => {
  assert.equal(isRelationalTerm({ a: 1 }), false);
});

test("isRelationalTerm: rejects plain JSON data — a non-tag array is data, not a morphism", () => {
  assert.equal(isRelationalTerm([1, 2, 3]), false);
});

test("isRelationalTerm: matches the metroplat dist build across the same fixture set", () => {
  const fixtures = [closedWellTypedTerm, tm.var(0), tm.fst(tm.star()), { a: 1 }, [1, 2, 3], tm.star()];
  for (const fixture of fixtures) {
    assert.equal(isRelationalTerm(fixture), dist.isRelationalTerm(fixture), `mismatch for ${JSON.stringify(fixture)}`);
  }
});

test("parseRmn: round-trips valid RMN source into the same term", () => {
  const source = JSON.stringify(closedWellTypedTerm);
  const parsed = parseRmn(source);
  assert.deepEqual(parsed, closedWellTypedTerm);
});

test("parseRmn: matches dist's parse of the same valid source", () => {
  const source = JSON.stringify(closedWellTypedTerm);
  assert.deepEqual(parseRmn(source), dist.parseRmn(source));
});

test("parseRmn: throws on source that is well-formed JSON but not a well-typed closed term", () => {
  assert.throws(() => parseRmn(JSON.stringify({ a: 1 })), TypeError);
});

test("parseRmn: throws on source that is not even well-formed JSON", () => {
  assert.throws(() => parseRmn("{not valid json"));
});

test("parseRmn: throwing behavior matches dist for the same invalid source", () => {
  const source = JSON.stringify({ a: 1 });
  assert.throws(() => parseRmn(source));
  assert.throws(() => dist.parseRmn(source));
});

test("settleRmn: actually reduces a term with a real redex (identity applied to a mark)", () => {
  const settled = settleRmn(closedWellTypedTerm);
  assert.deepEqual(settled, tm.mark("payload"));
});

test("settleRmn: matches dist's settlement of the same redex", () => {
  assert.deepEqual(settleRmn(closedWellTypedTerm), dist.settleRmn(closedWellTypedTerm));
});

test("RMN_JSON: matches dist's media-type string exactly", () => {
  assert.equal(RMN_JSON, dist.RMN_JSON);
  assert.equal(RMN_JSON, "application/rmn+json; charset=utf-8");
});

// =============================================================================
// 2. Boundary settlement — the HTML `<script type="application/rmn+json">`
//    gate and the message-stream session gate.
// =============================================================================

const rmnScriptBody = JSON.stringify(closedWellTypedTerm);
const nonRmnScriptBody = "console.log('hello');";

function htmlWithOneRmnAndOneNonRmnScript() {
  return `<!doctype html>
<html>
<head><script type="application/rmn+json">${rmnScriptBody}</script></head>
<body><script type="text/javascript">${nonRmnScriptBody}</script></body>
</html>`;
}

test("extractRelationalScripts: pulls only the RMN script body out of a mixed document", () => {
  const html = htmlWithOneRmnAndOneNonRmnScript();
  const scripts = extractRelationalScripts(html);
  assert.deepEqual(scripts, [rmnScriptBody]);
});

test("extractRelationalScripts: matches dist on the same mixed document", () => {
  const html = htmlWithOneRmnAndOneNonRmnScript();
  assert.deepEqual(extractRelationalScripts(html), dist.extractRelationalScripts(html));
});

test("htmlIsRelational: true for a document whose only script is RMN and well-typed", () => {
  const html = `<html><body><script type="application/rmn+json">${rmnScriptBody}</script></body></html>`;
  assert.equal(htmlIsRelational(html), true);
});

test("htmlIsRelational: true for a document with no scripts at all (trivially relational)", () => {
  assert.equal(htmlIsRelational("<html><body><p>static</p></body></html>"), true);
});

test("htmlIsRelational: false when one script is not RMN (a mixed document)", () => {
  const html = htmlWithOneRmnAndOneNonRmnScript();
  assert.equal(htmlIsRelational(html), false);
});

test("htmlIsRelational: false when the script IS typed application/rmn+json but its body is not well-typed", () => {
  const illTypedBody = JSON.stringify({ a: 1 });
  const html = `<html><body><script type="application/rmn+json">${illTypedBody}</script></body></html>`;
  assert.equal(htmlIsRelational(html), false);
});

test("htmlIsRelational: matches dist across the mixed, static, and ill-typed fixtures", () => {
  const mixed = htmlWithOneRmnAndOneNonRmnScript();
  const allRmn = `<html><body><script type="application/rmn+json">${rmnScriptBody}</script></body></html>`;
  const staticDoc = "<html><body><p>static</p></body></html>";
  const illTyped = `<html><body><script type="application/rmn+json">${JSON.stringify({ a: 1 })}</script></body></html>`;
  for (const html of [mixed, allRmn, staticDoc, illTyped]) {
    assert.equal(htmlIsRelational(html), dist.htmlIsRelational(html), `mismatch for ${html}`);
  }
});

test("settleRelationalHtml: actually settles every RMN script's redex in an all-RMN document", () => {
  const html = `<html><body><script type="application/rmn+json">${rmnScriptBody}</script></body></html>`;
  const settled = settleRelationalHtml(html);
  assert.deepEqual(settled, [tm.mark("payload")]);
});

test("settleRelationalHtml: settles multiple scripts in document order", () => {
  const otherRedex = tm.app(tm.lam(tm.pair(tm.var(0), tm.var(0))), tm.mark("dup"));
  const html = `<html><body>
<script type="application/rmn+json">${JSON.stringify(closedWellTypedTerm)}</script>
<script type="application/rmn+json">${JSON.stringify(otherRedex)}</script>
</body></html>`;
  const settled = settleRelationalHtml(html);
  assert.deepEqual(settled, [tm.mark("payload"), tm.pair(tm.mark("dup"), tm.mark("dup"))]);
});

test("settleRelationalHtml: matches dist's settlement of the same all-RMN document", () => {
  const html = `<html><body><script type="application/rmn+json">${rmnScriptBody}</script></body></html>`;
  assert.deepEqual(settleRelationalHtml(html), dist.settleRelationalHtml(html));
});

test("settleRelationalHtml: throws when the document contains a non-relational (Turing) script", () => {
  const html = htmlWithOneRmnAndOneNonRmnScript();
  assert.throws(() => settleRelationalHtml(html), TypeError);
  assert.throws(() => dist.settleRelationalHtml(html), TypeError);
});

const rmnMessage = closedWellTypedTerm;
const nonRmnMessage = { a: 1 };

test("sessionIsRelational: true when every message in the stream is an admitted RMN term", () => {
  assert.equal(sessionIsRelational([rmnMessage, tm.star()]), true);
});

test("sessionIsRelational: false when any single message is not RMN", () => {
  assert.equal(sessionIsRelational([rmnMessage, nonRmnMessage]), false);
});

test("sessionIsRelational: matches dist across relational and non-relational streams", () => {
  const relationalStream = [rmnMessage, tm.star()];
  const mixedStream = [rmnMessage, nonRmnMessage];
  assert.equal(sessionIsRelational(relationalStream), dist.sessionIsRelational(relationalStream));
  assert.equal(sessionIsRelational(mixedStream), dist.sessionIsRelational(mixedStream));
});

test("settleRelationalSession: actually settles every message's redex in an all-RMN stream", () => {
  const settled = settleRelationalSession([rmnMessage, tm.star()]);
  assert.deepEqual(settled, [tm.mark("payload"), tm.star()]);
});

test("settleRelationalSession: matches dist's settlement of the same all-RMN stream", () => {
  const stream = [rmnMessage, tm.star()];
  assert.deepEqual(settleRelationalSession(stream), dist.settleRelationalSession(stream));
});

test("settleRelationalSession: throws when the stream contains a non-relational message", () => {
  const stream = [rmnMessage, nonRmnMessage];
  assert.throws(() => settleRelationalSession(stream), TypeError);
  assert.throws(() => dist.settleRelationalSession(stream), TypeError);
});

// =============================================================================
// 3. Named-surface syntax.
// =============================================================================

// ── 3a. Builders — differential against dist, checking they build the
//    expected pair/mark/star shapes exactly. ──

test("namedString: matches dist's encoding of the same string", () => {
  assert.deepEqual(namedString("hello"), dist.namedString("hello"));
  assert.deepEqual(namedString("hello"), ["mark", dist.namedString("hello")[1]]);
});

test("namedArray: matches dist's encoding of the same open sub-terms", () => {
  const items = [["var", "x"], ["star"]];
  assert.deepEqual(namedArray(items), dist.namedArray(items));
});

test("namedObject: matches dist's encoding, including deterministic key sorting", () => {
  const entries = [["b", ["star"]], ["a", ["var", "x"]]];
  const mine = namedObject(entries);
  const theirs = dist.namedObject(entries);
  assert.deepEqual(mine, theirs);
  // Confirm the sort actually happened: "a" sorts before "b" in the spine,
  // regardless of input order. mine = ["pair", tagMark, list]; list's first
  // cons cell is ["pair", firstEntry, restList]; firstEntry is
  // ["pair", ["mark", <canonical "a">], value].
  const list = mine[2];
  const firstEntry = list[1];
  assert.deepEqual(firstEntry[2], ["var", "x"]);
});

test("namedBool: matches dist's charge-sugar encoding for both true and false", () => {
  assert.deepEqual(namedBool(true), dist.namedBool(true));
  assert.deepEqual(namedBool(false), dist.namedBool(false));
  assert.deepEqual(namedBool(true), ["charge", "held"]);
  assert.deepEqual(namedBool(false), ["charge", "denied"]);
});

test("namedGenerator: matches dist for each of the four generator names", () => {
  for (const name of ["specialization", "converse", "subjectProjection", "objectProjection"]) {
    assert.deepEqual(namedGenerator(name), dist.namedGenerator(name));
    assert.deepEqual(namedGenerator(name), ["mark", name]);
  }
});

test("namedGenerator: rejects a name that is not one of the four generators, matching dist's throwing behavior", () => {
  assert.throws(() => namedGenerator("not-a-generator"), TypeError);
  assert.throws(() => dist.namedGenerator("not-a-generator"), TypeError);
});

// ── 3b. compileNamedRmn — the single most important behavioral test in this
//    module: confirm resolveByFca's "innermost binder wins" claim concretely.
//    An outer binder named "x" and an inner binder ALSO named "x" are BOTH
//    in scope at the point the innermost lambda's body resolves "x" — the
//    FCA candidate set (`extentOfIntentTerm` over `{subject: binderId,
//    predicate: "x"}` cells) necessarily contains BOTH binder ids at that
//    point, and only the "take the highest id" tie-break inside
//    resolveByFca picks the inner one. If that tie-break were wrong (e.g.
//    picked the lowest id, or picked arbitrarily), this compiles to
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

test("compileNamedRmn: shadowing matches dist's compilation of the identical named surface exactly", () => {
  const shadowed = ["lam", "x", ["lam", "x", ["var", "x"]]];
  assert.deepEqual(compileNamedRmn(shadowed), dist.compileNamedRmn(shadowed));
});

test("compileNamedRmn: shadowing evaluates correctly — applying the shadowed function to two different marks returns the INNER argument, confirming resolution picked the inner binder not just structurally but semantically", () => {
  const shadowed = ["lam", "x", ["lam", "x", ["var", "x"]]];
  const compiled = compileNamedRmn(shadowed);
  // (lam x. lam x. x) outerArg innerArg  ==>  innerArg, if and only if the
  // body's "x" really is bound by the inner lambda.
  const applied = tm.app(tm.app(compiled, tm.mark("outer-value")), tm.mark("inner-value"));
  const settled = settleRmn(applied);
  assert.deepEqual(settled, tm.mark("inner-value"));
});

test("compileNamedRmn: a genuinely non-trivial NamedTm (nested lam/var/app/pair with shadowing) compiles identically to dist and evaluates to the expected value", () => {
  // (lam x. lam y. lam x. pair (var x) (var y)) A B C
  //   -> innermost x (bound to C) paired with y (bound to B)
  const surface = [
    "lam", "x", ["lam", "y", ["lam", "x",
      ["pair", ["var", "x"], ["var", "y"]],
    ]],
  ];
  const compiled = compileNamedRmn(surface);
  const distCompiled = dist.compileNamedRmn(surface);
  assert.deepEqual(compiled, distCompiled);

  const applied = tm.app(
    tm.app(tm.app(compiled, tm.mark("A")), tm.mark("B")),
    tm.mark("C"),
  );
  const settled = settleRmn(applied);
  assert.deepEqual(settled, tm.pair(tm.mark("C"), tm.mark("B")));
});

test("compileNamedRmn: without shadowing (two distinct names), resolution is unaffected — a sanity control alongside the shadowing tests", () => {
  const surface = ["lam", "a", ["lam", "b", ["var", "a"]]];
  const compiled = compileNamedRmn(surface);
  assert.deepEqual(compiled, ["lam", ["lam", ["var", 1]]]);
  assert.deepEqual(compiled, dist.compileNamedRmn(surface));
});

test("compileNamedRmn: throws on an unbound variable, matching dist", () => {
  const surface = ["var", "nowhere"];
  assert.throws(() => compileNamedRmn(surface), TypeError);
  assert.throws(() => dist.compileNamedRmn(surface), TypeError);
});

// ── 3c. namedOfCompiled / canonicalNamedRmn (reverse direction) — round-trip
//    a compiled term back to named surface / canonical JSON, differentially
//    against dist. (namedOfCompiled itself is not exported; canonicalNamedRmn
//    and digestNamedRmn are the exported surface over it.) ──

test("canonicalNamedRmn: round-trips a compiled shadowed term to canonical named JSON, matching dist exactly", () => {
  const shadowed = ["lam", "x", ["lam", "x", ["var", "x"]]];
  const compiled = compileNamedRmn(shadowed);
  const mine = canonicalNamedRmn(compiled);
  const theirs = dist.canonicalNamedRmn(compiled);
  assert.equal(mine, theirs);
});

test("canonicalNamedRmn: the round-tripped named form uses positional placeholder names ($0, $1, ...), never the original source names", () => {
  const shadowed = ["lam", "x", ["lam", "x", ["var", "x"]]];
  const compiled = compileNamedRmn(shadowed);
  const canonical = canonicalNamedRmn(compiled);
  const parsed = JSON.parse(canonical);
  assert.deepEqual(parsed, ["lam", "$0", ["lam", "$1", ["var", "$1"]]]);
});

test("digestNamedRmn: matches dist's digest for the same compiled term", () => {
  const compiled = compileNamedRmn(["lam", "x", ["var", "x"]]);
  assert.equal(digestNamedRmn(compiled), dist.digestNamedRmn(compiled));
});

test("digestNamedRmn: two structurally different compiled terms produce different digests", () => {
  const a = compileNamedRmn(["lam", "x", ["var", "x"]]);
  const b = compileNamedRmn(["lam", "x", ["lam", "y", ["var", "x"]]]);
  assert.notEqual(digestNamedRmn(a), digestNamedRmn(b));
});

// ── 3d. parseNamedRmn — end-to-end on JSON-encoded named surface. ──

test("parseNamedRmn: end-to-end parses a small JSON-encoded named surface, compiles it, and admits it", () => {
  const source = JSON.stringify(["app", ["lam", "x", ["var", "x"]], ["mark", "payload"]]);
  const term = parseNamedRmn(source);
  assert.deepEqual(term, closedWellTypedTerm);
  assert.deepEqual(settleRmn(term), tm.mark("payload"));
});

test("parseNamedRmn: matches dist's parse+compile of the same source", () => {
  const source = JSON.stringify(["app", ["lam", "x", ["var", "x"]], ["mark", "payload"]]);
  assert.deepEqual(parseNamedRmn(source), dist.parseNamedRmn(source));
});

test("parseNamedRmn: throws when the compiled result is not closed and well-typed, matching dist", () => {
  // "x" free in the top-level surface — compiles to an open var.
  const source = JSON.stringify(["var", "unbound"]);
  assert.throws(() => parseNamedRmn(source), TypeError);
  assert.throws(() => dist.parseNamedRmn(source), TypeError);
});
