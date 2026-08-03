import assert from "node:assert/strict";
import test from "node:test";
import { tm } from "@red-cup-engineering/relation-model-notation";
import {
  NI_URI,
  isNiUri,
  encodeCanonical,
  decodeCanonical,
  canonicalEqual,
  sha256Bytes,
  niUri,
  sha256Hex,
  rawSha256Bytes,
  rawNiUri,
  normalizeCarrier,
  normalizedCarrierBytes,
  normalizedCarrierNiUri,
  decodeNormalizedCarrier,
} from "../src/index.mjs";

// ── representative values ───────────────────────────────────────────────────

const identity = tm.lam(tm.var(0));
const sampleTerm = tm.app(tm.lam(tm.var(0)), tm.mark("x"));

// Explicit \u escapes, not visually-similar literals: two byte-distinct
// encodings of "the same word", one NFC-composed (single codepoint U+00E9
// LATIN SMALL LETTER E WITH ACUTE), one NFD-decomposed ("e" U+0065 followed
// by COMBINING ACUTE ACCENT U+0301). Written this way so the two are
// guaranteed genuinely different JS strings, not two copies of one literal.
const CAFE_NFC = "café";
const CAFE_NFD = "café";

const representativeValues = [
  true,
  false,
  null,
  0,
  -1,
  1,
  Number.MAX_SAFE_INTEGER,
  -Number.MAX_SAFE_INTEGER,
  "",
  "plain ascii",
  CAFE_NFC,
  CAFE_NFD,
  Buffer.from([0x00, 0x01, 0xff]),
  [],
  [1, 2, 3],
  [[1, [2, 3]], "nested"],
  { a: 1, b: 2 },
  { b: 2, a: 1 }, // non-canonical key order
  { zebra: 1, apple: 2, mango: 3 },
  sampleTerm,
  identity,
  tm.pair(tm.mark("l"), tm.mark("r")),
];

// Package-owned interoperability fixtures. Primitive encodings are RFC 8949
// examples/profile consequences; RMN fixtures are released 0.0.1 carrier
// commitments. Literal expected bytes and digests keep this test independent
// from every prior implementation.
const goldenVectors = [
  { label: "false", value: false, hex: "f4", sha256: "2017ff3461395672aa0aa4f64894fd2f95a4b120e2690e8951656d79adc2eed2" },
  { label: "true", value: true, hex: "f5", sha256: "27abdeddfe8503496adeb623466caa47da5f63abd2bc6fa19f6cfcb73ecfed70" },
  { label: "null", value: null, hex: "f6", sha256: "b0b2988b6bbe724bacda5e9e524736de0bc7dae41c46b4213c50e1d35d4e5f13" },
  { label: "zero", value: 0, hex: "00", sha256: "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d" },
  { label: "minus one", value: -1, hex: "20", sha256: "36a9e7f1c95b82ffb99743e0c5c4ce95d83c9a430aac59f84ef3cbfab6145068" },
  { label: "uint additional byte", value: 24, hex: "1818", sha256: "7c6348f7ea8a4e831aafe688a2557d7a3ab0be8549cdb190a029956ade971b15" },
  { label: "negative additional byte", value: -25, hex: "3818", sha256: "dd7baa54409c052850ed2e03e586086bfed37a275ae4aee888711cd7c46bc91f" },
  { label: "maximum safe integer", value: Number.MAX_SAFE_INTEGER, hex: "1b001fffffffffffff", sha256: "14f502e8a30340288b9da98ed55d9f230c8a92ee86336198df6d1b4e278f3d1e" },
  { label: "UTF-8 text", value: CAFE_NFC, hex: "65636166c3a9", sha256: "d969116be8b6651a9a0cc2fd6587420cab29c5283df323f5f70cce9bf8790993" },
  { label: "byte string", value: Buffer.from([0x00, 0x01, 0xff]), hex: "430001ff", sha256: "325c3dbd94e14764205585f692c9a631fd7e523975ed1551b602749d5224820b" },
  { label: "array", value: [1, 2, 3], hex: "83010203", sha256: "4abc31137ce738d9aceb8a1d1d51f15cad42c2b08dcb7ed179f737a194b355e7" },
  { label: "canonical map order", value: { zebra: 1, apple: 2, mango: 3 }, hex: "a3656170706c6502656d616e676f03657a6562726101", sha256: "f703f672c20fd1f66295eeb34c90fbb23393c48bb6f9990921a8dcb0a8e07768" },
  { label: "RMN star", value: tm.star(), hex: "816473746172", sha256: "537b8a2494f4bd1e10c38fa0cc22daf5aa737f963741763e757888155e483c0e" },
  { label: "RMN application", value: sampleTerm, hex: "836361707082636c616d82637661720082646d61726b6178", sha256: "2a821dce22c31092496a02294ced75e7c00f77308774e6d9a84056ab83b2d5bc" },
];

