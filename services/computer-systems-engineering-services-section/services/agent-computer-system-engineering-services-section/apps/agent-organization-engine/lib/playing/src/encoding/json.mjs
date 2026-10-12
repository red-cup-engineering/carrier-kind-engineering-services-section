/**
 * Json — the plain-data target of reading-faithful serialization.
 *
 * The codecs in this package map the frozen carriers of `@emsenn/game-algebra`
 * and `@emsenn/game-topology` (the algebraic substrate of the theory of
 * computing, $\mathbf{CGS}$, and the ludics that underlies it) onto and off of
 * ordinary JSON values.  Encoders produce `Json`; decoders accept `unknown`
 * (an honest boundary — decoded data has no type until checked) and throw
 * `TypeError` on malformed input, reusing the algebra's own constructors so a
 * decoded carrier is a *real* frozen carrier, not a look-alike literal.
 *
 * `Json` is the relating package's JSON carrier. This module only supplies the
 * small asserting helpers every decoder reuses; each throws `TypeError`, so the
 * whole package is total: it either returns a valid carrier or throws.
 */
import { requireJsonValue, admitJsonType, readJsonField } from "@red-cup-engineering/json-services-section";

/** Assert that an unknown value is a JSON carrier. */
export function asJson(value, what) {
  return requireJsonValue(value);
}

/** Assert that an unknown value is a JSON object, throwing `TypeError` otherwise. */
export function asObject(value, what) {
  return admitJsonType({value,type:"object",name:what,source:"game-codecs"});
}

/** Assert that an unknown value is a string, throwing `TypeError` otherwise. */
export function asString(value, what) {
  return admitJsonType({value,type:"string",name:what,source:"game-codecs"});
}

/** Assert that an unknown value is a finite number, throwing `TypeError` otherwise. */
export function asNumber(value, what) {
  return admitJsonType({value,type:"number",name:what,source:"game-codecs"});
}

/** Assert that an unknown value is an array, throwing `TypeError` otherwise. */
export function asArray(value, what) {
  return admitJsonType({value,type:"array",name:what,source:"game-codecs"});
}

/** Assert that an unknown value is a boolean, throwing `TypeError` otherwise. */
export function asBoolean(value, what) {
  return admitJsonType({value,type:"boolean",name:what,source:"game-codecs"});
}

/** Read a required property from an object, asserting the object shape first. */
export function field(obj, key, what) {
  return readJsonField({record:obj,key,name:what,source:"game-codecs"});
}
