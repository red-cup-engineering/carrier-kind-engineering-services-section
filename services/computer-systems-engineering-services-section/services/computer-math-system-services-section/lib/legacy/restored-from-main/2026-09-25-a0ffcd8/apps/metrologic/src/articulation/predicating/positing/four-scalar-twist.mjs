import { chargeValue } from "./bilattice-charge.mjs";
import { linearFusionValue, linearResiduumValue, truthOrderResiduation } from "./bilattice-linear-logic.mjs";

/** The scalar twist-residuated FOUR operations, independent of any cell carrier. */
export const fourScalarTwist = Object.freeze({
  fusion(left, right) { return linearFusionValue(chargeValue(left), chargeValue(right)).name; },
  residuum(left, right) { return linearResiduumValue(chargeValue(left), chargeValue(right)).name; },
  residuation(left, right, bound) { return truthOrderResiduation(chargeValue(left), chargeValue(right), chargeValue(bound)); },
});
