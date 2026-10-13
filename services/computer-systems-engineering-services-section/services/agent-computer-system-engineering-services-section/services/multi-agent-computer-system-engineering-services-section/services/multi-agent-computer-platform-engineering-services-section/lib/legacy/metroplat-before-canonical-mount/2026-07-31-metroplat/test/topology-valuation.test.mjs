import test from "node:test";
import assert from "node:assert/strict";

import { moduleTopologyValuation } from "../src/monitoring/source-code/topology/valuation.mts";

// Minimal evaluation stub — moduleTopologyValuation only reads .source,
// .topology, .observation, and .rulings from the evaluation.
function evaluation(rulings, source = "test") {
  return {
    kind: "metroplat.monitoring.source-code.policy-evaluation",
    source,
    topology: `${source}-topology`,
    observation: `${source}-observation`,
    relation: {},
    policies: [],
    rulings,
    summary: { held: 0, denied: 0, contested: 0, unknown: 0 },
    reconciliation: {},
  };
}

function localImportRuling(from, to, judgement) {
  return { kind: "metroplat.monitoring.source-code.local-import-ruling", from, to, targetPresent: true, judgement, fired: [] };
}

function buildOrderRuling(acyclic) {
  return { kind: "metroplat.monitoring.source-code.module-build-order-ruling", acyclic, buildOrder: { kind: "metroplat.monitoring.source-code.module-build-order", tiers: [] }, judgement: "held", fired: [] };
}

test("moduleTopologyValuation emits the correct kind and a stable content-addressed id", () => {
  const result = moduleTopologyValuation(evaluation([]));
  assert.equal(result.kind, "metroplat.monitoring.source-code.module-topology-valuation");
  assert.ok(typeof result.id === "string" && result.id.startsWith("metroplat:artifact:1:"), `unexpected id: ${result.id}`);
});

test("moduleTopologyValuation id is stable: same inputs produce same id", () => {
  const rulings = [localImportRuling("src/a.mts", "src/b.mts", "held")];
  const first = moduleTopologyValuation(evaluation(rulings));
  const second = moduleTopologyValuation(evaluation(rulings));
  assert.equal(first.id, second.id);
});

test("moduleTopologyValuation assigns held to a module whose every import conforms", () => {
  const rulings = [
    localImportRuling("src/app.mts", "src/lib/core.mts", "held"),
    localImportRuling("src/app.mts", "src/lib/utils.mts", "held"),
  ];
  const result = moduleTopologyValuation(evaluation(rulings));

  assert.equal(result.modules.length, 1);
  const entry = result.modules[0];
  assert.equal(entry.path, "src/app.mts");
  assert.equal(entry.charge, "held");
  assert.equal(entry.rulingCount, 2);
  assert.equal(result.summary.held, 1);
  assert.equal(result.summary.denied, 0);
  assert.equal(result.summary.contested, 0);
  assert.equal(result.summary.unknown, 0);
});

test("moduleTopologyValuation assigns denied to a module that only has violating imports", () => {
  const rulings = [
    localImportRuling("src/violator.mts", "src/missing.mts", "denied"),
  ];
  const result = moduleTopologyValuation(evaluation(rulings));

  const entry = result.modules.find((m) => m.path === "src/violator.mts");
  assert.ok(entry, "expected entry for src/violator.mts");
  assert.equal(entry.charge, "denied");
  assert.equal(result.summary.denied, 1);
  assert.equal(result.summary.held, 0);
});

test("moduleTopologyValuation assigns contested to a module with mixed conformant and violating imports", () => {
  // A module importing one present target (held) and one absent target (denied)
  // should be contested — Belnap knowledge join of held+denied = contested.
  const rulings = [
    localImportRuling("src/mixed.mts", "src/present.mts", "held"),
    localImportRuling("src/mixed.mts", "src/missing.mts", "denied"),
  ];
  const result = moduleTopologyValuation(evaluation(rulings));

  const entry = result.modules.find((m) => m.path === "src/mixed.mts");
  assert.ok(entry, "expected entry for src/mixed.mts");
  assert.equal(entry.charge, "contested",
    "held + denied should join to contested in the Belnap knowledge lattice");
  assert.equal(result.summary.contested, 1);
});

