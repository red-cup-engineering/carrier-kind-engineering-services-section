
import {
  bottom, top, potential, active, violation, compliant,
  isBottom, isTop, isViolation, isCompliant,
  chargeStatus,
  leqKnowledge, joinKnowledge, meetKnowledge, joinTruth, meetTruth,
  negate, conflate,
} from "@emsenn/language-algebra";

export {
  bottom, violation, compliant,
  isBottom, isTop, isViolation, isCompliant,
  leqKnowledge, joinKnowledge, meetKnowledge, joinTruth, meetTruth,
  negate, conflate,
};
export { chargeStatus as status };

export const BOTTOM = bottom();
export const TOP = top();
export const TRUE = potential();
export const FALSE = active();
