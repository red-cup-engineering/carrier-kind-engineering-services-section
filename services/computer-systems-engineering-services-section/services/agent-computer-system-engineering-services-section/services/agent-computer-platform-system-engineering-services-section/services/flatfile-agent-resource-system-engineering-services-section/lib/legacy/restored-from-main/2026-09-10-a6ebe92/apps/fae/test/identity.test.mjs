import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { identity, identityOfRecord } from "../src/kernel/identity.mjs";

const VECTORS_PATH = fileURLToPath(new URL(
  "../../../lib/conformance/identity-vectors.json",
  import.meta.url
));
const { vectors, recordVectors } = JSON.parse(readFileSync(VECTORS_PATH, "utf8"));

test("identity matches the recorded conformance vectors", () => {
  for (const { name, value, ni } of vectors) {
    assert.equal(identity(value), ni, `vector ${name}`);
  }
});

test("identityOfRecord matches the recorded conformance vectors", () => {
  for (const { name, body, ni } of recordVectors) {
    assert.equal(identityOfRecord(body), ni, `vector ${name}`);
  }
});

test("identity returns a well-formed sha-256 ni: URI", () => {
  assert.match(identity({ a: 1 }), /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
});

test("identity is deterministic and insensitive to key order", () => {
  assert.equal(identity({ a: 1, b: 2 }), identity({ b: 2, a: 1 }));
  assert.equal(identity({ a: 1, b: 2 }), identity({ a: 1, b: 2 }));
});

test("identity NFC-normalizes strings before hashing", () => {
  const nfc = "café";
  const nfd = "café";
  assert.notEqual(nfc, nfd);
  assert.equal(identity({ name: nfc }), identity({ name: nfd }));
});

test("identity distinguishes a mutated body", () => {
  assert.notEqual(identity({ a: 1 }), identity({ a: 2 }));
  assert.notEqual(identity({ a: 1 }), identity({ a: 1, b: 1 }));
});

test("identity rejects non-safe-integer numbers", () => {
  assert.throws(() => identity({ a: 1.5 }), /safe integers/);
  assert.throws(() => identity({ a: Number.MAX_SAFE_INTEGER + 1 }), /safe integers/);
});

test("identity rejects NFC key collisions", () => {
  assert.throws(() => identity({ "café": 1, "café": 2 }), /collide/);
});

test("identityOfRecord excludes the top-level id from identity", () => {
  const withId = identityOfRecord({ id: "some-opaque-address", a: 1 });
  const withDifferentId = identityOfRecord({ id: "a-different-address", a: 1 });
  const withoutId = identityOfRecord({ a: 1 });
  assert.equal(withId, withDifferentId);
  assert.equal(withId, withoutId);
});

test("identityOfRecord still reflects a change to the rest of the body", () => {
  assert.notEqual(
    identityOfRecord({ id: "x", a: 1 }),
    identityOfRecord({ id: "x", a: 2 })
  );
});

test("identityOfRecord rejects a non-object body", () => {
  assert.throws(() => identityOfRecord(null), TypeError);
  assert.throws(() => identityOfRecord([1, 2]), TypeError);
  assert.throws(() => identityOfRecord("not-an-object"), TypeError);
});
