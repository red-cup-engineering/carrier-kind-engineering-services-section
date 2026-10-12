/**
 * order/four-twist-product - finite executable shadow of
 * RelMath.Order.TwistProductResiduation, generic over any caller-supplied
 * four-valued charge algebra (see ../four-valued-names.mts).
 *
 * Lean proves `FOUR = Two^twist` and the truth-order residuation of the twist
 * product. This module exhausts the finite Boolean-pair carrier and checks that
 * it is exactly a given four-valued charge algebra's own lattice/linear-logic
 * operations.
 *
 * Canonicalized 2026-09-11: this exact checker (algorithm identical, only the
 * four charge-name strings and the concrete charge-algebra module differing) had
 * been hand-copied into `@lenticule-science/articulating`'s own
 * `predicating/positing/settling/analysis/twist-product.mts` (semiotic charge
 * vocabulary: absurd/potential/active/stable) and `@red-cup-engineering/feltos`'s
 * `src/lib/math/topology/twist-product.mts` (federation claim vocabulary:
 * unknown/held/denied/contested) — both now delete their private copy and call
 * this one with their own algebra.
 */
import type { FourValuedNames } from "../four-valued-names.mjs";
export interface FourValuedChargeAlgebra<Value extends {
    readonly name: Name;
}, Name extends string> {
    readonly names: FourValuedNames<Name>;
    chargeValue(name: Name): Value;
    readonly chargeValues: readonly Value[];
    joinKnowledgeValue(left: Value, right: Value): Value;
    joinTruthValue(left: Value, right: Value): Value;
    meetKnowledgeValue(left: Value, right: Value): Value;
    meetTruthValue(left: Value, right: Value): Value;
    negateValue(value: Value): Value;
    sameChargeValue(left: Value, right: Value): boolean;
    linearFusionValue(left: Value, right: Value): Value;
    readonly linearMultiplicativeUnit: Value;
    linearResiduumValue(left: Value, right: Value): Value;
}
export interface BooleanTwistPoint {
    readonly kind: "twistProduct.booleanPoint";
    readonly positive: boolean;
    readonly negative: boolean;
    readonly label: string;
}
export declare const booleanTwistPoints: readonly BooleanTwistPoint[];
export interface TwistProductFourElement<Name extends string> {
    readonly point: BooleanTwistPoint;
    readonly charge: Name;
}
export interface TwistProductFourWitness<Name extends string> {
    readonly kind: "twistProduct.four:witness";
    readonly elements: readonly TwistProductFourElement<Name>[];
    readonly knowledgeBottom: Name;
    readonly knowledgeTop: Name;
    readonly truthBottom: Name;
    readonly truthTop: Name;
    readonly fusionUnit: Name;
    readonly consistentFragment: readonly Name[];
    readonly bijection: true;
    readonly knowledgeOrderMatches: true;
    readonly truthOrderMatches: true;
    readonly negationMatches: true;
    readonly knowledgeLatticeMatches: true;
    readonly truthLatticeMatches: true;
    readonly truthResiduation: true;
    readonly fusionCommutative: true;
    readonly fusionUnitLaw: true;
    readonly unitNonIntegral: true;
}
export interface TwistProductFourObstruction<Name extends string> {
    readonly kind: "twistProduct.four-obstruction";
    readonly reason: "bijection" | "knowledgeOrder" | "truthOrder" | "negation" | "knowledgeLattice" | "truthLattice" | "truthResiduation" | "fusionCommutative" | "fusionUnit" | "unitNonIntegral";
    readonly left?: Name | undefined;
    readonly right?: Name | undefined;
    readonly bound?: Name | undefined;
    readonly observed?: Name | undefined;
    readonly expected?: Name | undefined;
}
export type TwistProductFourJudgment<Name extends string> = TwistProductFourWitness<Name> | TwistProductFourObstruction<Name>;
/** Exhaustive finite receipt for `FOUR = Two^twist` and truth-order residuation, over `algebra`. */
export declare function fourTwistProduct<Value extends {
    readonly name: Name;
}, Name extends string>(algebra: FourValuedChargeAlgebra<Value, Name>): TwistProductFourJudgment<Name>;
