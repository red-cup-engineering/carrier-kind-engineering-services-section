import test from "node:test";
import assert from "node:assert/strict";

import { readSourceCodeMonitorAggregate } from "../src/monitoring/source-code/aggregate.mts";
import { moduleTopologyValuation } from "../src/monitoring/source-code/topology/valuation.mts";

// Minimal evaluation stub — only the fields readSourceCodeMonitorAggregate reads.
function evaluation({ rulings = [], summary = { held: 0, denied: 0, contested: 0, unknown: 0 } } = {}) {
  return {
    kind: "metroplat.monitoring.source-code.policy-evaluation",
    source: "test-source",
    topology: "test-topology",
    observation: "test-observation",
    relation: {},
    policies: [],
    rulings,
    summary,
    reconciliation: {},
  };
}

function localRuling(from, to, judgement) {
  return { kind: "metroplat.monitoring.source-code.local-import-ruling", from, to, targetPresent: true, judgement, fired: [] };
}

function buildOrderRuling(judgement) {
  return { kind: "metroplat.monitoring.source-code.module-build-order-ruling", acyclic: judgement === "held", buildOrder: { kind: "metroplat.monitoring.source-code.module-build-order", tiers: [] }, judgement, fired: [] };
}

test("readSourceCodeMonitorAggregate emits the correct kind", () => {
  const result = readSourceCodeMonitorAggregate(evaluation());
  assert.equal(result.kind, "metroplat.monitoring.source-code.aggregate");
});

test("readSourceCodeMonitorAggregate produces a content-addressed id", () => {
  const result = readSourceCodeMonitorAggregate(evaluation());
  assert.ok(typeof result.id === "string" && result.id.startsWith("metroplat:artifact:1:"));
});

test("readSourceCodeMonitorAggregate id is stable for identical inputs", () => {
  const ev = evaluation({ rulings: [localRuling("a.mts", "b.mts", "held")], summary: { held: 1, denied: 0, contested: 0, unknown: 0 } });
  assert.equal(readSourceCodeMonitorAggregate(ev).id, readSourceCodeMonitorAggregate(ev).id);
});

test("readSourceCodeMonitorAggregate exposes three named subsystems in order", () => {
  const result = readSourceCodeMonitorAggregate(evaluation());
  assert.equal(result.subsystems.length, 3);
  assert.equal(result.subsystems[0].name, "policy");
  assert.equal(result.subsystems[1].name, "topology");
  assert.equal(result.subsystems[2].name, "build-order");
});

test("readSourceCodeMonitorAggregate charge is unknown for an empty corpus", () => {
  const result = readSourceCodeMonitorAggregate(evaluation());
  // Empty: no rulings → all censuses are zero or unknown → package charge unknown.
  // build-order subsystem has no ruling → census { unknown: 1 } → neg=0, pos=0 too.
  // All subsystems empty → package record { pos: 0, neg: 0 } → unknown.
  assert.equal(result.charge, "unknown");
  assert.equal(result.record.pos, 0);
  assert.equal(result.record.neg, 0);
});

test("readSourceCodeMonitorAggregate charge is held when all subsystems are conformant", () => {
  const rulings = [
    localRuling("src/a.mts", "src/b.mts", "held"),
    buildOrderRuling("held"),
  ];
  const summary = { held: 1, denied: 0, contested: 0, unknown: 0 };
  const result = readSourceCodeMonitorAggregate(evaluation({ rulings, summary }));
  // policy: held=1 → pos=1, neg=0
  // topology: module src/a.mts is held → pos=1, neg=0
  // build-order: held=1 → pos=1, neg=0
  // total: pos=3, neg=0 → held
  assert.equal(result.charge, "held");
  assert.ok(result.record.pos > 0, "positive mass from conformant subsystems");
  assert.equal(result.record.neg, 0, "no negative mass when all subsystems held");
});

test("readSourceCodeMonitorAggregate charge is denied when all subsystems deny", () => {
  const rulings = [
    localRuling("src/a.mts", "src/b.mts", "denied"),
    buildOrderRuling("denied"),
  ];
  const summary = { held: 0, denied: 1, contested: 0, unknown: 0 };
  const result = readSourceCodeMonitorAggregate(evaluation({ rulings, summary }));
  assert.equal(result.charge, "denied");
  assert.equal(result.record.pos, 0, "no positive mass when all subsystems denied");
  assert.ok(result.record.neg > 0, "negative mass from violating subsystems");
});

