import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { identityOfRecord } from "../src/kernel/identity.mjs";
import { makeWitness, validateWitness } from "../src/kernel/witness.mjs";

const VECTORS_PATH = fileURLToPath(new URL("../../../lib/conformance/record-vectors.json", import.meta.url));
const { vectors } = JSON.parse(readFileSync(VECTORS_PATH, "utf8"));
const VECTOR = vectors.find((vector) => vector.type === "Witness");

test("shared vector: valid Witness is accepted and id round-trips", () => {
  const record = VECTOR.valid;
  assert.equal(validateWitness(record), record);
  assert.equal(record.id, identityOfRecord(record));
});

test("shared vector: tampered Witness is a content identity mismatch", () => {
  assert.throws(() => validateWitness(VECTOR.invalid), /content identity mismatch/);
});

test("makeWitness constructs a Witness that round-trips its own id", () => {
  const witness = makeWitness({
    operator: "fm_add",
    target: "concepts/alpha.md",
    before_digest: null,
    after_digest: `sha256:${"a".repeat(64)}`,
    details: { field: "depends-on" },
    agent: "morgan",
    timestamp: "2026-08-19T00:00:00Z",
    kind: "mutation",
    four_before: [false, false],
    four_after: [true, false],
    channel: "substrate",
  });
  assert.equal(witness.id, identityOfRecord(witness));
  assert.equal(validateWitness(witness), witness);
});

test("makeWitness rejects a two-bit jump before minting anything", () => {
  assert.throws(
    () =>
      makeWitness({
        operator: "fm_add",
        target: "concepts/alpha.md",
        before_digest: null,
        after_digest: null,
        details: {},
        agent: "morgan",
        timestamp: "2026-08-19T00:00:00Z",
        kind: "mutation",
        four_before: [false, false],
        four_after: [true, true],
        channel: "substrate",
      }),
    { code: "not-one-wit" },
  );
});

test("makeWitness rejects a decrement before minting anything", () => {
  assert.throws(
    () =>
      makeWitness({
        operator: "fm_remove",
        target: "concepts/alpha.md",
        before_digest: null,
        after_digest: null,
        details: {},
        agent: "morgan",
        timestamp: "2026-08-19T00:00:00Z",
        kind: "mutation",
        four_before: [true, false],
        four_after: [false, false],
        channel: "substrate",
      }),
    { code: "not-one-wit" },
  );
});

test("makeWitness rejects a no-op transition before minting anything", () => {
  assert.throws(
    () =>
      makeWitness({
        operator: "fm_add",
        target: "concepts/alpha.md",
        before_digest: null,
        after_digest: null,
        details: {},
        agent: "morgan",
        timestamp: "2026-08-19T00:00:00Z",
        kind: "mutation",
        four_before: [false, false],
        four_after: [false, false],
        channel: "substrate",
      }),
    { code: "not-one-wit" },
  );
});

test("missing conveys_authority fails validation", () => {
  const { conveys_authority, ...record } = VECTOR.valid;
  assert.throws(() => validateWitness(record), /conveys_authority/);
});

test("conveys_authority: true is rejected", () => {
  const record = { ...VECTOR.valid, conveys_authority: true };
  assert.throws(() => validateWitness(record), /must be False/);
});

test("an invalid operation kind is rejected", () => {
  const record = { ...VECTOR.valid, kind: "not-a-real-kind" };
  assert.throws(() => validateWitness(record), /invalid operation kind/);
});

test("a non-Witness type is rejected", () => {
  assert.throws(() => validateWitness({ type: "Office" }), /not a Witness record/);
});
