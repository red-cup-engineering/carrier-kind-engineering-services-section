/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relation-model-notation-cbor-codec` is a generic RFC
 * 8949 canonical (core deterministic) CBOR codec plus RFC 6920 `ni://`
 * content-addressing. It is generic over ANY JSON-shaped value — booleans,
 * `null`, safe-integer numbers, bigints, strings, `Buffer`/`Uint8Array`
 * byte strings, arrays, and plain (`Object.prototype`) objects with
 * text-string keys — and carries no dependency on any particular term
 * grammar's shape.
 *
 * A lineage-A `Tm` value (from `@red-cup-engineering/relation-model-notation`)
 * is one valid input shape among the ones above: `Tm` values are frozen
 * tagged arrays, and `encode`'s `Array.isArray` branch already handles a
 * frozen array with no adaptation. This package does not import the grammar
 * package at runtime — see the `Tm` typedef import below, which is JSDoc-only
 * and erased at build/run time.
 *
 * @typedef {import("@red-cup-engineering/relation-model-notation/types").Tm} Tm
 *
 * Every export here is a typed gate in the Hoare-triple sense: a specific
 * carrier-type "in", a deterministic transformation, a specific carrier-type
 * "out".
 *
 * `encodeCanonical : value -> Buffer` is the low-level codec's writer half —
 * ANY admitted JSON-shaped value in, its unique RFC 8949 core deterministic
 * CBOR encoding out (integer-keyed major-type dispatch, definite lengths,
 * shortest-form arguments, map entries sorted by encoded-key bytes). Its
 * inverse, `decodeCanonical : Buffer -> value`, is the reader half — a CBOR
 * byte string in, the decoded value out, but ONLY if that byte string is
 * already in canonical form; a structurally valid but non-canonical encoding
 * is rejected rather than silently accepted, so `decodeCanonical` composed
 * with `encodeCanonical` is the identity on its domain and `encodeCanonical`
 * composed with `decodeCanonical` is the identity on canonical byte strings.
 *
 * `semanticBytes : value -> Buffer` is one level up: its domain is any
 * admitted value, its transformation is normalize-then-encode
 * (`encodeCanonical(normalizeCarrier(value))`), its codomain is the same
 * canonical CBOR byte strings `encodeCanonical` produces — the crossing a
 * caller actually wants when the input may carry non-NFC text. `semanticId :
 * value -> ni://... string` shares `semanticBytes`'s domain and
 * normalization, but its transformation hashes (SHA-256) and mints an RFC
 * 6920 content-address URI instead of returning raw bytes — the same value
 * always yields the same `ni://` URI, and different values (after
 * normalization) essentially never collide. `decodeSemantic : Buffer ->
 * value` is `semanticId`/`semanticBytes`'s inverse direction: canonical CBOR
 * bytes in, the decoded-and-normalized value out.
 *
 * Extracted from `relation-model-notation-runtime-service`'s
 * `src/canonical-cbor.mjs` (the full codec: `NI_URI`/`isNiUri`,
 * `encodeCanonical`/`decodeCanonical`/`canonicalEqual`,
 * `sha256Bytes`/`niUri`/`sha256Hex`, and the `raw*` byte-string variants)
 * plus the `normalizeCarrier`/`semanticBytes`/`semanticId`/`decodeSemantic`
 * functions of that same package's `src/rmn-core.mjs`. Everything else in
 * `rmn-core.mjs` — its own term/type grammar, `validateTerm`/`inferTerm`/
 * `checkTerm`/`evaluate`, and all effect/witness/circuit material — is
 * deliberately NOT carried over. This package is scoped to the codec only.
 */
import { createHash } from "node:crypto";

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

// The single admitted shape of an RFC 6920 SHA-256 content address. Every
// caller that mints one through niUri/rawNiUri validates against this same
// regex.
export const NI_URI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

export function isNiUri(value) { return typeof value === "string" && NI_URI.test(value); }

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function unsigned(value, label) {
  const integer = typeof value === "bigint" ? value : BigInt(value);
  if (integer < 0n || integer > 0xffffffffffffffffn) fail("non-canonical-rmn", `${label} is outside the CBOR uint64 profile`);
  return integer;
}

