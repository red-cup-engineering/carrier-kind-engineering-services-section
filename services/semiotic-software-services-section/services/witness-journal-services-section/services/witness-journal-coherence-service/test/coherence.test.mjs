import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cohere,
  cohereLog,
  assertCoherent,
  assertLogCoherent,
} from "@red-cup-engineering/witness-journal-coherence";
import { readingAsLogReading } from "@red-cup-engineering/wire-form-round-trip-check";

const witnessA = { e: "alpha", a: "warm", v: true, t: 1 };
const witnessB = { e: "beta", a: "warm", v: false, t: 2 };

const jsonStringReading = {
  id: "test.json-string",
  toWire: (witness) => JSON.stringify(witness),
  fromWire: (wire) => JSON.parse(wire),
};

const tupleReading = {
  id: "test.tuple",
  toWire: (witness) => [witness.e, witness.a, witness.v, witness.t],
  fromWire: ([e, a, v, t]) => ({ e, a, v, t }),
};

const lossyReading = {
  id: "test.lossy",
  toWire: (witness) => ({ e: witness.e, a: witness.a, t: witness.t }),
  fromWire: (wire) => ({ ...wire, v: null }),
};

describe("cohere", () => {
  it("reports ok:true for two independent lossless readings on the same witness", () => {
    const report = cohere(jsonStringReading, tupleReading, witnessA);
    assert.equal(report.kind, "witness-journal.coherence");
    assert.equal(report.left, "test.json-string");
    assert.equal(report.right, "test.tuple");
    assert.equal(report.leftIso, true);
    assert.equal(report.rightIso, true);
    assert.equal(report.leftToRight, true);
    assert.equal(report.rightToLeft, true);
    assert.equal(report.ok, true);
  });

  it("reports ok:false when one reading loses information", () => {
    const report = cohere(jsonStringReading, lossyReading, witnessA);
    assert.equal(report.rightIso, false);
    assert.equal(report.ok, false);
  });

  it("carries the admitted EAVT witness in the report", () => {
    const report = cohere(jsonStringReading, tupleReading, witnessB);
    assert.equal(report.witness.e, "beta");
  });
});

describe("assertCoherent", () => {
  it("returns the report when coherent", () => {
    const report = assertCoherent(jsonStringReading, tupleReading, witnessA);
    assert.equal(report.ok, true);
  });

  it("throws when the readings do not cohere", () => {
    assert.throws(() => assertCoherent(jsonStringReading, lossyReading, witnessA), /do not cohere/);
  });
});

describe("cohereLog / assertLogCoherent", () => {
  it("reports ok:true for two independent lossless log readings on the same log", () => {
    const left = readingAsLogReading(jsonStringReading);
    const right = readingAsLogReading(tupleReading);
    const report = cohereLog(left, right, [witnessA]);
    assert.equal(report.kind, "witness-journal.log-coherence");
    assert.equal(report.ok, true);
    assert.equal(report.witnessLog.length, 1);
  });

  it("assertLogCoherent throws when readings disagree", () => {
    const left = readingAsLogReading(jsonStringReading);
    const right = readingAsLogReading(lossyReading);
    assert.throws(() => assertLogCoherent(left, right, [witnessA]), /do not cohere/);
  });
});
