import assert from "node:assert/strict";
import test from "node:test";
import { tm } from "@red-cup-engineering/relation-model-notation";
import {
  RMN_JSON,
  isRelationalTerm, parseRmn, settleRmn,
  extractRelationalScripts, htmlIsRelational, settleRelationalHtml,
  sessionIsRelational, settleRelationalSession,
} from "../src/index.mjs";
// The real, compiled metroplat build of the module this package ports. Every
// exported value is differentially tested against this exact dist file —
// this is the load-bearing evidence that the port is behaviorally identical,
// not merely structurally similar. The named-surface half of the original
// module (namedString/compileNamedRmn/etc.) moved to
// @red-cup-engineering/relation-model-notation-named-codec along with its
// own copy of this differential-testing pattern; this file keeps only the
// admission-gate and HTML/session-gate coverage.
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

