// Theorem-shaped tests for knowing-as-the-comonad-on-Meme, run against the built dist.
// Each name is a falsifiable claim from dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md:
// knowing works the meme's knowledge order ≤_k — meme in, meme out — and the
// reflect/ruminate fork is one value of the general intelligence (regime) faculty.
import { test } from "node:test";
import assert from "node:assert/strict";

// memeCarrier (every cognizing morphism's domain/codomain) is now SignCell's flat
// cellSchema: {subject, predicate, object, for, against} — a meme IS a SignCell, its
// evidence carried directly on the cell. There is no separate meme(cell, charge)
// wrapper any more (signcraft/fiber, which supplied it, is retired); build memes
// straight from signcell/cell's `cell(subject, predicate, object, evidence)`.
import { cell, triple } from "@red-cup-engineering/signcell/cell";
import { witnessedReading } from "@red-cup-engineering/signchain/bilattice";

// SignCell cells cross the content-address boundary (`cell()` calls `semanticBytes` on every
// component and witness), which admits only plain JSON records — a `Mark`/`Token` class instance
// (signcell/utterance's `mark()`/`token()`) is rejected (`Object.getPrototypeOf(source) ===
// Object.prototype` in semiotic-content-address.mjs). So fixtures here use plain JSON literals,
// as communicating's translation-factor.test.mjs's `plainMark` does for the same reason.
// NOTE the calling convention matches the retired class-based API: every call site below is
// `token(mark(x))` (a mark built first, then wrapped as a token) — so `token` here takes an
// already-built mark, exactly as `new Token(markCarrier)` did, rather than building one itself.
const mark = (value) => ({ kind: "utterance.mark", value });
const token = (markValue) => ({ kind: "utterance.token", hand: "left", mark: markValue });
import { cognizeAction } from "../src/cognizing/morphisms/cognize.mjs";
import { absorbAction } from "../src/cognizing/morphisms/absorb.mjs";
import { reflectAction } from "../src/cognizing/morphisms/reflect.mjs";
import { ruminateAction } from "../src/cognizing/morphisms/ruminate.mjs";
import { doubtAction } from "../src/cognizing/morphisms/doubt.mjs";
import { forgetAction } from "../src/cognizing/morphisms/forget.mjs";
import { assessAction } from "../src/cognizing/assess.mjs";
import { gaugeAction } from "../src/cognizing/gauge.mjs";
import { discernAction } from "../src/cognizing/discern.mjs";
import { recollectAction } from "../src/cognizing/recollect.mjs";
import { inferAction } from "../src/cognizing/infer.mjs";
import { attendAction } from "../src/cognizing/attend.mjs";
import { consolidateAction } from "../src/cognizing/consolidate.mjs";
import { attractAction, attractorOf } from "../src/cognizing/attract.mjs";
import { contextualDreamFrontierAction, contextualDreamFrontierOf, contextualSpectrumAction, contextualSpectrumOf } from "../src/cognizing/spectral.mjs";
import { samePatternAction } from "../src/cognizing/same-pattern.mjs";
import { knowNecessarilyAction } from "../src/cognizing/know-necessarily.mjs";
import { knowPossiblyAction } from "../src/cognizing/know-possibly.mjs";
import { cognizingTerms } from "../src/cognizing/expressing.mjs";

test("migrated meme-endomorphisms carry their CHL runTerm witnesses", () => {
  assert.deepEqual(cognizeAction.runTerm, cognizingTerms.cognize);
  assert.deepEqual(reflectAction.runTerm, cognizingTerms.reflect);
  assert.deepEqual(ruminateAction.runTerm, cognizingTerms.ruminate);
  assert.deepEqual(doubtAction.runTerm, cognizingTerms.doubt);
  assert.deepEqual(forgetAction.runTerm, cognizingTerms.forget);
});

// A minimal predicate literal: isCell only checks key presence and every cognizing
// morphism REUSES prior.cell.predicate (never inspects it), so this is faithful.
const pred = { kind: "predication.predicate", claim: { kind: "utterance.claim", hand: "right", mark: mark("knows") }, mark: mark("knows") };
// When no explicit evidence is given, synthesize the witness `value` names: the old
// bilattice-charge carrier could declare a value independently of its evidence array
// (e.g. "potential" with no witnesses); the new evidence-derived reading cannot, so the
// default witness makes the declared value and the derived reading agree.
const makeMeme = (subject, object, value, evidence = [[], []]) => {
  const [forTold, againstTold] = evidence;
  const ev = forTold.length > 0 || againstTold.length > 0
    ? { for: forTold, against: againstTold }
    : witnessedReading(value, "default");
  return cell(token(mark(subject)), pred, token(mark(object)), ev);
};

