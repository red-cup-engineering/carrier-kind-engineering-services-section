/**
 * positing/logic/bilattice-linear-logic — multiplicative linear logic over FOUR.
 *
 * Fusion (tensor ⊗), residuum (linear implication ⊸), negation, and par on the
 * four charge values, computed coordinate-wise over the truth/falsity sides:
 * fusion is side-product on truth and side-implication on falsity; residuum is
 * its adjoint. The multiplicative unit is `stable`; `absurd`/`potential`/`active`
 * are the consistent values. Self-contained over the charge algebra.
 */
import { chargeTwist, chargeValueAt, chargeValue, joinTruthValue, sameChargeValue, } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
/** The multiplicative unit: the "stable" value. */
export const linearMultiplicativeUnit = chargeValueAt(chargeTwist.one);
/** The consistent charge values: absurd, potential, active. */
export const consistentChargeValues = Object.freeze([chargeValue("absurd"), chargeValue("potential"), chargeValue("active")]);
/** Multiplicative conjunction (tensor ⊗) of two charge values. */
export function linearFusionValue(left, right) {
    return chargeValueAt(chargeTwist.fuse({ left: left.coordinates, right: right.coordinates }));
}
/** Linear implication (residuum ⊸) of two charge values. */
export function linearResiduumValue(left, right) {
    return chargeValueAt(chargeTwist.imply({ left: left.coordinates, right: right.coordinates }));
}
/** Linear negation: the residuum against the multiplicative unit. */
export function linearNegationValue(value) {
    return linearResiduumValue(value, linearMultiplicativeUnit);
}
/** Multiplicative disjunction (par ⅋): the De Morgan dual of fusion. */
export function linearParValue(left, right) {
    return linearNegationValue(linearFusionValue(linearNegationValue(left), linearNegationValue(right)));
}
/** Whether a charge value is consistent (truth and falsity not both present). */
export function chargeConsistency(value) {
    return chargeValueAt(value.coordinates).name !== "stable"
        ? Object.freeze({ kind: "bilattice.linearLogic.chargeConsistency:witness", value })
        : Object.freeze({ kind: "bilattice.linearLogic.chargeConsistency-obstruction", value });
}
/** Check the fusion/residuation adjunction at (left, right, bound) in the truth order. */
export function truthOrderResiduation(left, right, bound) {
    const residualBound = linearResiduumValue(right, bound);
    const fusionBound = joinTruthValue(linearFusionValue(left, right), bound);
    const residualOrder = joinTruthValue(left, residualBound);
    const fusionLeqBound = sameChargeValue(fusionBound, bound);
    const leftLeqResidual = sameChargeValue(residualOrder, residualBound);
    return fusionLeqBound === leftLeqResidual
        ? Object.freeze({ kind: "bilattice.linearLogic.truthOrderResiduation:witness", left, right, bound, fusionBound, residualBound })
        : Object.freeze({ kind: "bilattice.linearLogic.truthOrderResiduation-obstruction", left, right, bound, fusionBound, residualBound });
}
