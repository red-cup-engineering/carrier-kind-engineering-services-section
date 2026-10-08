/**
 * The defining *condition* of each Caillois regime as a witness/obstruction.
 *
 * `regime.mts` scores all four modes commensurably and names a dominant one.
 * This module refines that picture: it asks, for each regime, whether the
 * regime's *necessary condition* â€” the structural feature without which the
 * mode is not genuinely present â€” actually **holds**.  A board can score
 * non-zero agon yet fail agon's necessary condition (formal equality); the
 * score measures *how much*, the condition judges *whether at all*.  Each
 * condition is grounded in its 2026-05-24 regime journal:
 *
 *   - **agon â€” formal equality / fairness.**  Agon's fairness is the symmetry
 *     of the twist-product fusion ($v_A \odot v_B = v_B \odot v_A$); "agon
 *     requires formal equality of starting conditions" is the algebraic
 *     statement that the algebra does not privilege one party (agon journal,
 *     fairness theorem and its corollary).  Its structural shadow on the arena
 *     is **perfectly balanced Player/Opponent polarity**: the contest is fair
 *     exactly when positive and negative events are evenly matched, neither
 *     side holding predicates the other lacks.  (We do *not* look in the
 *     symmetry groupoid: those bijections are polarity-preserving relabelings,
 *     not the player-exchanging $\mathbf{Z}/2$ swap of the fairness theorem.)
 *   - **alea â€” genuine indeterminacy.**  Alea is *non-confluence*: from one
 *     starting commitment, multiple incomparable normal forms (alea journal,
 *     (Al1)â€“(Al3)).  Its structural shadow is the **presence of conflict**:
 *     at least one pair of events stands in conflict ($\#$), so the running
 *     game forks into incompatible futures.  (This is the same condition as
 *     embedding image-condition (I4) â€” non-trivial bypass-cone structure;
 *     `cultural-embedding.mts` shares it.)
 *   - **mimicry â€” identity / fiction boundary.**  Mimicry is *fiber-assumption*
 *     with a *navigable* enter/exit boundary â€” the double consciousness, the
 *     witness simultaneously holding their own and an assumed fiber (mimicry
 *     journal, double-consciousness theorem).  Its structural shadow is a
 *     **non-identity symmetry**: a relabeling under which a play may put on
 *     another's mask.  Here the symmetry groupoid *is* the right structure.
 *   - **ilinx â€” reversibility.**  Ilinx is a *settlement cascade* that is
 *     playful only when **reversible** â€” the cascade settles, the spin ends,
 *     stability returns; an irreversible cascade is injury, not play (ilinx
 *     journal, (I3) and the play-vs-injury theorem).  Reversibility is read off
 *     an *interaction*, not the arena alone: the cascade is reversible exactly
 *     when it settles into the Daimon $\dagger$ (convergence).  This condition
 *     therefore takes two dual designs, not an arena â€” a faithful asymmetry.
 *
 * All four reuse the existing measures verbatim (`agonScore`, `aleaScore`,
 * `mimicryScore`, and the `cascade` settling judgment); a condition is the
 * *threshold* reading of a score, not a new computation.
 */


import { ratCompare } from "@red-cup-engineering/exact-number-data-service/exact-number";
import {
  agonScore,
  aleaScore,
  mimicryScore,
} from "./regime.mjs";
import {
  cascadeLength,

} from "./cascade.mjs";
import { fromRatio } from "@red-cup-engineering/exact-number-data-service/exact-number";


/** Agon's necessary condition holds â€” the board is a fair, formally-equal contest. */

                                                              

/**
 * Judge agon's necessary condition: *formal equality of starting conditions*,
 * realized as perfectly balanced Player/Opponent polarity (agon journal,
 * fairness corollary).  The condition holds exactly when `agonScore` is $1$ â€”
 * equal numbers of positive and negative events â€” so the algebra does not
 * privilege either party.  An empty board stages no contest; an imbalanced
 * board names the dominant polarity as the obstruction.
 */
export function agonFairness(arena       )                       {
  let positive = 0;
  let negative = 0;
  for (const e of arena.structure.events) {
    if (e.polarity.name === "positive") positive += 1;
    else negative += 1;
  }
  if (positive + negative === 0) {
    return Object.freeze({
      kind: "game-analysis.agonFairness-obstruction"         ,
      arena,
      reason: "empty-board"         ,
      dominant: null,
      positive,
      negative,
    });
  }
  // Fairness IS agonScore = 1 (perfect balance); reuse the existing measure.
  if (ratCompare(agonScore(arena), fromRatio(1, 1)) === 0) {
    return Object.freeze({
      kind: "game-analysis.agonFairness:witness"         ,
      arena,
      positive,
      negative,
    });
  }
  return Object.freeze({
    kind: "game-analysis.agonFairness-obstruction"         ,
    arena,
    reason: "imbalanced"         ,
    dominant: positive > negative ? ("positive"         ) : ("negative"         ),
    positive,
    negative,
  });
}

