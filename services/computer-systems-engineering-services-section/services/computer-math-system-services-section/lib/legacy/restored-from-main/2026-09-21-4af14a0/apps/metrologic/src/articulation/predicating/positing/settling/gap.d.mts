/**
 * settling/gap — the graded gap of a settling and its H¹-rank identity.
 *
 * The cells lost at non-Scott firings; the graded-gap rank equals the first
 * cohomology rank (each lost cell is a cohomology generator).
 */
import { type RankIdentityJudgment } from "./cohomology.mjs";
import type { GradedGapCarrier, SettlementFiltration } from "./object.mjs";
/** The graded gap: one loss per cell added at a non-Scott firing, with its count. */
export declare function readGradedGapOfSettlementFiltration(carrier: SettlementFiltration): GradedGapCarrier;
/** The rank identity: first-cohomology rank equals graded-gap rank. */
export declare const readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration: (carrier: SettlementFiltration) => RankIdentityJudgment;
