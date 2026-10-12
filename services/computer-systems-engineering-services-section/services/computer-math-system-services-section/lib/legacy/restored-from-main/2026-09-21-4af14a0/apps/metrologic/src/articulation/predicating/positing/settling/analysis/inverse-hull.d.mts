/**
 * analysis/inverse-hull - constant Anderson-Putnam inverse hull receipts.
 *
 * Executable shadow of RelMath.Aperiodic.InverseHull for the constant H1Class
 * inverse system: every stage carries the same class, restrictions are
 * identity, and the seam reads the class at stage 0.
 */
import { type H1Class } from "./aperiodic-classification.mjs";
export interface ConstantHullThread {
    readonly kind: "aperiodic.inverseHull.constantThread";
    readonly clInv: H1Class;
    readonly sampleStages: readonly number[];
    readonly values: Readonly<Record<string, H1Class>>;
    readonly coherent: true;
}
export interface InverseHullReceipt {
    readonly kind: "aperiodic.inverseHull.receipt:witness";
    readonly thread: ConstantHullThread;
    readonly seam: H1Class;
    readonly witnessThread: ConstantHullThread;
    readonly zeroThread: ConstantHullThread;
    readonly oneThread: ConstantHullThread;
    readonly seamMapConstThread: true;
    readonly seamMapSurjective: true;
    readonly threadExtensional: true;
    readonly hullSeparatedByStages: true;
    readonly hullPairsClInv: true;
    readonly apHullHasDistinctThreads: true;
    readonly constantHullBoundary: "genuine Cantor hull and hullLeaf real accretion remain proof/frontier work";
}
export declare function constThread(clInv: H1Class, sampleStages?: readonly number[]): ConstantHullThread;
export declare function projAt(thread: ConstantHullThread, stage: number): H1Class;
export declare const seamMap: (thread: ConstantHullThread) => H1Class;
export declare function threadExtensional(left: ConstantHullThread, right: ConstantHullThread): boolean;
export declare function hullSeparatedByStages(left: ConstantHullThread, right: ConstantHullThread, stages?: readonly number[]): boolean;
export declare function receipt(coord?: number): InverseHullReceipt;
