import { type H1Class } from "./aperiodic-classification.mjs";
import { type FiniteValuation, type LaplacianizerWitness } from "./flow.mjs";
export interface LawvereHarmonicCohomologyReceipt {
    readonly kind: "lawvereHarmonicCohomology.receipt:witness";
    readonly seed: FiniteValuation;
    readonly settled: FiniteValuation;
    readonly laplacianizer: LaplacianizerWitness;
    readonly classifyingInvariant: H1Class;
    readonly h0TruthFiringCount: number;
    readonly harmonic: true;
    readonly fixedPoint: true;
    readonly classifyingInvariantZero: true;
    readonly cocycle: true;
    readonly coboundary: true;
    readonly coboundaryUnique: true;
    readonly h0CountsTruthFirings: true;
    readonly strictScottRegimeGate: true;
    readonly transfiniteAperiodicBoundary: true;
    readonly frontier: readonly string[];
}
export declare const defaultSeed: FiniteValuation;
export declare const h0TruthFiringCount: (value: FiniteValuation) => number;
export declare function receipt(seed?: FiniteValuation): LawvereHarmonicCohomologyReceipt;
