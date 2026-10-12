/**
 * Existence as a bilattice charge — and death as a reading of it.
 *
 * In this engine a body does not have a boolean `alive`. Its existence is a
 * four-valued bilattice charge (meme-algebra's `ChargeValue`), and *visibility
 * is that charge*: a body renders when its existence reads real or
 * contradiction, and is culled when it reads destroyed or unknown. Evidence is
 * monotone — conservation of evidence, the substrate's first commitment — so a
 * body's existence is never mutated; it is the knowledge-join of the positive
 * `alive` evidence and the negative `slain` evidence accumulated about it:
 *
 *     existence = joinKnowledge( alive ? t : ⊥ ,  slain ? f : ⊥ )
 *
 *   ⊥ absurd     no evidence either way      → not a body yet; culled
 *   t potential  alive, not slain            → real; rendered
 *   f active     slain, never alive          → destroyed/void; culled
 *   ⊤ stable     alive AND slain             → a held contradiction; the
 *                                              paraconsistent case — the engine
 *                                              does not throw it, it *renders*
 *                                              it (the undead)
 *
 * `slain ⊣ alive` (slain read as negative evidence into the existence cell) is
 * the *reading*, not an admitted polarity: meme-topology has no verb that
 * admits a denial. The negativity lives here, at the read, exactly as aletheon
 * and ruinfold routed a killing blow's `slain` row as negative evidence.
 *
 * Which contradiction a slain body *gets* is read from its death-rule (data on
 * the body), routed onto the same four values — the five deaths ruinfold built,
 * recovered as policy over the bilattice rather than five code paths.
 */

import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  type ChargeValue,
  type ChargeValueName,
} from "@emsenn/relating";

/** Monotone evidence accumulated about one body's existence. Never removed —
 *  only added to. `aliveCount`/`slainCount` are evidence weights (how many
 *  assertions landed); presence, not magnitude, drives the charge, but the
 *  counts are kept so resurrection (more `alive`) and overkill are legible. */
export interface ExistenceEvidence {
  readonly kind: "qwzspace.existence.evidence";
  readonly aliveCount: number;
  readonly slainCount: number;
}

export const noEvidence = (): ExistenceEvidence =>
  Object.freeze({ kind: "qwzspace.existence.evidence" as const, aliveCount: 0, slainCount: 0 });

/** Articulate one unit of positive `alive` evidence (spawn, heal, resurrect). */
export const witnessAlive = (evidence: ExistenceEvidence, units = 1): ExistenceEvidence =>
  Object.freeze({ ...evidence, aliveCount: evidence.aliveCount + Math.max(1, units | 0) });

/** Articulate one unit of negative `slain` evidence (a killing blow). */
export const witnessSlain = (evidence: ExistenceEvidence, units = 1): ExistenceEvidence =>
  Object.freeze({ ...evidence, slainCount: evidence.slainCount + Math.max(1, units | 0) });

const ABSURD = chargeValue("absurd"); // ⊥
const POTENTIAL = chargeValue("potential"); // t
const ACTIVE = chargeValue("active"); // f

/** The existence charge of a body: the knowledge-join of its alive and slain
 *  evidence. This is meme-algebra's bilattice, used directly — the join of
 *  positive `t` and negative `f` is the contradiction `⊤` (stable), which is
 *  why the undead are a held contradiction and not a crash. */
export const existenceCharge = (evidence: ExistenceEvidence): ChargeValue =>
  joinKnowledgeValue(
    evidence.aliveCount > 0 ? POTENTIAL : ABSURD,
    evidence.slainCount > 0 ? ACTIVE : ABSURD,
  );

export const existenceName = (evidence: ExistenceEvidence): ChargeValueName =>
  chargeValueName(existenceCharge(evidence));

/** The bilattice glyph the wire carries so a client can show world-truth, as
 *  aletheon's view did. */
export const existenceGlyph = (evidence: ExistenceEvidence): "⊥" | "t" | "f" | "⊤" => {
  switch (existenceName(evidence)) {
    case "absurd": return "⊥";
    case "potential": return "t";
    case "active": return "f";
    case "stable": return "⊤";
  }
};

/**
 * The five deaths, as policy over the bilattice rather than five code paths.
 * Every rule's killing blow is the same: it adds `slain` evidence. The rule
 * only decides what the resulting charge *means* for rendering and return:
 *
 *   - `undead`    at ⊤ → renders (rises); the contradiction is its resting
 *                 state. Heal it; it stays ⊤ forever.
 *   - `named`     at ⊤ → does not render (a true, settled death); long return.
 *   - `mortal`    at ⊤ → does not render; ordinary return on cooldown.
 *   - `construct` at ⊤ → does not render; *unmade* — removed from the world
 *                 (returns to the void cone) and reformed elsewhere, not a
 *                 standing corpse.
 *   - `cursed`    at ⊤ → does not render; on return, its slayer is itself
 *                 contradicted (a dual identity laid on the killer) — the
 *                 curse is a *new* ⊤ on another body, handled by the scene.
 */
export type DeathRule = "undead" | "named" | "mortal" | "construct" | "cursed";

export const DEATH_RULES: readonly DeathRule[] = Object.freeze(["undead", "named", "mortal", "construct", "cursed"]);

export const isDeathRule = (value: unknown): value is DeathRule =>
  typeof value === "string" && (DEATH_RULES as readonly string[]).includes(value);

/** Does a body with this death-rule and this evidence render? Real (t) always
 *  renders. Of the contradiction (⊤), only the undead render — every other
 *  rule reads ⊤ as gone. Destroyed (f) and unknown (⊥) never render. */
export const rendersUnder = (rule: DeathRule, evidence: ExistenceEvidence): boolean => {
  const name = existenceName(evidence);
  if (name === "potential") return true;
  if (name === "stable") return rule === "undead";
  return false;
};

/** Whether a slain body of this rule is *unmade* — removed from the world
 *  rather than left as a (possibly hidden) corpse. Constructs return to ⊥. */
export const isUnmadeUnder = (rule: DeathRule, evidence: ExistenceEvidence): boolean =>
  rule === "construct" && existenceName(evidence) === "stable";
