// Pure placement-independent RMN die material.
import { parseRml, semanticBytes, semanticId } from "./rmn-core.mjs";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "./relational-value.mjs";

const REQUIRED_FIELDS = Object.freeze(["type", "version", "precondition", "operation", "postcondition", "refusal"]);

export function validateLawValue(value) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError("RMN law must be an RML map");
  for (const field of REQUIRED_FIELDS) if (!Object.hasOwn(value, field)) throw new TypeError(`RMN law requires ${field}`);
  if (typeof value.type !== "string" || value.type.length === 0 || !Number.isSafeInteger(value.version) || value.version < 1) throw new TypeError("RMN law requires a nonempty type and positive integer version");
  for (const field of ["precondition", "operation", "postcondition", "refusal"]) if (typeof value[field] !== "string" || value[field].length === 0) throw new TypeError(`RMN law ${field} must be nonempty text`);
  return value;
}

export function compileRmlLaw(source) {
  const value = validateLawValue(parseRml(source));
  const relational = encodeRelationalValue(value);
  const term = ["ascribe", relational.type, relational.term];
  return Object.freeze({ value, term, bytes: semanticBytes(term), id: semanticId(term) });
}

export function decodeCompiledLaw(term) {
  if (!Array.isArray(term) || term[0] !== "ascribe" || term.length !== 3 || JSON.stringify(term[1]) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new TypeError("compiled RMN law requires the relational-value ascription");
  return validateLawValue(decodeRelationalValue(term[1], term[2]));
}
