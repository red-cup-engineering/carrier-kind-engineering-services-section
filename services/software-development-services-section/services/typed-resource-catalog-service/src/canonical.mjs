import { isDeepStrictEqual } from "node:util";
import { jsonToTerm, termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import {
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";

function canonicalValue(value, context = "value") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${context}: non-finite numbers are not canonical JSON`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => canonicalValue(item, `${context}[${index}]`));
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalValue(item, `${context}.${key}`)]));
  }
  throw new TypeError(`${context}: expected a JSON value`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function semanticId(value) {
  return identifyJsonSemanticContent({
    objectKind: "typed-resource-catalog.resource",
    value: JSON.parse(canonicalJson(value)),
    witnessRoot: EMPTY_WITNESS_ROOT,
  }).token;
}

/** The one RMN coordinate used for identity and every downstream projection. */
export function semanticTerm(value) {
  return jsonToTerm(JSON.parse(canonicalJson(value)));
}

export function encodeJsonTerm(value) {
  return jsonToTerm(JSON.parse(canonicalJson(value)));
}

export function decodeJsonTerm(term) {
  const value = termToJson(term);
  if (!isDeepStrictEqual(jsonToTerm(value), term)) throw new TypeError("term is not the injective JSON-to-RMN representation");
  return value;
}

export function immutable(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) immutable(item);
  return Object.freeze(value);
}
