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
  semanticBytes,
  semanticId,
  decodeSemantic,
} from "../src/index.mjs";

// Differential source: relation-model-notation-runtime-service is a real,
// current, non-legacy sibling package in this same monorepo (not a `dist`
// build). Its canonical-cbor.mjs is the file this package extracts wholesale;
// its rmn-core.mjs carries the normalizeCarrier/semanticBytes/semanticId/
// decodeSemantic wrapper functions this package also extracts. Every
// representative input below is run through BOTH this package's exports and
// the real runtime-service source, and the outputs must match exactly.
import * as sourceCbor from "../../../../relation-model-notation-runtime-service/src/canonical-cbor.mjs";
import {
  normalizeCarrier as sourceNormalizeCarrier,
  semanticBytes as sourceSemanticBytes,
  semanticId as sourceSemanticId,
  decodeSemantic as sourceDecodeSemantic,
} from "../../../../relation-model-notation-runtime-service/src/rmn-core.mjs";

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

// ── 3. semanticBytes/semanticId/decodeSemantic on a Tm value ───────────────

test("semanticBytes/decodeSemantic: round-trip a Tm value end-to-end", () => {
  const term = sampleTerm;
  const bytes = semanticBytes(term);
  assert.ok(Buffer.isBuffer(bytes));
  assert.deepEqual(decodeSemantic(bytes), term);
});

test("semanticId: mints a well-formed ni:// URI for a Tm value", () => {
  const uri = semanticId(sampleTerm);
  assert.ok(isNiUri(uri));
  assert.ok(NI_URI.test(uri));
  assert.match(uri, /^ni:\/\/\/sha-256;/);
});

test("isNiUri: rejects non-URI strings and non-strings", () => {
  assert.equal(isNiUri("not a uri"), false);
  assert.equal(isNiUri(42), false);
  assert.equal(isNiUri(null), false);
});

// ── 4. differential against relation-model-notation-runtime-service ────────

test("differential / encodeCanonical: matches the runtime-service source across every representative value", () => {
  for (const value of representativeValues) {
    const mine = encodeCanonical(value);
    const theirs = sourceCbor.encodeCanonical(value);
    assert.ok(mine.equals(theirs), `encodeCanonical mismatch for ${JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v)}`);
  }
});

test("differential / decodeCanonical: matches the runtime-service source across every representative value's canonical encoding", () => {
  for (const value of representativeValues) {
    const encoded = encodeCanonical(value);
    assert.deepEqual(decodeCanonical(encoded), sourceCbor.decodeCanonical(encoded));
  }
});

test("differential / canonicalEqual: matches the runtime-service source", () => {
  const pairs = [
    [1, 1], [1, 2],
    [{ a: 1, b: 2 }, { b: 2, a: 1 }],
    [tm.mark("x"), tm.mark("x")],
    [tm.mark("x"), tm.mark("y")],
  ];
  for (const [left, right] of pairs) {
    assert.equal(canonicalEqual(left, right), sourceCbor.canonicalEqual(left, right));
  }
});

test("differential / sha256Bytes, niUri, sha256Hex: match the runtime-service source across every representative value", () => {
  for (const value of representativeValues) {
    assert.ok(sha256Bytes(value).equals(sourceCbor.sha256Bytes(value)));
    assert.equal(niUri(value), sourceCbor.niUri(value));
    assert.equal(sha256Hex(value), sourceCbor.sha256Hex(value));
  }
});

test("differential / rawSha256Bytes, rawNiUri: match the runtime-service source over raw byte strings", () => {
  const buffers = [Buffer.from([]), Buffer.from([0x00]), Buffer.from("hello world", "utf8"), Buffer.from([0xff, 0x00, 0xab, 0xcd])];
  for (const bytes of buffers) {
    assert.ok(rawSha256Bytes(bytes).equals(sourceCbor.rawSha256Bytes(bytes)));
    assert.equal(rawNiUri(bytes), sourceCbor.rawNiUri(bytes));
  }
});

test("differential / semanticBytes, semanticId, decodeSemantic: match the runtime-service source for a Tm value", () => {
  for (const term of [sampleTerm, identity, tm.pair(tm.mark("l"), tm.mark("r")), tm.mark("x")]) {
    assert.ok(semanticBytes(term).equals(sourceSemanticBytes(term)));
    assert.equal(semanticId(term), sourceSemanticId(term));
    const bytes = semanticBytes(term);
    assert.deepEqual(decodeSemantic(bytes), sourceDecodeSemantic(bytes));
  }
});

// ── 5. normalizeCarrier specifics ───────────────────────────────────────────

test("normalizeCarrier: NFC-normalizes strings and object keys, matching the runtime-service source", () => {
  assert.equal(normalizeCarrier(CAFE_NFD), CAFE_NFC);
  assert.equal(normalizeCarrier(CAFE_NFD), sourceNormalizeCarrier(CAFE_NFD));

  const withDecomposedKey = { [CAFE_NFD]: 1 };
  const normalized = normalizeCarrier(withDecomposedKey);
  assert.deepEqual(Object.keys(normalized), [CAFE_NFC]);
  assert.deepEqual(normalized, sourceNormalizeCarrier(withDecomposedKey));
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
  assert.throws(() => sourceNormalizeCarrier(collidingKeys), /collide/);
});

test("normalizeCarrier: rejects non-safe-integer numbers, matching the runtime-service source", () => {
  for (const bad of [1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Infinity, -Infinity]) {
    assert.throws(() => normalizeCarrier(bad));
    assert.throws(() => sourceNormalizeCarrier(bad));
  }
});

test("normalizeCarrier: accepts safe integers and non-string/array/object scalars unchanged, matching the runtime-service source", () => {
  for (const value of [0, -1, Number.MAX_SAFE_INTEGER, true, false, null, 10n, Buffer.from([1, 2, 3])]) {
    const mine = normalizeCarrier(value);
    const theirs = sourceNormalizeCarrier(value);
    assert.deepEqual(mine, theirs);
  }
});

test("normalizeCarrier: recurses into arrays and plain objects, matching the runtime-service source, including a Tm value", () => {
  const nested = { z: [1, { a: CAFE_NFD }, 2], a: sampleTerm };
  assert.deepEqual(normalizeCarrier(nested), sourceNormalizeCarrier(nested));
});