test("knowing-in/knowing-out: cognize (the ε-unit) preserves the cell and returns a meme", () => {
  const m = makeMeme("knower", "thing", "potential", [[mark("obs")], []]);
  const out = cognizeAction.execute(m, {});
  // subject-gone: the meme carrier is now SignCell's flat cellSchema (subject, predicate,
  // object, for, against; additionalProperties:false) — there is no "kind" tag any more.
  // A meme is the flat SignCell itself, with no separate kind wrapper.
  assert.equal(out.kind, undefined);
  // faithful transmission on the ≤_k axis (compare wire-shapes; the action JSON-projects)
  assert.deepEqual(triple(out), JSON.parse(JSON.stringify(triple(m))));
});

test("absorb is a ≤_k increment: potential + against-evidence settles to stable", () => {
  const m = makeMeme("knower", "thing", "potential", [[mark("obs")], []]);
  const learned = absorbAction.execute(m, { evidence: "counter", side: "against" });
  const standing = assessAction.execute(learned, {});
  assert.equal(standing.standing, "stable"); // both sides witnessed ⇒ ≤_k top
  assert.equal(standing.settled, true);
});

test("reflect converges (charge preserved) but ruminate is the aperiodic, never-settling regime", () => {
  const m = makeMeme("knower", "thing", "stable", [[mark("o")], [mark("c")]]);

  const reflected = reflectAction.execute(m, {});
  assert.deepEqual(
    JSON.parse(JSON.stringify({ for: reflected.for, against: reflected.against })),
    JSON.parse(JSON.stringify({ for: m.for, against: m.against })),
  ); // ≤_k fixpoint preserved
  assert.equal(gaugeAction.execute(reflected, {}).converges, true);

  const ruminated = ruminateAction.execute(m, {});
  const regime = gaugeAction.execute(ruminated, {});
  assert.equal(regime.regime, "aperiodic"); // κ≥ω₁ — settling that fails to settle
  assert.equal(regime.converges, false);
});

test("doubt descends ≤_k one step and forget annihilates to the ≤_k bottom (absurd)", () => {
  const m = makeMeme("knower", "thing", "stable", [[mark("o")], [mark("c")]]);
  assert.equal(assessAction.execute(doubtAction.execute(m, {}), {}).standing, "potential");
  assert.equal(assessAction.execute(forgetAction.execute(m, {}), {}).standing, "absurd");
});

test("discern reads the two derived equalities off the cell's diagonal", () => {
  const onDiagonal = discernAction.execute(makeMeme("x", "x", "potential"), {});
  assert.equal(onDiagonal.onDiagonal, true);
  assert.equal(onDiagonal.classical, "t");
  assert.equal(onDiagonal.paraconsistent, "top");

  const offDiagonal = discernAction.execute(makeMeme("x", "y", "potential"), {});
  assert.equal(offDiagonal.classical, "f");
  assert.equal(offDiagonal.paraconsistent, "bottom");
});

// ── wave 3: the C(Meme) knowledge-state grain ──

test("recollect folds coincident cells up ≤_k into one held section (memory)", () => {
  const a = makeMeme("s", "o", "potential", [[mark("t")], []]); // (s,o) truth-side
  const b = makeMeme("s", "o", "active", [[], [mark("f")]]);    // same cell, falsity-side
  const c = makeMeme("x", "y", "stable", [[mark("p")], [mark("q")]]);
  const state = recollectAction.execute([a, b, c], { base: "demo" });
  assert.equal(state.kind, "knowing.knowledge-state");
  assert.equal(state.held, 2);     // (s,o) folded into one; (x,y) separate
  assert.equal(state.settled, 2);  // potential ∨_k active = stable; (x,y) already stable
});

test("infer is idempotent (the Kock–Zöberlein closure 2-monad)", () => {
  const state = recollectAction.execute([makeMeme("s", "o", "potential", [[mark("t")], []])], { base: "demo" });
  const once = inferAction.execute(state, {});
  const twice = inferAction.execute(once, {});
  assert.deepEqual(twice, once); // closing twice = closing once
});

test("attend restricts the section to a fiber (attention = base-change f*)", () => {
  const state = recollectAction.execute([
    makeMeme("s", "o", "stable", [[mark("t")], [mark("f")]]),
    makeMeme("x", "y", "potential", [[mark("p")], []]),
  ], { base: "demo" });
  const stableOnly = attendAction.execute(state, { standing: "stable" });
  assert.equal(stableOnly.held, 1);
  assert.equal(stableOnly.settled, 1);
});

