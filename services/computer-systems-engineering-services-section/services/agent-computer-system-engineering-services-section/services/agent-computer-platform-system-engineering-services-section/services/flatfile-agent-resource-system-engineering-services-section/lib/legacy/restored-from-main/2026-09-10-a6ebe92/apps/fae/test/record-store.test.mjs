import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import test from "node:test";
import { getRecord, putRecord } from "../src/kernel/record-store.mjs";
import { makeTempRoot } from "./support/temp-root.mjs";

function withTempRoot(fn) {
  const root = makeTempRoot("fars-record-store-");
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("getRecord on an id never put returns null", () => {
  withTempRoot((root) => {
    assert.equal(getRecord(root, "ni:///sha-256;" + "A".repeat(43)), null);
  });
});

test("putRecord then getRecord round-trips a record's full body, keyed by its own id", () => {
  withTempRoot((root) => {
    const record = {
      type: "Witness",
      id: "ni:///sha-256;" + "B".repeat(43),
      operator: "fm_set",
      target: "concepts/alpha.md",
      before_digest: "ni:///sha-256;" + "C".repeat(43),
      after_digest: "ni:///sha-256;" + "D".repeat(43),
      details: { key: "status", value: "stable" },
      agent: null,
      timestamp: "2026-08-19T00:00:00Z",
      kind: "compose",
      four_before: [false, false],
      four_after: [true, false],
      channel: "substrate",
      conveys_authority: false,
    };
    putRecord(root, record);
    assert.deepEqual(getRecord(root, record.id), record);
  });
});

test("putRecord is idempotent across repeated writes of the same id", () => {
  withTempRoot((root) => {
    const record = { type: "Witness", id: "ni:///sha-256;" + "E".repeat(43), operator: "fm_add", target: "x" };
    putRecord(root, record);
    putRecord(root, record);
    assert.deepEqual(getRecord(root, record.id), record);
  });
});

test("distinct record ids never collide on disk", () => {
  withTempRoot((root) => {
    const a = { type: "Witness", id: "ni:///sha-256;" + "F".repeat(43), operator: "fm_add", target: "x" };
    const b = { type: "Witness", id: "ni:///sha-256;" + "G".repeat(43), operator: "fm_add", target: "y" };
    putRecord(root, a);
    putRecord(root, b);
    assert.deepEqual(getRecord(root, a.id), a);
    assert.deepEqual(getRecord(root, b.id), b);
  });
});
