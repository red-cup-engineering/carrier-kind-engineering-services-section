/**
 * analysis/order-infra - finite executable shadows of RelMath.Order.OrderInfra.
 *
 * Lean gives the abstract order hierarchy: preorder, partial order, monotone
 * maps, algebraic lattices, bounded/distributive lattices, and complete
 * lattices by arbitrary suprema. This module keeps the Node claim finite:
 * explicit carrier/relation/table data are checked and returned as receipts.
 */
export declare const assertIndex: (name: string, value: number, length: number) => void;
export declare const requireBinaryTable: (name: string, table: readonly (readonly number[])[], size: number, rowCountMessage?: string) => void;
export interface FinitePreorderSystem {
    readonly kind: "orderInfra.finitePreorderSystem";
    readonly labels: readonly string[];
    readonly le: readonly (readonly boolean[])[];
}
export declare function finitePreorderSystem(labels: readonly string[], le: readonly (readonly boolean[])[]): FinitePreorderSystem;
export interface PreorderWitness {
    readonly kind: "orderInfra.preorder:witness";
    readonly carrier: readonly string[];
    readonly reflexive: true;
    readonly transitive: true;
}
export interface PreorderObstruction {
    readonly kind: "orderInfra.preorder-obstruction";
    readonly reason: "reflexivity" | "transitivity";
    readonly point?: number;
    readonly pointLabel?: string;
    readonly chain?: readonly [number, number, number];
    readonly chainLabels?: readonly [string, string, string];
}
export type PreorderJudgment = PreorderWitness | PreorderObstruction;
/** Finite receipt for `Preorder`: reflexivity and transitivity. */
export declare function preorder(system: FinitePreorderSystem): PreorderJudgment;
export interface PartialOrderWitness {
    readonly kind: "orderInfra.partialOrder:witness";
    readonly carrier: readonly string[];
    readonly preorder: PreorderWitness;
    readonly antisymmetric: true;
}
export interface PartialOrderObstruction {
    readonly kind: "orderInfra.partialOrder-obstruction";
    readonly reason: "preorder" | "antisymmetry";
    readonly preorder?: PreorderObstruction;
    readonly pair?: readonly [number, number];
    readonly labels?: readonly [string, string];
}
export type PartialOrderJudgment = PartialOrderWitness | PartialOrderObstruction;
/** Finite receipt for `PartialOrder`: preorder plus antisymmetry. */
export declare function partialOrder(system: FinitePreorderSystem): PartialOrderJudgment;
export interface MonotoneMapWitness {
    readonly kind: "orderInfra.monotoneMap:witness";
    readonly domain: readonly string[];
    readonly codomain: readonly string[];
    readonly map: readonly number[];
    readonly monotone: true;
}
export interface MonotoneMapObstruction {
    readonly kind: "orderInfra.monotoneMap-obstruction";
    readonly reason: "domain-preorder" | "codomain-preorder" | "monotonicity";
    readonly domainPreorder?: PreorderObstruction;
    readonly codomainPreorder?: PreorderObstruction;
    readonly pair?: readonly [number, number];
    readonly imagePair?: readonly [number, number];
    readonly labels?: readonly [string, string];
    readonly imageLabels?: readonly [string, string];
}
export type MonotoneMapJudgment = MonotoneMapWitness | MonotoneMapObstruction;
/** Finite receipt for monotonicity between finite preorders. */
export declare function monotoneMap(domain: FinitePreorderSystem, codomain: FinitePreorderSystem, map: readonly number[]): MonotoneMapJudgment;
export interface FiniteLatticeSystem {
    readonly kind: "orderInfra.finiteLatticeSystem";
    readonly labels: readonly string[];
    readonly meet: readonly (readonly number[])[];
    readonly join: readonly (readonly number[])[];
}
export declare function finiteLatticeSystem(labels: readonly string[], meet: readonly (readonly number[])[], join: readonly (readonly number[])[]): FiniteLatticeSystem;
export declare function latticeOrder(system: FiniteLatticeSystem): FinitePreorderSystem;
export interface LatticeWitness {
    readonly kind: "orderInfra.lattice:witness";
    readonly carrier: readonly string[];
    readonly order: FinitePreorderSystem;
    readonly partialOrder: PartialOrderWitness;
    readonly laws: true;
    readonly meetGlb: true;
    readonly joinLub: true;
    readonly meetJoinOrderAgree: true;
}
export interface LatticeObstruction {
    readonly kind: "orderInfra.lattice-obstruction";
    readonly law: "meet.comm" | "meet.assoc" | "meet.idem" | "join.comm" | "join.assoc" | "join.idem" | "absorb.meetJoin" | "absorb.joinMeet" | "partialOrder" | "meet.glb" | "join.lub" | "order.agreement";
    readonly indices?: readonly number[];
    readonly labels?: readonly string[];
    readonly left?: number | undefined;
    readonly right?: number | undefined;
    readonly partialOrder?: PartialOrderObstruction;
}
export type LatticeJudgment = LatticeWitness | LatticeObstruction;
/** Finite receipt for the algebraic lattice laws plus derived glb/lub order laws. */
export declare function lattice(system: FiniteLatticeSystem): LatticeJudgment;
export interface BoundedLatticeWitness {
    readonly kind: "orderInfra.boundedLattice:witness";
    readonly carrier: readonly string[];
    readonly top: number;
    readonly topLabel: string;
    readonly bot: number;
    readonly botLabel: string;
    readonly lattice: LatticeWitness;
    readonly leTop: true;
    readonly botLe: true;
}
export interface BoundedLatticeObstruction {
    readonly kind: "orderInfra.boundedLattice-obstruction";
    readonly reason: "lattice" | "meetTop" | "joinBot" | "leTop" | "botLe";
    readonly lattice?: LatticeObstruction;
    readonly point?: number;
    readonly pointLabel?: string;
}
export type BoundedLatticeJudgment = BoundedLatticeWitness | BoundedLatticeObstruction;
/** Finite receipt for `BoundedLattice`: top/bot identities and derived bounds. */
export declare function boundedLattice(system: FiniteLatticeSystem, top: number, bot: number): BoundedLatticeJudgment;
export interface DistributiveLatticeWitness {
    readonly kind: "orderInfra.distributiveLattice:witness";
    readonly carrier: readonly string[];
    readonly lattice: LatticeWitness;
    readonly meetJoinDistributes: true;
}
export interface DistributiveLatticeObstruction {
    readonly kind: "orderInfra.distributiveLattice-obstruction";
    readonly reason: "lattice" | "distributivity";
    readonly lattice?: LatticeObstruction;
    readonly indices?: readonly [number, number, number];
    readonly labels?: readonly [string, string, string];
    readonly left?: number;
    readonly right?: number;
}
export type DistributiveLatticeJudgment = DistributiveLatticeWitness | DistributiveLatticeObstruction;
/** Finite receipt for `meet a (join b c) = join (meet a b) (meet a c)`. */
export declare function distributiveLattice(system: FiniteLatticeSystem): DistributiveLatticeJudgment;
export interface CompleteLatticeWitness {
    readonly kind: "orderInfra.completeLattice:witness";
    readonly carrier: readonly string[];
    readonly subsetsChecked: number;
    readonly top: number;
    readonly topLabel: string;
    readonly bot: number;
    readonly botLabel: string;
    readonly partialOrder: PartialOrderWitness;
}
export interface CompleteLatticeObstruction {
    readonly kind: "orderInfra.completeLattice-obstruction";
    readonly reason: "size" | "partialOrder" | "supremum" | "infimum";
    readonly maxSize?: number;
    readonly partialOrder?: PartialOrderObstruction;
    readonly subset?: readonly number[];
    readonly subsetLabels?: readonly string[];
    readonly candidates?: readonly number[];
    readonly candidateLabels?: readonly string[];
}
export type CompleteLatticeJudgment = CompleteLatticeWitness | CompleteLatticeObstruction;
/** Finite complete-lattice check: every finite subset has a unique lub and glb. */
export declare function completeLattice(system: FinitePreorderSystem, maxSize?: number): CompleteLatticeJudgment;
export declare const booleanLatticeSystem: FiniteLatticeSystem;
export declare const booleanOrderSystem: FinitePreorderSystem;