function head(major, value) {
  const integer = unsigned(value, "CBOR argument");
  if (integer < 24n) return Buffer.from([(major << 5) | Number(integer)]);
  if (integer <= 0xffn) return Buffer.from([(major << 5) | 24, Number(integer)]);
  if (integer <= 0xffffn) {
    const bytes = Buffer.alloc(3); bytes[0] = (major << 5) | 25; bytes.writeUInt16BE(Number(integer), 1); return bytes;
  }
  if (integer <= 0xffffffffn) {
    const bytes = Buffer.alloc(5); bytes[0] = (major << 5) | 26; bytes.writeUInt32BE(Number(integer), 1); return bytes;
  }
  const bytes = Buffer.alloc(9); bytes[0] = (major << 5) | 27; bytes.writeBigUInt64BE(integer, 1); return bytes;
}

function byteOrder(left, right) {
  if (left.length !== right.length) return left.length - right.length;
  return Buffer.compare(left, right);
}

function encode(value) {
  if (value === false) return Buffer.from([0xf4]);
  if (value === true) return Buffer.from([0xf5]);
  if (value === null) return Buffer.from([0xf6]);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("non-canonical-rmn", "RMN numbers must be safe integers; decimals use typed decimal strings");
    return value >= 0 ? head(0, value) : head(1, -1 - value);
  }
  if (typeof value === "bigint") return value >= 0n ? head(0, value) : head(1, -1n - value);
  if (typeof value === "string") {
    const bytes = Buffer.from(value, "utf8"); return Buffer.concat([head(3, bytes.length), bytes]);
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const bytes = Buffer.from(value); return Buffer.concat([head(2, bytes.length), bytes]);
  }
  if (Array.isArray(value)) {
    const members = value.map(encode); return Buffer.concat([head(4, members.length), ...members]);
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value).map(([key, member]) => {
      const encodedKey = encode(key); return { encodedKey, encodedValue: encode(member) };
    }).sort((left, right) => byteOrder(left.encodedKey, right.encodedKey));
    return Buffer.concat([head(5, entries.length), ...entries.flatMap(({ encodedKey, encodedValue }) => [encodedKey, encodedValue])]);
  }
  fail("non-canonical-rmn", `unsupported RMN carrier value ${Object.prototype.toString.call(value)}`);
}

function readArgument(bytes, state, additional) {
  const take = (length) => {
    if (state.offset + length > bytes.length) fail("non-canonical-rmn", "truncated CBOR item");
    const start = state.offset; state.offset += length; return start;
  };
  if (additional < 24) return BigInt(additional);
  if (additional === 24) return BigInt(bytes[take(1)]);
  if (additional === 25) return BigInt(bytes.readUInt16BE(take(2)));
  if (additional === 26) return BigInt(bytes.readUInt32BE(take(4)));
  if (additional === 27) return bytes.readBigUInt64BE(take(8));
  fail("non-canonical-rmn", "indefinite-length and reserved CBOR arguments are outside the RMN profile");
}

function asLength(value) {
  if (value > MAX_SAFE) fail("non-canonical-rmn", "CBOR collection length exceeds the implementation ceiling");
  return Number(value);
}

function decodeOne(bytes, state) {
  if (state.offset >= bytes.length) fail("non-canonical-rmn", "truncated CBOR item");
  const initial = bytes[state.offset++], major = initial >> 5, additional = initial & 31;
  if (major === 7) {
    if (additional === 20) return false;
    if (additional === 21) return true;
    if (additional === 22) return null;
    fail("non-canonical-rmn", "floating-point and unassigned simple values are outside the RMN profile");
  }
  const argument = readArgument(bytes, state, additional);
  if (major === 0) return argument <= MAX_SAFE ? Number(argument) : argument;
  if (major === 1) {
    const negative = -1n - argument; return negative >= -MAX_SAFE ? Number(negative) : negative;
  }
  if (major === 2 || major === 3) {
    const length = asLength(argument), end = state.offset + length;
    if (end > bytes.length) fail("non-canonical-rmn", "truncated CBOR string");
    const value = bytes.subarray(state.offset, end); state.offset = end;
    return major === 2 ? Buffer.from(value) : new TextDecoder("utf-8", { fatal: true }).decode(value);
  }
  if (major === 4) {
    const result = [];
    for (let index = 0; index < asLength(argument); index += 1) result.push(decodeOne(bytes, state));
    return result;
  }
  if (major === 5) {
    const result = {};
    for (let index = 0; index < asLength(argument); index += 1) {
      const key = decodeOne(bytes, state);
      if (typeof key !== "string") fail("non-canonical-rmn", "RMN map keys must be text strings");
      if (Object.hasOwn(result, key)) fail("non-canonical-rmn", `duplicate RMN map key ${key}`);
      result[key] = decodeOne(bytes, state);
    }
    return result;
  }
  fail("non-canonical-rmn", "CBOR tags are outside the RMN core profile");
}

