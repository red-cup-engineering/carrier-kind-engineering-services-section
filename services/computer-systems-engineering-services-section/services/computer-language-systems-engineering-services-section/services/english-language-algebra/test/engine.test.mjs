// engine.test.mjs — exercises the REAL ported pipeline stages directly
// (articulate → tag/construe → parse → roles/cohomology) against the real
// English bundle data, reproducing parity.test.mts's own SVO assertions
// plus reproducible gaps still open in that data.
import test from "node:test";
import assert from "node:assert/strict";

import { rawBundle } from "../src/bundle.mjs";
import { admitCommunication, articulateCommunication, load, read, roles } from "@red-cup-engineering/communicating";

const bundle = load(rawBundle);
const articulate = (text, selectedBundle) => articulateCommunication(admitCommunication(text), selectedBundle);
const parse = (sentence, _base, selectedBundle) => read(sentence.text, selectedBundle).parse;
const tag = (word, selectedBundle) => read(word, selectedBundle).parse.words[0]?.tags ?? [];

test("bundle declares SVO order with left-headed determiners/adjectives", () => {
  assert.equal(bundle.wordOrder, "SVO");
  assert.equal(bundle.attachment.determiner, "left");
  assert.equal(bundle.attachment.adjective, "left");
  assert.equal(bundle.attachment.subject, "left");
  assert.equal(bundle.attachment.object, "right");
});

test("tag() tags reference English words from the recovered parity.test.mts fixture", () => {
  assert.ok(tag("The", bundle).includes("det"));
  assert.ok(tag("teacher", bundle).includes("noun"));
  assert.ok(tag("graded", bundle).includes("verb"));
});

test("parse() reproduces the recovered parity.test.mts's SVO subject/object arcs", () => {
  const text = "The teacher graded the exam.";
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  const result = parse(sentence, base, bundle);
  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  const dobj = result.arcs.find((a) => a.rel === "dobj");
  assert.equal(nsubj?.headText, "graded");
  assert.equal(nsubj?.depText, "teacher");
  assert.equal(dobj?.headText, "graded");
  assert.equal(dobj?.depText, "exam");
});

test("articulate() is offset-true: every span's text matches the source slice", () => {
  const text = "The teacher graded the exam. Mary read the book.";
  const base = articulate(text, bundle);
  for (const s of base.spans) {
    if (s.start === null || s.end === null) continue;
    assert.equal(text.slice(s.start, s.end), s.text, `span mismatch at tier ${s.tier}: "${s.text}"`);
  }
  assert.equal(base.spans.filter((s) => s.tier === "sentence").length, 2);
});

test("amod fires for suffix-derived English adjectives, unlike Latin/Lakota/Toki Pona", () => {
  // Latin's and Lakota's READMEs both document that their own recovered
  // suffixRules produce no "adj" tag at all, so amod can never fire for
  // them. English's recovered suffixRules DO include an adjective-suffix
  // rule ("famous" -> -ous), so amod genuinely fires here.
  const text = "The famous teacher graded the exam.";
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  const result = parse(sentence, base, bundle);
  const amod = result.arcs.find((a) => a.rel === "amod");
  assert.equal(amod?.headText, "teacher");
  assert.equal(amod?.depText, "famous");
  const dobj = result.arcs.find((a) => a.rel === "dobj");
  assert.equal(dobj?.depText, "exam");
});

test("cohomology() reads a glued (H0=1, H1=0, no conflicts) parse for a clean past-tense sentence", () => {
  const text = "The teacher graded the exam.";
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  const result = parse(sentence, base, bundle);
  const h = read(text, bundle).cohomology;
  assert.equal(h.glued, true);
  assert.equal(h.h0, 1);
  assert.equal(h.h1, 0);
});

test("roles() extracts agent/patient from a clean past-tense sentence", () => {
  const text = "The teacher graded the exam.";
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  const result = parse(sentence, base, bundle);
  const frame = roles(result).find((r) => r.verb === "graded");
  assert.equal(frame?.agent, "teacher");
  assert.equal(frame?.patient, "exam");
});

