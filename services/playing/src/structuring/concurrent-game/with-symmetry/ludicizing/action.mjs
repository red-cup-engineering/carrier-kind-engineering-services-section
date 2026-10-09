/**
 * Actions — Girard 2001 §4 atoms of designs, realized over the meme reading.
 *
 * The action note (corpus, ludics/action, "Definition (Girard 2001 §4.1)")
 * makes the action vocabulary three-fold and exhaustive.  An **action** is one
 * of:
 *
 *   - a **positive action** $(+, \xi, I)$ at a positive locus $\xi$ opening the
 *     finite ramification $I \subseteq_\mathrm{fin} \mathbb{N}$ (which children
 *     loci $\xi \cdot i$ are opened),
 *   - a **negative action** $(-, \xi, I)$ at a negative locus, dually,
 *   - the **Daimon** $\dagger$ — the positive-polarity terminator (give up).
 *
 * The action-to-Belnap-class correspondence (action note, "Theorem: actions are
 * in bijection with three of the four Belnap classes") is bijective on the four
 * bilattice points $\{t, f, \top, \bot\}$, where $\bot$ is "no action at this
 * locus."  This is exactly the existing `DesignAct` reading mapping of
 * `design.mjs` — we do NOT re-hardcode the bilattice; we route through
 * `actReading`/`designAct`, so action↔reading IS the design's act↔reading.
 *
 *   - positive ↦ `proponent` ↦ `potential` = $t = (1,0)$
 *   - negative ↦ `opponent`  ↦ `active`    = $f = (0,1)$
 *   - daimon   ↦ `daimon`    ↦ `stable`    = $\top = (1,1)$ (designated)
 *   - absent   ↦ `none`      ↦ `absurd`    = $\bot = (0,0)$ (the default)
 *
 * The sub-action order (action note, "Definition. The sub-action order $\le$")
 * is, at one locus and polarity, the lattice of finite subsets of $\mathbb{N}$
 * under $\subseteq$; the Daimon is the unique maximum among positive actions at
 * any positive locus.  There are no comparabilities across distinct loci or
 * polarities.
 */

import { polarity, polarityName } from "../../../polarity.mjs";
import {

  child,
  locusDepth,
  locusKey,
  root,
  sameLocus,
} from "./locus.mjs";
import { actReading, daimon } from "./design.mjs";

/** The three concrete action varieties (the non-$\bot$ Belnap classes). */

/**
 * An action — one commitment at one locus.  The bare Daimon $\dagger$ "has no
 * locus" in Girard's notation; following `design.mjs`'s `daimon(xi = root())`
 * we give every action a concrete locus (Daimon defaults to the design base
 * `root()`), an empty ramification, and positive polarity — so the sub-action
 * order is well-defined and `exactOptionalPropertyTypes` stays happy.
 */

  

const freezeRamification = (ramification) => {
  const seen = new Set();
  for (const i of ramification) seen.add(i);
  return Object.freeze([...seen].sort((a, b) => a - b));
};

const makeAction = (
  variety,
  locus,
  ramification,
) =>
  Object.freeze({
    kind: "game.action",
    variety,
    locus,
    ramification: freezeRamification(ramification),
  });

/** A positive action $(+, \xi, I)$ — Proponent commits "told true" at $\xi$. */
export const positiveAction = (xi, ramification = []) =>
  makeAction("positive", xi, ramification);

/** A negative action $(-, \xi, I)$ — Opponent commits "told false" at $\xi$. */
export const negativeAction = (xi, ramification = []) =>
  makeAction("negative", xi, ramification);

/** The Daimon $\dagger_\xi$ — give up at $\xi$ (defaults to the base `root()`). */
export const daimonAction = (xi = root()) =>
  makeAction("daimon", xi, []);

/** The locus at which an action plays. */
export const actionLocus = (a) => a.locus;

/** The finite ramification $I$ of an action ($\emptyset$ for the Daimon). */
export const actionRamification = (a) => a.ramification;

/** The children loci $\xi \cdot i$ opened by the action's ramification. */
export const actionChildren = (a) =>
  Object.freeze(a.ramification.map((i) => child(a.locus, i)));

const VARIETY_TO_ACT = {
  positive: "proponent",
  negative: "opponent",
  daimon: "daimon",
};

/** The polarity of an action — $+$ for positive & Daimon, $-$ for negative. */
export function actionPolarity(a) {
  return polarity(a.variety === "negative" ? "negative" : "positive");
}

/** The `DesignAct` an action commits — the bridge to the existing design layer. */
export const actionAct = (a) => VARIETY_TO_ACT[a.variety];

/**
 * The Belnap reading an action commits, REUSING the design layer's `actReading`.
 * positive↦`potential`=t, negative↦`active`=f, daimon↦`stable`=⊤.  Absent
 * actions ($\bot$=`absurd`) have no `Action` representative — see `readingAction`.
 */
export const actionReading = (a) => actReading(actionAct(a));