test("readSourceCodeMonitorAggregate charge is contested when policy held but topology has denial", () => {
  // Policy says held overall but one module has a denied import and another held → topology contested.
  const rulings = [
    localRuling("src/a.mts", "src/b.mts", "held"),
    localRuling("src/a.mts", "src/missing.mts", "denied"),
    buildOrderRuling("held"),
  ];
  const summary = { held: 1, denied: 1, contested: 0, unknown: 0 };
  const result = readSourceCodeMonitorAggregate(evaluation({ rulings, summary }));
  // policy: held=1, denied=1 → pos includes 1+1=2 (evidenceRecordOfFourCensus: held+contested for pos, denied+contested for neg)
  // Actually evidenceRecordOfFourCensus: pos = held + contested, neg = denied + contested
  // policy summary { held:1, denied:1 } → pos=1, neg=1 → contested
  // topology: src/a.mts has held+denied → contested → summary { contested: 1 } → pos=1, neg=1
  // build-order: held → pos=1, neg=0
  // joined: pos=3, neg=2 → contested
  assert.equal(result.charge, "contested", "mixed evidence across subsystems → contested");
});

test("readSourceCodeMonitorAggregate record pos/neg sums are non-negative integers", () => {
  const rulings = [
    localRuling("src/x.mts", "src/y.mts", "held"),
    buildOrderRuling("held"),
  ];
  const summary = { held: 1, denied: 0, contested: 0, unknown: 0 };
  const result = readSourceCodeMonitorAggregate(evaluation({ rulings, summary }));
  assert.ok(Number.isInteger(result.record.pos) && result.record.pos >= 0);
  assert.ok(Number.isInteger(result.record.neg) && result.record.neg >= 0);
});

test("readSourceCodeMonitorAggregate evidence carries key diagnostic fields", () => {
  const result = readSourceCodeMonitorAggregate(evaluation());
  assert.ok(result.evidence.some((e) => e.startsWith("charge:")));
  assert.ok(result.evidence.some((e) => e.startsWith("subsystems:")));
  assert.ok(result.evidence.some((e) => e.includes("belnap")));
  assert.ok(result.evidence.some((e) => e.startsWith("policy-charge:")));
  assert.ok(result.evidence.some((e) => e.startsWith("topology-charge:")));
  assert.ok(result.evidence.some((e) => e.startsWith("build-order-charge:")));
});

test("readSourceCodeMonitorAggregate accepts a pre-computed topology valuation", () => {
  const rulings = [localRuling("src/a.mts", "src/b.mts", "held")];
  const summary = { held: 1, denied: 0, contested: 0, unknown: 0 };
  const ev = evaluation({ rulings, summary });
  const tv = moduleTopologyValuation(ev);
  const withPrecomputed = readSourceCodeMonitorAggregate(ev, tv);
  const withoutPrecomputed = readSourceCodeMonitorAggregate(ev);
  // Same content-addressed id regardless of whether topology was passed in.
  assert.equal(withPrecomputed.id, withoutPrecomputed.id);
});

test("readSourceCodeMonitorAggregate topology subsystem reflects module-level charges", () => {
  const rulings = [
    localRuling("src/good.mts", "src/lib.mts", "held"),
    localRuling("src/bad.mts",  "src/missing.mts", "denied"),
  ];
  const summary = { held: 1, denied: 1, contested: 0, unknown: 0 };
  const result = readSourceCodeMonitorAggregate(evaluation({ rulings, summary }));
  const topoSubsystem = result.subsystems.find((s) => s.name === "topology");
  assert.ok(topoSubsystem, "topology subsystem must be present");
  // good.mts → held, bad.mts → denied → topology census { held:1, denied:1 }
  // pos = 1 (held), neg = 1 (denied)
  assert.ok(topoSubsystem.record.pos >= 1, "held module contributes positive mass");
  assert.ok(topoSubsystem.record.neg >= 1, "denied module contributes negative mass");
  assert.equal(topoSubsystem.charge, "contested");
});

test("readSourceCodeMonitorAggregate build-order subsystem: no ruling → unknown", () => {
  const result = readSourceCodeMonitorAggregate(evaluation());
  const bo = result.subsystems.find((s) => s.name === "build-order");
  assert.ok(bo, "build-order subsystem must be present");
  assert.equal(bo.charge, "unknown");
  assert.equal(bo.census.unknown, 1);
});

test("readSourceCodeMonitorAggregate build-order subsystem: acyclic graph → held", () => {
  const result = readSourceCodeMonitorAggregate(evaluation({ rulings: [buildOrderRuling("held")] }));
  const bo = result.subsystems.find((s) => s.name === "build-order");
  assert.ok(bo);
  assert.equal(bo.charge, "held");
  assert.equal(bo.census.held, 1);
});

test("readSourceCodeMonitorAggregate build-order subsystem: cyclic graph → denied", () => {
  const result = readSourceCodeMonitorAggregate(evaluation({ rulings: [buildOrderRuling("denied")] }));
  const bo = result.subsystems.find((s) => s.name === "build-order");
  assert.ok(bo);
  assert.equal(bo.charge, "denied");
  assert.equal(bo.census.denied, 1);
});
