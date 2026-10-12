/**
 * analysis/port-graph - finite lenticule port-graph and condensate receipts.
 *
 * Executable shadow of RelMath.Aperiodic.PortGraph and
 * RelMath.Aperiodic.CondensateMatter: a legal one-hole pass alternates sides,
 * occupancy 0/1/2+ reads as FOUR bottom/truth/top, and material rigidity is the
 * count of over-occupied condensed lenticules.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type Matrix } from "./exact-number.mjs";
export interface ThreadPassCarrier {
    readonly kind: "aperiodic.portGraph.threadPass";
    readonly lenticule: string;
    readonly inSide: boolean;
    readonly outSide: boolean;
}
export interface PortGraphReceipt {
    readonly kind: "aperiodic.portGraph.receipt:witness";
    readonly thread: readonly ThreadPassCarrier[];
    readonly legal: boolean;
    readonly holeTransitionEqualsWarpAlt: true;
    readonly legalIffDistinct: true;
    readonly threadLegalNil: true;
    readonly condensateZero: "absurd";
    readonly condensateOne: "potential";
    readonly condensateOver: "stable";
    readonly emptyConsistent: true;
    readonly singleConsistent: true;
    readonly overOccupationInconsistency: true;
    readonly mirrorFixesEmpty: true;
    readonly mirrorFixesCondensatePole: true;
    readonly mirrorFixesCondensate: true;
}
export interface CondensateMatterReceipt {
    readonly kind: "aperiodic.condensateMatter.receipt:witness";
    readonly material: readonly number[];
    readonly rigidity: number;
    readonly overOccupied: readonly number[];
    readonly condensateInconsistencyIff: true;
    readonly rigidIffOveroccupied: true;
    readonly floppyOfAllLeOne: boolean;
}
export interface PortGrowthReceipt {
    readonly kind: "aperiodic.portGrowth.receipt:witness";
    readonly matrix: Matrix;
    readonly a: number;
    readonly b: number;
    readonly growthA: Matrix;
    readonly growthB: Matrix;
    readonly growthSum: Matrix;
    readonly composed: Matrix;
    readonly portGrowthZero: true;
    readonly portGrowthSucc: true;
    readonly matPowAdd: true;
    readonly portGrowthTelescopes: true;
    readonly padovanMatrix: Matrix;
    readonly padovanGrowth3: Matrix;
    readonly padovanRenormalized: Matrix;
    readonly portGrowthRenormPadovan: true;
    readonly padovanChuIncidence: readonly (readonly ChargeValueName[])[];
    readonly portGrowthEdgesChu: true;
}
export interface PortGrowthTimeReceipt {
    readonly kind: "aperiodic.portGrowthTime.receipt:witness";
    readonly levels: readonly number[];
    readonly timeSection: Readonly<Record<string, number>>;
    readonly levelPrecTransitive: true;
    readonly levelPrecIrreflexive: true;
    readonly portGrowthTimeStrictMono: true;
    readonly chainTimeSectionEqLevel: true;
}
export interface PortVershikReceipt {
    readonly kind: "aperiodic.portVershik.receipt:witness";
    readonly path: readonly boolean[];
    readonly successor: readonly boolean[];
    readonly serialIndex: number;
    readonly successorIndex: number;
    readonly successorIncrements: boolean;
    readonly lengthPreserved: true;
    readonly vershikSuccWhenNotMaximal: true;
    readonly maximalWraps: true;
    readonly twoCycle: true;
}
export declare function threadPass(lenticule: string, inSide: boolean, outSide: boolean): ThreadPassCarrier;
export declare function vershik(path: readonly boolean[]): readonly boolean[];
export declare function vershikToNat(path: readonly boolean[]): number;
export declare function portVershikReceipt(path?: readonly boolean[]): PortVershikReceipt;
export declare const warpAlt: (left: boolean, right: boolean) => boolean;
export declare const holeTransition: (inSide: boolean, outSide: boolean) => boolean;
export declare const legalThreadPass: (pass: ThreadPassCarrier) => boolean;
export declare const threadLegal: (thread: readonly ThreadPassCarrier[]) => boolean;
export declare function condensate(occupation: number): ChargeValueName;
export declare const condensateInconsistency: (occupation: number) => boolean;
export declare function portGraphReceipt(thread?: readonly ThreadPassCarrier[]): PortGraphReceipt;
export declare function rigidity(material: readonly number[]): number;
export declare function condensateMatterReceipt(material: readonly number[]): CondensateMatterReceipt;
export declare function matrixIdentity(size: number): Matrix;
export declare function matrixAdd(left: Matrix, right: Matrix): Matrix;
export declare function matrixPower(matrix: Matrix, exponent: number): Matrix;
export declare const portGrowth: typeof matrixPower;
export declare function substitutionMatrix(substitution: readonly (readonly number[])[], alphabetSize?: number): Matrix;
export declare const padovanSubstitution: readonly (readonly number[])[];
export declare const fibonacciSubstitution: readonly (readonly number[])[];
export declare const padovanMatrix: Matrix;
export declare const fibonacciMatrix: Matrix;
export declare function portGrowthReceipt(matrix?: Matrix, a?: number, b?: number): PortGrowthReceipt;
export declare const levelPrec: (a: number, b: number) => boolean;
export declare function timeSection(levels: readonly number[], level: number): number;
export declare function portGrowthTimeReceipt(levels?: readonly number[]): PortGrowthTimeReceipt;
