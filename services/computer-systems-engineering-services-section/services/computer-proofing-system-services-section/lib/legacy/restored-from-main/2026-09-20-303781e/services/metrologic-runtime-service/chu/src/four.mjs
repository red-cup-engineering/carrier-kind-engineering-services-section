// four.mjs — FOUR, the Belnap–Ginsberg four-valued bilattice, as a *reading* of the bilattice floor.
//
// This package exists because ~20 copies of this bilattice were hand-rolled across the repo, each
// re-deriving the same four-valued logic inline. This module re-derives NOTHING. A FOUR value IS
// `@lenticule-science/articulating`'s `ChargeValue`, and every operation below is that charge's own
// morphism — `negateValue`/`conflateValue`/`join-*Value`/`meet-*Value`. FOUR is the charge's algebra
// wearing Belnap's names; the only thing local to this file is the naming (`t`/`f`/`bot`/`top`).
//
//     t   = [true,  false]   true only            bot = [false, false]   neither — no evidence (⊥)
//     f   = [false, true ]   false only           top = [true,  true ]   both — contradiction (⊤)
//
// Two orders run on the pair, σ-dual to each other:
//   • knowledge ≤_k ("how determined"): both bits rise together. join ⊕ = OR/OR, meet ⊗ = AND/AND.
//   • truth     ≤_t ("which way"):       the negative bit is reversed. join ∨ = OR/AND, meet ∧ = AND/OR.
// Two involutions (the Klein gauge): `negate` swaps t↔f (truth flip); `conflate` swaps bot↔top.

import {
  chargeValue,
  chargeValueName,
  conflateValue,
  joinKnowledgeValue,
  joinTruthValue,
  meetKnowledgeValue,
  meetTruthValue,
  negateValue,
} from "@lenticule-science/articulating/predicating/positing/bilattice-charge";

/**
 * The four bilattice values, by name. The string values are stable and may be compared with `===`.
 * @typedef {"t"|"f"|"bot"|"top"} Four
 */

/** The four named values. `T` true-only, `F` false-only, `BOT` ⊥ neither, `TOP` ⊤ both. */
export const FOUR = Object.freeze({ T: "t", F: "f", BOT: "bot", TOP: "top" });

/** Display glyphs for the four values (presentation only — never use for logic). */
export const GLYPH = Object.freeze({ t: "t", f: "f", bot: "⊥", top: "⊤" });

// Belnap's name ⇄ the charge value's own name. No bits are re-derived here.
const CHARGE_NAME = Object.freeze({ t: "potential", f: "active", bot: "absurd", top: "stable" });
const FOUR_NAME = Object.freeze({ potential: "t", active: "f", absurd: "bot", stable: "top" });
const NAMES = Object.freeze(Object.keys(CHARGE_NAME));

/** Is `v` one of the four named values? @param {unknown} v @returns {v is Four} */
export function isFour(v) {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(CHARGE_NAME, v);
}

/** Assert `v` is a Four and return it, else throw. @param {unknown} v @returns {Four} */
export function asFour(v) {
  if (!isFour(v)) throw new TypeError(`not a FOUR value: ${JSON.stringify(v)} (expected one of ${NAMES.join(", ")})`);
  return v;
}

/** @typedef {import("@lenticule-science/articulating/predicating/positing/bilattice-charge").ChargeValue} ChargeValue */

/**
 * The charge value this Four names — `absurd`/`potential`/`active`/`stable`, the one bilattice point.
 * @param {Four} v @returns {ChargeValue}
 */
export function toCharge(v) {
  return chargeValue(CHARGE_NAME[asFour(v)]);
}

/**
 * The Four naming a charge value.
 * @param {ChargeValue} value @returns {Four}
 */
export function fromCharge(value) {
  return FOUR_NAME[chargeValueName(value)];
}

// Lift a charge-value morphism to a Four-operation: name(s) → charge value(s) → the charge's op → name.
// This is the whole trick: the operations ARE the charge's, read on its four named points.
const lift1 = (morphism) => (/** @type {Four} */ a) => fromCharge(morphism(toCharge(a)));
const lift2 = (morphism) => (/** @type {Four} */ a, /** @type {Four} */ b) =>
  fromCharge(morphism(toCharge(a), toCharge(b)));

// ── the two involutions (the Klein gauge) ───────────────────────────────────────────────────────
/** ¬ — the truth involution: swaps t↔f, fixes ⊥,⊤. `articulating/negateValue`. @type {(v: Four) => Four} */
export const negate = lift1(negateValue);
/** − — the knowledge involution: swaps ⊥↔⊤, fixes t,f. `articulating/conflateValue`. @type {(v: Four) => Four} */
export const conflate = lift1(conflateValue);

// ── the two lattice orders, each with its join (lub) and meet (glb) ──────────────────────────────
/** ⊕ — knowledge join (lub in ≤_k); identity is ⊥. `articulating/joinKnowledgeValue`. @type {(a: Four, b: Four) => Four} */
export const knowledgeJoin = lift2(joinKnowledgeValue);
/** ⊗ — knowledge meet (glb in ≤_k); identity is ⊤. `articulating/meetKnowledgeValue`. @type {(a: Four, b: Four) => Four} */
export const knowledgeMeet = lift2(meetKnowledgeValue);
/** ∨ — truth join (lub in ≤_t); identity is f. `articulating/joinTruthValue`. @type {(a: Four, b: Four) => Four} */
export const truthJoin = lift2(joinTruthValue);
/** ∧ — truth meet (glb in ≤_t); identity is t. `articulating/meetTruthValue`. @type {(a: Four, b: Four) => Four} */
export const truthMeet = lift2(meetTruthValue);
