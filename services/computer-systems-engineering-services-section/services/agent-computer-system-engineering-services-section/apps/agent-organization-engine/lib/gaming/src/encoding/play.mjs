/**
 * Play codec — positions with history.
 *
 * A play is a sequence of moves (event ids); its reading-faithful JSON is the
 * moves array.  Decode reuses the `play` constructor.
 */
import { play } from "../index.mjs";

import { asArray, asString } from "@red-cup-engineering/playing/encoding/json";

/** Encode a play to its moves array. */
export function encodePlay(value) {
  return [...value.moves];
}

/** Decode a moves array back to the frozen `Play`. */
export function decodePlay(json) {
  const arr = asArray(json, "play");
  return play(arr.map((m, i) => asString(m, `play.moves[${i}]`)));
}
