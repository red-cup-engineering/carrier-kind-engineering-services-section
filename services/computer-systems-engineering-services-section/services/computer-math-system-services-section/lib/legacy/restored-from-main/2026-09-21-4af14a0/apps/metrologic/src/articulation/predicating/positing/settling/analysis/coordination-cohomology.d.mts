/**
 * analysis/coordination-cohomology - finite executable shadow of
 * RelMath.Cohomology.CoordinationCohomology.
 *
 * Lean models a federated cover nerve by Euler counts: entities |V|, cells |E|,
 * and components |C|. H0 is |C| and H1 is |E| - |V| + |C| under the carried
 * union-find invariant |V| <= |E| + |C|. This module makes that finite
 * coordination-cost receipt executable.
 */
import { type DetailedBalanceStationaryWitness } from "../stochastic.mjs";
import type { CohomologyCarrier } from "../../cohomology.mjs";
export interface CoverNerveCarrier {
    readonly kind: "coordinationCohomology.coverNerve";
    readonly entities: number;
    readonly cells: number;
    readonly components: number;
    readonly componentsLeEntities: true;
    readonly entitiesLeCellsAddComponents: true;
}
export interface CoverNerveObstruction {
    readonly kind: "coordinationCohomology.coverNerve-obstruction";
    readonly entities: number;
    readonly cells: number;
    readonly components: number;
    readonly reason: "negative-count" | "empty-component-with-entities" | "components-exceed-entities" | "union-find-invariant-fails";
}
export type CoverNerveJudgment = CoverNerveCarrier | CoverNerveObstruction;
export interface CoordinationCostReceipt {
    readonly kind: "coordinationCohomology.cost:witness";
    readonly nerve: CoverNerveCarrier;
    readonly h0Rank: number;
    readonly h1Rank: number;
    readonly spanningForestEdges: number;
    readonly coordinationCost: number;
    readonly coordinationFree: boolean;
    readonly forestEquality: boolean;
    readonly h1VanishesIffForest: true;
    readonly h1RankIsCoordinationCost: true;
}
export interface LaplacianDualReceipt {
    readonly kind: "coordinationCohomology.laplacianDual:witness";
    readonly nerve: CoverNerveCarrier;
    readonly incidenceRank: number;
    readonly h0KernelRank: number;
    readonly h1CokernelRank: number;
    readonly h0EqualsKernel: true;
    readonly h1EqualsCokernel: true;
}
export interface TreeCoordinationReceipt {
    readonly kind: "coordinationCohomology.tree:witness";
    readonly vertices: number;
    readonly edges: number;
    readonly nerve: CoverNerveCarrier;
    readonly edgeCountIdentity: true;
    readonly h1Rank: 0;
    readonly coordinationFree: true;
}
export interface LandauerEntropyReceipt {
    readonly kind: "coordinationCohomology.landauerEntropy:witness";
    readonly nerve: CoverNerveCarrier;
    readonly bits: number;
    readonly coordinationCost: number;
    readonly reversible: boolean;
    readonly landauerFree: boolean;
    readonly zeroIffReversible: true;
    readonly equalsCoordinationCost: true;
    readonly stochasticFace: DetailedBalanceStationaryWitness;
    readonly reversibleIsLandauerFree: true;
    readonly bitScale: "one-bit-per-first-cohomology-class";
    readonly physicalScaleBoundary: "exact bit count only; kT-ln2 thermodynamic scaling remains an interpretation boundary";
}
export interface CoordinationCohomologyReceipt {
    readonly kind: "coordinationCohomology.receipt:witness";
    readonly cycle: CoordinationCostReceipt;
    readonly forest: CoordinationCostReceipt;
    readonly tree: TreeCoordinationReceipt;
    readonly laplacian: LaplacianDualReceipt;
    readonly landauer: LandauerEntropyReceipt;
    readonly openFrontier: readonly string[];
}
export declare function coverNerveJudgment(entitiesInput: number, cellsInput: number, componentsInput: number): CoverNerveJudgment;
export declare function coverNerve(entities: number, cells: number, components: number): CoverNerveCarrier;
export declare function coverNerveOfCohomology(cohomology: CohomologyCarrier): CoverNerveCarrier;
export declare const h0Rank: (nerve: CoverNerveCarrier) => number;
export declare const h1Rank: (nerve: CoverNerveCarrier) => number;
export declare const coordinationFree: (nerve: CoverNerveCarrier) => boolean;
export declare const forestEquality: (nerve: CoverNerveCarrier) => boolean;
export declare const landauerBits: (nerve: CoverNerveCarrier) => number;
export declare const landauerZeroIffReversible: (nerve: CoverNerveCarrier) => boolean;
export declare const landauerEqualsCoordinationCost: (nerve: CoverNerveCarrier) => boolean;
export declare function coordinationCostReceipt(nerve: CoverNerveCarrier): CoordinationCostReceipt;
export declare function laplacianDualReceipt(nerve: CoverNerveCarrier): LaplacianDualReceipt;
export declare function treeCoordinationReceipt(verticesInput: number): TreeCoordinationReceipt;
export declare function landauerEntropyReceipt(nerve?: CoverNerveCarrier): LandauerEntropyReceipt;
export declare function receipt(): CoordinationCohomologyReceipt;
