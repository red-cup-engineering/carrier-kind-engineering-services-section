// engine.test.mjs — exercises the REAL shared pipeline stages directly
// (articulate → tag/construe → parse → roles/cohomology) against the shared
// ../../../lib/language-engine/, mirroring the original recovered
// src/parity.test.mts's own assertions (SOV order, postposed determiner
// attachment; tag() on individual words closed-class-before-morphology; the
// postposed determiner attaching back to its noun). Every sentence below is
// built only from the recovered parity.test.mts's own fixture sentence
// ("Sunka kiŋ yawá.") and from closed-class lexicon items actually present
// in ./src/bundle.mjs's rawBundle — no invented Lakota vocabulary.
import test from "node:test";
import assert from "node:assert/strict";

import { rawBundle } from "../src/bundle.mjs";
import { admitCommunication, articulateCommunication, load, read, roles } from "@red-cup-engineering/communicating";

const bundle = load(rawBundle);
const articulate = (text, selectedBundle) => articulateCommunication(admitCommunication(text), selectedBundle);
const parse = (sentence, _base, selectedBundle) => read(sentence.text, selectedBundle).parse;
const tag = (word, selectedBundle) => read(word, selectedBundle).parse.words[0]?.tags ?? [];

function firstParse(text) {
  const base = articulate(text, bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  return parse(sentence, base, bundle);
}

test("bundle declares SOV order and postposed attachment parameters", () => {
  assert.equal(bundle.wordOrder, "SOV");
  assert.equal(bundle.attachment.determiner, "right");
  assert.equal(bundle.attachment.adjective, "right");
  assert.equal(bundle.attachment.subject, "left");
  assert.equal(bundle.attachment.object, "left");
  assert.equal(bundle.roleBy, undefined); // Lakota carries no case-role flag, unlike Latin
});

test("tag() tags curated closed classes and leaves prefixal morphology unfaked", () => {
  assert.ok(tag("kiŋ", bundle).includes("det"));
  assert.ok(tag("el", bundle).includes("prep")); // filed as prep; it is really a postposition
  assert.ok(tag("yawá", bundle).includes("verb"));
  assert.deepEqual(tag("wayawá", bundle), ["noun"]); // not a curated verb stem — floors to noun, not faked
});

test("articulate() is offset-true: every span's text matches the source slice", () => {
  const text = "Sunka kiŋ yawá. Sunka el yawá.";
  const base = articulate(text, bundle);
  for (const s of base.spans) {
    if (s.start === null || s.end === null) continue;
    assert.equal(text.slice(s.start, s.end), s.text, `span mismatch at tier ${s.tier}: "${s.text}"`);
  }
  assert.equal(base.spans.filter((s) => s.tier === "sentence").length, 2);
});

test("parse() attaches the postposed determiner back to the noun (the recovered parity assertion)", () => {
  const result = firstParse("Sunka kiŋ yawá.");
  const det = result.arcs.find((a) => a.rel === "det");
  assert.equal(det?.headText, "Sunka");
  assert.equal(det?.depText, "kiŋ");
});

test("parse() reads a glued (H0=1, H1=0) cohomology for a clean one-argument sentence", () => {
  const result = firstParse("Sunka kiŋ yawá.");
  const h = read("Sunka kiŋ yawá.", bundle).cohomology;
  assert.equal(h.glued, true);
  assert.equal(h.h0, 1);
  assert.equal(h.h1, 0);
});

test("the pipeline is a deterministic function of (text, bundle): identical input, identical output", () => {
  const text = "Sunka kiŋ yawá.";
  const runOnce = () => firstParse(text);
  assert.deepEqual(runOnce(), runOnce());
});

// ── Honest gap: nsubj/dobj both scan leftward from the verb (see README) ──
// bundle.attachment.subject === bundle.attachment.object === "left" for
// Lakota's real SOV data, and (unlike Latin) roleBy !== "case" — so neither
// rule has anything but adjacency to go on, and both resolve to the SAME
// nearest noun-or-pronoun to the verb's left. "Miyé" (a real closed-class
// pronoun) is left disconnected in a two-argument sentence, and "Sunka" (the
// recovered parity fixture's own noun) is claimed as BOTH agent and patient.
// This is the real, unresolved behavior of the shared engine's generic
// nsubj/dobj rules confronted with Lakota's real attachment data — not a
// new defect introduced by this die.
test("nsubj/dobj ambiguity: with no case marking and identical left attachment, both resolve to the nearest noun, and a true subject can go unclaimed", () => {
  const result = firstParse("Miyé Sunka kiŋ yawá.");
  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  const dobj = result.arcs.find((a) => a.rel === "dobj");
  assert.equal(nsubj?.depText, "Sunka"); // nearest noun to the verb, NOT the true subject "Miyé"
  assert.equal(dobj?.depText, "Sunka");  // same nearest noun — nsubj and dobj collide
  const frame = roles(result).find((candidate) => candidate.verb === "yawá");
  assert.equal(frame?.agent, "Sunka");
  assert.equal(frame?.patient, "Sunka");
  const miye = result.words.find((w) => w.text === "Miyé");
  assert.equal(miye.connected, "void"); // the true subject is never attached to anything
  const h = read("Miyé Sunka kiŋ yawá.", bundle).cohomology;
  assert.equal(h.glued, true); // "glued" only tracks CONFLICTS (h0), not missed attachments
  assert.equal(h.h1, 1);       // the void connectivity obstruction is visible in H1
});

// ── Honest gap: prep()/pobj() assume a PREPOSED adposition (see README) ──
// Lakota's "el" etc. are real postpositions (they follow their NP), and the
// shared engine's prep() rule happens to still resolve the correct head by
// scanning backward from the adposition — but pobj() scans FORWARD from the
// adposition for its object, which is the wrong direction for a postposition
// that already sits after its NP. No pobj arc is ever produced for a
// postposed adposition under this generic rule.
test("postposition attachment: prep() finds the right head by accident of direction, but pobj() never fires for a postposed adposition", () => {
  const result = firstParse("Sunka el yawá.");
  const prep = result.arcs.find((a) => a.rel === "prep");
  const pobj = result.arcs.find((a) => a.rel === "pobj");
  assert.equal(prep?.headText, "Sunka");
  assert.equal(prep?.depText, "el");
  assert.equal(pobj, undefined);
});
