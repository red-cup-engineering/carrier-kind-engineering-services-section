/**
 * Suits' lusory attitude — the witness-side stance that makes play *play*.
 *
 * Bernard Suits (1978) defines a game tightly: "to play a game is to attempt to
 * achieve a specific state of affairs (the **prelusory goal**), using only means
 * permitted by rules (**lusory means**), where the rules prohibit use of more
 * efficient in favour of less efficient means (**constitutive rules**), and
 * where the rules are accepted just because they make possible such activity
 * (the **lusory attitude**)" — "the voluntary attempt to overcome unnecessary
 * obstacles" (lusory-attitude journal 2026-05-24).
 *
 * The journal lifts all four components to the substrate term-by-term, and
 * identifies the lusory attitude with embedding image-condition (I1): the
 * witness selects *one* closure-rule system $\mathcal{S}$ — one behaviour
 * $\mathbf{B}^* \in \mathrm{Beh}(\xi_0)$ — among the multiple consistent
 * choices, and that selection is what makes the substrate *played* rather than
 * *processed*.  The attitude is **non-trivial** exactly when there is more than
 * one consistent rule-system to choose among ($|\mathrm{Beh}(\xi_0)| > 1$); with
 * a single forced rule-system the witness has no real choice and the attitude
 * degenerates (lusory-attitude journal, "Distinction from forced commitment").
 *
 * We realize the four components over `@emsenn/game-*`:
 *   - **prelusory goal** — a target reading state at a locus (the "state of
 *     affairs" describable without the rules): a `Locus` and the `ReadingValue`
 *     the witness aims to commit there.
 *   - **constitutive rules** — the chosen behaviour: the witness's committed
 *     `Design` (the rule-system $\mathcal{S}_{\mathbf{B}^*}$), drawn from a
 *     universe of *alternatives* (the consistent siblings in $\mathrm{Beh}$).
 *   - **lusory means** — the moves the witness actually commits: the support of
 *     the chosen design (the positing-morphisms that fire under its rules).
 *   - **lusory attitude** — the judgment that the witness *voluntarily* accepts
 *     these constitutive-rule constraints to reach the prelusory goal: the
 *     chosen design must reach the goal, and the choice must be non-trivial
 *     (alternatives exist), or the commitment is forced, not lusory.
 *
 * No bilattice is reinvented: the goal reading is a `ReadingValue`, reached when
 * the design's reading at the goal locus equals it under `samePoint`.
 */

import { designReading, supportKeys } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/design";
import { locusKey } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/locus";
import { samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** Suits' prelusory goal — a target reading at a locus, describable without the rules. */

/** Build a prelusory goal: a target reading at a locus. */
export function prelusoryGoal(locus, target) {
  return Object.freeze({
    kind: "game-analysis.prelusoryGoal",
    locus,
    target,
  });
}

/**
 * A Suitsian game-with-strategy: a prelusory goal, the witness's chosen
 * constitutive rules (a committed `Design` = behaviour $\mathbf{B}^*$), and the
 * consistent *alternative* rule-systems available (the sibling behaviours).
 * The chosen design's support is the *lusory means*.  The alternatives carry the
 * voluntariness: with no alternative the commitment is forced, not lusory.
 */

  

/** Build a Suitsian game from a goal, a chosen design, and the alternatives. */
export function suitsianGame(
  goal,
  chosen,
  alternatives = [],
) {
  return Object.freeze({
    kind: "game-analysis.suitsianGame",
    goal,
    chosen,
    alternatives: Object.freeze([...alternatives]),
  });
}

/**
 * Suits' lusory means: the moves the witness commits under the chosen
 * constitutive rules — the support keys of the chosen design (the positing
 * morphisms that fire under $\mathcal{S}_{\mathbf{B}^*}$'s rules).
 */
export const lusoryMeans = (g) =>
  supportKeys(g.chosen);

  

  
  

/**
 * Judge whether a game-with-strategy exhibits the *lusory attitude*: the
 * witness voluntarily accepting the constitutive-rule constraints to reach the
 * prelusory goal (lusory-attitude journal).  Two conditions, both required:
 *
 *   1. **The chosen rules reach the goal.**  The chosen design's reading at the
 *      goal locus equals the target reading — the constitutive rules actually
 *      bring about the prelusory state of affairs.  Otherwise the attitude has
 *      no activity to take it toward (Suits: a stance without lusory means).
 *   2. **The acceptance is voluntary (I1).**  At least one consistent
 *      *alternative* rule-system exists that the witness declined.  A more
 *      efficient route is available, yet the witness commits to these awkward
 *      constraints "just because they make possible such activity."  With no
 *      alternative the commitment is *forced* — labour, not play.
 *
 * The witness records the lusory means and how many alternatives were declined.
 */
export function lusoryAttitudeJudgment(g) {
  const reached = designReading(g.chosen, g.goal.locus);
  if (!samePoint(reached, g.goal.target)) {
    return Object.freeze({
      kind: "game-analysis.lusoryAttitude-obstruction",
      game: g,
      reason: "goal-unreached",
    });
  }
  if (g.alternatives.length === 0) {
    return Object.freeze({
      kind: "game-analysis.lusoryAttitude-obstruction",
      game: g,
      reason: "forced-commitment",
    });
  }
  return Object.freeze({
    kind: "game-analysis.lusoryAttitude:witness",
    game: g,
    means: supportKeys(g.chosen),
    declined: g.alternatives.length,
  });
}

/** Whether a game-with-strategy exhibits the lusory attitude. */
export const hasLusoryAttitude = (g) =>
  lusoryAttitudeJudgment(g).kind === "game-analysis.lusoryAttitude:witness";

/**
 * Whether the chosen constitutive rules bring about the prelusory goal — the
 * goal locus carries the target reading under the chosen design.  This is the
 * "activity to take the attitude toward" half of Suits' definition, read on its
 * own (independent of voluntariness).
 */
export const reachesGoal = (g) =>
  samePoint(designReading(g.chosen, g.goal.locus), g.goal.target);

/**
 * Whether the lusory commitment is *non-trivial* in the (I1) sense: more than
 * one consistent rule-system is available, so the witness's selection is a real
 * choice (the obstacles are "unnecessary" because alternatives exist).  This is
 * the voluntariness half, read on its own.
 */
export const isVoluntaryCommitment = (g) =>
  g.alternatives.length > 0;

/** The locus key at which the prelusory goal is read — convenience over `locusKey`. */
export const goalLocusKey = (g) => locusKey(g.goal.locus);
