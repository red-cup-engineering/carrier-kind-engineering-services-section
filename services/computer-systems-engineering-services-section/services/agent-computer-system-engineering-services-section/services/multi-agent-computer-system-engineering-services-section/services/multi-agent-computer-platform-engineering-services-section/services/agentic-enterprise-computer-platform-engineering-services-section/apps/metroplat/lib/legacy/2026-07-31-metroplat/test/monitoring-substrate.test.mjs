/**
 * Tests for the domain-neutral monitoring substrate:
 * joinChargesKnowledge, fourCensusOf, chargeEvidence (valuation),
 * recordHistoryOfStages, recordKnowledgeRelation, recordTruthRelation (history),
 * subsystemEntry, readMonitorAggregate (aggregate).
 *
 * These tests exercise the substrate primitives directly — no source-code-specific
 * types or evaluation stubs are needed.  That's the point.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  joinChargesKnowledge,
  fourCensusOf,
  chargeEvidence,
  recordHistoryOfStages,
  recordKnowledgeRelation,
  recordTruthRelation,
  subsystemEntry,
  readMonitorAggregate,
} from "../src/monitoring/substrate/index.mts";

const TODAY = "2026-07-16";

// ---------------------------------------------------------------------------
// chargeEvidence
// ---------------------------------------------------------------------------

test("chargeEvidence: held → pos=1 neg=0", () => {
  const e = chargeEvidence("held");
  assert.equal(e.pos, 1);
  assert.equal(e.neg, 0);
});

test("chargeEvidence: denied → pos=0 neg=1", () => {
  const e = chargeEvidence("denied");
  assert.equal(e.pos, 0);
  assert.equal(e.neg, 1);
});

test("chargeEvidence: contested → pos=1 neg=1", () => {
  const e = chargeEvidence("contested");
  assert.equal(e.pos, 1);
  assert.equal(e.neg, 1);
});

test("chargeEvidence: unknown → pos=0 neg=0", () => {
  const e = chargeEvidence("unknown");
  assert.equal(e.pos, 0);
  assert.equal(e.neg, 0);
});

// ---------------------------------------------------------------------------
// joinChargesKnowledge
// ---------------------------------------------------------------------------

test("joinChargesKnowledge: empty → unknown", () => {
  assert.equal(joinChargesKnowledge([]), "unknown");
});

test("joinChargesKnowledge: [held] → held", () => {
  assert.equal(joinChargesKnowledge(["held"]), "held");
});

test("joinChargesKnowledge: [denied] → denied", () => {
  assert.equal(joinChargesKnowledge(["denied"]), "denied");
});

test("joinChargesKnowledge: [contested] → contested", () => {
  assert.equal(joinChargesKnowledge(["contested"]), "contested");
});

test("joinChargesKnowledge: [unknown] → unknown", () => {
  assert.equal(joinChargesKnowledge(["unknown"]), "unknown");
});

test("joinChargesKnowledge: [held, denied] → contested (cross-join)", () => {
  assert.equal(joinChargesKnowledge(["held", "denied"]), "contested");
});

test("joinChargesKnowledge: [denied, held] → contested (commutative)", () => {
  assert.equal(joinChargesKnowledge(["denied", "held"]), "contested");
});

test("joinChargesKnowledge: [held, held] → held", () => {
  assert.equal(joinChargesKnowledge(["held", "held"]), "held");
});

test("joinChargesKnowledge: [denied, denied] → denied", () => {
  assert.equal(joinChargesKnowledge(["denied", "denied"]), "denied");
});

test("joinChargesKnowledge: [unknown, held] → held (identity of unknown)", () => {
  assert.equal(joinChargesKnowledge(["unknown", "held"]), "held");
});

test("joinChargesKnowledge: [unknown, denied] → denied (identity of unknown)", () => {
  assert.equal(joinChargesKnowledge(["unknown", "denied"]), "denied");
});

test("joinChargesKnowledge: [unknown, unknown] → unknown", () => {
  assert.equal(joinChargesKnowledge(["unknown", "unknown"]), "unknown");
});

test("joinChargesKnowledge: contested absorbs anything", () => {
  for (const other of ["held", "denied", "contested", "unknown"]) {
    assert.equal(joinChargesKnowledge(["contested", other]), "contested",
      `contested + ${other} should remain contested`);
    assert.equal(joinChargesKnowledge([other, "contested"]), "contested",
      `${other} + contested should remain contested`);
  }
});

test("joinChargesKnowledge: commutativity for all pairs", () => {
  const charges = ["held", "denied", "contested", "unknown"];
  for (const a of charges) {
    for (const b of charges) {
      assert.equal(
        joinChargesKnowledge([a, b]),
        joinChargesKnowledge([b, a]),
        `join([${a},${b}]) should equal join([${b},${a}])`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// fourCensusOf
// ---------------------------------------------------------------------------

test("fourCensusOf: empty array → all zeros", () => {
  const c = fourCensusOf([]);
  assert.equal(c.held, 0);
  assert.equal(c.denied, 0);
  assert.equal(c.contested, 0);
  assert.equal(c.unknown, 0);
});

test("fourCensusOf: counts each charge class correctly", () => {
  const entries = [
    { charge: "held" },
    { charge: "held" },
    { charge: "denied" },
    { charge: "contested" },
    { charge: "unknown" },
    { charge: "unknown" },
  ];
  const c = fourCensusOf(entries);
  assert.equal(c.held, 2);
  assert.equal(c.denied, 1);
  assert.equal(c.contested, 1);
  assert.equal(c.unknown, 2);
});

test("fourCensusOf: all held", () => {
  const c = fourCensusOf([{ charge: "held" }, { charge: "held" }, { charge: "held" }]);
  assert.equal(c.held, 3);
  assert.equal(c.denied + c.contested + c.unknown, 0);
});

// ---------------------------------------------------------------------------
// recordKnowledgeRelation
// ---------------------------------------------------------------------------

test("recordKnowledgeRelation: equal records → equal", () => {
  const r = { kind: "evidence.record", pos: 3, neg: 2 };
  assert.equal(recordKnowledgeRelation(r, r), "equal");
});

test("recordKnowledgeRelation: both dimensions increase → ascending", () => {
  const left = { kind: "evidence.record", pos: 1, neg: 1 };
  const right = { kind: "evidence.record", pos: 2, neg: 2 };
  assert.equal(recordKnowledgeRelation(left, right), "ascending");
});

test("recordKnowledgeRelation: both dimensions decrease → descending", () => {
  const left = { kind: "evidence.record", pos: 3, neg: 3 };
  const right = { kind: "evidence.record", pos: 1, neg: 1 };
  assert.equal(recordKnowledgeRelation(left, right), "descending");
});

test("recordKnowledgeRelation: pos up neg down → incomparable", () => {
  const left = { kind: "evidence.record", pos: 1, neg: 3 };
  const right = { kind: "evidence.record", pos: 3, neg: 1 };
  assert.equal(recordKnowledgeRelation(left, right), "incomparable");
});

// ---------------------------------------------------------------------------
// recordTruthRelation
// ---------------------------------------------------------------------------

test("recordTruthRelation: pos up neg same → ascending (improving)", () => {
  const left = { kind: "evidence.record", pos: 2, neg: 1 };
  const right = { kind: "evidence.record", pos: 4, neg: 1 };
  assert.equal(recordTruthRelation(left, right), "ascending");
});

test("recordTruthRelation: pos same neg up → descending (regression)", () => {
  const left = { kind: "evidence.record", pos: 2, neg: 1 };
  const right = { kind: "evidence.record", pos: 2, neg: 3 };
  assert.equal(recordTruthRelation(left, right), "descending");
});

test("recordTruthRelation: pos up neg up → incomparable", () => {
  const left = { kind: "evidence.record", pos: 1, neg: 1 };
  const right = { kind: "evidence.record", pos: 3, neg: 3 };
  assert.equal(recordTruthRelation(left, right), "incomparable");
});

// ---------------------------------------------------------------------------
// recordHistoryOfStages
// ---------------------------------------------------------------------------

function stage(overrides = {}) {
  return Object.freeze({
    observation: `obs-${Math.random().toString(36).slice(2)}`,
    at: "2026-07-16T10:00:00.000Z",
    receipt: "rec-1",
    pos: 0,
    neg: 0,
    ...overrides,
  });
}

function recordOf(s) {
  return { kind: "evidence.record", pos: s.pos ?? 0, neg: s.neg ?? 0 };
}

test("recordHistoryOfStages: empty stages → no stages no transitions", () => {
  const h = recordHistoryOfStages([TODAY], [], recordOf);
  assert.equal(h.stages.length, 0);
  assert.equal(h.transitions.length, 0);
  assert.equal(h.observations, 0);
});

test("recordHistoryOfStages: single stage → no transitions", () => {
  const s = stage({ observation: "obs-a", at: "2026-07-16T09:00:00.000Z", receipt: "r1" });
  const h = recordHistoryOfStages([TODAY], [s], recordOf);
  assert.equal(h.stages.length, 1);
  assert.equal(h.transitions.length, 0);
});

test("recordHistoryOfStages: two distinct observations → one transition", () => {
  const s1 = stage({ observation: "obs-a", at: "2026-07-16T09:00:00.000Z", receipt: "r1" });
  const s2 = stage({ observation: "obs-b", at: "2026-07-16T10:00:00.000Z", receipt: "r2" });
  const h = recordHistoryOfStages([TODAY], [s1, s2], recordOf);
  assert.equal(h.stages.length, 2);
  assert.equal(h.transitions.length, 1);
  assert.equal(h.transitions[0].from, "obs-a");
  assert.equal(h.transitions[0].to, "obs-b");
});

test("recordHistoryOfStages: deduplicates consecutive identical observations", () => {
  const shared = "obs-same";
  const s1 = stage({ observation: shared, at: "2026-07-16T09:00:00.000Z", receipt: "r1" });
  const s2 = stage({ observation: shared, at: "2026-07-16T10:00:00.000Z", receipt: "r2" });
  const s3 = stage({ observation: "obs-other", at: "2026-07-16T11:00:00.000Z", receipt: "r3" });
  const h = recordHistoryOfStages([TODAY], [s1, s2, s3], recordOf);
  assert.equal(h.stages.length, 2);
  assert.equal(h.observations, 3);
});

test("recordHistoryOfStages: respects maxStages", () => {
  const stages = Array.from({ length: 8 }, (_, i) =>
    stage({ observation: `obs-${i}`, at: `2026-07-16T${String(i).padStart(2, "0")}:00:00.000Z`, receipt: `r${i}` }));
  const h = recordHistoryOfStages([TODAY], stages, recordOf, { maxStages: 3 });
  assert.equal(h.stages.length, 3);
});

test("recordHistoryOfStages: transition knowledge ascending when evidence grows", () => {
  const s1 = stage({ observation: "obs-a", at: "2026-07-16T09:00:00.000Z", receipt: "r1", pos: 1, neg: 0 });
  const s2 = stage({ observation: "obs-b", at: "2026-07-16T10:00:00.000Z", receipt: "r2", pos: 3, neg: 0 });
  const h = recordHistoryOfStages([TODAY], [s1, s2], recordOf);
  assert.equal(h.transitions[0].knowledge, "ascending");
  assert.equal(h.transitions[0].truth, "ascending");
});

test("recordHistoryOfStages: rejects empty dates", () => {
  assert.throws(() => recordHistoryOfStages([], [], recordOf));
});

test("recordHistoryOfStages: rejects invalid date format", () => {
  assert.throws(() => recordHistoryOfStages(["not-a-date"], [], recordOf));
});

// ---------------------------------------------------------------------------
// subsystemEntry
// ---------------------------------------------------------------------------

test("subsystemEntry: held census → held charge", () => {
  const entry = subsystemEntry("my-subsystem", { held: 5, denied: 0, contested: 0, unknown: 0 });
  assert.equal(entry.name, "my-subsystem");
  assert.equal(entry.charge, "held");
  assert.ok(entry.record.pos > 0);
  assert.equal(entry.record.neg, 0);
});

test("subsystemEntry: denied census → denied charge", () => {
  const entry = subsystemEntry("bad", { held: 0, denied: 3, contested: 0, unknown: 0 });
  assert.equal(entry.charge, "denied");
  assert.equal(entry.record.pos, 0);
  assert.ok(entry.record.neg > 0);
});

test("subsystemEntry: mixed census → contested charge", () => {
  const entry = subsystemEntry("mixed", { held: 2, denied: 1, contested: 0, unknown: 0 });
  assert.equal(entry.charge, "contested");
});

test("subsystemEntry: unknown census → unknown charge", () => {
  const entry = subsystemEntry("empty", { held: 0, denied: 0, contested: 0, unknown: 1 });
  assert.equal(entry.charge, "unknown");
});

test("subsystemEntry: evidence includes subsystem name and charge", () => {
  const entry = subsystemEntry("alpha", { held: 1, denied: 0, contested: 0, unknown: 0 });
  assert.ok(entry.evidence.some((e) => e.includes("alpha")));
  assert.ok(entry.evidence.some((e) => e.startsWith("charge:")));
});

test("subsystemEntry: extra evidence strings are appended", () => {
  const entry = subsystemEntry("x", { held: 1, denied: 0, contested: 0, unknown: 0 }, ["custom:value"]);
  assert.ok(entry.evidence.includes("custom:value"));
});

// ---------------------------------------------------------------------------
// readMonitorAggregate
// ---------------------------------------------------------------------------

test("readMonitorAggregate: correct kind", () => {
  const agg = readMonitorAggregate("test-domain", []);
  assert.equal(agg.kind, "metroplat.monitoring.aggregate");
});

test("readMonitorAggregate: empty subsystems → unknown charge", () => {
  const agg = readMonitorAggregate("test-domain", []);
  assert.equal(agg.charge, "unknown");
  assert.equal(agg.record.pos, 0);
  assert.equal(agg.record.neg, 0);
});

test("readMonitorAggregate: content-addressed (same inputs → same id)", () => {
  const subs = [subsystemEntry("s", { held: 2, denied: 0, contested: 0, unknown: 0 })];
  const agg1 = readMonitorAggregate("domain-a", subs);
  const agg2 = readMonitorAggregate("domain-a", subs);
  assert.equal(agg1.id, agg2.id);
});

test("readMonitorAggregate: id changes when name changes", () => {
  const subs = [subsystemEntry("s", { held: 1, denied: 0, contested: 0, unknown: 0 })];
  const agg1 = readMonitorAggregate("domain-a", subs);
  const agg2 = readMonitorAggregate("domain-b", subs);
  assert.notEqual(agg1.id, agg2.id);
});

test("readMonitorAggregate: all-held subsystems → held charge", () => {
  const subs = [
    subsystemEntry("s1", { held: 3, denied: 0, contested: 0, unknown: 0 }),
    subsystemEntry("s2", { held: 2, denied: 0, contested: 0, unknown: 0 }),
  ];
  const agg = readMonitorAggregate("clean-domain", subs);
  assert.equal(agg.charge, "held");
  assert.equal(agg.record.neg, 0);
});

test("readMonitorAggregate: all-denied subsystems → denied charge", () => {
  const subs = [
    subsystemEntry("s1", { held: 0, denied: 2, contested: 0, unknown: 0 }),
    subsystemEntry("s2", { held: 0, denied: 1, contested: 0, unknown: 0 }),
  ];
  const agg = readMonitorAggregate("broken-domain", subs);
  assert.equal(agg.charge, "denied");
  assert.equal(agg.record.pos, 0);
});

test("readMonitorAggregate: mixed subsystems → contested charge", () => {
  const subs = [
    subsystemEntry("good", { held: 3, denied: 0, contested: 0, unknown: 0 }),
    subsystemEntry("bad", { held: 0, denied: 1, contested: 0, unknown: 0 }),
  ];
  const agg = readMonitorAggregate("mixed-domain", subs);
  assert.equal(agg.charge, "contested");
});

test("readMonitorAggregate: pos/neg sums match subsystem totals", () => {
  const subs = [
    subsystemEntry("s1", { held: 3, denied: 1, contested: 0, unknown: 0 }),
    subsystemEntry("s2", { held: 2, denied: 2, contested: 0, unknown: 0 }),
  ];
  const agg = readMonitorAggregate("d", subs);
  // pos = (3+0)+(2+0) = 5 from held; neg = (1+0)+(2+0) = 3 from denied
  assert.equal(agg.record.pos, subs[0].record.pos + subs[1].record.pos);
  assert.equal(agg.record.neg, subs[0].record.neg + subs[1].record.neg);
});

test("readMonitorAggregate: name field matches domain name", () => {
  const agg = readMonitorAggregate("my-domain", []);
  assert.equal(agg.name, "my-domain");
});

test("readMonitorAggregate: subsystems preserved in order", () => {
  const subs = [
    subsystemEntry("alpha", { held: 1, denied: 0, contested: 0, unknown: 0 }),
    subsystemEntry("beta", { held: 0, denied: 1, contested: 0, unknown: 0 }),
    subsystemEntry("gamma", { held: 0, denied: 0, contested: 1, unknown: 0 }),
  ];
  const agg = readMonitorAggregate("d", subs);
  assert.equal(agg.subsystems[0].name, "alpha");
  assert.equal(agg.subsystems[1].name, "beta");
  assert.equal(agg.subsystems[2].name, "gamma");
});

test("readMonitorAggregate: evidence includes domain name and charge", () => {
  const agg = readMonitorAggregate("probe-domain", [
    subsystemEntry("x", { held: 1, denied: 0, contested: 0, unknown: 0 }),
  ]);
  assert.ok(agg.evidence.some((e) => e.includes("probe-domain")));
  assert.ok(agg.evidence.some((e) => e.startsWith("charge:")));
  assert.ok(agg.evidence.some((e) => e.includes("belnap")));
});

// ---------------------------------------------------------------------------
// Cross-check: substrate used by source-code domain (smoke test)
// ---------------------------------------------------------------------------

test("source-code domain still imports joinChargesKnowledge from substrate", async () => {
  // If moduleTopologyValuation still produces correct output, the re-wiring worked.
  const { moduleTopologyValuation } = await import("../src/monitoring/source-code/topology/valuation.mts");
  const ev = {
    kind: "metroplat.monitoring.source-code.policy-evaluation",
    source: "smoke-test",
    topology: "smoke-topology",
    observation: "smoke-obs",
    relation: {},
    policies: [],
    rulings: [
      { kind: "metroplat.monitoring.source-code.local-import-ruling", from: "a.mts", to: "b.mts", targetPresent: true, judgement: "held", fired: [] },
      { kind: "metroplat.monitoring.source-code.local-import-ruling", from: "a.mts", to: "c.mts", targetPresent: false, judgement: "denied", fired: [] },
    ],
    summary: { held: 0, denied: 0, contested: 0, unknown: 0 },
    reconciliation: {},
  };
  const result = moduleTopologyValuation(ev);
  assert.equal(result.modules[0]?.charge, "contested", "held+denied via substrate join → contested");
});
