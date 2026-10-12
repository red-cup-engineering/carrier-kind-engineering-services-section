/** Witness an arbitrary runtime value as a JSON resource: round-trip it
 *  through JSON text and admit the result as a JSON value. */
import { requireJsonValue } from "./require-json-value.mjs";

export function jsonResource(value, context = "json resource") {
  return requireJsonValue(JSON.parse(JSON.stringify(value)), context);
}
