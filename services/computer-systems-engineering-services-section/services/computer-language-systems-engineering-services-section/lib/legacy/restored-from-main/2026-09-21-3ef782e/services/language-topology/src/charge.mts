import type { GrammaticalCharge, GrammaticalChargeValue } from "@emsenn/language-algebra";
import {
  bottom, top, potential, active, violation, compliant,
  isBottom, isTop, isViolation, isCompliant,
  chargeStatus,
  leqKnowledge, joinKnowledge, meetKnowledge, joinTruth, meetTruth,
  negate, conflate,
} from "@emsenn/language-algebra";

export type Charge = GrammaticalCharge;
export type ChargeValue = GrammaticalChargeValue;
export type { ChargeStatus } from "@emsenn/language-algebra";

export {
  bottom, violation, compliant,
  isBottom, isTop, isViolation, isCompliant,
  leqKnowledge, joinKnowledge, meetKnowledge, joinTruth, meetTruth,
  negate, conflate,
};
export { chargeStatus as status };

export const BOTTOM: Charge = bottom();
export const TOP: Charge = top();
export const TRUE: Charge = potential();
export const FALSE: Charge = active();
