import assert from "node:assert/strict";
import test from "node:test";
import { allocateSettlementEnergy } from "../src/energy/settlement-allocation.mjs";

const START = "2026-10-13T00:00:00.000Z";
const MIDDLE = "2026-10-13T00:00:05.000Z";
const END = "2026-10-13T00:00:10.000Z";
const conversionFactors = { cpuSecondsToJoules: { value: "65", sourceUrl: "https://meter.example/factor", asOf: "2026-10-13" } };
const row = (rowId, intervalStart = START, intervalEnd = END) => ({ rowId, intervalStart, intervalEnd });
const meter = (intervalStart = START, intervalEnd = END) => ({
  type: "bare-cedar-fog.resource-metering/unit-resource-consumed", version: 1,
  host: "bare-cedar-fog", unit: "example.service", provider: "bare-cedar-fog", actor: "example.service",
  intervalStart, intervalEnd, derivedFrom: {},
  price: { denomination: { kind: "resource", asset: "cpu-seconds", unit: "second" }, amount: { numerator: "2", denominator: "1" } },
});
const allocate = (settledRows, resourceReceipts) => allocateSettlementEnergy({ settledRows, resourceReceipts, conversionFactors, boundary: ["hosts"] });

test("a whole meter interval is converted once and retains its unchanged source", () => {
  const source = meter();
  const result = allocate([row("one")], [source]);
  assert.equal(result.receipts.length, 1);
  assert.equal(result.receipts[0].joules, "130");
  assert.deepEqual(result.unmatchedRowIds, []);
  assert.deepEqual(result.receipts[0].sourceReceipts, [source]);
});

test("one aggregate meter interval cannot be charged in full to two settlement rows", () => {
  const source = meter();
  const result = allocate([row("first", START, MIDDLE), row("second", MIDDLE, END)], [source]);
  assert.equal(result.refused, true);
  assert.equal(result.reason, "resource-attribution-ambiguous");
  assert.deepEqual(result.rowIds, ["first", "second"]);
  assert.deepEqual(result.sourceReceipts, [source]);
  assert.equal("joules" in result, false);
  assert.equal("receipts" in result, false);
});

test("partial interval overlap supplies no distribution law and remains unresolved", () => {
  const source = meter();
  const result = allocate([row("first", START, MIDDLE)], [source]);
  assert.equal(result.reason, "resource-interval-not-contained");
  assert.deepEqual(result.sourceReceipts, [source]);
});

test("granular independently metered intervals allocate to adjacent half-open rows", () => {
  const result = allocate([row("first", START, MIDDLE), row("second", MIDDLE, END)], [meter(START, MIDDLE), meter(MIDDLE, END)]);
  assert.deepEqual(result.receipts.map(({ rowId, joules }) => ({ rowId, joules })), [
    { rowId: "first", joules: "130" }, { rowId: "second", joules: "130" },
  ]);
});

test("adjacent receipts establish unknown consumption for the row, never zero", () => {
  assert.deepEqual(allocate([row("first", START, MIDDLE)], [meter(MIDDLE, END)]), { receipts: [], unmatchedRowIds: ["first"] });
});

test("repeated meter witnesses cannot multiply resource consumption", () => {
  const source = meter();
  const reordered = Object.fromEntries(Object.entries(structuredClone(source)).reverse());
  const result = allocate([row("one")], [source, reordered]);
  assert.equal(result.reason, "duplicate-resource-receipt");
  assert.equal("receipts" in result, false);
  assert.deepEqual(result.sourceReceipts, [reordered]);
});

test("a row's explicit actor or unit identity cannot borrow another actor's meter", () => {
  for (const field of ["actor", "unit"]) {
    const result = allocate([{ ...row("one"), [field]: "other.service" }], [meter()]);
    assert.equal(result.reason, "resource-owner-disagreement");
  }
});

test("interval comparison respects the instant rather than the UTC-offset spelling", () => {
  const source = meter("2026-10-12T19:00:00.000-05:00", "2026-10-12T19:00:10.000-05:00");
  assert.equal(allocate([row("one")], [source]).receipts[0].joules, "130");
});

test("duplicate row identities and nonpositive or malformed intervals are refused before allocation", () => {
  assert.throws(() => allocate([row("one"), row("one")], [meter()]), /identities must be unique/u);
  assert.throws(() => allocate([row("one", END, START)], [meter()]), /positive dated interval/u);
  assert.throws(() => allocate([row("one")], [meter(START, START)]), /positive dated interval/u);
  assert.throws(() => allocate([row("one")], [meter("unknown", END)]), /explicit dated instants/u);
});

test("unsupported timestamp precision cannot turn a partial source interval into a contained one", () => {
  assert.throws(() => allocate([row("one")], [meter(START, "2026-10-13T00:00:10.000001Z")]), /millisecond precision/u);
  assert.equal(allocate([row("one")], [meter("2026-10-13T00:00:00.000000Z", "2026-10-13T00:00:10.000000Z")]).receipts[0].joules, "130");
});

test("a resource without a declared energy conversion is still unknown", () => {
  const memory = meter();
  memory.price.denomination = { kind: "resource", asset: "memory-peak-bytes", unit: "byte" };
  assert.deepEqual(allocate([row("one")], [memory]), { refused: true, reason: "no-conversion-factor-for-asset", asset: "memory-peak-bytes" });
});
