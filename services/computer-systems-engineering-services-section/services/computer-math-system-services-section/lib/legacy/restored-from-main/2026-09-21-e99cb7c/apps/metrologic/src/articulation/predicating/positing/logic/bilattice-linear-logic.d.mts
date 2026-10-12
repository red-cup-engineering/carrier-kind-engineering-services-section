/**
 * positing/logic/bilattice-linear-logic — multiplicative linear logic over FOUR.
 *
 * Fusion (tensor ⊗), residuum (linear implication ⊸), negation, and par on the
 * four charge values, computed coordinate-wise over the truth/falsity sides:
 * fusion is side-product on truth and side-implication on falsity; residuum is
 * its adjoint. The multiplicative unit is `stable`; `absurd`/`potential`/`active`
 * are the consistent values. Self-contained over the charge algebra.
 */
import { type ChargeValue } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
/** The judgment that a charge value is consistent (sides not both present). */
export interface ChargeConsistencyWitness {
    readonly kind: "bilattice.linearLogic.chargeConsistency:witness";
    readonly value: ChargeValue;
}
/** The judgment that a charge value is inconsistent (both sides present). */
export interface ChargeConsistencyObstruction {
    readonly kind: "bilattice.linearLogic.chargeConsistency-obstruction";
    readonly value: ChargeValue;
}
/** The result of a charge-consistency check. */
export type ChargeConsistencyJudgment = ChargeConsistencyWitness | ChargeConsistencyObstruction;
/** Fusion and residuation are adjoint at (left, right, bound). */
export interface TruthOrderResiduationWitness {
    readonly kind: "bilattice.linearLogic.truthOrderResiduation:witness";
    readonly left: ChargeValue;
    readonly right: ChargeValue;
    readonly bound: ChargeValue;
    readonly fusionBound: ChargeValue;
    readonly residualBound: ChargeValue;
}
/** Fusion and residuation fail to be adjoint at (left, right, bound). */
export interface TruthOrderResiduationObstruction {
    readonly kind: "bilattice.linearLogic.truthOrderResiduation-obstruction";
    readonly left: ChargeValue;
    readonly right: ChargeValue;
    readonly bound: ChargeValue;
    readonly fusionBound: ChargeValue;
    readonly residualBound: ChargeValue;
}
/** The result of a truth-order residuation check. */
export type TruthOrderResiduationJudgment = TruthOrderResiduationWitness | TruthOrderResiduationObstruction;
/** The multiplicative unit: the "stable" value. */
export declare const linearMultiplicativeUnit: ChargeValue;
/** The consistent charge values: absurd, potential, active. */
export declare const consistentChargeValues: readonly ChargeValue[];
/** Multiplicative conjunction (tensor ⊗) of two charge values. */
export declare function linearFusionValue(left: ChargeValue, right: ChargeValue): ChargeValue;
/** Linear implication (residuum ⊸) of two charge values. */
export declare function linearResiduumValue(left: ChargeValue, right: ChargeValue): ChargeValue;
/** Linear negation: the residuum against the multiplicative unit. */
export declare function linearNegationValue(value: ChargeValue): ChargeValue;
/** Multiplicative disjunction (par ⅋): the De Morgan dual of fusion. */
export declare function linearParValue(left: ChargeValue, right: ChargeValue): ChargeValue;
/** Whether a charge value is consistent (truth and falsity not both present). */
export declare function chargeConsistency(value: ChargeValue): ChargeConsistencyJudgment;
/** Check the fusion/residuation adjunction at (left, right, bound) in the truth order. */
export declare function truthOrderResiduation(left: ChargeValue, right: ChargeValue, bound: ChargeValue): TruthOrderResiduationJudgment;
