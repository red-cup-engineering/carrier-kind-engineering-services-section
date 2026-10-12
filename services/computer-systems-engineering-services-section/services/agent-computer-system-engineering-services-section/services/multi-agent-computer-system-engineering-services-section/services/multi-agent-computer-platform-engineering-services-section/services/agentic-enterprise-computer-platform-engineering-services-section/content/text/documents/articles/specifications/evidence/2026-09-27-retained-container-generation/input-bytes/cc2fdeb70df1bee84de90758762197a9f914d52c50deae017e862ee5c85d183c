/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/json-codec` is the bridge between JSON values
 * and SEN terms.
 *
 * `jsonToTerm` admits a JSON value into the term layer; `termToJson`
 * decodes a normal-form term back to JSON. `evaluateRunTerm` is the single
 * entry point for running an operation body: admit the input, apply the term,
 * evaluate, decode.
 *
 * Every JSON kind has a distinct tag. In particular, JSON booleans are not
 * FOUR charges and strings such as `"held"` remain strings. Arrays and objects
 * encode as tagged-pair spines with sorted keys, so the bridge is injective
 * over its admitted JSON domain. The internal bridge helpers (objectFieldOf,
 * arrayConcatOf, etc.) are exported for the evaluators engine, which needs
 * them to reduce field/append/coincide/fold over bridge-encoded data.
 *
 * Product reading: this is not a schema validator or a general serializer. It
 * is the deterministic crossing from already-admitted JSON data into the
 * typed total term substrate, and back out after evaluation.
 *
 * Every export here is a typed gate in the Hoare-triple sense SEN's own
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
 */
import { senListHeadTail, tm, ty } from "./notation.mjs";
import { encodeCanonicalArrayHeader, encodeCanonicalScalar } from "@red-cup-engineering/cbor-services-section";

// This boundary consumes JSON text already resident in memory. Pulling the
// filesystem JSON codec into it coupled the SEN bridge to file projection,
// cryptographic-integrity, and Articulating services just to call JSON.parse.
const parse = (text) => JSON.parse(text);

/** Canonical text for one admitted primitive mark payload. */
function canonicalBytes(value) {
  return JSON.stringify(value);
}

/**
 * @typedef {null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }} JsonValue
 * @typedef {import("./notation/types.mjs").Ty} Ty
 * @typedef {import("./notation/types.mjs").Tm} Tm
 */

export const arrayTag = "sen.json.array";
export const objectTag = "sen.json.object";
export const nullTag = "sen.json.null";
export const booleanTag = "sen.json.boolean";
export const stringTag = "sen.json.string";
export const numberTag = "sen.json.number";

/**
 * @param {readonly Tm[]} items
 * @returns {Tm}
 */
export function listTerm(items) {
  return items.reduceRight((tail, item) => tm.pair(item, tail), tm.star());
}

/** Build a homogeneous list as the array encoding `fold` recurses over; its
 * type is `list itemType`, which the typer reads off the array's spine. */
export function typedListTerm(itemType, items) {
  void itemType;
  return arrayTerm(items);
}

/** Read a grammar list without reimplementing the grammar traversal. */
export function typedListItems(term) {
  const items = [];
  let current = term;
  for (;;) {
    const view = senListHeadTail(current);
    if (view === "empty") return Object.freeze(items);
    if (view === undefined) throw new TypeError(`typedListItems: malformed list ${JSON.stringify(term)}`);
    items.push(view.head);
    current = view.tail;
  }
}

/** The one declared type for a homogeneous typed collection. */
export function listTy(itemType) {
  return ty.list(itemType);
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
  return tm.pair(tm.mark(canonicalBytes(stringTag)), tm.mark(canonicalBytes(value)));
}

/** Cross a native truth-axis decision into the canonical JSON Boolean carrier.
 * @param {Tm} decision
 * @returns {Tm}
 */
export function booleanResultTerm(decision) {
  return tm.cond(decision, jsonToTerm(true), jsonToTerm(false));
}

/** Read a schema-admitted JSON Boolean as a native truth-axis decision.
 * @param {Tm} value
 * @returns {Tm}
 */
export function booleanConditionTerm(value) {
  return tm.coincide(value, jsonToTerm(true));
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

/**
 * A deliberately small, type-directed JSON boundary descriptor.  It is not a
 * universal recursive JSON type: executable callers state their actual record
 * and homogeneous-list shape, including the element type retained by an empty
 * list.  The same descriptor owns both crossings, so a caller cannot encode
 * input one way and decode output through a private second interpreter.
 *
 * @typedef {{ readonly kind: "null" | "boolean" | "number" | "string" } | { readonly kind: "list", readonly item: SenJsonDescriptor } | { readonly kind: "record", readonly fields: Readonly<Record<string, SenJsonDescriptor>> }} SenJsonDescriptor
 */

export const nullDescriptor = Object.freeze({ kind: "null" });
export const booleanDescriptor = Object.freeze({ kind: "boolean" });
export const numberDescriptor = Object.freeze({ kind: "number" });
export const stringDescriptor = Object.freeze({ kind: "string" });

/** Declare one homogeneous list boundary. */
export function listDescriptor(item) {
  return Object.freeze({ kind: "list", item });
}

/** Declare one fixed record boundary. */
export function recordDescriptor(fields) {
  return Object.freeze({ kind: "record", fields: Object.freeze({ ...fields }) });
}

/** Return the exact SEN type induced by one declared boundary descriptor. */
export function descriptorTy(descriptor) {
  switch (descriptor.kind) {
    case "null": return ty.prod(ty.base(), ty.unit());
    case "boolean":
    case "number":
    case "string": return ty.prod(ty.base(), ty.base());
    case "list": return listTy(descriptorTy(descriptor.item));
    case "record": {
      const fields = Object.fromEntries(Object.entries(descriptor.fields)
        .map(([key, value]) => [key, descriptorTy(value)]));
      return objectTy(Object.keys(descriptor.fields), fields);
    }
    default: throw new TypeError(`descriptorTy: unknown descriptor ${String(descriptor?.kind)}`);
  }
}

function tagged(term) {
  if (term[0] !== "pair" || term[1][0] !== "mark") throw new TypeError("descriptor: expected canonical JSON term");
  return parse(term[1][1]);
}

function admittedRecord(term) {
  if (tagged(term) !== objectTag) throw new TypeError("descriptor: expected canonical JSON record");
  const out = new Map();
  for (const item of termList(term[2])) {
    if (item[0] !== "pair" || item[1][0] !== "mark") throw new TypeError("descriptor: malformed canonical JSON record");
    const key = parse(item[1][1]);
    if (typeof key !== "string") throw new TypeError("descriptor: malformed canonical JSON record key");
    out.set(key, item[2]);
  }
  return out;
}

function encodeAdmitted(descriptor, term) {
  const tag = tagged(term);
  switch (descriptor.kind) {
    case "null": if (tag !== nullTag) throw new TypeError("descriptor: expected null"); return term;
    case "boolean": if (tag !== booleanTag) throw new TypeError("descriptor: expected boolean"); return term;
    case "number": if (tag !== numberTag) throw new TypeError("descriptor: expected number"); return term;
    case "string": if (tag !== stringTag) throw new TypeError("descriptor: expected string"); return term;
    case "list":
      if (tag !== arrayTag) throw new TypeError("descriptor: expected array");
      return typedListTerm(descriptorTy(descriptor.item), termList(term[2]).map((item) => encodeAdmitted(descriptor.item, item)));
    case "record": {
      const fields = admittedRecord(term);
      const keys = Object.keys(descriptor.fields).sort();
      if (fields.size !== keys.length || keys.some((key) => !fields.has(key))) throw new TypeError(`descriptor: expected exactly ${keys.join(", ")}`);
      return objectTerm(keys.map((key) => [key, encodeAdmitted(descriptor.fields[key], fields.get(key))]));
    }
    default: throw new TypeError(`encodeDescriptor: unknown descriptor ${String(descriptor?.kind)}`);
  }
}

/** Encode a JSON value through its declared SEN descriptor. */
export function encodeDescriptor(descriptor, value, path = "$") {
  void path;
  return encodeAdmitted(descriptor, jsonToTerm(value));
}

function recordField(term, fieldNames, key) {
  while (term[0] === "ascribe") term = term[2];
  if (term[0] !== "pair" || term[2] === undefined) throw new TypeError("decodeDescriptor: malformed record term");
  const index = [...fieldNames].sort().indexOf(key);
  let spine = term[2];
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (spine[0] !== "pair") throw new TypeError("decodeDescriptor: malformed record spine");
    spine = spine[2];
  }
  if (spine[0] !== "pair" || spine[1][0] !== "pair") throw new TypeError("decodeDescriptor: malformed record field");
  return spine[1][2];
}

/** Decode a checked normal SEN value through the same declared descriptor. */
export function decodeDescriptor(descriptor, term) {
  while (term[0] === "ascribe") term = term[2];
  switch (descriptor.kind) {
    case "null":
    case "boolean":
    case "number":
    case "string": return termToJson(term);
    case "list": return typedListItems(term).map((item) => decodeDescriptor(descriptor.item, item));
    case "record": return Object.fromEntries(Object.keys(descriptor.fields).sort()
      .map((key) => [key, decodeDescriptor(descriptor.fields[key], recordField(term, Object.keys(descriptor.fields), key))]));
    default: throw new TypeError(`decodeDescriptor: unknown descriptor ${String(descriptor?.kind)}`);
  }
}

// ── bridge ────────────────────────────────────────────────────────────────────

/** Admit a JSON value into the term layer.
 * @param {JsonValue} value
 * @returns {Tm}
 */
export function jsonToTerm(value) {
  const frames = [];
  let result;
  const emit = (term) => {
    const frame = frames.at(-1);
    if (frame === undefined) { result = term; return; }
    if (frame.kind === "array") { frame.items.push(term); return; }
    frame.entries.push([frame.key, term]); frame.key = undefined;
  };
  traverseJson(value, {
    scalar(kind, payload) {
      if (kind === "null") emit(tm.pair(tm.mark(canonicalBytes(nullTag)), tm.star()));
      else if (kind === "boolean") emit(tm.pair(tm.mark(canonicalBytes(booleanTag)), tm.mark(payload ? "true" : "false")));
      else if (kind === "string") emit(tm.pair(tm.mark(canonicalBytes(stringTag)), tm.mark(canonicalBytes(payload))));
      else emit(tm.pair(tm.mark(canonicalBytes(numberTag)), tm.mark(canonicalBytes(payload))));
    },
    startArray() { frames.push({ kind: "array", items: [] }); },
    endArray() { emit(tm.pair(tm.mark(canonicalBytes(arrayTag)), listTerm(frames.pop().items))); },
    startObject() { frames.push({ kind: "object", entries: [], key: undefined }); },
    key(key) { frames.at(-1).key = key; },
    endObject() { emit(tm.pair(tm.mark(canonicalBytes(objectTag)), listTerm(frames.pop().entries.map(([key, item]) => tm.pair(tm.mark(canonicalBytes(key)), item))))); },
  });
  return result;
}

/** Encode the exact canonical CBOR carrier of `jsonToTerm(value)` without
 * allocating that outer SEN term. */
export function encodeJsonTermCanonical(value) {
  const chunks = [];
  const scalar = (value) => chunks.push(encodeCanonicalScalar(value));
  const mark = (value) => { chunks.push(encodeCanonicalArrayHeader(2)); scalar("mark"); scalar(value); };
  const star = () => { chunks.push(encodeCanonicalArrayHeader(1)); scalar("star"); };
  const startTaggedList = (tag) => {
    chunks.push(encodeCanonicalArrayHeader(3)); scalar("pair"); mark(canonicalBytes(tag));
  };
  traverseJson(value, {
    scalar(kind, payload) {
      const tag = kind === "null" ? nullTag : kind === "boolean" ? booleanTag : kind === "string" ? stringTag : numberTag;
      chunks.push(encodeCanonicalArrayHeader(3)); scalar("pair"); mark(canonicalBytes(tag));
      if (kind === "null") star(); else mark(kind === "boolean" ? (payload ? "true" : "false") : canonicalBytes(payload));
    },
    startArray() { startTaggedList(arrayTag); },
    arrayItem() { chunks.push(encodeCanonicalArrayHeader(3)); scalar("pair"); },
    endArray() { star(); },
    startObject() { startTaggedList(objectTag); },
    key(key) { chunks.push(encodeCanonicalArrayHeader(3)); scalar("pair"); chunks.push(encodeCanonicalArrayHeader(3)); scalar("pair"); mark(canonicalBytes(key)); },
    endObject() { star(); },
  });
  return Buffer.concat(chunks);
}

/**
 * JSON has a smaller carrier than JavaScript's convenient object soup.  The
 * bridge must reject anything whose in-memory shape is not reproducible as a
 * JSON value, before it reaches the injective SEN representation.
 * @param {unknown} value
 * @param {Set<object>} ancestors
 * @param {string} path
 * @returns {Tm}
 */
function traverseJson(value, visitor, ancestors = new Set(), path = "$") {
  if (value === null) return visitor.scalar("null");
  if (typeof value === "boolean") return visitor.scalar("boolean", value);
  if (typeof value === "string") return visitor.scalar("string", value);
  if (typeof value === "number") {
    // NaN, infinities, and -0 either have no JSON spelling or collapse under
    // JSON.stringify; admitting them would make this bridge non-injective.
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new TypeError(`jsonToTerm: ${path} must be one finite, non-negative-zero JSON number`);
    }
    return visitor.scalar("number", value);
  }
  if (typeof value !== "object") throw new TypeError(`jsonToTerm: ${path} is not a JSON value`);
  if (ancestors.has(value)) throw new TypeError(`jsonToTerm: ${path} contains a cycle`);
  ancestors.add(value);
  try {
  if (Array.isArray(value)) {
    const names = Object.getOwnPropertyNames(value);
    const symbols = Object.getOwnPropertySymbols(value);
    if (symbols.length > 0 || names.length !== value.length + 1 || names.includes("length") === false) {
      throw new TypeError(`jsonToTerm: ${path} must be a dense JSON array with no extra properties`);
    }
    visitor.startArray(value.length);
    for (let index = 0; index < value.length; index += 1) {
      const key = String(index);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        throw new TypeError(`jsonToTerm: ${path}[${index}] must be one enumerable data value`);
      }
      visitor.arrayItem?.(index);
      traverseJson(descriptor.value, visitor, ancestors, `${path}[${index}]`);
    }
    return visitor.endArray();
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`jsonToTerm: ${path} must be a plain JSON record`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`jsonToTerm: ${path} must not have symbol-keyed properties`);
  }
  const names = Object.getOwnPropertyNames(value);
  for (const key of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError(`jsonToTerm: ${path}.${key} must be one enumerable data property`);
    }
  }
  visitor.startObject(names.length);
  for (const key of names.sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    visitor.key(key);
    traverseJson(descriptor.value, visitor, ancestors, `${path}.${key}`);
  }
  return visitor.endObject();
  } finally {
    ancestors.delete(value);
  }
}

/** Decode a normal-form term back to an admitted JSON value.
 * @param {Tm} term
 * @returns {JsonValue}
 */
export function termToJson(term) {
  if (term[0] === "mark") return parse(term[1]);
  if (term[0] === "pair") {
    const tag = markString(term[1]);
    if (tag === nullTag && term[2][0] === "star") return null;
    if (tag === booleanTag && term[2][0] === "mark" && (term[2][1] === "true" || term[2][1] === "false")) return term[2][1] === "true";
    if (tag === stringTag && term[2][0] === "mark") {
      const value = parse(term[2][1]);
      if (typeof value === "string") return value;
    }
    if (tag === numberTag && term[2][0] === "mark") {
      const value = parse(term[2][1]);
      if (typeof value === "number") return value;
    }
    if (tag === arrayTag) return termList(term[2]).map((item) => termToJson(item));
    if (tag === objectTag) {
      const out = {};
      for (const entry of termList(term[2])) {
        if (entry[0] !== "pair") throw new TypeError(`termToJson: malformed object entry ${JSON.stringify(entry)}`);
        const key = markString(entry[1]);
        if (key === undefined) throw new TypeError(`termToJson: object key is not an opaque string mark ${JSON.stringify(entry[1])}`);
        Object.defineProperty(out, key, { value: termToJson(entry[2]), enumerable: true, writable: true, configurable: true });
      }
      return out;
    }
    return [termToJson(term[1]), termToJson(term[2])];
  }
  throw new TypeError(`termToJson: cannot decode normal form ${JSON.stringify(term)}`);
}
