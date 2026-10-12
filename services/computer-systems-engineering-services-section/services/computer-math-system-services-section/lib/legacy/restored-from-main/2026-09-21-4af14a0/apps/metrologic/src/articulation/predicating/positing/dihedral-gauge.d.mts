/**
 * positing/dihedral-gauge — D4 as the value-level symmetry surface of FOUR.
 *
 * The FOUR charge algebra has two visible gauges. `bilattice-charge` carries the
 * Klein-four gauge K4 = `{ id, negation, conflation, double }`: the symmetries
 * that act within the two orders. Each K4 element preserves or reverses the
 * knowledge order and the truth order, but it carries knowledge order to
 * knowledge order and truth order to truth order; it never leaves an order. K4 is
 * missing the one symmetry of FOUR that exchanges the two orders.
 *
 * `orderSwapValue` is that missing symmetry: keep the truth side, complement the
 * falsity side. It witnesses the order-isomorphism
 * `(FOUR, knowledge) ~= (FOUR, truth)`, swapping `absurd <-> active` and
 * `potential <-> stable`. It belongs to neither order's automorphism group
 * precisely because it exchanges them.
 *
 * Adjoining `orderSwapValue` to K4 yields the order-eight dihedral gauge: the
 * full symmetry group of FOUR as a doubly ordered set, the bilattice square. The
 * order-preserving coset is K4. The order-swapping coset is
 * `{ order-swap, order-swap-negation, order-swap-conflation, order-swap-double }`,
 * each acting as `gauge(k, orderSwapValue(value))`. The defining dihedral
 * relation exposed here is `order-swap · negation · order-swap = conflation`;
 * the swapped coset contains the two diagonal reflections and the two quarter
 * rotations.
 *
 * The public API is deliberately value-level. The order-swap complements one
 * evidence side, and accumulated witness lists do not carry enough information to
 * perform that complement lawfully. Use this module to read the finite symmetry
 * algebra of admitted charge values, not to rewrite evidence carriers.
 *
 * The Lean side has the fuller proof object in `RelMath.Positing.D4Gauge`, with
 * `KleinFourGauge` and `OrderSwapDuality` supplying the upstream pieces. This
 * module is the Node carrier surface: names, action, multiplication by action
 * composition, fixed sets, coset effects, and witness-shaped reads for the
 * cross-order isomorphism and the defining conjugation law.
 *
 * @packageDocumentation
 */
import { type ChargeValue, type ChargeValueName, type GaugeElementName } from "../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
/**
 * The order-swap involution σ: ⟨truth, falsity⟩ ↦ ⟨truth, ¬falsity⟩ — keep the
 * truth side, complement the falsity side. The cross-order iso
 * (FOUR, ≤knowledge) ≅ (FOUR, ≤truth); it swaps `absurd ↔ active` and
 * `potential ↔ stable`, and belongs to neither order's automorphism group.
 */
export declare function orderSwapValue(value: ChargeValue): ChargeValue;
/** A D₄ gauge element: the Klein-four coset `GaugeElementName` plus the order-swap
 * coset `order-swap · K₄`. */
export type DihedralElementName = GaugeElementName | "order-swap" | "order-swap-negation" | "order-swap-conflation" | "order-swap-double";
/** All eight D₄ element names: the order-preserving K₄ coset, then the order-swapping
 * K₄·σ coset. */
export declare const dihedralElementNames: readonly DihedralElementName[];
/**
 * Apply a D₄ element to a charge value. The order-preserving coset K₄ acts by
 * `gauge`; the order-swapping coset K₄·σ acts by `gauge(k, σ value)` — σ first, then
 * the Klein-four part.
 */
export declare function dihedral(element: DihedralElementName, value: ChargeValue): ChargeValue;
/**
 * The dihedral multiplication g·h, DERIVED from the action: the unique element whose
 * action equals `dihedral(g, dihedral(h, ·))`. Throws if the composite leaves D₄ —
 * which it cannot, so a successful return also witnesses closure.
 */
export declare function dihedralMul(left: DihedralElementName, right: DihedralElementName): DihedralElementName;
/** The charge values fixed by a D₄ element. */
export declare const dihedralFixedSet: (element: DihedralElementName) => readonly ChargeValue[];
/** Whether a D₄ element preserves each order or exchanges the two orders. */
export type DihedralOrderEffectName = "order-preserving" | "order-swapping";
/** The order effect of a D₄ element: K₄ preserves each order, K₄·σ swaps them. */
export declare const dihedralOrderEffect: (element: DihedralElementName) => DihedralOrderEffectName;
/** A witness that σ carries the knowledge order to the truth order at a pair. */
export interface OrderSwapIsoWitness {
    readonly kind: "dihedral-gauge.orderSwapIso:witness";
    readonly left: ChargeValue;
    readonly right: ChargeValue;
    readonly swappedLeft: ChargeValue;
    readonly swappedRight: ChargeValue;
    readonly knowledgeLeq: boolean;
}
/** An obstruction: σ fails to carry the knowledge order to the truth order at a pair. */
export interface OrderSwapIsoObstruction {
    readonly kind: "dihedral-gauge.orderSwapIso-obstruction";
    readonly left: ChargeValue;
    readonly right: ChargeValue;
    readonly swappedLeft: ChargeValue;
    readonly swappedRight: ChargeValue;
    readonly knowledgeLeq: boolean;
    readonly truthLeqSwapped: boolean;
}
/** The result of testing σ's cross-order iso at a pair. */
export type OrderSwapIsoJudgment = OrderSwapIsoWitness | OrderSwapIsoObstruction;
/**
 * Witness that σ is the cross-order isomorphism at `(left, right)`:
 * `left ≤knowledge right ⟺ σ left ≤truth σ right`.
 */
