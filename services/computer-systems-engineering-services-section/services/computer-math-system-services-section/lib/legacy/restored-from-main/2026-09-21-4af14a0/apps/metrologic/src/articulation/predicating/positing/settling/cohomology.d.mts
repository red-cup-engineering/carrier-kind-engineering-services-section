import { type Cell, type PredicationTerm } from "../../predication.mjs";
import { type Integer, type Matrix, type Natural } from "./analysis/exact-number.mjs";
import type { Valuation } from "../fiber.mjs";
import type { SheafCarrier } from "./sheaf.mjs";
/** Witness that two natural ranks coincide. */
export interface RankIdentityWitness {
    readonly kind: "predication.cohomology.rankIdentity:witness";
    readonly left: Natural;
    readonly right: Natural;
}
/** Obstruction recording that two natural ranks differ. */
export interface RankIdentityObstruction {
    readonly kind: "predication.cohomology.rankIdentity-obstruction";
    readonly left: Natural;
    readonly right: Natural;
}
/** The result of a rank-identity check. */
export type RankIdentityJudgment = RankIdentityWitness | RankIdentityObstruction;
/** Witness that a natural rank is zero. */
export interface RankVanishingWitness {
    readonly kind: "predication.cohomology.rankVanishing:witness";
    readonly rank: Natural;
}
/** Obstruction recording that a natural rank is nonzero. */
export interface RankVanishingObstruction {
    readonly kind: "predication.cohomology.rankVanishing-obstruction";
    readonly rank: Natural;
}
/** The result of a rank-vanishing check. */
export type RankVanishingJudgment = RankVanishingWitness | RankVanishingObstruction;
/** The left rank is strictly less than the right. */
export interface BelowRankComparison {
    readonly kind: "predication.cohomology.rankComparison.below";
    readonly left: Natural;
    readonly right: Natural;
}
/** The left and right ranks are equal. */
export interface SameRankComparison {
    readonly kind: "predication.cohomology.rankComparison.same";
    readonly left: Natural;
    readonly right: Natural;
}
/** The left rank is strictly greater than the right. */
export interface AboveRankComparison {
    readonly kind: "predication.cohomology.rankComparison.above";
    readonly left: Natural;
    readonly right: Natural;
}
/** The result of comparing two natural ranks. */
export type RankComparison = BelowRankComparison | SameRankComparison | AboveRankComparison;
/** The zeroth coboundary operator: entities, cells, and the incidence matrix. */
export interface ZeroCoboundaryMatrixCarrier {
    readonly kind: "predication.cohomology.zeroCoboundaryMatrix";
    readonly entities: readonly PredicationTerm[];
    readonly cells: readonly Cell[];
    readonly matrix: Matrix;
}
/** The zeroth cohomology: component count and the indicator cocycle basis. */
export interface ZeroCohomologyCarrier {
    readonly kind: "predication.cohomology.zeroCohomology";
    readonly rank: Natural;
    readonly cocycleBasis: Matrix;
}
/** The first cohomology: the cycle rank and its vanishing judgment. */
export interface FirstCohomologyCarrier {
    readonly kind: "predication.cohomology.firstCohomology";
    readonly rank: Natural;
    readonly vanishing: RankVanishingJudgment;
}
/** The full cohomology of a predication complex. */
export interface CohomologyCarrier {
    readonly kind: "predication.cohomology.carrier";
    readonly entities: readonly PredicationTerm[];
    readonly cells: readonly Cell[];
    readonly zeroCoboundary: ZeroCoboundaryMatrixCarrier;
    readonly zeroCohomology: ZeroCohomologyCarrier;
    readonly firstCohomology: FirstCohomologyCarrier;
}
/** The graph-Laplacian view of a predication cohomology. */
export interface PredicationCohomologyLaplacian {
    readonly kind: "predication.cohomology.laplacian";
    readonly cohomology: CohomologyCarrier;
    readonly incidence: Matrix;
    readonly entityLaplacian: Matrix;
    readonly characteristicPolynomial: readonly Integer[];
    readonly incidenceRank: Natural;
    readonly laplacianRank: Natural;
    readonly zeroCohomologyKernelRank: RankIdentityJudgment;
    readonly firstCohomologyCokernelRank: RankIdentityJudgment;
}
/** Compare two natural ranks for identity. */
export declare function rankIdentity(left: Natural, right: Natural): RankIdentityJudgment;
/** Whether a natural rank vanishes. */
export declare function rankVanishing(rankValue: Natural): RankVanishingJudgment;
/** Order two natural ranks. */
export declare function rankComparison(left: Natural, right: Natural): RankComparison;
/** The cohomology of a valuation: incidence, components (union-find), and cycle rank. */
export declare function cohomologyOfValuation(valuation: Valuation, extraEntities?: readonly PredicationTerm[]): CohomologyCarrier;
/** The cohomology of a sheaf carrier (its section valuation). */
export declare function cohomology(sheaf: SheafCarrier): CohomologyCarrier;
/** The cohomology of a list of cells (wrapped in a single potential-charged fiber). */
export declare function cohomologyOfCells(cells: readonly Cell[], extraEntities?: readonly PredicationTerm[]): CohomologyCarrier;
/** The Laplacian view of a cohomology carrier, with kernel/cokernel rank identities. */
export declare function cohomologyLaplacian(cohomologyCarrier: CohomologyCarrier): PredicationCohomologyLaplacian;
/** The Laplacian of a list of cells. */
export declare function cohomologyLaplacianOfCells(cells: readonly Cell[]): PredicationCohomologyLaplacian;

export declare function firstCohomologyRankOfCells(cells: readonly Cell[], extraEntities?: readonly PredicationTerm[]): Natural;
export declare function componentsOf(cohomologyObject: CohomologyCarrier): readonly (readonly PredicationTerm[])[];
export declare function cohomologyOfEdgeGraph(nodes: readonly string[], edges: readonly (readonly [string, string])[]): CohomologyCarrier;