test("consolidate reports the sheaf verdict (glues, consistency, settled fraction)", () => {
  const state = recollectAction.execute([makeMeme("s", "o", "stable", [[mark("t")], [mark("f")]])], { base: "demo" });
  const v = consolidateAction.execute(state, {});
  assert.equal(v.kind, "knowing.consolidation");
  assert.equal(v.glues, true);          // the bilattice fold is confluent (H¹=0)
  assert.equal(v.settledFraction, 1);
  assert.equal(v.consistent, false);    // the held cell is a both-sides-witnessed contradiction
});

test("same-pattern judges two sections MLD-equivalent by their H¹ fingerprint", () => {
  const left = recollectAction.execute([makeMeme("a", "b", "stable", [[mark("x")], [mark("y")]])], { base: "l" });
  const sameShape = recollectAction.execute([makeMeme("c", "d", "stable", [[mark("u")], [mark("v")]])], { base: "r" });
  assert.equal(samePatternAction.execute({ left, right: sameShape }, {}).equivalent, true);

  const otherShape = recollectAction.execute([makeMeme("a", "b", "potential", [[mark("x")], []])], { base: "r" });
  assert.equal(samePatternAction.execute({ left, right: otherShape }, {}).equivalent, false);
});

// ── wave 4: modal knowing (□/◇ over a world-set) ──

test("modal knowing: □ is the ≤_k meet across worlds, ◇ the ≤_k join (S5)", () => {
  const m = makeMeme("s", "o", "stable", [[mark("t")], [mark("f")]]);
  const w1 = recollectAction.execute([m], { base: "w1" });                                  // holds (s,o) stable
  const w2 = recollectAction.execute([makeMeme("p", "q", "stable", [[mark("a")], [mark("b")]])], { base: "w2" }); // does not

  const box = knowNecessarilyAction.execute({ meme: m, worlds: [w1, w2] }, {});
  assert.equal(box.modality, "necessity");
  assert.equal(box.value, "absurd");   // meet_k(stable, absurd) = absurd — not necessary

  const diamond = knowPossiblyAction.execute({ meme: m, worlds: [w1, w2] }, {});
  assert.equal(diamond.modality, "possibility");
  assert.equal(diamond.value, "stable"); // join_k(stable, absurd) = stable — possible
  assert.equal(diamond.heldIn, 1);
});

test("attract reads MEMORY RECALL as attractor dynamics — cycle-free by the no-periodic-orbit theorem", () => {
  // a clean cue (two distinct one-sided memes) settles to its fixed-point attractor and is
  // fully RECALLABLE: the recall converges (cycle-free) to a contradiction-free pattern.
  const clean = attractorOf([
    makeMeme("a", "x", "potential", [[mark("e")], []]),
    makeMeme("b", "y", "potential", [[mark("e")], []]),
  ]);
  assert.equal(clean.kind, "knowing.attractor");
  assert.equal(clean.attractor, 2);
  assert.equal(clean.spurious, 0);
  assert.equal(clean.cycleFree, true, "the no-non-trivial-periodic-orbit theorem: recall never cycles");
  assert.equal(clean.terminates, true);
  assert.equal(clean.recallable, true);

  // a cue that asserts AND denies the SAME cell settles to a SPURIOUS attractor (⊤ told-both) —
  // a mixed/spurious recall, NOT a clean stored memory. The two coincident memes fold to one ⊤.
  const spurious = attractorOf([
    makeMeme("a", "x", "potential", [[mark("e")], []]),
    makeMeme("a", "x", "active", [[], [mark("f")]]),
  ]);
  assert.equal(spurious.attractor, 1, "coincident opposite readings fold to one attractor cell");
  assert.equal(spurious.spurious, 1, "the ⊤ told-both is a spurious recall");
  assert.equal(spurious.cycleFree, true, "still cycle-free — it converges, to a spurious fixed point");
  assert.equal(spurious.recallable, false, "a spurious (contradictory) attractor is not a clean recall");

  // a REFLEXIVE one-sided cue (a meme-about-a-meme, still one-sided) is the APERIODIC orbit —
  // a memory that keeps deepening and never fully settles (rumination): recall does NOT terminate.
  const inner = makeMeme("a", "x", "potential", [[mark("e")], []]);
  const reflexive = cell(token(mark(inner)), pred, token(mark("y")), { for: [mark("e")], against: [] });
  const ruminating = attractorOf([reflexive]);
  assert.equal(ruminating.regime, "aperiodic");
  assert.equal(ruminating.terminates, false, "the aperiodic orbit never settles");
  assert.equal(ruminating.cycleFree, true, "even aperiodic: monotone-ascending, no periodic orbit");
  assert.equal(ruminating.recallable, false);

  // the verb is registered and dispatches a knowing/attractor resource.
  const out = attractAction.execute([makeMeme("a", "x", "potential", [[mark("e")], []])], {});
  assert.equal(out.kind, "knowing.attractor");
});

