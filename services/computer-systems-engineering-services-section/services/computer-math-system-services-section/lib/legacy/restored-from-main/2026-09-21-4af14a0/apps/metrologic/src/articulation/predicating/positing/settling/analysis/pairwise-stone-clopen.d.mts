/**
 * analysis/pairwise-stone-clopen - finite executable shadow of
 * RelMath.Cohomology.PairwiseStoneClopen.
 *
 * Lean proves the two-point paired Priestley / pairwise-Stone dual of FOUR:
 * points `{plus, minus}`, antichain order, swap involution, clopen up-sets as
 * boolean membership pairs, and the transport of swap to FOUR negation. This
 * module keeps exactly that finite carrier executable.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export type StonePointName = "plus" | "minus";
export interface StonePoint {
    readonly kind: "pairwiseStone.point";
    readonly name: StonePointName;
}
export interface ClopenUp {
    readonly kind: "pairwiseStone.clopenUp";
    readonly plus: boolean;
    readonly minus: boolean;
}
export interface PairedPriestleyReceipt {
    readonly kind: "pairwiseStone.pairedPriestley:witness";
    readonly points: readonly StonePoint[];
    readonly order: readonly (readonly [StonePointName, StonePointName])[];
    readonly sigma: Readonly<Record<StonePointName, StonePointName>>;
    readonly reflexive: true;
    readonly transitive: true;
    readonly antisymmetric: true;
    readonly antichain: true;
    readonly sigmaInvolutive: true;
    readonly sigmaOrderReversing: true;
}
export interface ClopenLatticeReceipt {
    readonly kind: "pairwiseStone.clopenLattice:witness";
    readonly clopens: readonly ClopenUp[];
    readonly bottom: ClopenUp;
    readonly top: ClopenUp;
    readonly table: readonly {
        readonly clopen: ClopenUp;
        readonly members: readonly StonePointName[];
        readonly charge: ChargeValueName;
    }[];
    readonly everySubsetClopenUp: true;
    readonly meetCommutative: true;
    readonly joinCommutative: true;
    readonly absorption: true;
    readonly bounded: true;
}
export interface SwapNegationReceipt {
    readonly kind: "pairwiseStone.swapNegation:witness";
    readonly sigmaInvolutive: true;
    readonly clopenActionInvolutive: true;
    readonly transportedAsChargeNegation: true;
    readonly transportedAsGaugeNegation: true;
    readonly table: readonly {
        readonly clopen: ClopenUp;
        readonly sigmaAct: ClopenUp;
        readonly charge: ChargeValueName;
        readonly negatedCharge: ChargeValueName;
    }[];
}
export interface PairwiseTopologyReceipt {
    readonly kind: "pairwiseStone.topology:witness";
    readonly tauPlus: readonly ClopenUp[];
    readonly tauMinus: readonly ClopenUp[];
    readonly tauMinusIsSigmaImage: true;
    readonly finiteDiscrete: true;
    readonly orderRecoveredFromTauPlus: true;
}
export interface PairwiseStoneClopenReceipt {
    readonly kind: "pairwiseStoneClopen.receipt:witness";
    readonly space: PairedPriestleyReceipt;
    readonly lattice: ClopenLatticeReceipt;
    readonly swap: SwapNegationReceipt;
    readonly topology: PairwiseTopologyReceipt;
    readonly duality: "ClopenUp(FourDual) ~= FOUR";
    readonly openFrontier: readonly string[];
}
export declare const stonePointNames: readonly StonePointName[];
export declare const point: (name: StonePointName) => StonePoint;
export declare const points: readonly StonePoint[];
export declare const bot: ClopenUp;
export declare const top: ClopenUp;
export declare const clopenUp: (plus: boolean, minus: boolean) => ClopenUp;
export declare const allClopens: readonly ClopenUp[];
export declare const le: (left: StonePoint | StonePointName, right: StonePoint | StonePointName) => boolean;
export declare const sigma: (value: StonePoint | StonePointName) => StonePointName;
export declare const mem: (set: ClopenUp, value: StonePoint | StonePointName) => boolean;
export declare const meet: (left: ClopenUp, right: ClopenUp) => ClopenUp;
export declare const join: (left: ClopenUp, right: ClopenUp) => ClopenUp;
export declare const sigmaAct: (set: ClopenUp) => ClopenUp;
export declare function toChargeName(set: ClopenUp): ChargeValueName;
export declare function ofChargeName(value: string): ClopenUp;
export declare const tauPlus: readonly ClopenUp[];
export declare const tauMinus: readonly ClopenUp[];
export declare function orderRecoveredFromTauPlus(left: StonePoint | StonePointName, right: StonePoint | StonePointName): boolean;
export declare function pairedPriestleyReceipt(): PairedPriestleyReceipt;
export declare function clopenLatticeReceipt(): ClopenLatticeReceipt;
export declare function swapNegationReceipt(): SwapNegationReceipt;
export declare function topologyReceipt(): PairwiseTopologyReceipt;
export declare function receipt(): PairwiseStoneClopenReceipt;
