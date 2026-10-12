/**
 * settling/gap — the graded gap of a settling and its H¹-rank identity.
 *
 * The cells lost at non-Scott firings; the graded-gap rank equals the first
 * cohomology rank (each lost cell is a cohomology generator).
 */
import { rankIdentity, type RankIdentityJudgment } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cohomology";
import { count } from "@red-cup-engineering/computer-data-engine/exact-number";
import { readFirstCohomologyOfSettlementFiltration } from "./first-cohomology.mts";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mts";
import type { GradedGap, Settlement } from "@lenticule-science/metrologic/settling/settlement";

/** The graded gap: one loss per cell added at a non-Scott firing, with its count. */
export function readGradedGapOfSettlementFiltration(filtration: Settlement): GradedGap {
  const lost = Object.freeze(readNonScottFiringsOfSettlementFiltration(filtration).firings.flatMap((increment) =>
    increment.added.cells.map((cell) => Object.freeze({
      kind: "predication.settling.gradedGapLoss" as const,
      stage: increment.source,
      cell,
    }))));
  return Object.freeze({ kind: "predication.settling.gradedGap" as const, lost, rank: count(lost) });
}

/** The rank identity: first-cohomology rank equals graded-gap rank. */
export const readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration = (filtration: Settlement): RankIdentityJudgment =>
  rankIdentity(readFirstCohomologyOfSettlementFiltration(filtration).rank, readGradedGapOfSettlementFiltration(filtration).rank);