/**
 * The action *variety* committed by a reading value (the bijection at the level
 * of TYPES — the action note stresses it forgets locus and ramification, so we
 * return a variety, not a full `Action`).  `absurd` ($\bot$ = no action) maps
 * to `null`.  Mirrors `designAct` of `design.mjs`.
 */
export function readingAction(value) {
  const act = (() => {
    // route through the design layer's act↔reading so the two never diverge
    const matches = (name) =>
      actReading(name) === value;
    if (matches("proponent")) return "positive";
    if (matches("opponent")) return "negative";
    if (matches("daimon")) return "daimon";
    return null;
  })();
  return act;
}

export const sameAction = (left, right) =>
  left.variety === right.variety
  && sameLocus(left.locus, right.locus)
  && left.ramification.length === right.ramification.length
  && left.ramification.every((i, k) => right.ramification[k] === i);

export function isAction(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.action"
    && (candidate.variety === "positive" || candidate.variety === "negative" || candidate.variety === "daimon")
    && Array.isArray(candidate.ramification);
}

/* ------------------------------------------------------------------------- *
 * The sub-action partial order $\le$.
 * ------------------------------------------------------------------------- */

const subsetOf = (small, big) =>
  small.every((i) => big.includes(i));

/**
 * Sub-action order $a \le a'$ (action note, "Definition. The sub-action order").
 * Holds iff:
 *   - same locus & same polarity with $I \subseteq I'$, or
 *   - $a$ is a positive-locus action and $a'$ is the Daimon at the same locus
 *     ($\dagger$ is the maximum among positive actions at any positive locus).
 * No comparabilities across distinct loci or distinct polarities.
 */
export function subAction(a, b) {
  if (!sameLocus(a.locus, b.locus)) return false;
  // † is the max among positive actions at a positive locus.
  if (b.variety === "daimon") {
    return a.variety === "positive" || a.variety === "daimon";
  }
  if (a.variety === "daimon") return false;
  if (a.variety !== b.variety) return false;
  return subsetOf(a.ramification, b.ramification);
}

/** Witness/obstruction for "$a \le a'$" in the sub-action order. */
export function subActionJudgment(a, b) {
  if (subAction(a, b)) {
    return Object.freeze({ kind: "game.action.subAction:witness", lesser: a, greater: b });
  }
  const reason = !sameLocus(a.locus, b.locus)
    ? `distinct loci (${locusKey(a.locus)} vs ${locusKey(b.locus)}): no comparability across loci`
    : a.variety === "daimon"
      ? "the Daimon is maximal: only † ≤ † at the same locus"
      : b.variety === "daimon"
        ? "only positive-polarity actions are below the Daimon (negative actions are incomparable to †)"
        : a.variety !== b.variety
          ? `distinct polarities (${a.variety} vs ${b.variety}): no comparability across polarities`
          : `ramification ${JSON.stringify(a.ramification)} ⊄ ${JSON.stringify(b.ramification)}`;
  return Object.freeze({ kind: "game.action.subAction-obstruction", lesser: a, greater: b, reason });
}

/** The sub-action join $a \vee a'$ at a shared positive/negative locus — union of ramifications. `null` when incomparable-by-locus/polarity (the Daimon-extended join is `daimonAction` when either is †). */
export function subActionJoin(a, b) {
  if (!sameLocus(a.locus, b.locus)) return null;
  if (a.variety === "daimon" || b.variety === "daimon") {
    // † is the top among positive actions; the join with a positive action is †.
    if ((a.variety === "positive" || a.variety === "daimon")
      && (b.variety === "positive" || b.variety === "daimon")) {
      return daimonAction(a.locus);
    }
    return null;
  }
  if (a.variety !== b.variety) return null;
  return makeAction(a.variety, a.locus, [...a.ramification, ...b.ramification]);
}

/* ------------------------------------------------------------------------- *
 * Polarity respects locus parity:  π(ξ) by |ξ| parity, π(root) = +.
 * ------------------------------------------------------------------------- */

/** The parity polarity of a locus: $+$ at even depth (incl. root), $-$ at odd. */
export function parityPolarity(xi) {
  return polarity(locusDepth(xi) % 2 === 0 ? "positive" : "negative");
}

/**
 * Witness/obstruction for "the action's polarity respects its locus parity"
 * (action note, §"Polarity and the Belnap evidence pair": $\pi(\xi)$ by
 * $|\xi|$ parity, $\pi(\varepsilon) = +$).  The Daimon is positive-only and so
 * respects parity exactly at even-depth (positive) loci.
 */
export function parityRespectJudgment(a) {
  const expected = parityPolarity(a.locus);
  const actual = actionPolarity(a);
  if (polarityName(expected) === polarityName(actual)) {
    return Object.freeze({ kind: "game.action.parityRespect:witness", action: a, parityPolarity: expected });
  }
  return Object.freeze({
    kind: "game.action.parityRespect-obstruction",
    action: a,
    parityPolarity: expected,
    reason: `${a.variety} action has polarity ${polarityName(actual)} but locus ${locusKey(a.locus)} (depth ${locusDepth(a.locus)}) has parity polarity ${polarityName(expected)}`,
  });
}