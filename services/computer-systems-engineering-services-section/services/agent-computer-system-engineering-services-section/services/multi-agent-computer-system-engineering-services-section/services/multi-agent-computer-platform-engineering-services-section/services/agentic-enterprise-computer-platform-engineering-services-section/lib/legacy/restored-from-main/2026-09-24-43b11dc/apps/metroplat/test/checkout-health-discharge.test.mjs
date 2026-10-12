import assert from "node:assert/strict";
import test from "node:test";
import { classifyDutyScope as metroplatClassifyDutyScope, dischargeReadyDuties as metroplatDischargeReadyDuties } from "../src/work/duty-discharge.mjs";
import {
  classifyDutyScope,
  dischargeReadyDuties,
} from "../src/work/duty-discharge.mjs";

test("MetroPlat reexports the shared deterministic duty operations", () => {
  assert.equal(metroplatClassifyDutyScope, classifyDutyScope);
  assert.equal(metroplatDischargeReadyDuties, dischargeReadyDuties);
});

test("MetroPlat preserves the shared scoped discharge result", async () => {
  const result = await metroplatDischargeReadyDuties({
    readout: { frontier: [{ scope: "task:exact-deps-spotcomp", intent: "i", text: "pins", state: "ready" }] },
    root: "/checkout",
    binding: null,
    apply: false,
    scope: "task:exact-deps-spotcomp",
    planOrDischargeFn: async () => ({ scope: "task:exact-deps-spotcomp", intent: "i", kind: "exact-deps", status: "planned" }),
  });
  assert.deepEqual(result, {
    kind: "metroplat.monitoring.checkout-health.duty-discharge",
    duties: [{ scope: "task:exact-deps-spotcomp", intent: "i", kind: "exact-deps", status: "planned" }],
    ok: true,
  });
});