// ── 1. encodeCanonical/decodeCanonical round-tripping ───────────────────────

test("encodeCanonical/decodeCanonical: round-trips every representative value", () => {
  for (const value of representativeValues) {
    const encoded = encodeCanonical(value);
    assert.ok(Buffer.isBuffer(encoded));
    const decoded = decodeCanonical(encoded);
    assert.deepEqual(decoded, value, `round-trip mismatch for ${JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v)}`);
  }
});

test("encodeCanonical: booleans and null encode to the fixed single-byte CBOR simple values", () => {
  assert.deepEqual(encodeCanonical(false), Buffer.from([0xf4]));
  assert.deepEqual(encodeCanonical(true), Buffer.from([0xf5]));
  assert.deepEqual(encodeCanonical(null), Buffer.from([0xf6]));
});

test("encodeCanonical: negative integers and MAX_SAFE_INTEGER round-trip exactly", () => {
  for (const n of [0, -1, -2, 1, 2, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER]) {
    assert.equal(decodeCanonical(encodeCanonical(n)), n);
  }
});

test("encodeCanonical: non-ASCII strings encode as UTF-8 text and round-trip byte-for-byte as given (no implicit normalization at this layer)", () => {
  assert.notEqual(CAFE_NFC, CAFE_NFD); // distinct JS strings pre-normalization
  assert.equal(decodeCanonical(encodeCanonical(CAFE_NFC)), CAFE_NFC);
  assert.equal(decodeCanonical(encodeCanonical(CAFE_NFD)), CAFE_NFD);
  // encodeCanonical itself does NOT normalize -- the two distinct strings
  // produce two distinct encodings, confirming NFC normalization is strictly
  // normalizeCarrier's job, not the codec's.
  assert.notEqual(encodeCanonical(CAFE_NFC).toString("hex"), encodeCanonical(CAFE_NFD).toString("hex"));
});

test("encodeCanonical: nested arrays round-trip structurally", () => {
  const value = [1, [2, [3, [4, []]]], "leaf"];
  assert.deepEqual(decodeCanonical(encodeCanonical(value)), value);
});

test("encodeCanonical: plain objects with non-canonical key order re-sort to canonical (encoded-key-bytes) order on encode", () => {
  const inOrder = { a: 1, b: 2, c: 3 };
  const outOfOrder = { c: 3, a: 1, b: 2 };
  assert.deepEqual(encodeCanonical(inOrder), encodeCanonical(outOfOrder));
  assert.ok(canonicalEqual(inOrder, outOfOrder));
});

test("encodeCanonical: an actual lineage-A Tm value round-trips byte-identically and structurally deepEqual", () => {
  const term = tm.app(tm.lam(tm.var(0)), tm.mark("x"));
  const encoded = encodeCanonical(term);
  const decoded = decodeCanonical(encoded);
  assert.deepEqual(decoded, term);
  // byte-identical: re-encoding the decoded value reproduces the same bytes
  assert.ok(encodeCanonical(decoded).equals(encoded));
});

test("decodeCanonical: rejects non-canonical (non-shortest-form) encodings", () => {
  // Manually construct a non-shortest-form encoding of the integer 0: major
  // type 0 (unsigned int), additional info 24 (one-byte-follows) carrying
  // value 0, which SHOULD have been encoded as the single byte 0x00.
  const nonShortest = Buffer.from([0x18, 0x00]);
  assert.throws(() => decodeCanonical(nonShortest));
});

// ── 2. canonicalEqual ────────────────────────────────────────────────────────

test("canonicalEqual: equal values", () => {
  assert.ok(canonicalEqual(1, 1));
  assert.ok(canonicalEqual("x", "x"));
  assert.ok(canonicalEqual([1, 2], [1, 2]));
  assert.ok(canonicalEqual({ a: 1, b: 2 }, { a: 1, b: 2 }));
});

test("canonicalEqual: differently-ordered-but-equal objects", () => {
  assert.ok(canonicalEqual({ a: 1, b: 2, c: 3 }, { c: 3, b: 2, a: 1 }));
});

test("canonicalEqual: genuinely different values", () => {
  assert.equal(canonicalEqual(1, 2), false);
  assert.equal(canonicalEqual({ a: 1 }, { a: 2 }), false);
  assert.equal(canonicalEqual([1, 2], [1, 2, 3]), false);
  assert.equal(canonicalEqual(tm.mark("x"), tm.mark("y")), false);
});

test("isNiUri: rejects non-URI strings and non-strings", () => {
  assert.equal(isNiUri("not a uri"), false);
  assert.equal(isNiUri(42), false);
  assert.equal(isNiUri(null), false);
});

test("isNiUri: rejects non-canonical base64url pad bits", () => {
  const canonical = rawNiUri(Buffer.alloc(0));
  const nonCanonical = `${canonical.slice(0, -1)}V`;
  assert.equal(isNiUri(canonical), true);
  assert.equal(isNiUri(nonCanonical), false);
  assert.equal(NI_URI.test(nonCanonical), false);
});

