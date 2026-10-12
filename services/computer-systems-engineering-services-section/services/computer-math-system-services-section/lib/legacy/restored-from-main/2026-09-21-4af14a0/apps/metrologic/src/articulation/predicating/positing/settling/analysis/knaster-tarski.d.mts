/**
 * analysis/knaster-tarski - finite executable shadow of
 * RelMath.Order.KnasterTarskiStandalone.
 *
 * Lean proves the abstract complete-lattice theorem. This module carries the
 * finite table version: a finite complete lattice relation plus a monotone
 * endomap table yields least/greatest fixed-point receipts.
 */
import { type CompleteLatticeObstruction, type FinitePreorderSystem, type MonotoneMapObstruction } from "./order-infra.mjs";
export interface FiniteMonotoneEndomap {
    readonly kind: "knasterTarski.finiteMonotoneEndomap";
    readonly order: FinitePreorderSystem;
    readonly map: readonly number[];
}
export declare function finiteMonotoneEndomap(order: FinitePreorderSystem, map: readonly number[]): FiniteMonotoneEndomap;
export interface KnasterTarskiWitness {
    readonly kind: "knasterTarski.fixedPoints:witness";
    readonly carrier: readonly string[];
    readonly map: readonly number[];
    readonly prefixPoints: readonly number[];
    readonly postfixPoints: readonly number[];
    readonly fixedPoints: readonly number[];
    readonly lfp: number;
    readonly lfpLabel: string;
    readonly gfp: number;
    readonly gfpLabel: string;
    readonly lfpFixed: true;
    readonly gfpFixed: true;
    readonly lfpLeast: true;
    readonly gfpGreatest: true;
    readonly lfpLeGfp: true;
}
export interface KnasterTarskiObstruction {
    readonly kind: "knasterTarski.fixedPoints-obstruction";
    readonly reason: "completeLattice" | "monotone" | "lfp-infimum" | "gfp-supremum" | "lfp-fixed" | "gfp-fixed" | "lfp-least" | "gfp-greatest" | "bracket";
    readonly completeLattice?: CompleteLatticeObstruction;
    readonly monotone?: MonotoneMapObstruction;
    readonly candidates?: readonly number[];
    readonly candidateLabels?: readonly string[];
    readonly point?: number;
    readonly pointLabel?: string;
}
export type KnasterTarskiJudgment = KnasterTarskiWitness | KnasterTarskiObstruction;
/** Finite Knaster-Tarski receipt: monotone endomap on a finite complete lattice. */
export declare function fixedPoints(endomap: FiniteMonotoneEndomap): KnasterTarskiJudgment;
