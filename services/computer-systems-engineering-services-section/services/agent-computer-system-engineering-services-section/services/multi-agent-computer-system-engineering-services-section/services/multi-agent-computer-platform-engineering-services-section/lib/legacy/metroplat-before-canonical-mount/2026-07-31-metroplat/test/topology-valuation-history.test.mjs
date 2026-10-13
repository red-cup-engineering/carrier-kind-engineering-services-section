import test from "node:test";
import assert from "node:assert/strict";

import {
  moduleTopologyValuationHistoryOfStages,
  moduleTopologyValuationHistoryContract,
} from "../src/monitoring/source-code/topology/history.mts";

function stage(overrides = {}) {
  return Object.freeze({
    source: "test-source",
    observation: `obs-${Math.random().toString(36).slice(2)}`,
    at: new Date().toISOString(),
    invocation: "inv-1",
    receipt: "rec-1",
    causes: Object.freeze([]),
    summary: Object.freeze({ held: 0, denied: 0, contested: 0, unknown: 0 }),
    ...overrides,
  });
}

const TODAY = "2026-07-16";

test("moduleTopologyValuationHistoryOfStages emits the correct kind", () => {
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 0, malformed: 0, stages: [] });
  assert.equal(result.kind, "metroplat.monitoring.source-code.module-topology-valuation-history");
});

test("moduleTopologyValuationHistoryOfStages output passes its own contract", () => {
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 5, malformed: 0, stages: [] });
  assert.doesNotThrow(() => {
    moduleTopologyValuationHistoryContract.assert(result, "history contract");
  });
});

test("moduleTopologyValuationHistoryOfStages carries dates and counts through", () => {
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 7, malformed: 1, stages: [] });
  assert.deepEqual(result.dates, [TODAY]);
  assert.equal(result.rows, 7);
  assert.equal(result.malformed, 1);
  assert.equal(result.observations, 0);
});

test("moduleTopologyValuationHistoryOfStages orders stages by at then receipt", () => {
  const s1 = stage({ observation: "obs-A", at: "2026-07-16T10:00:00.000Z", receipt: "rec-A" });
  const s2 = stage({ observation: "obs-B", at: "2026-07-16T09:00:00.000Z", receipt: "rec-B" });
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 2, malformed: 0, stages: [s1, s2] });
  // s2 is earlier, so it should come first
  assert.equal(result.stages[0]?.observation, "obs-B");
  assert.equal(result.stages[1]?.observation, "obs-A");
});

test("moduleTopologyValuationHistoryOfStages deduplicates consecutive identical observations", () => {
  const sharedObs = "obs-same";
  const s1 = stage({ observation: sharedObs, at: "2026-07-16T09:00:00.000Z", receipt: "rec-1" });
  const s2 = stage({ observation: sharedObs, at: "2026-07-16T10:00:00.000Z", receipt: "rec-2" });
  const s3 = stage({ observation: "obs-other", at: "2026-07-16T11:00:00.000Z", receipt: "rec-3" });
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 3, malformed: 0, stages: [s1, s2, s3] });
  assert.equal(result.stages.length, 2);
  assert.equal(result.observations, 3); // counts all before dedup
});

test("moduleTopologyValuationHistoryOfStages produces no transitions for a single stage", () => {
  const s = stage({ observation: "obs-only", at: "2026-07-16T09:00:00.000Z", receipt: "rec-1", summary: { held: 5, denied: 0, contested: 0, unknown: 2 } });
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 1, malformed: 0, stages: [s] });
  assert.equal(result.transitions.length, 0);
  assert.equal(result.stages.length, 1);
});

test("moduleTopologyValuationHistoryOfStages produces one transition for two distinct stages", () => {
  const s1 = stage({ observation: "obs-A", at: "2026-07-16T09:00:00.000Z", receipt: "rec-A", summary: { held: 5, denied: 0, contested: 0, unknown: 0 } });
  const s2 = stage({ observation: "obs-B", at: "2026-07-16T10:00:00.000Z", receipt: "rec-B", summary: { held: 7, denied: 0, contested: 0, unknown: 0 } });
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 2, malformed: 0, stages: [s1, s2] });
  assert.equal(result.transitions.length, 1);
  const t = result.transitions[0];
  assert.equal(t?.from, "obs-A");
  assert.equal(t?.to, "obs-B");
});

