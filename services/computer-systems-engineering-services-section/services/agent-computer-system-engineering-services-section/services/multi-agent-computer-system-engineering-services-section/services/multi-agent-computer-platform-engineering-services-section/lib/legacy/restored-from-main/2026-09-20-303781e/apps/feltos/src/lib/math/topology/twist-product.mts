/**
 * topology/twist-product - FeltOS's own federation-claim binding of the
 * canonical, algebra-generic finite executable shadow of
 * RelMath.Order.TwistProductResiduation.
 *
 * Canonicalized 2026-09-11 to
 * `@lenticule-science/sheaf-mathematics-services-section/order/four-twist-product`
 * (this checker's law-checking logic has nothing semiotic- or federation-
 * specific about it; this file had been a hand-copy of
 * `@lenticule-science/articulating`'s own analysis/twist-product.mts, relabeled
 * to FeltOS's claim vocabulary -- unknown/held/denied/contested in place of
 * articulating's absurd/potential/active/stable). This file supplies FeltOS's
 * own claim-charge algebra as the one parameter the canonical checker needs --
 * a binding, not a duplicate. FeltOS composes the capability; it does not own
 * the math.
 */
import {
  chargeValue,
  chargeValues,
  joinKnowledgeValue,
  joinTruthValue,
  meetKnowledgeValue,
  meetTruthValue,
  negateValue,
  sameChargeValue,
  type ChargeValue,
  type ChargeValueName,
} from "@red-cup-engineering/agentic-enterprise-computer-platform-engineering-services-section/claim-charge";
import {
  linearFusionValue,
  linearMultiplicativeUnit,
  linearResiduumValue,
} from "../../logic/predicating/evidence/logic/bilattice-linear-logic.mts";
import {
  fourTwistProduct as fourTwistProductGeneric,
  booleanTwistPoints,
  type BooleanTwistPoint,
  type FourValuedChargeAlgebra,
  type TwistProductFourElement,
  type TwistProductFourWitness,
  type TwistProductFourObstruction,
  type TwistProductFourJudgment,
} from "@lenticule-science/sheaf-mathematics-services-section/order/four-twist-product";

export { booleanTwistPoints };
export type { BooleanTwistPoint };
export type TwistProductFourElementLocal = TwistProductFourElement<ChargeValueName>;
export type { TwistProductFourElementLocal as TwistProductFourElement };
export type TwistProductFourWitnessLocal = TwistProductFourWitness<ChargeValueName>;
export type { TwistProductFourWitnessLocal as TwistProductFourWitness };
export type TwistProductFourObstructionLocal = TwistProductFourObstruction<ChargeValueName>;
export type { TwistProductFourObstructionLocal as TwistProductFourObstruction };
export type TwistProductFourJudgmentLocal = TwistProductFourJudgment<ChargeValueName>;
export type { TwistProductFourJudgmentLocal as TwistProductFourJudgment };

const CLAIM_NAMES = Object.freeze({ bottom: "unknown", positiveOnly: "held", negativeOnly: "denied", top: "contested" } as const);

const claimAlgebra: FourValuedChargeAlgebra<ChargeValue, ChargeValueName> = Object.freeze({
  names: CLAIM_NAMES,
  chargeValue,
  chargeValues,
  joinKnowledgeValue,
  joinTruthValue,
  meetKnowledgeValue,
  meetTruthValue,
  negateValue,
  sameChargeValue,
  linearFusionValue,
  linearMultiplicativeUnit,
  linearResiduumValue,
});

/** Exhaustive finite receipt for `FOUR = Two^twist` and truth-order residuation, over FeltOS's own claim algebra. */
export function fourTwistProduct(): TwistProductFourJudgmentLocal {
  return fourTwistProductGeneric(claimAlgebra);
}
