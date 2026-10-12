import { tokenValue, utterance } from "@red-cup-engineering/signcell/cell";
import { articulate as articulateUtterance, isMark } from "@red-cup-engineering/signcell/utterance";

/**
 * A communicating carrier is not text. It is an admitted utterance from the
 * relating substrate, plus the first articulation opened from that utterance.
 */

/** A decoded boundary document before admission into Marks. */

/** A boundary claim carried by the root morphism. */

/** A boundary token carried by the root morphism. */

export { isMark };

export const communicationMark = (input) =>
  isMark(input) ? input : { boundary: "communicating.document", text: input };

const communicationClaimMark = (input) =>
  input === undefined
    ? { boundary: "communicating.claim", claim: "uttered" }
    : isMark(input)
      ? input
      : { boundary: "communicating.claim", claim: input };

/**
 * Admit communicating boundary values as a relating utterance.
 *
 * Domain: token Mark/string x optional claim Mark/string.
 * Codomain: communicating carrier.
 * Normalization: boundary document -> Mark -> Utterance -> relating articulate.
 */
export function admitCommunication(
  tokenInput,
  claimInput,
) {
  const carrier = utterance(communicationMark(tokenInput), communicationClaimMark(claimInput));
  return carrierOfUtterance(carrier);
}

/**
 * Lift an already admitted relating utterance into the communicating category.
 *
 * Domain: UtteranceCarrier.
 * Codomain: communicating carrier.
 * Law: the returned articulation is exactly relating's articulation of the
 * given utterance; no span, parse, reading, or reading is accepted as primitive.
 */
export function carrierOfUtterance(carrier) {
  return Object.freeze({
    kind: "communicating.carrier",
    utterance: carrier,
    articulation: articulateUtterance(carrier),
  });
}

export function communicationDocument(carrier) {
  const value = tokenValue(carrier.utterance);
  if (
    typeof value === "object"
    && value !== null
    && "boundary" in value
    && value.boundary === "communicating.document"
    && "text" in value
    && typeof value.text === "string"
  ) {
    return value.text;
  }
  return null;
}
