// engine.test.mjs — exercises the REAL ported pipeline stages directly
// (articulate → tag/construe → parse → roles/cohomology), mirroring the
// original recovered src/parity.test.mts's own assertions (word order free /
// role-by-case / no determiners; tag() on individual words; roles() beating
// object-first surface order) — the exact behavior that package boundary
// dropped when this die's src/tag.mjs was first written as a flat
// suffix/lexicon stub with no arcs, no roles, and no free-word-order
// resolution at all.
import test from "node:test";
import assert from "node:assert/strict";

import { rawBundle } from "../src/bundle.mjs";
import { admitCommunication, articulateCommunication, load, read, roles } from "@red-cup-engineering/communicating";

const bundle = load(rawBundle);
const articulate = (text, selectedBundle) => articulateCommunication(admitCommunication(text), selectedBundle);
const parse = (sentence, _base, selectedBundle) => read(sentence.text, selectedBundle).parse;
const tag = (word, selectedBundle) => read(word, selectedBundle).parse.words[0]?.tags ?? [];

test("bundle declares free order and role-by-case with no articles", () => {
  assert.equal(bundle.wordOrder, "free");
  assert.equal(bundle.roleBy, "case");
  assert.equal(bundle.raw.lexicon.determiners.length, 0);
});

test("tag() tags nominative, accusative, and verb endings from suffix morphology", () => {
  assert.ok(tag("puella", bundle).includes("noun"));
  assert.ok(tag("servum", bundle).includes("noun"));
  assert.ok(tag("amat", bundle).includes("verb"));
});

test("tag() tags closed-class words from the lexicon over morphology", () => {
  assert.deepEqual(tag("et", bundle), ["conj"]);
  assert.deepEqual(tag("in", bundle), ["prep"]);
});

test("articulate() is offset-true: every span's text matches the source slice", () => {
  const text = "Puella rosam amat. Servus dominum videt.";
  const base = articulate(text, bundle);
  for (const s of base.spans) {
    if (s.start === null || s.end === null) continue;
    assert.equal(text.slice(s.start, s.end), s.text, `span mismatch at tier ${s.tier}: "${s.text}"`);
  }
  assert.equal(base.spans.filter((s) => s.tier === "sentence").length, 2);
});

test("parse() resolves nsubj/dobj from CASE, not position — role-by-case beats object-first order", () => {
  const text = "Juliam Marcus amat.";
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  const result = parse(sentence, base, bundle);

  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  const dobj = result.arcs.find((a) => a.rel === "dobj");
  assert.equal(nsubj.depText, "Marcus"); // subject, despite appearing SECOND in the text
  assert.equal(dobj.depText, "Juliam"); // object, despite appearing FIRST in the text

  const frame = roles(result).find((candidate) => candidate.verb === "amat");
  assert.equal(frame?.agent, "Marcus");
  assert.equal(frame?.patient, "Juliam");
});

test("parse() attaches a prepositional object via prep/pobj and folds a multi-step path", () => {
  const text = "Servus cum domino ambulat.";
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  const result = parse(sentence, base, bundle);

  const prep = result.arcs.find((a) => a.rel === "prep");
  const pobj = result.arcs.find((a) => a.rel === "pobj");
  assert.equal(prep.depText, "cum");
  assert.equal(pobj.headText, "cum");
  assert.equal(pobj.depText, "domino");
  // fold() composed at least one multi-step (head -> prep -> pobj) path
  assert.ok(result.compositions.some((p) => p.path.length > 1));
});

test("cohomology() reads a glued (H0=1, H1=0, no conflicts) parse for a clean sentence", () => {
  const text = "Puella rosam amat.";
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  const result = parse(sentence, base, bundle);
  const h = read(text, bundle).cohomology;
  assert.equal(h.glued, true);
  assert.equal(h.h0, 1);
  assert.equal(h.h1, 0);
});

test("the pipeline is a deterministic function of (text, bundle): identical input, identical output", () => {
  const text = "Puella rosam amat.";
  const runOnce = () => {
    const base = articulate(text, bundle);
    const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
    return parse(sentence, base, bundle);
  };
  assert.deepEqual(runOnce(), runOnce());
});
