// index.mjs — the Horsetail public API.
import { makeWorld as _makeWorld } from "./world.mjs";

import { readAll } from "./reader.mjs";
import { evaluate } from "./evaluator.mjs";
import { loadStdlib } from "./stdlib.mjs";

import { BOT, readingOf } from "./value.mjs";

export { sym, pointLit, cell } from "./types.mjs";

export {
  T, F, BOT, TOP,
  isTop, isBottom, isAffirmed, isDenied, isHeld, isPending,
  negate, conflate,
  joinKnowledge, meetKnowledge, joinTruth, meetTruth,
  bottom, potential, readingOf,
  seqOf, seqFrom, fnValue, fnId, codeOf, codeFrom,
  valueOf, writeValue, booleanOf, glyph,
} from "./value.mjs";
export { read, readAll, write } from "./reader.mjs";
export { matchForm } from "./pattern.mjs";

export { makeWorld as _makeWorld, gensym, parseParams } from "./world.mjs";
export { evaluate } from "./evaluator.mjs";
export { loadStdlib } from "./stdlib.mjs";
export { readJson, valueFromJson, valueToJson } from "./json.mjs";

export const LANGUAGE_NAME = "Horsetail";

// ── high-level API ────────────────────────────────────────────────────────────

/** Create a fresh World with the stdlib preloaded. */
export function world() {
  const w = _makeWorld();
  loadStdlib(w);
  return w;
}

/** Read all forms from `src`, evaluate each in `w`, return the last Value. */
export function run(src, w) {
  const forms = readAll(src);
  if (forms.length === 0) return BOT;
  let result = BOT;
  for (const f of forms) result = evaluate(f, w.env, w);
  return result;
}

/** Run one source string, return a step object with the raw value and its reading reading. */

export function step(src, w) {
  const value = run(src, w);
  return { value, reading: readingOf(value), world: w };
}
