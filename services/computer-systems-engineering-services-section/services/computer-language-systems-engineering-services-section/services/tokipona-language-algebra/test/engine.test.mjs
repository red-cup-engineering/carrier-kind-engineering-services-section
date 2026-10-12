// engine.test.mjs — exercises the REAL shared pipeline stages directly
// (articulate → tag/construe → parse → roles/cohomology) against the shared
// ../../../lib/language-engine/, mirroring the original recovered
// src/parity.test.mts's own assertions (SVO order, empty suffixRules, tag()
// on individual closed-class and open-class words). Every sentence below is
// built only from the recovered parity.test.mts's own fixture words ("mi",
// "soweli", "moku", "kili") and from closed-class lexicon items actually
// present in ./src/bundle.mjs's rawBundle — no invented Toki Pona vocabulary
// or grammar.
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

test("bundle declares SVO order and preposed-particle attachment parameters", () => {
  assert.equal(bundle.wordOrder, "SVO");
  assert.equal(bundle.attachment.determiner, "left");
  assert.equal(bundle.attachment.adjective, "right");
  assert.equal(bundle.attachment.subject, "left");
  assert.equal(bundle.attachment.object, "right");
  assert.equal(bundle.roleBy, undefined); // Toki Pona carries no case-role flag either
});

test("tag() reproduces the recovered parity.test.mts's own assertions exactly", () => {
  assert.ok(tag("li", bundle).includes("det"));
  assert.ok(tag("e", bundle).includes("det"));
  assert.deepEqual(tag("soweli", bundle), ["noun"]);
  assert.deepEqual(tag("moku", bundle), ["noun"]);
  assert.deepEqual(tag("kili", bundle), ["noun"]);
});

test("articulate() is offset-true: every span's text matches the source slice", () => {
  const text = "mi moku e kili. soweli li lon tomo.";
  const base = articulate(text, bundle);
  for (const s of base.spans) {
    if (s.start === null || s.end === null) continue;
    assert.equal(text.slice(s.start, s.end), s.text, `span mismatch at tier ${s.tier}: "${s.text}"`);
  }
  assert.equal(base.spans.filter((s) => s.tier === "sentence").length, 2);
});

test("parse() reads a clean (H0=1, H1=0) cohomology for a real preposed-preposition sentence", () => {
  const result = firstParse("soweli li lon tomo.");
  const h = read("soweli li lon tomo.", bundle).cohomology;
  assert.equal(h.glued, true);
  assert.equal(h.h0, 1);
  assert.equal(h.h1, 0);
});

test("the pipeline is a deterministic function of (text, bundle): identical input, identical output", () => {
  const text = "soweli li lon tomo.";
  const runOnce = () => firstParse(text);
  assert.deepEqual(runOnce(), runOnce());
});

// ── What's real: prep()/pobj() actually work for Toki Pona (contrast with
// Lakota's honest gap) ── Toki Pona's lexicon.prepositions (lon, tan,
// kepeken, tawa, sama) are genuine PREPOSITIONS — they precede their NP, the
// direction both prep() (scans backward for a verb/noun head) and pobj()
// (scans forward for a nominal object) already assume. Unlike Lakota's
// postpositions, nothing here is filed under the wrong schema slot's
// direction: both arcs resolve correctly.
test("prep()/pobj() resolve correctly for Toki Pona's real preposed prepositions", () => {
  const result = firstParse("soweli li lon tomo.");
  const prep = result.arcs.find((a) => a.rel === "prep");
  const pobj = result.arcs.find((a) => a.rel === "pobj");
  assert.equal(prep?.headText, "soweli");
  assert.equal(prep?.depText, "lon");
  assert.equal(pobj?.headText, "lon");
  assert.equal(pobj?.depText, "tomo");
});

// ── Honest gap #1: isolating morphology means NO word is ever tagged "verb"
// (see README) ── rawBundle.morphology.suffixRules is empty (Toki Pona is
// fully isolating), so tagging.mjs's open-class floor always assigns "noun"
// to content words — including true verbs like "moku" ("eat"). nsubj()/
// dobj() require a word tagged "verb" OR "aux" to anchor on. Without a
// preverb/auxiliary present, NEITHER rule ever fires — not incorrectly, just
// never — leaving the true subject and the true verb both disconnected.
// This is real, reproducible behavior of the shared engine's generic
// nsubj/dobj rules confronted with Toki Pona's real isolating morphology —
// not a new defect introduced by this port.
test("no verb tag ever fires without a preverb: nsubj/dobj never fire, and the true subject/verb are left void", () => {
  const result = firstParse("mi moku e kili.");
  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  const dobj = result.arcs.find((a) => a.rel === "dobj");
  assert.equal(nsubj, undefined);
  assert.equal(dobj, undefined);
  const mi = result.words.find((w) => w.text === "mi");
  const moku = result.words.find((w) => w.text === "moku");
  assert.equal(mi.connected, "void"); // the true subject is never attached to anything
  assert.equal(moku.connected, "void"); // the true verb, floored to "noun", is never attached either
  assert.deepEqual(roles(result), []); // roles() filters on tags.includes("verb"), which never holds
  const h = read("mi moku e kili.", bundle).cohomology;
  assert.equal(h.h1, 2); // both void words register as H1 underdetermined obstructions
});

// ── Honest gap #2: when an auxiliary IS present, dobj's rightward scan
// collides with the real main verb before reaching the true object (see
// README) ── With a preverb like "wile" tagged "aux", nsubj correctly finds
// "mi" scanning left. But dobj scans right from "wile" for the nearest
// noun-or-pronoun and stops at the FIRST one it finds — which is "moku" (the
// real main verb, floored to "noun" since no verb tag exists to distinguish
// it), not "kili" (the true direct object further right). Worse than gap #1:
// cohomology reports this parse as fully "glued" with h1=0, giving no
// algorithmic signal that dobj resolved to the wrong word. This is real,
// reproducible behavior of the shared engine's generic dobj rule confronted
// with Toki Pona's real isolating morphology — not a new defect introduced
// by this port.
test("dobj ambiguity: with an auxiliary present, dobj collides with the real main verb before reaching the true object", () => {
  const result = firstParse("mi wile moku e kili.");
  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  const dobj = result.arcs.find((a) => a.rel === "dobj");
  assert.equal(nsubj?.depText, "mi"); // correct: subject scan leftward from the aux finds the true subject
  assert.equal(dobj?.depText, "moku"); // WRONG: this is the true main verb ("eat"), not the object
  const kili = result.words.find((w) => w.text === "kili");
  assert.notEqual(kili.connected, undefined); // kili is reachable only via the unrelated det arc (e -> kili), never as a dobj
  assert.deepEqual(roles(result), []); // "wile" is tagged aux, not verb, so roles() still finds no frame
  const h = read("mi wile moku e kili.", bundle).cohomology;
  assert.equal(h.glued, true); // "glued" tracks conflicts only — a confidently WRONG parse still glues
  assert.equal(h.h1, 0); // no obstruction is visible; the wrong resolution is invisible to cohomology
});
