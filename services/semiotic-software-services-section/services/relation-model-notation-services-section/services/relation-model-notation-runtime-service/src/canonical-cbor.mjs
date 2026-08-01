// Pure placement-independent RMN die material.
import { createHash } from "node:crypto";

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

// The single admitted shape of an RFC 6920 SHA-256 content address. Every seat
// that mints one through niUri/rawNiUri validates against this same regex.
export const NI_URI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

export function isNiUri(value) { return typeof value === "string" && NI_URI.test(value); }

function fail(message) {
  const error = new Error(message);
  error.code = "non-canonical-rmn";
  throw error;
}

function unsigned(value, label) {
  const integer = typeof value === "bigint" ? value : BigInt(value);
  if (integer < 0n || integer > 0xffffffffffffffffn) fail(`${label} is outside the CBOR uint64 profile`);
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
    if (!Number.isSafeInteger(value)) fail("RMN numbers must be safe integers; decimals use typed decimal strings");
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
  fail(`unsupported RMN carrier value ${Object.prototype.toString.call(value)}`);
}

function readArgument(bytes, state, additional) {
  const take = (length) => {
    if (state.offset + length > bytes.length) fail("truncated CBOR item");
    const start = state.offset; state.offset += length; return start;
  };
  if (additional < 24) return BigInt(additional);
  if (additional === 24) return BigInt(bytes[take(1)]);
  if (additional === 25) return BigInt(bytes.readUInt16BE(take(2)));
  if (additional === 26) return BigInt(bytes.readUInt32BE(take(4)));
  if (additional === 27) return bytes.readBigUInt64BE(take(8));
  fail("indefinite-length and reserved CBOR arguments are outside the RMN profile");
}

function asLength(value) {
  if (value > MAX_SAFE) fail("CBOR collection length exceeds the implementation ceiling");
  return Number(value);
}

function decodeOne(bytes, state) {
  if (state.offset >= bytes.length) fail("truncated CBOR item");
  const initial = bytes[state.offset++], major = initial >> 5, additional = initial & 31;
  if (major === 7) {
    if (additional === 20) return false;
    if (additional === 21) return true;
    if (additional === 22) return null;
    fail("floating-point and unassigned simple values are outside the RMN profile");
  }
  const argument = readArgument(bytes, state, additional);
  if (major === 0) return argument <= MAX_SAFE ? Number(argument) : argument;
  if (major === 1) {
    const negative = -1n - argument; return negative >= -MAX_SAFE ? Number(negative) : negative;
  }
  if (major === 2 || major === 3) {
    const length = asLength(argument), end = state.offset + length;
    if (end > bytes.length) fail("truncated CBOR string");
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
      if (typeof key !== "string") fail("RMN map keys must be text strings");
      if (Object.hasOwn(result, key)) fail(`duplicate RMN map key ${key}`);
      result[key] = decodeOne(bytes, state);
    }
    return result;
  }
  fail("CBOR tags are outside the RMN core profile");
}

export function encodeCanonical(value) { return encode(value); }

export function decodeCanonical(source) {
  const bytes = Buffer.from(source), state = { offset: 0 }, value = decodeOne(bytes, state);
  if (state.offset !== bytes.length) fail("trailing bytes after the RMN CBOR item");
  if (!encode(value).equals(bytes)) fail("CBOR item is valid but not in RFC 8949 core deterministic form");
  return value;
}

export function canonicalEqual(left, right) { return encode(left).equals(encode(right)); }

export function sha256Bytes(value) { return createHash("sha256").update(encode(value)).digest(); }

export function niUri(value) { return `ni:///sha-256;${sha256Bytes(value).toString("base64url")}`; }

export function sha256Hex(value) { return sha256Bytes(value).toString("hex"); }

export function rawSha256Bytes(source) { return createHash("sha256").update(source).digest(); }

export function rawNiUri(source) { return `ni:///sha-256;${rawSha256Bytes(source).toString("base64url")}`; }
