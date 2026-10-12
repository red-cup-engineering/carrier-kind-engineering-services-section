/**
 * cognizing — knowing as the comonad on the Meme carrier.
 *
 * Every knowing morphism is Meme → Meme, working the knowledge order ≤_k.
 * The ε-counit (cognize) is the faithful extract; absorb is a ≤_k increment;
 * reflect converges (finite regime) while ruminate is aperiodic (never-settling).
 */
import { stateFromMemes } from "../src/cognizing/section.mjs";
import { cognizeAction } from "../src/cognizing/morphisms/cognize.mjs";
import { absorbAction } from "../src/cognizing/morphisms/absorb.mjs";
import { reflectAction } from "../src/cognizing/morphisms/reflect.mjs";
import { ruminateAction } from "../src/cognizing/morphisms/ruminate.mjs";
import { doubtAction } from "../src/cognizing/morphisms/doubt.mjs";
import { forgetAction } from "../src/cognizing/morphisms/forget.mjs";
import { assessAction } from "../src/cognizing/assess.mjs";
import { inferAction } from "../src/cognizing/infer.mjs";
import { consolidateAction } from "../src/cognizing/consolidate.mjs";
import { knowNecessarilyAction } from "../src/cognizing/know-necessarily.mjs";
import { knowPossiblyAction } from "../src/cognizing/know-possibly.mjs";
import { cell, sameCell } from "@red-cup-engineering/signcell/cell";

// ── build a meme (the comonad's carrier) ─────────────────────────────────────────
const makeMeme = (subject, object, [forSide, againstSide] = [[], []]) =>
  cell(subject, "knows", object, { for: forSide, against: againstSide });

const m = makeMeme("knower", "thing", [["obs"], []]);

// ── cognize: the ε-counit (faithful extract) ────────────────────────────────────
const out = cognizeAction.execute(m, {});
console.log("cell preserved:", sameCell(out, m) && out.for.join() === m.for.join()); // true

// ── absorb: a ≤_k increment (adds evidence, raises knowledge order) ──────────────
const learned = absorbAction.execute(m, { evidence: "counter", side: "against" });
const standing = assessAction.execute(learned, {});
console.log("absorbed standing:", standing.standing); // "stable" (both sides witnessed)
console.log("settled:", standing.settled);            // true

// ── reflect vs ruminate: finite vs aperiodic regime ──────────────────────────────
const stable = makeMeme("knower", "thing", [["o"], ["c"]]);
const reflected = reflectAction.execute(stable, {});
console.log("reflect nests the prior meme:", sameCell(reflected.object, stable)); // true — converges (finite)

const ruminated = ruminateAction.execute(stable, {});
console.log("ruminate nests it twice:", sameCell(ruminated.subject, stable) && sameCell(ruminated.object, stable)); // true — never-settling (aperiodic)

// ── doubt: suspend evidence, return to undecidable ───────────────────────────────
const doubted = doubtAction.execute(stable, {});
console.log("doubt keeps evidence for only:", doubted.for.length, doubted.against.length); // 1 0 — suspended

// ── forget: erase both sides of evidence ─────────────────────────────────────────
const forgotten = forgetAction.execute(stable, {});
const forgottenStanding = assessAction.execute(forgotten, {});
console.log("forgotten standing:", forgottenStanding.standing); // "absurd"

// ── modalities: necessarily / possibly — box/diamond over a world-set W ──────────
// Each world is a knowledge-state: a held section of memes
const world = stateFromMemes("w0", [m]);
const necessarily = knowNecessarilyAction.execute({ meme: m, worlds: [world] }, {});
const possibly    = knowPossiblyAction.execute({ meme: m, worlds: [world] }, {});
console.log("necessarily kind:", necessarily.kind);   // "knowing.modal-standing"
console.log("necessarily modality:", necessarily.modality); // "necessity"
console.log("possibly kind:", possibly.kind);         // "knowing.modal-standing"
console.log("possibly modality:", possibly.modality); // "possibility"
