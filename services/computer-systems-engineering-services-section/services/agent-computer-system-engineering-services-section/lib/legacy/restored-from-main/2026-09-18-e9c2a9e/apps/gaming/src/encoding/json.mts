/**
 * Json — the plain-data target of charge-faithful serialization.
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
import {
  requireJsonArray,
  requireJsonBoolean,
  requireJsonField,
  requireJsonNumber,
  requireJsonRecord,
  requireJsonString,
  requireJsonValue,
  type JsonRecord,
  type JsonValue,
} from "@red-cup-engineering/computer-data-engine/json";

export type Json = JsonValue;
export type JsonObject = JsonRecord;

/** Assert that an unknown value is a JSON carrier. */
export function asJson(value: unknown, what: string): Json {
  return requireJsonValue(value, what);
}

/** Assert that an unknown value is a JSON object, throwing `TypeError` otherwise. */
export function asObject(value: unknown, what: string): JsonRecord {
  return requireJsonRecord(value, what, "game-codecs");
}

/** Assert that an unknown value is a string, throwing `TypeError` otherwise. */
export function asString(value: unknown, what: string): string {
  return requireJsonString(value, what, "game-codecs");
}

/** Assert that an unknown value is a finite number, throwing `TypeError` otherwise. */
export function asNumber(value: unknown, what: string): number {
  return requireJsonNumber(value, what, "game-codecs");
}

/** Assert that an unknown value is an array, throwing `TypeError` otherwise. */
export function asArray(value: unknown, what: string): readonly Json[] {
  return requireJsonArray(value, what, "game-codecs");
}

/** Assert that an unknown value is a boolean, throwing `TypeError` otherwise. */
export function asBoolean(value: unknown, what: string): boolean {
  return requireJsonBoolean(value, what, "game-codecs");
}

/** Read a required property from an object, asserting the object shape first. */
export function field(obj: JsonRecord, key: string, what: string): Json {
  return requireJsonField(obj, key, what, "game-codecs");
}
