/**
 * settling/gap — the graded gap of a settling and its H¹-rank identity.
 *
 * The cells lost at non-Scott firings; the graded-gap rank equals the first
 * cohomology rank (each lost cell is a cohomology generator).
 */
import { rankIdentity } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/cohomology";
import { count } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { readFirstCohomologyOfSettlementFiltration } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/first-cohomology";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";

/** The graded gap: one loss per cell added at a non-Scott firing, with its count. */
export function readGradedGapOfSettlementFiltration(filtration) {
  const lost = Object.freeze(readNonScottFiringsOfSettlementFiltration(filtration).firings.flatMap((increment) =>
    increment.added.cells.map((cell) => Object.freeze({
      kind: "predication.settling.gradedGapLoss",
      stage: increment.source,
      cell,
    }))));
  return Object.freeze({ kind: "predication.settling.gradedGap", lost, rank: count(lost) });
}

/** The rank identity: first-cohomology rank equals graded-gap rank. */
export const readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration = (filtration) =>
  rankIdentity(readFirstCohomologyOfSettlementFiltration(filtration).rank, readGradedGapOfSettlementFiltration(filtration).rank);
