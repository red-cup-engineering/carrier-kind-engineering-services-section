/**
 * The settlement cascade — ilinx as iterated interaction depth.
 *
 * Ilinx (Caillois) is "play structured around vertigo — the temporary
 * disruption of stable perception" (corpus, terms/ilinx), realized on the
 * dialogical-game substrate as a *settlement cascade* (cultural-ludic embedding
 * journal: "ilinx-heavy plays to settlement-cascade-dominated configurations").
 * Where `regime.mts` reads ilinx structurally off the arena's causal depth,
 * this module measures the *actual* cascade of an interaction: how far the play
 * falls — how many meeting loci it descends through — before it settles into
 * the Daimon $\dagger$ (convergence).
 *
 * The depth is read off the interaction normal form of two dual designs.  We
 * reuse `interactionReport` (the per-locus meeting of the designs) and
 * `convergenceJudgment` (whether the join reaches a $\top$-collision) from the
 * cores verbatim — the cascade is not a new interaction, it is a *measurement*
 * of one.  The Daimon loci are the give-up points; `locusDepth` measures how
 * deep in the locus tree the deepest fall lands.  A long cascade is a long
 * vertiginous descent — the algebraic shadow of ilinx.
 */

import { convergenceJudgment } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/settling/orthogonality";
import { interactionReport } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/strategizing/interaction";
import { locusDepth } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/locus";

  

  

    

/**
 * Measure the settlement cascade of an interaction between two dual designs.
 * The interaction converges (a witness) exactly when it reaches the Daimon;
 * `length` is then the locus-tree depth of the deepest $\top$-collision — the
 * vertigo's reach.  Divergence (no meeting, or meeting without a Daimon) is an
 * obstruction: there is no settled bottom to fall to.
 */
export function cascadeLength(d1, d2) {
  const report = interactionReport(d1, d2);
  const meetings = report.meetings.length;
  const convergence = convergenceJudgment(d1, d2);
  if (convergence.kind === "game.convergence-obstruction") {
    return Object.freeze({
      kind: "game-analysis.cascade-obstruction",
      reason: convergence.reason,
      meetings,
    });
  }
  const daimonLoci = convergence.daimonLoci;
  // Convergence guarantees at least one Daimon locus; fold to the deepest.
  let settlesAt = daimonLoci[0];
  let length = locusDepth(settlesAt);
  for (const xi of daimonLoci) {
    const depth = locusDepth(xi);
    if (depth > length) {
      length = depth;
      settlesAt = xi;
    }
  }
  return Object.freeze({
    kind: "game-analysis.cascade:witness",
    meetings,
    daimonCount: daimonLoci.length,
    length,
    settlesAt,
  });
}

/** Whether the interaction settles into the Daimon — has a finite cascade. */
export const settles = (d1, d2) =>
  cascadeLength(d1, d2).kind === "game-analysis.cascade:witness";
