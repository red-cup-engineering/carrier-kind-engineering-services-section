/**
 * speaking/listening/grounding — common-ground carriers and update morphisms.
 *
 * A common ground is the communicative state participants treat as shared. It
 * grows by accepted assertions and refuses or removes propositions by challenge.
 */
export {
  CommonGroundBasisSchema,
  commonGroundCarrier,
  commonGroundPropositionCarrier,
  commonGroundUpdateCarrier,
} from "./carriers.mjs";

/** Construct a common-ground carrier from propositions already treated as shared. */
export const commonGround = (
  propositions = [],
) =>
  Object.freeze({
    kind: "communicating.speaking.listening.grounding.commonGround",
    propositions: Object.freeze([...propositions]),
  });

/** Construct a proposition with the basis by which it enters common ground. */
export const commonGroundProposition = (
  proposition,
  basis,
) =>
  Object.freeze({
    kind: "communicating.speaking.listening.grounding.proposition",
    proposition,
    basis,
  });

const sameProposition = (
  left,
  right,
) => Object.is(left.proposition, right.proposition);

/** Add a proposition to common ground when it is not already present. */
export function assertIntoCommonGround(
  carrier,
  proposition,
) {
  const propositions = carrier.propositions.some((item) => sameProposition(item, proposition))
    ? carrier.propositions
    : Object.freeze([...carrier.propositions, proposition]);
  return Object.freeze({
    kind: "communicating.speaking.listening.grounding.update",
    before: carrier,
    after: commonGround(propositions),
    proposition,
    mode: "assertion",
  });
}

/** Add a proposition by accommodation rather than prior explicit assertion. */
export function accommodateCommonGround(
  carrier,
  proposition,
) {
  const accommodated = commonGroundProposition(proposition, "accommodation");
  const update = assertIntoCommonGround(carrier, accommodated);
  return Object.freeze({ ...update, mode: "accommodation" });
}

/** Remove a proposition from common ground by challenge. */
export function challengeCommonGround(
  carrier,
  proposition,
) {
  return Object.freeze({
    kind: "communicating.speaking.listening.grounding.update",
    before: carrier,
    after: commonGround(carrier.propositions.filter((item) => !sameProposition(item, proposition))),
    proposition,
    mode: "challenge",
  });
}
