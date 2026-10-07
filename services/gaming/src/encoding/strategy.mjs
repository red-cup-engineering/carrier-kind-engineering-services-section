/**
 * Strategy codec — the morphisms of $\mathbf{CGS}$.
 *
 * A strategy is an arena together with a prefix-closed set of valid plays.  Its
 * JSON is `{arena, plays}`.  Decode reuses the `strategy` constructor over the
 * decoded arena and plays, so the result is a real frozen carrier.
 */
import { strategy } from "../index.mjs";

import { decodeArena, encodeArena } from "./arena.mjs";
import { asArray, asObject, field } from "@red-cup-engineering/playing/encoding/json";

import { decodePlay, encodePlay } from "./play.mjs";

/** Encode a strategy to `{arena, plays}`. */
export function encodeStrategy(value) {
  return {
    arena: encodeArena(value.arena),
    plays: value.plays.map(encodePlay),
  };
}

/** Decode `{arena, plays}` back to the frozen `Strategy`. */
export function decodeStrategy(json) {
  const obj = asObject(json, "strategy");
  const a = decodeArena(field(obj, "arena", "strategy"));
  const plays = asArray(field(obj, "plays", "strategy"), "strategy.plays").map(decodePlay);
  return strategy(a, plays);
}