/** Agon's fairness condition holds in the arena. */
export const isAgonFair = (arena       )          =>
  agonFairness(arena).kind === "game-analysis.agonFairness:witness";

/** Alea's necessary condition holds â€” the board admits genuine indeterminacy. */

                                           

                     

/** Count distinct unordered conflict pairs (conflict is symmetric, stored once). */
const conflictPairCount = (arena       )         => {
  const seen = new Set        ();
  for (const [a, b] of arena.structure.conflict) {
    if (a === b) continue;
    seen.add(a < b ? `${a} ${b}` : `${b} ${a}`);
  }
  return seen.size;
};

/**
 * Judge alea's necessary condition: *genuine indeterminacy*, realized as
 * non-confluence â€” the presence of conflict, so the running game forks into
 * incomparable futures (alea journal, (Al1)â€“(Al3)).  The condition holds
 * exactly when at least one conflict pair exists, equivalently `aleaScore > 0`.
 * A confluent board (no conflict) has a determined trajectory and hosts no
 * alea â€” this is also the failure of embedding image-condition (I4).
 */
export function aleaIndeterminacy(arena       )                            {
  const conflicts = conflictPairCount(arena);
  // Indeterminacy IS aleaScore > 0 (some conflict fork); reuse the measure.
  if (conflicts > 0 && ratCompare(aleaScore(arena), fromRatio(0, 1)) > 0) {
    return Object.freeze({
      kind: "game-analysis.aleaIndeterminacy:witness"         ,
      arena,
      conflicts,
    });
  }
  return Object.freeze({
    kind: "game-analysis.aleaIndeterminacy-obstruction"         ,
    arena,
    reason: "confluent"         ,
  });
}

/** Alea's indeterminacy condition holds in the arena. */
export const isAleaIndeterminate = (arena       )          =>
  aleaIndeterminacy(arena).kind === "game-analysis.aleaIndeterminacy:witness";

/** Mimicry's necessary condition holds â€” a navigable identity boundary exists. */

                                       

                         

/**
 * Judge mimicry's necessary condition: a navigable *identity / fiction
 * boundary*, realized as the existence of a non-identity symmetry â€” a
 * relabeling under which a play may put on another's mask (mimicry journal,
 * double-consciousness theorem; the symmetry groupoid is the right structure).
 * The condition holds exactly when the groupoid has more than the identity
 * bijection, equivalently `mimicryScore > 0`.  A discrete arena carries only
 * identity: no mask, no boundary to cross.
 */
export function mimicryBoundary(arena       )                          {
  const symmetries = arena.symmetry.length;
  // A navigable boundary IS mimicryScore > 0 (a non-identity mask exists).
  if (symmetries > 1 && ratCompare(mimicryScore(arena), fromRatio(0, 1)) > 0) {
    return Object.freeze({
      kind: "game-analysis.mimicryBoundary:witness"         ,
      arena,
      symmetries,
    });
  }
  return Object.freeze({
    kind: "game-analysis.mimicryBoundary-obstruction"         ,
    arena,
    reason: "identity-only"         ,
  });
}

/** Mimicry's identity-boundary condition holds in the arena. */
export const hasMimicryBoundary = (arena       )          =>
  mimicryBoundary(arena).kind === "game-analysis.mimicryBoundary:witness";

/**
 * Judge ilinx's necessary condition: *reversibility* â€” the play-vs-injury
 * distinction (ilinx journal, (I3) and the reversibility theorem).  Playful
 * vertigo's cascade is reversible: it settles, stability returns.  An
 * irreversible cascade is injury, not play.  Reversibility is read off an
 * *interaction* of two dual designs, not the arena alone: the cascade is
 * reversible exactly when it settles into the Daimon $\dagger$ (convergence).
 * This is precisely the settling judgment of `cascade.mts` â€” the cascade
 * *witness* is the reversible (playful) case, the *obstruction* the
 * irreversible (no settled bottom to fall to) case.
 */
export function ilinxReversibility(d1        , d2        )                  {
  return cascadeLength(d1, d2);
}

/** Ilinx's reversibility condition holds â€” the cascade settles into the Daimon. */
export const isIlinxReversible = (d1        , d2        )          =>
  ilinxReversibility(d1, d2).kind === "game-analysis.cascade:witness";

/**
 * The three *arena-readable* regime conditions in one carrier â€” agon's
 * fairness, alea's indeterminacy, mimicry's boundary.  Ilinx's reversibility is
 * deliberately excluded: it needs an interaction (two designs), not an arena,
 * and is judged separately by `ilinxReversibility`.
 */

/** Judge the three arena-readable regime conditions of an arena at once. */
export function regimeConditions(arena       )                   {
  return Object.freeze({
    kind: "game-analysis.regimeConditions"         ,
    arena,
    agonFairness: agonFairness(arena),
    aleaIndeterminacy: aleaIndeterminacy(arena),
    mimicryBoundary: mimicryBoundary(arena),
  });
}
