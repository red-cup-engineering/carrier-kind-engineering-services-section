/**
 * Event / event-structure codec — the polarized prime event structures that
 * are the objects of $\mathbf{CGS}$ before symmetry.
 *
 * An event is `{id, polarity}`; a prime event structure $(E, \leq, \#)$ is a
 * list of events plus causality and conflict edge lists.  Edges are ordered
 * pairs `[from, to]`, serialized as two-element string arrays.  Decode reuses
 * the `event` and `eventStructure` constructors, so the result is a real frozen
 * carrier with the same edge normalization the algebra applies.
 */
import { event, eventStructure } from "../structuring/event/structure.mjs";

import { asArray, asObject, asString, field } from "./json.mjs";

import { decodePolarity, encodePolarity } from "./polarity.mjs";

/** Encode an event to `{id, polarity}`. */
export function encodeEvent(value) {
  return { id: value.id, polarity: encodePolarity(value.polarity) };
}

function encodePair(pair) {
  return [pair[0], pair[1]];
}

function decodePair(json, what) {
  const arr = asArray(json, what);
  if (arr.length !== 2) {
    throw new TypeError(`game-codecs: expected 2-element ${what}, got length ${arr.length}`);
  }
  return [asString(arr[0], `${what}.from`), asString(arr[1], `${what}.to`)];
}

/** Encode a prime event structure to `{events, causality, conflict}`. */
export function encodeEventStructure(value) {
  return {
    events: value.events.map(encodeEvent),
    causality: value.causality.map(encodePair),
    conflict: value.conflict.map(encodePair),
  };
}

/** Encode a single `[from, to]` edge pair (shared by arena symmetry codecs). */
export { encodePair as encodeEventPair, decodePair as decodeEventPair };
