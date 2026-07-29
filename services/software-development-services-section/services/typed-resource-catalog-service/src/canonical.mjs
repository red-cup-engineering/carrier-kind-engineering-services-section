import { semanticId as identifySemanticTerm } from "@red-cup-engineering/rmn-semantic-conformance";
import { encodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";

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
  return identifySemanticTerm(semanticTerm(value));
}

/** The one RMN coordinate used for identity and every downstream projection. */
export function semanticTerm(value) {
  const encoded = encodeRelationalValue(JSON.parse(canonicalJson(value)));
  return Object.freeze(["ascribe", encoded.type, encoded.term]);
}

export function immutable(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) immutable(item);
  return Object.freeze(value);
}