test("transition knowledge and truth: held increases → truth ascending", () => {
  // pos = held, neg = denied + contested
  // from: pos=3, neg=0 → to: pos=5, neg=0 → pos up, neg same → truth ascending
  const s1 = stage({ observation: "obs-A", at: "2026-07-16T09:00:00.000Z", receipt: "rec-A", summary: { held: 3, denied: 0, contested: 0, unknown: 0 } });
  const s2 = stage({ observation: "obs-B", at: "2026-07-16T10:00:00.000Z", receipt: "rec-B", summary: { held: 5, denied: 0, contested: 0, unknown: 0 } });
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 2, malformed: 0, stages: [s1, s2] });
  const t = result.transitions[0];
  assert.ok(t, "expected a transition");
  assert.equal(t.truth, "ascending", "more held modules → truth ascending");
  assert.equal(t.knowledge, "ascending", "more observed evidence → knowledge ascending");
});

test("transition truth: denied increases → truth descending", () => {
  // from: pos=5, neg=0 → to: pos=5, neg=2 → pos same, neg up → truth descending
  const s1 = stage({ observation: "obs-A", at: "2026-07-16T09:00:00.000Z", receipt: "rec-A", summary: { held: 5, denied: 0, contested: 0, unknown: 0 } });
  const s2 = stage({ observation: "obs-B", at: "2026-07-16T10:00:00.000Z", receipt: "rec-B", summary: { held: 5, denied: 2, contested: 0, unknown: 0 } });
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 2, malformed: 0, stages: [s1, s2] });
  const t = result.transitions[0];
  assert.ok(t, "expected a transition");
  assert.equal(t.truth, "descending", "more denied modules → truth descending (regression)");
});

test("transition truth: held up and denied up → incomparable (paraconsistent co-movement)", () => {
  // from: pos=2, neg=1 → to: pos=4, neg=3 → pos up, neg up → knowledge ascending, truth incomparable
  const s1 = stage({ observation: "obs-A", at: "2026-07-16T09:00:00.000Z", receipt: "rec-A", summary: { held: 2, denied: 1, contested: 0, unknown: 0 } });
  const s2 = stage({ observation: "obs-B", at: "2026-07-16T10:00:00.000Z", receipt: "rec-B", summary: { held: 4, denied: 3, contested: 0, unknown: 0 } });
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 2, malformed: 0, stages: [s1, s2] });
  const t = result.transitions[0];
  assert.ok(t, "expected a transition");
  assert.equal(t.knowledge, "ascending", "both evidence dimensions up → knowledge ascending");
  assert.equal(t.truth, "incomparable", "pos up AND neg up → paraconsistent incomparable");
});

test("transition: contested modules count as negative mass (neg evidence)", () => {
  // Contested contributes to neg. from: pos=3, neg=0 → to: pos=3, neg=2 (contested increases)
  const s1 = stage({ observation: "obs-A", at: "2026-07-16T09:00:00.000Z", receipt: "rec-A", summary: { held: 3, denied: 0, contested: 0, unknown: 0 } });
  const s2 = stage({ observation: "obs-B", at: "2026-07-16T10:00:00.000Z", receipt: "rec-B", summary: { held: 3, denied: 0, contested: 2, unknown: 0 } });
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 2, malformed: 0, stages: [s1, s2] });
  const t = result.transitions[0];
  assert.ok(t, "expected a transition");
  assert.equal(t.truth, "descending", "rising contested modules → truth descending (neg mass up)");
});

test("moduleTopologyValuationHistoryOfStages respects maxStages bound", () => {
  const stages = Array.from({ length: 10 }, (_, i) => stage({
    observation: `obs-${i}`,
    at: `2026-07-16T${String(i).padStart(2, "0")}:00:00.000Z`,
    receipt: `rec-${i}`,
  }));
  const result = moduleTopologyValuationHistoryOfStages([TODAY], { rows: 10, malformed: 0, stages }, { maxStages: 5 });
  assert.equal(result.stages.length, 5);
  // Should keep the most recent 5
  assert.equal(result.stages[0]?.observation, "obs-5");
  assert.equal(result.stages[4]?.observation, "obs-9");
});

test("moduleTopologyValuationHistoryOfStages rejects invalid dates", () => {
  assert.throws(() => {
    moduleTopologyValuationHistoryOfStages([], { rows: 0, malformed: 0, stages: [] });
  });
  assert.throws(() => {
    moduleTopologyValuationHistoryOfStages(["not-a-date"], { rows: 0, malformed: 0, stages: [] });
  });
});