export declare function orderSwapIso(left: ChargeValue, right: ChargeValue): OrderSwapIsoJudgment;
export interface OrderSwapDualityReceipt {
    readonly kind: "dihedral-gauge.orderSwapDuality:witness";
    readonly theoremInvolution: "RelMath.Charge.swap_swap";
    readonly theoremKnowledgeTruthIso: "RelMath.Charge.swap_kle_tle";
    readonly theoremTruthKnowledgeIso: "RelMath.Charge.swap_tle_kle";
    readonly theoremJoinK: "RelMath.Charge.swap_joinK";
    readonly theoremMeetK: "RelMath.Charge.swap_meetK";
    readonly theoremClosureTransport: "RelMath.Charge.toTClosure_joinClosure_op";
    readonly theoremSettleTransport: "RelMath.Charge.swap_settle_joinClosure";
    readonly swapTable: Readonly<Record<ChargeValueName, ChargeValueName>>;
    readonly involutive: true;
    readonly distinctFromK4: true;
    readonly swapsBounds: true;
    readonly knowledgeToTruthIso: true;
    readonly truthToKnowledgeIso: true;
    readonly knowledgeJoinTransport: true;
    readonly knowledgeMeetTransport: true;
    readonly truthJoinConjugate: true;
    readonly truthMeetConjugate: true;
    readonly canonicalJoinClosureTransport: true;
    readonly settleJoinClosureTransport: true;
}
/** Bundle the finite Node shadow of `RelMath.Positing.OrderSwapDuality`. */
export declare function orderSwapDualityReceipt(): OrderSwapDualityReceipt;
/** A witness of the defining dihedral relation σ∼σ = − at a value. */
export interface DihedralConjugationWitness {
    readonly kind: "dihedral-gauge.conjugation:witness";
    readonly value: ChargeValue;
    readonly conjugate: ChargeValue;
    readonly conflation: ChargeValue;
}
/** An obstruction: σ∼σ disagrees with − at a value. */
export interface DihedralConjugationObstruction {
    readonly kind: "dihedral-gauge.conjugation-obstruction";
    readonly value: ChargeValue;
    readonly conjugate: ChargeValue;
    readonly conflation: ChargeValue;
}
/** The result of testing the dihedral relation σ∼σ = − at a value. */
export type DihedralConjugationJudgment = DihedralConjugationWitness | DihedralConjugationObstruction;
/**
 * Witness the defining dihedral relation σ∼σ = − at a value: conjugating negation by
 * the order-swap yields conflation. This is the relation that makes ⟨K₄, σ⟩ the
 * dihedral group D₄ rather than an abelian extension.
 */
export declare function dihedralConjugation(value: ChargeValue): DihedralConjugationJudgment;
/** A witness that a D₄ element exchanges the two orders (it lies in the coset K₄·σ). */
export interface DihedralSwapsOrdersWitness {
    readonly kind: "dihedral-gauge.swapsOrders:witness";
    readonly element: DihedralElementName;
}
/** An obstruction: a D₄ element preserves each order (it lies in K₄), shown by the
 * first pair whose knowledge-comparability it does not send to truth-comparability. */
export interface DihedralSwapsOrdersObstruction {
    readonly kind: "dihedral-gauge.swapsOrders-obstruction";
    readonly element: DihedralElementName;
    readonly left: ChargeValue;
    readonly right: ChargeValue;
}
/** The result of testing whether a D₄ element exchanges the two orders. */
export type DihedralSwapsOrdersJudgment = DihedralSwapsOrdersWitness | DihedralSwapsOrdersObstruction;
/**
 * Witness that a D₄ element is in the order-swapping coset K₄·σ — the non-trivial
 * class of `D₄/K₄ ≅ ℤ/2`. Direction-agnostically: for every pair, `a, b` are
 * knowledge-comparable ⟺ `g a, g b` are truth-comparable (so `g` carries the
 * ≤knowledge-incomparable pair {potential, active} onto the ≤truth-incomparable pair
 * {absurd, stable}). The first failing pair is the obstruction, which every
 * order-preserving K₄ element produces.
 */
export declare function dihedralSwapsOrders(element: DihedralElementName): DihedralSwapsOrdersJudgment;
export interface D4GaugeReceipt {
    readonly kind: "dihedral-gauge.d4:witness";
    readonly theoremDihedral: "RelMath.D4.d4_is_dihedral";
    readonly theoremAutFour: "RelMath.D4.d4_is_aut_four";
    readonly elements: readonly DihedralElementName[];
    readonly orderEight: true;
    readonly faithfulAction: true;
    readonly actionHomomorphism: true;
    readonly associative: true;
    readonly identity: true;
    readonly inverses: Readonly<Record<DihedralElementName, DihedralElementName>>;
    readonly rotation: "order-swap-negation";
    readonly reflection: "order-swap";
    readonly rotationSquared: DihedralElementName;
    readonly rotationFourthIsIdentity: true;
    readonly reflectionSquaredIsIdentity: true;
    readonly reflectionConjugatesRotationToInverse: true;
    readonly swapNegationSwapIsConflation: true;
    readonly nonAbelian: true;
    readonly k4Coset: readonly GaugeElementName[];
    readonly swapCoset: readonly Exclude<DihedralElementName, GaugeElementName>[];
    readonly cosetPartition: true;
    readonly k4Closed: true;
    readonly cosetBitHomomorphism: true;
    readonly orderEffects: Readonly<Record<DihedralElementName, DihedralOrderEffectName>>;
}
/** Bundle the finite Node shadow of `RelMath.D4.d4_is_dihedral` and `d4_is_aut_four`. */
export declare function d4GaugeReceipt(): D4GaugeReceipt;
