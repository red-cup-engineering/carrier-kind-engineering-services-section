/**
 * relation-boundary — animating's membrane boundary: utterances to SignCells.
 *
 * An utterance is a token and a claim. When the token packs a relation pair
 * `{ subject, object }`, the utterance tells the cell (subject, claim, object);
 * otherwise the reflexive cell (token, claim, token). The rest is stable keys
 * and value-level matching over those cells' terms.
 */

import { cell } from "@red-cup-engineering/signcell/cell";
import { canonical } from "@red-cup-engineering/json-services-section";

/** A term's label. */
export const termLabel = (input) => String(input);

/** Whether two boundary values are the same value. */
export function sameBoundaryValue(left, right) {
  return canonical(left) === canonical(right);
}

export { cellOfUtterance, relationPairOf } from "@red-cup-engineering/signcraft/membrane";
import { relationPairOf } from "@red-cup-engineering/signcraft/membrane";
import { cellOfUtterance } from "@red-cup-engineering/signcraft/membrane";

/** A cell's stable key, subject|predicate|object. */
export function cellKey(value) {
  return [canonical(value.subject), canonical(value.predicate), canonical(value.object)].join("|");
}

/** The cell (subject, predicate, object), reflexive when the object is omitted. */
export function cellOfTerms(subject, predicate, object) {
  return cell(subject, predicate, object ?? subject);
}

/** Whether an utterance tells the projection (subject, predicate[, object]). */
export function utteranceMatchesProjection(carrier, subject, predicate, object) {
  const told = cellOfUtterance(carrier);
  return sameBoundaryValue(told.predicate, predicate)
    && sameBoundaryValue(told.subject, subject)
    && sameBoundaryValue(told.object, object ?? subject);
}

/** Whether a term is, or (as a packed pair) contains, an input. */
export function termTouches(term, input) {
  if (sameBoundaryValue(term, input)) return true;
  const pair = relationPairOf(term);
  return pair !== undefined && (sameBoundaryValue(pair.subject, input) || sameBoundaryValue(pair.object, input));
}

/** Whether a predicate is an input. */
export function predicateMatches(predicate, input) {
  return sameBoundaryValue(predicate, input);
}

/** A boundary input's tag. */
export function boundaryInputTag(input) {
  return input === undefined ? "reflexive" : typeof input === "string" ? `s:${input}` : `m:${canonical(input)}`;
}