// ── 4. package-owned golden vectors and independent invariants ────────────

test("golden vectors: canonical bytes, SHA-256, NI names, and decoding remain stable", () => {
  for (const { label, value, hex, sha256 } of goldenVectors) {
    const expected = Buffer.from(hex, "hex");
    assert.deepEqual(encodeCanonical(value), expected, `${label}: bytes`);
    assert.deepEqual(decodeCanonical(expected), value, `${label}: decode`);
    assert.equal(sha256Hex(value), sha256, `${label}: SHA-256 hex`);
    assert.deepEqual(sha256Bytes(value), Buffer.from(sha256, "hex"), `${label}: SHA-256 bytes`);
    assert.equal(niUri(value), `ni:///sha-256;${Buffer.from(sha256, "hex").toString("base64url")}`, `${label}: NI URI`);
  }
});

test("raw byte naming hashes the bytes themselves rather than their CBOR wrapper", () => {
  const fixtures = [
    { bytes: Buffer.alloc(0), sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
    { bytes: Buffer.from("hello world", "utf8"), sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9" },
    { bytes: Buffer.from([0xff, 0x00, 0xab, 0xcd]), sha256: "064145b73178d7c9fee36e70bb497d618fadb0e8a7f30b8fe7d9761ef1be635c" },
  ];
  for (const { bytes, sha256 } of fixtures) {
    const digest = Buffer.from(sha256, "hex");
    assert.deepEqual(rawSha256Bytes(bytes), digest);
    assert.equal(rawNiUri(bytes), `ni:///sha-256;${digest.toString("base64url")}`);
    assert.notEqual(rawNiUri(bytes), niUri(bytes));
  }
});

test("normalized carrier helpers preserve the released RMN commitments", () => {
  const vectors = [
    { value: sampleTerm, hex: "836361707082636c616d82637661720082646d61726b6178", id: "ni:///sha-256;KoIdziLDEJJJagIpTO1158APdzCHdObZqEBWq4Oy1bw" },
    { value: identity, hex: "82636c616d826376617200", id: "ni:///sha-256;OYXkMnHZDsxkXhpouKBfinN4-qqnzp8PJdT8pxZ3DPc" },
    { value: tm.pair(tm.mark("l"), tm.mark("r")), hex: "83647061697282646d61726b616c82646d61726b6172", id: "ni:///sha-256;4iGIxQuek3CCCn9sP90hkj8Yf6hkvkshMAy_ZidWXdk" },
  ];
  for (const { value, hex, id } of vectors) {
    const bytes = Buffer.from(hex, "hex");
    assert.deepEqual(normalizedCarrierBytes(value), bytes);
    assert.equal(normalizedCarrierNiUri(value), id);
    assert.deepEqual(decodeNormalizedCarrier(bytes), value);
  }
});

// ── 5. normalizeCarrier specifics ───────────────────────────────────────────

test("normalizeCarrier: NFC-normalizes strings and object keys", () => {
  assert.equal(normalizeCarrier(CAFE_NFD), CAFE_NFC);

  const withDecomposedKey = { [CAFE_NFD]: 1 };
  const normalized = normalizeCarrier(withDecomposedKey);
  assert.deepEqual(Object.keys(normalized), [CAFE_NFC]);
  assert.deepEqual(normalized, { [CAFE_NFC]: 1 });
});

test("normalizeCarrier: rejects post-normalization object-key collisions", () => {
  // Two source keys, byte-distinct (NFC vs NFD), that normalize to the same
  // string -- built via computed-property assignment so both keys actually
  // land in the object (a literal with two identical-looking keys would just
  // silently keep the last one, which is not what this test needs).
  const collidingKeys = {};
  collidingKeys[CAFE_NFC] = 1;
  collidingKeys[CAFE_NFD] = 2;
  assert.equal(Object.keys(collidingKeys).length, 2); // confirm the setup: two distinct keys
  assert.throws(() => normalizeCarrier(collidingKeys), /collide/);
});

test("normalizeCarrier: rejects non-safe-integer numbers", () => {
  for (const bad of [1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Infinity, -Infinity]) {
    assert.throws(() => normalizeCarrier(bad), (error) => error.code === "malformed-rmn");
  }
});

test("normalizeCarrier: accepts safe integers and non-string/array/object scalars unchanged", () => {
  for (const value of [0, -1, Number.MAX_SAFE_INTEGER, true, false, null, 10n, Buffer.from([1, 2, 3])]) {
    assert.deepEqual(normalizeCarrier(value), value);
  }
});

test("normalizeCarrier: recurses into arrays and plain objects, including a Tm value", () => {
  const nested = { z: [1, { a: CAFE_NFD }, 2], a: sampleTerm };
  assert.deepEqual(normalizeCarrier(nested), { z: [1, { a: CAFE_NFC }, 2], a: sampleTerm });
});