test("moduleTopologyValuation propagates contested rulings correctly", () => {
  // A contested ruling already carries both pos and neg evidence; joining two
  // contested rulings must still yield contested.
  const rulings = [
    localImportRuling("src/a.mts", "src/b.mts", "contested"),
    localImportRuling("src/a.mts", "src/c.mts", "contested"),
  ];
  const result = moduleTopologyValuation(evaluation(rulings));
  const entry = result.modules.find((m) => m.path === "src/a.mts");
  assert.ok(entry);
  assert.equal(entry.charge, "contested");
});

test("moduleTopologyValuation values multiple distinct modules independently", () => {
  const rulings = [
    localImportRuling("src/good.mts", "src/lib.mts", "held"),
    localImportRuling("src/bad.mts",  "src/gone.mts", "denied"),
    localImportRuling("src/ugly.mts", "src/here.mts", "held"),
    localImportRuling("src/ugly.mts", "src/gone.mts", "denied"),
  ];
  const result = moduleTopologyValuation(evaluation(rulings));

  assert.equal(result.modules.length, 3);
  const byPath = new Map(result.modules.map((m) => [m.path, m]));
  assert.equal(byPath.get("src/good.mts")?.charge, "held");
  assert.equal(byPath.get("src/bad.mts")?.charge, "denied");
  assert.equal(byPath.get("src/ugly.mts")?.charge, "contested");
  assert.equal(result.summary.held, 1);
  assert.equal(result.summary.denied, 1);
  assert.equal(result.summary.contested, 1);
  assert.equal(result.summary.unknown, 0);
});

test("moduleTopologyValuation ignores module-build-order and normalization-cut rulings", () => {
  // These ruling kinds are topology-level, not per-module. They must not
  // create module entries or corrupt the per-module charge.
  const rulings = [
    buildOrderRuling(true),
    { kind: "metroplat.monitoring.source-code.normalization-cut-ruling",
      cut: { kind: "metroplat.monitoring.source-code.normalization-cut", identity: "cut:1", module: "src/x.mts", recommendedPath: "src/x/index.mts" },
      actionability: "held",
      judgement: "denied",
      fired: [] },
  ];
  const result = moduleTopologyValuation(evaluation(rulings));
  assert.equal(result.modules.length, 0,
    "topology-level rulings must not produce per-module charge entries");
  assert.equal(result.summary.held + result.summary.denied + result.summary.contested + result.summary.unknown, 0);
});

test("moduleTopologyValuation modules are sorted alphabetically by path", () => {
  const rulings = [
    localImportRuling("src/z.mts", "src/lib.mts", "held"),
    localImportRuling("src/a.mts", "src/lib.mts", "held"),
    localImportRuling("src/m.mts", "src/lib.mts", "denied"),
  ];
  const result = moduleTopologyValuation(evaluation(rulings));
  const paths = result.modules.map((m) => m.path);
  assert.deepEqual(paths, ["src/a.mts", "src/m.mts", "src/z.mts"]);
});

test("moduleTopologyValuation id changes when source changes", () => {
  const rulings = [localImportRuling("src/a.mts", "src/b.mts", "held")];
  const first  = moduleTopologyValuation(evaluation(rulings, "pkg-a"));
  const second = moduleTopologyValuation(evaluation(rulings, "pkg-b"));
  assert.notEqual(first.id, second.id);
});

test("moduleTopologyValuation evidence carries diagnostic fields", () => {
  const rulings = [
    localImportRuling("src/a.mts", "src/b.mts", "held"),
    localImportRuling("src/c.mts", "src/d.mts", "denied"),
  ];
  const result = moduleTopologyValuation(evaluation(rulings));
  assert.ok(result.evidence.some((e) => e.startsWith("modules-valued:")));
  assert.ok(result.evidence.some((e) => e.startsWith("held:")));
  assert.ok(result.evidence.some((e) => e.startsWith("denied:")));
  assert.ok(result.evidence.some((e) => e.includes("belnap")));
});
