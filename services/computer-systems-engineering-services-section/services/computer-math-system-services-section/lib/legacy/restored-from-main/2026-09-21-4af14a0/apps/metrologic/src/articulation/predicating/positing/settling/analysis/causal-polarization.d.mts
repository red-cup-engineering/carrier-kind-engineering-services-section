/**
 * analysis/causal-polarization - causal colouring polarization and Liouville receipts.
 *
 * Executable shadow of RelMath.Lorentzian.CausalPolarization and
 * RelMath.Lorentzian.CausalLiouville: a nondegenerate polarization is exactly a
 * proper colouring of direct causal edges, graph-hom/factor maps pull it back,
 * and the Liouville 1-form is the exact coboundary dc with d(dc)=0.
 */
import { type CausalSetCarrier } from "./causal.mjs";
export type ColorAssignment = Readonly<Record<string, number>>;
export type EventMap = Readonly<Record<string, string>>;
export interface PolarizationFormEntry {
    readonly from: string;
    readonly to: string;
    readonly value: number;
}
export interface CausalPolarizationReceipt {
    readonly kind: "lorentzian.causalPolarization.receipt:witness";
    readonly carrier: CausalSetCarrier;
    readonly colors: ColorAssignment;
    readonly form: readonly PolarizationFormEntry[];
    readonly nondegenerate: boolean;
    readonly properColoring: boolean;
    readonly nondegenerateIffProper: true;
    readonly mldPreservesPolarization: true;
    readonly boolPolarizationIffBipartite: true;
    readonly chromaticObstruction: "odd causal cycle obstructs Bool polarization";
}
export interface CausalLiouvilleReceipt {
    readonly kind: "lorentzian.causalLiouville.receipt:witness";
    readonly carrier: CausalSetCarrier;
    readonly colors: ColorAssignment;
    readonly liouville: readonly PolarizationFormEntry[];
    readonly omega: readonly number[];
    readonly liouvilleCodirEqualsPolForm: true;
    readonly omegaExact: true;
    readonly omegaClosed: true;
    readonly omegaLiouvilleZero: true;
    readonly liouvilleNondegenerateIffProper: true;
    readonly mldPreservesLiouville: true;
    readonly exactSymplecticBoundary: "the implemented datum is exact Liouville polarization, not a nontrivial H2 class";
}
export declare function polForm(colors: ColorAssignment, from: string, to: string): number;
export declare function polarizationForm(carrier: CausalSetCarrier, colors: ColorAssignment): readonly PolarizationFormEntry[];
export declare function nondegenerate(carrier: CausalSetCarrier, colors: ColorAssignment): boolean;
export declare function properColoring(carrier: CausalSetCarrier, colors: ColorAssignment): boolean;
export declare function graphHom(source: CausalSetCarrier, target: CausalSetCarrier, map: EventMap): boolean;
export declare function pullbackColors(map: EventMap, colors: ColorAssignment): ColorAssignment;
export declare function bipartiteColoring(carrier: CausalSetCarrier): ColorAssignment | undefined;
export declare const hasBoolPolarization: (carrier: CausalSetCarrier) => boolean;
export declare function liouville(carrier: CausalSetCarrier, colors: ColorAssignment): readonly PolarizationFormEntry[];
export interface CausalTriangle {
    readonly a: string;
    readonly b: string;
    readonly c: string;
}
export declare function causalTriangles(carrier: CausalSetCarrier): readonly CausalTriangle[];
export declare function omegaLiouville(carrier: CausalSetCarrier, colors: ColorAssignment): readonly number[];
export declare const diamondCarrier: CausalSetCarrier;
export declare const triangleCarrier: CausalSetCarrier;
export declare function polarizationReceipt(carrier?: CausalSetCarrier, colors?: ColorAssignment): CausalPolarizationReceipt;
export declare function liouvilleReceipt(carrier?: CausalSetCarrier, colors?: ColorAssignment): CausalLiouvilleReceipt;
