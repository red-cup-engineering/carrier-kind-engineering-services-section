import { dTop, type ChargedCell, type CochainCarrier, type ShortExactSequenceReceipt } from "./settling-associated-sheaf.mjs";
export interface InconsistencyCohomologyReceipt {
    readonly kind: "inconsistencySheaf.cohomology:witness";
    readonly valuation: readonly ChargedCell[];
    readonly cells: readonly string[];
    readonly h0Top: number;
    readonly hasInconsistencyContent: boolean;
    readonly h0CountsInconsistency: true;
    readonly h1VanishesInStrict: true;
    readonly h1VanishesInScott: true;
    readonly h1VanishesInTransfinite: false;
    readonly h1VanishesInAperiodic: false;
}
export interface ConsistentZeroReceipt {
    readonly kind: "inconsistencySheaf.consistentZero:witness";
    readonly valuation: readonly ChargedCell[];
    readonly cochain: CochainCarrier;
    readonly topSection: CochainCarrier;
    readonly noTopCells: true;
    readonly topSectionZero: true;
}
export interface InconsistencySheafReceipt {
    readonly kind: "inconsistencySheaf.receipt:witness";
    readonly valuation: readonly ChargedCell[];
    readonly cochain: CochainCarrier;
    readonly topMask: ReturnType<typeof dTop>;
    readonly topSection: CochainCarrier;
    readonly cokernel: ShortExactSequenceReceipt;
    readonly cohomology: InconsistencyCohomologyReceipt;
    readonly consistentZero: ConsistentZeroReceipt;
    readonly restrictTopEqualsPi: true;
    readonly cokernelOfIota: true;
    readonly directSumSplitInherited: true;
    readonly frontier: "arbitrary Cech H1 proof objects remain Lean-side; Node reports the finite dTop cokernel and regime gate";
}
export declare const h0Top: (valuation: readonly ChargedCell[]) => number;
export declare const hasInconsistencyContent: (valuation: readonly ChargedCell[]) => boolean;
export declare const restrictTop: (valuation: readonly ChargedCell[], value: CochainCarrier) => CochainCarrier;
export declare function inconsistencyCohomologyReceipt(valuationInput?: readonly ChargedCell[]): InconsistencyCohomologyReceipt;
export declare function consistentZeroReceipt(valuationInput?: readonly ChargedCell[], value?: CochainCarrier): ConsistentZeroReceipt;
export declare function receipt(valuationInput?: readonly ChargedCell[], value?: CochainCarrier): InconsistencySheafReceipt;
