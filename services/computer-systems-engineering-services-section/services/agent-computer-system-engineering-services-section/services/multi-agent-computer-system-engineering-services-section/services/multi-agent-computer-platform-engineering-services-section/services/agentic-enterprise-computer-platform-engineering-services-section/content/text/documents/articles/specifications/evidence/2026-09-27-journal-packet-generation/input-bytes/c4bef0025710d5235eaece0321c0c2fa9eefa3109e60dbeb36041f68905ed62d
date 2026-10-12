/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/cbor-services-section` is the house's RFC 8949
 * core-deterministic CBOR codec. It is generic over admitted carrier values — booleans,
 * `null`, safe-integer numbers, bigints, strings, `Buffer`/`Uint8Array`
 * byte strings, arrays, and plain (`Object.prototype`) objects with
 * text-string keys (an entry whose value is `undefined` is absent, as in
 * JSON) — and carries no dependency on any particular term
 * grammar's shape.
 *
 * `encodeCanonical : value -> Buffer` is the writer half —
 * ANY admitted JSON-shaped value in, its unique RFC 8949 core deterministic
 * CBOR encoding out (finite IEEE 754 numbers use the shortest exact float
 * form, integer values retain integer major types, map entries sort by
 * encoded-key bytes). Its
 * inverse, `decodeCanonical : Buffer -> value`, is the reader half — a CBOR
 * byte string in, the decoded value out, but ONLY if that byte string is
 * already in canonical form; a structurally valid but non-canonical encoding
 * is rejected rather than silently accepted, so `decodeCanonical` composed
 * with `encodeCanonical` is the identity on its domain and `encodeCanonical`
 * composed with `decodeCanonical` is the identity on canonical byte strings.
 * The one naming this section adds is the RFC 6920 name of a canonical byte
 * string; carrier canonicalization and semantic naming are
 * semiotic-content-address's.
 */
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function unsigned(value, label) {
  const integer = typeof value === "bigint" ? value : BigInt(value);
  if (integer < 0n || integer > 0xffffffffffffffffn) fail("non-canonical-cbor", `${label} is outside the CBOR uint64 profile`);
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

function unicodeString(value, label) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (index + 1 >= value.length || value.charCodeAt(index + 1) < 0xdc00 || value.charCodeAt(index + 1) > 0xdfff) {
        fail("non-canonical-cbor", `${label} contains an unpaired Unicode surrogate`);
      }
      index += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) fail("non-canonical-cbor", `${label} contains an unpaired Unicode surrogate`);
  }
  return value;
}

function float16BitsIfExact(value) {
  const sign = value < 0 ? 0x8000 : 0;
  const magnitude = Math.abs(value);
  if (magnitude === 0) return sign;
  if (magnitude > 65504) return undefined;
  if (magnitude < 2 ** -14) {
    const fraction = magnitude * 2 ** 24;
    if (!Number.isInteger(fraction) || fraction < 1 || fraction > 1023) return undefined;
    return sign | fraction;
  }
  const exponent = Math.floor(Math.log2(magnitude));
  const fraction = (magnitude / 2 ** exponent - 1) * 1024;
  if (!Number.isInteger(fraction) || exponent < -14 || exponent > 15 || fraction < 0 || fraction > 1023) return undefined;
  return sign | ((exponent + 15) << 10) | fraction;
}

function decodeFloat16(bits) {
  const sign = (bits & 0x8000) === 0 ? 1 : -1;
  const exponent = (bits >>> 10) & 0x1f;
  const fraction = bits & 0x03ff;
  if (exponent === 0) return sign * fraction * 2 ** -24;
  if (exponent === 31) return fraction === 0 ? sign * Infinity : NaN;
  return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
}

function float(value) {
  if (!Number.isFinite(value)) fail("non-canonical-cbor", "CBOR codec numbers must be finite");
  if (Object.is(value, -0)) return head(0, 0);
  if (Number.isSafeInteger(value)) return value >= 0 ? head(0, value) : head(1, -1 - value);
  const half = float16BitsIfExact(value);
  if (half !== undefined && decodeFloat16(half) === value) {
    const bytes = Buffer.alloc(3); bytes[0] = 0xf9; bytes.writeUInt16BE(half, 1); return bytes;
  }
  const single = Buffer.alloc(5); single[0] = 0xfa; single.writeFloatBE(value, 1);
  if (single.readFloatBE(1) === value) return single;
  const double = Buffer.alloc(9); double[0] = 0xfb; double.writeDoubleBE(value, 1); return double;
}

function encode(value) {
  const chunks = [];
  const stack = [{ kind: "value", value }];
  while (stack.length > 0) {
    const item = stack.pop();
    if (item.kind === "bytes") { chunks.push(item.value); continue; }
    const member = item.value;
    if (member === false) { chunks.push(Buffer.from([0xf4])); continue; }
    if (member === true) { chunks.push(Buffer.from([0xf5])); continue; }
    if (member === null) { chunks.push(Buffer.from([0xf6])); continue; }
    if (typeof member === "number") {
      chunks.push(float(member)); continue;
    }
    if (typeof member === "bigint") { chunks.push(member >= 0n ? head(0, member) : head(1, -1n - member)); continue; }
    if (typeof member === "string") {
      const bytes = Buffer.from(unicodeString(member, "CBOR text string"), "utf8"); chunks.push(head(3, bytes.length), bytes); continue;
    }
    if (Buffer.isBuffer(member) || member instanceof Uint8Array) {
      const bytes = Buffer.from(member); chunks.push(head(2, bytes.length), bytes); continue;
    }
    if (Array.isArray(member)) {
      chunks.push(head(4, member.length));
      for (let index = member.length - 1; index >= 0; index -= 1) stack.push({ kind: "value", value: member[index] });
      continue;
    }
    if (member && Object.getPrototypeOf(member) === Object.prototype) {
      const entries = Object.entries(member).filter(([, entry]) => entry !== undefined).map(([key, entry]) => ({ encodedKey: encode(key), value: entry }))
        .sort((left, right) => byteOrder(left.encodedKey, right.encodedKey));
      chunks.push(head(5, entries.length));
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        stack.push({ kind: "value", value: entries[index].value });
        stack.push({ kind: "bytes", value: entries[index].encodedKey });
      }
      continue;
    }
    fail("non-canonical-cbor", `unsupported CBOR codec carrier value ${Object.prototype.toString.call(member)}`);
  }
  return Buffer.concat(chunks);
}

function readArgument(bytes, state, additional) {
  const take = (length) => {
    if (state.offset + length > bytes.length) fail("non-canonical-cbor", "truncated CBOR item");
    const start = state.offset; state.offset += length; return start;
  };
  if (additional < 24) return BigInt(additional);
  if (additional === 24) return BigInt(bytes[take(1)]);
  if (additional === 25) return BigInt(bytes.readUInt16BE(take(2)));
  if (additional === 26) return BigInt(bytes.readUInt32BE(take(4)));
  if (additional === 27) return bytes.readBigUInt64BE(take(8));
  fail("non-canonical-cbor", "indefinite-length and reserved CBOR arguments are outside the supported CBOR codec profile");
}

function asLength(value) {
  if (value > MAX_SAFE) fail("non-canonical-cbor", "CBOR collection length exceeds the implementation ceiling");
  return Number(value);
}

function decodeOne(bytes, state) {
  if (state.offset >= bytes.length) fail("non-canonical-cbor", "truncated CBOR item");
  const initial = bytes[state.offset++], major = initial >> 5, additional = initial & 31;
  if (major === 7) {
    if (additional === 20) return false;
    if (additional === 21) return true;
    if (additional === 22) return null;
    if (additional === 25) {
      if (state.offset + 2 > bytes.length) fail("non-canonical-cbor", "truncated CBOR float");
      const value = decodeFloat16(bytes.readUInt16BE(state.offset)); state.offset += 2;
      if (!Number.isFinite(value)) fail("non-canonical-cbor", "CBOR codec numbers must be finite");
      return value;
    }
    if (additional === 26) {
      if (state.offset + 4 > bytes.length) fail("non-canonical-cbor", "truncated CBOR float");
      const value = bytes.readFloatBE(state.offset); state.offset += 4;
      if (!Number.isFinite(value)) fail("non-canonical-cbor", "CBOR codec numbers must be finite");
      return value;
    }
    if (additional === 27) {
      if (state.offset + 8 > bytes.length) fail("non-canonical-cbor", "truncated CBOR float");
      const value = bytes.readDoubleBE(state.offset); state.offset += 8;
      if (!Number.isFinite(value)) fail("non-canonical-cbor", "CBOR codec numbers must be finite");
      return value;
    }
    fail("non-canonical-cbor", "unassigned simple values are outside the supported CBOR codec profile");
  }
  const argument = readArgument(bytes, state, additional);
  if (major === 0) return argument <= MAX_SAFE ? Number(argument) : argument;
  if (major === 1) {
    const negative = -1n - argument; return negative >= -MAX_SAFE ? Number(negative) : negative;
  }
  if (major === 2 || major === 3) {
    const length = asLength(argument), end = state.offset + length;
    if (end > bytes.length) fail("non-canonical-cbor", "truncated CBOR string");
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
      if (typeof key !== "string") fail("non-canonical-cbor", "CBOR codec map keys must be text strings");
      if (Object.hasOwn(result, key)) fail("non-canonical-cbor", `duplicate CBOR map key ${key}`);
      result[key] = decodeOne(bytes, state);
    }
    return result;
  }
  fail("non-canonical-cbor", "CBOR tags are outside the supported CBOR codec profile");
}

/** Encode `value` as RFC 8949 core deterministic ("canonical") CBOR.
 * @param {*} value a boolean, null, finite number, bigint, string,
 *   Buffer/Uint8Array, array, or plain object (recursively) — a a compatible value
 *   qualifies via the array branch, with no adaptation.
 * @returns {Buffer}
 */
export function encodeCanonical(value) { return encode(value); }

/** Encode one non-collection carrier through the canonical writer. */
export function encodeCanonicalScalar(value) {
  if (Array.isArray(value) || (value && Object.getPrototypeOf(value) === Object.prototype)) {
    fail("non-canonical-cbor", "canonical scalar cannot be a collection");
  }
  return encode(value);
}

/** Encode one definite-length canonical CBOR array header. */
export function encodeCanonicalArrayHeader(length) { return head(4, length); }

/** Decode a canonical CBOR byte string back into a value. Rejects any input
 *  that is structurally valid CBOR but is not itself in RFC 8949 core
 *  deterministic form (non-shortest arguments, unsorted map keys, trailing
 *  bytes, indefinite lengths, non-shortest floats, tags, duplicate keys, etc.).
 * @param {Buffer | Uint8Array} source
 * @returns {*}
 */
export function decodeCanonical(source) {
  const bytes = Buffer.from(source), state = { offset: 0 }, value = decodeOne(bytes, state);
  if (state.offset !== bytes.length) fail("non-canonical-cbor", "trailing bytes after the CBOR item");
  if (!encode(value).equals(bytes)) fail("non-canonical-cbor", "CBOR item is valid but not in RFC 8949 core deterministic form");
  return value;
}

/** True iff `left` and `right` encode to the same canonical CBOR bytes. */
export function canonicalEqual(left, right) { return encode(left).equals(encode(right)); }

/**
 * Name one canonical CBOR byte string: RFC 8949 core-deterministic bytes in,
 * the RFC 6920 SHA-256 `ni:` URI of those exact bytes out. Bytes that are not
 * already canonical are refused.
 */
export function canonicalCborToNiUri(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("canonical CBOR must be a Uint8Array");
  const canonical = Buffer.from(bytes);
  decodeCanonical(canonical);
  return makeNiUri(canonical);
}

/** {value} -> {base64}: the canonical CBOR of an admitted carrier value. */
export function encodeCbor(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { base64: encodeCanonical(request.value).toString("base64") };
}

/** {base64} -> {value}: a canonical CBOR byte string decoded. */
export function decodeCbor(request) {
  if (typeof request?.base64 !== "string") throw new TypeError("base64 must be a string");
  return { value: decodeCanonical(Buffer.from(request.base64, "base64")) };
}

/** {value} -> {uri}: the ni: name of a value's canonical CBOR encoding. */
export function deriveCborNi(request) {
  if (!Object.prototype.hasOwnProperty.call(request ?? {}, "value")) throw new TypeError("value is required");
  return { uri: canonicalCborToNiUri(encodeCanonical(request.value)) };
}