import { contextualityOf } from "../src/cognizing/contextuality.mjs";

test("contextuality (the SIGNED sibling of bind): frustration of agree/disagree constraints is the Z₂/H¹ obstruction", () => {
  // a balanced signed graph admits a global truth-assignment — NON-contextual.
  const balanced = contextualityOf(["A=B", "B=C", "A=C"]);
  assert.equal(balanced.kind, "knowing.contextuality");
  assert.equal(balanced.globalSection, true, "balanced ⇒ a consistent 2-colouring (global section) exists");
  assert.equal(balanced.contextual, false);
  assert.equal(balanced.frustration, 0);

  // the FRUSTRATED triangle A=B, B=C, A≠C: each pair is locally satisfiable, but no global
  // assignment satisfies all three — CONTEXTUAL (order effects / dissonance / conjunction fallacy).
  const frustrated = contextualityOf(["A=B", "B=C", "A!=C"]);
  assert.equal(frustrated.contextual, true, "an unbalanced cycle ⇒ no global section ⇒ contextual");
  assert.equal(frustrated.globalSection, false);
  assert.equal(frustrated.frustration, 1, "one constraint must be dropped for balance (the H¹ class)");

  // an odd cycle of inequalities (x≠y, y≠z, z≠x) is frustrated too — the negation (sign) is load-bearing.
  assert.equal(contextualityOf(["x!=y", "y!=z", "z!=x"]).contextual, true);
  // a non-contextual disagreement chain (even) glues fine.
  assert.equal(contextualityOf(["x!=y", "y!=z"]).globalSection, true);
});

test("contextual-spectrum bridges harmonic spectral residue with signed global-section obstruction", () => {
  const memes = [
    makeMeme("A", "B", "potential", [[mark("ab")], []]),
    makeMeme("B", "C", "potential", [[mark("bc")], []]),
    makeMeme("C", "A", "potential", [[mark("ca")], []]),
  ];
  const constraints = ["A=B", "B=C", "A!=C"];

  const bridge = contextualSpectrumOf({ memes, constraints });
  assert.equal(bridge.kind, "knowing.contextual-spectrum");
  assert.equal(bridge.hodge.irreducible, 1);
  assert.equal(bridge.contextuality.frustration, 1);
  assert.equal(bridge.obstruction.phase, "harmonic-contextual");
  assert.equal(bridge.praxis.action.includes("dream frontier"), true);

  const projected = contextualSpectrumAction.execute({ memes, constraints }, {});
  assert.equal(projected.kind, "knowing.contextual-spectrum");
  assert.equal(projected.obstruction.phase, "harmonic-contextual");
});

test("contextual-dream-frontier promotes global-section obstruction into aperiodic residue", () => {
  const memes = [
    makeMeme("A", "B", "potential", [[mark("ab")], []]),
    makeMeme("B", "C", "potential", [[mark("bc")], []]),
    makeMeme("C", "A", "potential", [[mark("ca")], []]),
  ];
  const constraints = ["A=B", "B=C", "A!=C"];

  const frontier = contextualDreamFrontierOf({ memes, constraints, limit: 1 });
  assert.equal(frontier.kind, "knowing.contextual-dream-frontier");
  assert.equal(frontier.regime, "aperiodic");
  assert.equal(frontier.spectrum.obstruction.phase, "harmonic-contextual");
  assert.equal(frontier.bridge.active, true);
  assert.equal(frontier.observations.length, 2);
  assert.equal(frontier.residue.pairs.length, 1);
  assert.deepEqual(frontier.residue.pairs[0].finiteReachability, {
    "strict": false,
    "scott": false,
    "transfinite-bounded": false,
  });
  assert.equal(frontier.dream.candidates.length, 1);
  assert.equal(frontier.praxis.interventions.length, 1);
  assert.equal(frontier.theory.dream, "aperiodic-non-convergence");

  const projected = contextualDreamFrontierAction.execute({ memes, constraints, limit: 1 }, {});
  assert.equal(projected.kind, "knowing.contextual-dream-frontier");
  assert.equal(projected.residue.pairs[0].strictRegimeExclusions.length, 3);
});
