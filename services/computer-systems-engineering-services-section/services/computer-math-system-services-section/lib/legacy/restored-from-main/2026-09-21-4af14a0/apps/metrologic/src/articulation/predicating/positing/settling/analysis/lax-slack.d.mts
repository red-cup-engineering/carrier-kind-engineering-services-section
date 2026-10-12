/**
 * analysis/lax-slack - finite executable shadow of RelMath.Closure.LaxSlackDiagnosis.
 *
 * Lean isolates the order-theoretic reason a KZ/lax-idempotent closure collapses
 * to strict idempotence: antisymmetry. This module models that as finite relation
 * and endomap tables, plus a concrete FOUR/knowledge-order no-slack receipt.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export interface FiniteLaxSystem {
    readonly kind: "laxSlack.finiteSystem";
    readonly labels: readonly string[];
    readonly le: readonly (readonly boolean[])[];
    readonly op: readonly number[];
}
export declare function finiteLaxSystem(labels: readonly string[], le: readonly (readonly boolean[])[], op: readonly number[]): FiniteLaxSystem;
export interface AntisymmetryWitness {
    readonly kind: "laxSlack.antisymmetry:witness";
    readonly carrier: readonly string[];
}
export interface AntisymmetryObstruction {
    readonly kind: "laxSlack.antisymmetry-obstruction";
    readonly pair: readonly [number, number];
    readonly labels: readonly [string, string];
}
export type AntisymmetryJudgment = AntisymmetryWitness | AntisymmetryObstruction;
export declare function antisymmetry(system: FiniteLaxSystem): AntisymmetryJudgment;
export interface KzStrictCollapseWitness {
    readonly kind: "laxSlack.kzStrictCollapse:witness";
    readonly point: number;
    readonly label: string;
    readonly first: number;
    readonly second: number;
    readonly firstLabel: string;
    readonly secondLabel: string;
    readonly inflationAtFirst: true;
    readonly kz: true;
    readonly antisymmetric: true;
    readonly strict: true;
}
export interface KzStrictCollapseObstruction {
    readonly kind: "laxSlack.kzStrictCollapse-obstruction";
    readonly reason: "inflation" | "kz" | "antisymmetry" | "strict";
    readonly point: number;
    readonly label: string;
    readonly first: number;
    readonly second: number;
    readonly firstLabel: string;
    readonly secondLabel: string;
    readonly inflationAtFirst: boolean;
    readonly kz: boolean;
    readonly antisymmetry: AntisymmetryJudgment;
    readonly strict: boolean;
}
export type KzStrictCollapseJudgment = KzStrictCollapseWitness | KzStrictCollapseObstruction;
/** Finite carrier for `kz_strict_of_antisymm`: KZ + inflation + antisymmetry force strictness. */
export declare function kzStrictCollapse(system: FiniteLaxSystem, point: number): KzStrictCollapseJudgment;
export interface LaxSlackAntisymmetryFailureWitness {
    readonly kind: "laxSlack.antisymmetryFailure:witness";
    readonly point: number;
    readonly label: string;
    readonly first: number;
    readonly second: number;
    readonly firstLabel: string;
    readonly secondLabel: string;
    readonly kz: true;
    readonly inflationAtFirst: true;
    readonly strict: false;
    readonly antisymmetryFailurePair: readonly [number, number];
}
export interface LaxSlackAntisymmetryFailureObstruction {
    readonly kind: "laxSlack.antisymmetryFailure-obstruction";
    readonly reason: "kz" | "inflation" | "strict";
    readonly point: number;
    readonly label: string;
    readonly first: number;
    readonly second: number;
    readonly firstLabel: string;
    readonly secondLabel: string;
    readonly kz: boolean;
    readonly inflationAtFirst: boolean;
    readonly strict: boolean;
}
export type LaxSlackAntisymmetryFailureJudgment = LaxSlackAntisymmetryFailureWitness | LaxSlackAntisymmetryFailureObstruction;
/** Finite carrier for `lax_slack_witnesses_antisymmetry_failure`. */
export declare function laxSlackAntisymmetryFailure(system: FiniteLaxSystem, point: number): LaxSlackAntisymmetryFailureJudgment;
export declare const twoPointChainSystem: FiniteLaxSystem;
export declare const nonThinLaxSystem: FiniteLaxSystem;
export interface ChargeNoLaxSlackWitness {
    readonly kind: "laxSlack.chargeNoLaxSlack:witness";
    readonly target: ChargeValueName;
    readonly checked: readonly {
        readonly seed: ChargeValueName;
        readonly first: ChargeValueName;
        readonly second: ChargeValueName;
        readonly kz: boolean;
        readonly strict: boolean;
        readonly laxSlack: false;
    }[];
    readonly noLaxSlack: true;
}
/** Concrete FOUR/knowledge-order receipt: charge join closures have no genuine lax slack. */
export declare function chargeNoLaxSlack(target: ChargeValueName): ChargeNoLaxSlackWitness;
export interface PreValueCategoryReceipt {
    readonly kind: "preValueCategory.laxClosure:witness";
    readonly nonThinCarrier: FiniteLaxSystem;
    readonly slackAt: number;
    readonly laxSlackWitness: LaxSlackAntisymmetryFailureWitness;
    readonly antisymmetryObstruction: AntisymmetryObstruction;
    readonly thinCollapse: KzStrictCollapseWitness;
    readonly kzInequality: true;
    readonly mutuallyBelowDistinct: true;
    readonly genuineLaxConeNeedsNonThinCarrier: true;
    readonly antisymmetricCarrierCollapsesToIdempotence: true;
}
/** Finite receipt for RelMath.Value.PreValueCategory. */
export declare function preValueCategoryReceipt(): PreValueCategoryReceipt;
