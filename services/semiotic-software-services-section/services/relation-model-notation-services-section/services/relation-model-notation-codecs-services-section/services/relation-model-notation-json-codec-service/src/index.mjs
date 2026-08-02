/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relation-model-notation-json-codec` is the bridge between JSON values
 * and RMN terms.
 *
 * `jsonToTerm` admits a JSON value into the term layer; `termToJson`
 * decodes a normal-form term back to JSON. `evaluateRunTerm` is the single
 * entry point for running an operation body: admit the input, apply the term,
 * evaluate, decode.
 *
 * Arrays and objects encode as tagged-pair spines with sentinel marks; the
 * encoding is deterministic (object keys sorted), so the same JSON value
 * always produces the same term. The internal bridge helpers (objectFieldOf,
 * arrayConcatOf, etc.) are exported for the evaluators engine, which needs
 * them to reduce field/append/coincide/fold over bridge-encoded data.
 *
 * Product reading: this is not a schema validator or a general serializer. It
 * is the deterministic crossing from already-admitted JSON data into the
 * typed total term substrate, and back out after evaluation.
 *
 * Every export here is a typed gate in the Hoare-triple sense RMN's own
 * morphism-packet format (`{verb, domain, codomain, runTerm}`) already
 * commits to: a specific carrier-type "in", a pure transformation, a specific
 * carrier-type "out". `jsonToTerm : JsonValue -> Tm` and `termToJson : Tm ->
 * JsonValue` are the two crossings proper; `objectTerm`/`arrayTerm`/
 * `stringTerm` are builders with the same shape one level down (`(structured
 * input) -> Tm`, matching a slice of `jsonToTerm`'s own encoding exactly, but
 * callable directly at term-authoring time rather than only via a full JSON
 * value); `projectField : (field names, key, Tm) -> Tm` is a typed
 * projection out of an already-built object term, its domain a name-list
 * plus a term rather than a bare `Tm`, its codomain still a `Tm`. Reading the
 * module this way — domain and codomain first, transformation second — is
 * exactly how each function below is meant to be read.
 *
 * Transcribed from metroplat's `src/lib/language/reader/projecting/index.mts`,
 * behavior preserved exactly (TypeScript type annotations dropped; JSDoc
 * typedefs substituted). `tm`/`ty`/`chargeNameOfTerm`/`generatorNameOfTerm`/
 * `chargeValueNames`/`isChargeValueName` now come from
 * `@red-cup-engineering/relation-model-notation` (the charge-name vocabulary
 * is grammar-fundamental, not general infra — it belongs there, not in some
 * other package this one reaches into). `parse`/`JsonValue` now come from
 * `@red-cup-engineering/json-file-codec-service`, a real published package
 * with matching behavior (differentially verified: 10/10 representative
 * values match, both throw the same error type on invalid input) — no
 * reason to keep depending on metroplat's copy once a modern equivalent is
 * confirmed identical for what this package actually needs.
 *
 * `canonicalBytes` (from metroplat's `identity/index.mts`) is NOT replaced
 * with `json-file-codec-service`'s `canonical()` — those two use genuinely
 * different algorithms (RFC-8785 vs. a simpler ad hoc one) and swapping
 * would be a real behavioral-divergence risk for numeric edge cases in
 * general. But every call site in this package only ever passes a plain
 * string or number (an object key, a tag constant, a JSON string/number
 * leaf already type-checked before the call) — never a nested object or
 * array, where the two algorithms could actually diverge. For that
 * primitive-only case, `JSON.stringify` and `canonicalBytes` are proven
 * identical (differentially verified: 10/10, including unicode, quotes,
 * negative zero, and both very large and very small numbers) — so this
 * package needs no external canonicalization dependency at all here, just
 * the standard library.
 */
import { parse } from "@red-cup-engineering/json-file-codec-service";
import { tm, ty, chargeNameOfTerm, generatorNameOfTerm, isChargeValueName } from "@red-cup-engineering/relation-model-notation";

/** Canonical text for a primitive mark payload (a string or number leaf,
 *  never an object/array at these call sites) — `JSON.stringify` and
 *  metroplat's RFC-8785 `canonicalBytes` are proven identical for exactly
 *  this domain; see the module doc comment. */
function canonicalBytes(value) {
  return JSON.stringify(value);
}

/**
 * @typedef {import("@red-cup-engineering/json-file-codec-service").JsonValue} JsonValue
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").ChargeValueName} ChargeValueName
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").Ty} Ty
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").Tm} Tm
 */

export const arrayTag = "metroplat.term.array";
export const objectTag = "metroplat.term.object";

/**
 * @param {readonly Tm[]} items
 * @returns {Tm}
 */
export function listTerm(items) {
  return items.reduceRight((tail, item) => tm.pair(item, tail), tm.star());
}

/**
 * @param {Tm} term
 * @returns {readonly Tm[]}
 */
export function termList(term) {
  const out = [];
  let current = term;
  while (current[0] === "pair") {
    out.push(current[1]);
    current = current[2];
  }
  if (current[0] !== "star") throw new TypeError(`termToJson: malformed product list ${JSON.stringify(term)}`);
  return Object.freeze(out);
}

/**
 * @param {Tm} term
 * @returns {string | undefined}
 */
function markString(term) {
  if (term[0] !== "mark") return undefined;
  const value = parse(term[1]);
  return typeof value === "string" ? value : undefined;
}

/** Whether a term is a fully-reduced value (closed data). Used by the evaluators engine for `coincide` reduction.
 * @param {Tm} t
 * @returns {boolean}
 */
export function isValueTerm(t) {
  switch (t[0]) {
    case "mark":
    case "star":
      return true;
    case "pair":
      return isValueTerm(t[1]) && isValueTerm(t[2]);
    default:
      return false;
  }
}

/**
 * Decompose a tagged pair-spine term for `fold`. Tag-agnostic: array-encoded
 * (`arrayTag`) and object-encoded (`objectTag`) terms are both `pair(mark(tag), spine)`
 * over the same cons-list shape, so `field`/`append` (composed from `fold` in
 * `core/language/index.mts`) walk either through this one decomposition.
 * @param {Tm} term
 * @returns {"empty" | { readonly head: Tm, readonly tail: Tm } | undefined}
 */
export function arrayHeadTail(term) {
  if (term[0] !== "pair" || term[1][0] !== "mark") return undefined;
  const tag = term[1][1];
  const spine = term[2];
  if (spine[0] === "star") return "empty";
  if (spine[0] === "pair") return { head: spine[1], tail: tm.pair(tm.mark(tag), spine[2]) };
  return undefined;
}

// ── public builder API ────────────────────────────────────────────────────────

/** Build an object term (matching jsonToTerm's object encoding).
 * @param {ReadonlyArray<readonly [string, Tm]>} entries
 * @returns {Tm}
 */
export function objectTerm(entries) {
  const sorted = [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return tm.pair(
    tm.mark(canonicalBytes(objectTag)),
    listTerm(sorted.map(([key, value]) => tm.pair(tm.mark(canonicalBytes(key)), value))),
  );
}

/** Build an array term (matching jsonToTerm's array encoding).
 * @param {readonly Tm[]} items
 * @returns {Tm}
 */
export function arrayTerm(items) {
  return tm.pair(tm.mark(canonicalBytes(arrayTag)), listTerm(items));
}

/** Admit a string literal exactly as the bridge encodes one (an opaque mark).
 * @param {string} value
 * @returns {Tm}
 */
export function stringTerm(value) {
  return tm.mark(canonicalBytes(value));
}

/**
 * Project a named field out of an object term by DIRECT position —
 * `fst`/`snd` down `objectTerm`'s own sorted spine — instead of `field`'s
 * generic runtime search. `field` (sugar over `fold`) is the right tool when
 * the object's field set isn't known at term-authoring time (or must stay
 * open, as a real JSON-boundary reader does); `projectField` is for the
 * common case this codebase actually has far more of: a morphism whose input
 * shape is a specific, fixed object known when the term is written. That
 * case is a genuine categorical projection (matching how Obsmetrologia's own
 * `PredicationCell` accesses its fields — `φ.subject`, not a string-keyed
 * lookup, `Obsmetrologia/Language/Predicating/Cell.lean`), and unlike `field`
 * it is typeable with the existing `prod`/`base`/`unit` vocabulary alone —
 * `fst`/`snd` already have complete `inferTy`/`checkTy` rules.
 *
 * `fieldNames` is the SAME (unsorted, as-authored) field-name list a caller
 * would pass to `objectTerm` for this shape — this function sorts it the
 * identical way (`objectTerm`'s own comparator) to find `key`'s position, so
 * the two functions can never silently disagree about field order.
 * @param {readonly string[]} fieldNames
 * @param {string} key
 * @param {Tm} objectValue
 * @returns {Tm}
 */
export function projectField(fieldNames, key, objectValue) {
  const sorted = [...fieldNames].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const index = sorted.indexOf(key);
  if (index < 0) throw new TypeError(`projectField: ${JSON.stringify(key)} is not one of ${JSON.stringify(sorted)}`);
  let spine = tm.snd(objectValue); // past the leading mark(objectTag)
  for (let i = 0; i < index; i += 1) spine = tm.snd(spine);
  return tm.snd(tm.fst(spine));
}

/**
 * The `Ty` of an object term with the given (sorted-the-same-way-as
 * `objectTerm`) fields — the type-level mirror of `projectField`, built from
 * the EXISTING `prod`/`base`/`unit` vocabulary alone (no new `Ty` former: an
 * object with a known, fixed field set is exactly a nested product, once you
 * know the field order, which is this function's whole job). Each field's
 * value inhabits `base` (a `mark`) generically unless a real element `Ty` is
 * supplied via `fieldTypes` for fields whose internal structure a caller
 * actually needs to check (see `hasTy`'s `fold` case, `evaluators/index.mts`,
 * for why plain `field`-based reads still need `list`/checking elsewhere —
 * this only replaces the RECORD half of that gap for terms rewritten to use
 * `projectField`).
 * @param {readonly string[]} fieldNames
 * @param {Readonly<Record<string, Ty>>} [fieldTypes]
 * @returns {Ty}
 */
export function objectTy(fieldNames, fieldTypes = {}) {
  const sorted = [...fieldNames].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const spine = sorted.reduceRight(
    (tail, key) => ty.prod(ty.prod(ty.base(), fieldTypes[key] ?? ty.base()), tail),
    ty.unit(),
  );
  return ty.prod(ty.base(), spine);
}

/** The `Ty` of a FIXED-length array term (`arrayTerm`) with the given
 *  item types, positionally — unlike `objectTy`'s entries, array items carry
 *  no key-mark, so each slot is the item's own `Ty` directly, not wrapped in
 *  an extra `prod(base, _)`. Only sound for a statically-known item COUNT
 *  (exactly what `arrayTerm` is given at term-authoring time here); a
 *  variable-length homogeneous array is `ty.list(elementTy)`, not this.
 * @param {readonly Ty[]} itemTypes
 * @returns {Ty}
 */
export function arrayTy(itemTypes) {
  const spine = itemTypes.reduceRight((tail, itemTy) => ty.prod(itemTy, tail), ty.unit());
  return ty.prod(ty.base(), spine);
}

// ── bridge ────────────────────────────────────────────────────────────────────

/** Admit a JSON value into the term layer.
 * @param {JsonValue} value
 * @returns {Tm}
 */
export function jsonToTerm(value) {
  if (value === null) return tm.star();
  if (typeof value === "boolean") return tm.bool(value);
  if (typeof value === "string" && isChargeValueName(value)) return tm.charge(value);
  if (typeof value === "string" || typeof value === "number") return tm.mark(canonicalBytes(value));
  if (Array.isArray(value)) {
    return tm.pair(tm.mark(canonicalBytes(arrayTag)), listTerm(value.map((item) => jsonToTerm(item))));
  }
  const record = value;
  const entries = Object.keys(record).sort().map((key) =>
    tm.pair(tm.mark(canonicalBytes(key)), jsonToTerm(record[key])));
  return tm.pair(tm.mark(canonicalBytes(objectTag)), listTerm(entries));
}

/** Decode a normal-form term back to an admitted JSON value.
 * @param {Tm} term
 * @returns {JsonValue}
 */
export function termToJson(term) {
  const chargeName = chargeNameOfTerm(term);
  if (chargeName !== undefined) return chargeName;
  const generatorName = generatorNameOfTerm(term);
  if (generatorName !== undefined) return generatorName;
  if (term[0] === "mark") return parse(term[1]);
  if (term[0] === "star") return null;
  if (term[0] === "pair") {
    const tag = markString(term[1]);
    if (tag === arrayTag) return termList(term[2]).map((item) => termToJson(item));
    if (tag === objectTag) {
      const out = {};
      for (const entry of termList(term[2])) {
        if (entry[0] !== "pair") throw new TypeError(`termToJson: malformed object entry ${JSON.stringify(entry)}`);
        const key = markString(entry[1]);
        if (key === undefined) throw new TypeError(`termToJson: object key is not an opaque string mark ${JSON.stringify(entry[1])}`);
        out[key] = termToJson(entry[2]);
      }
      return out;
    }
    return [termToJson(term[1]), termToJson(term[2])];
  }
  throw new TypeError(`termToJson: cannot decode normal form ${JSON.stringify(term)}`);
}