/** Encode `value` as RFC 8949 core deterministic ("canonical") CBOR.
 * @param {*} value a boolean, null, safe-integer number, bigint, string,
 *   Buffer/Uint8Array, array, or plain object (recursively) — a `Tm` value
 *   qualifies via the array branch, with no adaptation.
 * @returns {Buffer}
 */
export function encodeCanonical(value) { return encode(value); }

/** Decode a canonical CBOR byte string back into a value. Rejects any input
 *  that is structurally valid CBOR but is not itself in RFC 8949 core
 *  deterministic form (non-shortest arguments, unsorted map keys, trailing
 *  bytes, indefinite lengths, floats, tags, duplicate keys, etc.).
 * @param {Buffer | Uint8Array} source
 * @returns {*}
 */
export function decodeCanonical(source) {
  const bytes = Buffer.from(source), state = { offset: 0 }, value = decodeOne(bytes, state);
  if (state.offset !== bytes.length) fail("non-canonical-rmn", "trailing bytes after the RMN CBOR item");
  if (!encode(value).equals(bytes)) fail("non-canonical-rmn", "CBOR item is valid but not in RFC 8949 core deterministic form");
  return value;
}

/** True iff `left` and `right` encode to the same canonical CBOR bytes. */
export function canonicalEqual(left, right) { return encode(left).equals(encode(right)); }

/** SHA-256 over `value`'s canonical CBOR encoding. */
export function sha256Bytes(value) { return createHash("sha256").update(encode(value)).digest(); }

/** Mint the RFC 6920 `ni:///sha-256;<base64url>` content address for `value`
 *  (SHA-256 over its canonical CBOR encoding). */
export function niUri(value) { return `ni:///sha-256;${sha256Bytes(value).toString("base64url")}`; }

/** Hex-encoded SHA-256 over `value`'s canonical CBOR encoding. */
export function sha256Hex(value) { return sha256Bytes(value).toString("hex"); }

/** SHA-256 directly over a raw byte string, no CBOR encoding step. */
export function rawSha256Bytes(source) { return createHash("sha256").update(source).digest(); }

/** Mint the RFC 6920 `ni:///sha-256;<base64url>` content address for a raw
 *  byte string, no CBOR encoding step. */
export function rawNiUri(source) { return `ni:///sha-256;${rawSha256Bytes(source).toString("base64url")}`; }

// ── semantic (normalize + codec) layer ──────────────────────────────────────

/** Canonicalization pre-pass: NFC-normalizes strings (including object keys,
 *  rejecting post-normalization key collisions), rejects non-safe-integer
 *  numbers, passes `Buffer`/`Uint8Array`/`null`/`boolean`/`bigint` through
 *  unchanged, and recurses into arrays and plain objects. Anything else is
 *  rejected with a `malformed-rmn`-coded error.
 * @param {*} value
 * @returns {*}
 */
export function normalizeCarrier(value) {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(normalizeCarrier);
  if (Buffer.isBuffer(value) || value instanceof Uint8Array || value === null || typeof value === "boolean" || typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("malformed-rmn", "RMN numbers must be safe integers");
    return value;
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    const result = {};
    for (const key of Object.keys(value)) {
      const normalizedKey = key.normalize("NFC");
      if (Object.hasOwn(result, normalizedKey)) fail("malformed-rmn", `map keys collide after NFC normalization: ${normalizedKey}`);
      result[normalizedKey] = normalizeCarrier(value[key]);
    }
    return result;
  }
  fail("malformed-rmn", `unsupported RMN value ${Object.prototype.toString.call(value)}`);
}

/** Normalize (NFC strings, safe-integer numbers) then encode as canonical
 *  CBOR. `value -> Buffer`.
 * @param {*} value
 * @returns {Buffer}
 */
export function semanticBytes(value) { return encodeCanonical(normalizeCarrier(value)); }

/** Normalize then mint the RFC 6920 content address. `value -> ni://... string`.
 * @param {*} value
 * @returns {string}
 */
export function semanticId(value) { return niUri(normalizeCarrier(value)); }

/** Decode canonical CBOR bytes, then normalize the result. `Buffer -> value`.
 * @param {Buffer | Uint8Array} bytes
 * @returns {*}
 */
export function decodeSemantic(bytes) { return normalizeCarrier(decodeCanonical(bytes)); }