test("GAP (real, reproducible): a bare adjective with no recognized derivational suffix floors to \"noun\" and steals the dobj arc ahead of the true object", () => {
  // "difficult" matches none of rawBundle.morphology.suffixRules's adjective
  // patterns (ous|ful|ible|able|ive|ical|ic|ish|less|al|ant|ent|ary|ese|most)
  // — a real, common gap: many ordinary English adjectives ("big", "red",
  // "old", "difficult", "good") carry no derivational suffix at all — so
  // tagging.mjs's open-class floor assigns it ["noun"] instead of ["adj"].
  // dobj() then scans rightward from the verb for the nearest noun-or-
  // pronoun and stops at "difficult" (mistagged noun) before ever reaching
  // the true object "exam". This is real, reproducible behavior of the
  // shared engine's generic dobj() rule confronted with English's own real
  // recovered suffixRules data — not a new defect introduced by this port
  // (contrast with the sentence above, where "famous" DOES carry a
  // recognized adjective suffix and dobj resolves correctly).
  const text = "The teacher graded the difficult exam.";
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  const result = parse(sentence, base, bundle);
  assert.deepEqual(tag("difficult", bundle), ["noun"]);
  const dobj = result.arcs.find((a) => a.rel === "dobj");
  assert.equal(dobj?.depText, "difficult"); // wrong: should be "exam"
  const examWord = result.words.find((w) => w.text === "exam");
  assert.equal(examWord.connected, "void"); // the true object is left unattached
  const frame = roles(result).find((r) => r.verb === "graded");
  assert.equal(frame?.patient, "difficult"); // roles() inherits the same wrong resolution
});

test("present-tense verbs now tag \"verb\" via the irregular-verb table, the regular 3sg rule, and a verb-stem lexicon, so nsubj/dobj/roles() fire for present-tense sentences", () => {
  // rawBundle.morphology.irregularVerbs lists read/eat/run (bare lemma AND
  // inflected forms, unambiguous). rawBundle.morphology.verbFormRules'
  // regular-3sg rule covers the rest ("chases") — dual-tagged noun+verb,
  // since it collides with the noun-plural suffix (settled by arc evidence,
  // see @red-cup-engineering/communicating's charging.mts). rawBundle.morphology
  // .verbStems now covers the truly regular BARE stem with no inflection at
  // all ("chase") as unambiguous verb evidence.
  for (const verb of ["reads", "read", "chases", "eats", "eat", "runs", "run", "chase"]) {
    assert.ok(tag(verb, bundle).includes("verb"), `expected "${verb}" to tag verb, got ${JSON.stringify(tag(verb, bundle))}`);
  }
  assert.deepEqual(tag("chase", bundle), ["verb"], "a verbStems bare stem is unambiguous, non-defeasible verb evidence");
  assert.ok(tag("chases", bundle).includes("noun"), "the suffix-only 3sg reading of \"chases\" stays dual-tagged, not argmaxed");
  const text = "Mary reads a book.";
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  const result = parse(sentence, base, bundle);
  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  const dobj = result.arcs.find((a) => a.rel === "dobj");
  assert.equal(nsubj?.headText, "reads");
  assert.equal(nsubj?.depText, "Mary");
  assert.equal(dobj?.headText, "reads");
  assert.equal(dobj?.depText, "book");
  const frame = roles(result).find((r) => r.verb === "reads");
  assert.equal(frame?.agent, "Mary");
  assert.equal(frame?.patient, "book");
});

test("the pipeline is a deterministic function of (text, bundle): identical input, identical output", () => {
  const text = "The teacher graded the exam.";
  const runOnce = () => {
    const base = articulate(text, bundle);
    const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
    return parse(sentence, base, bundle);
  };
  assert.deepEqual(runOnce(), runOnce());
});
