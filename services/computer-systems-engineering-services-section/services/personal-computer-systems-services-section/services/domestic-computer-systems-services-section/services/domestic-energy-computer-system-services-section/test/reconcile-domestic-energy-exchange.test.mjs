import assert from "node:assert/strict";
import test from "node:test";
import { reconcileDomesticEnergyExchange } from "../scripts/reconcile-domestic-energy-exchange.mjs";

const confirmedExchange = {
  period: { start: "2026-08-01T00:00:00Z", end: "2026-08-31T23:59:59Z" },
  commodity: "KWH",
  quantity: "412.5",
  readings: [
    { source: "home-meter", amount: "412.5", observedAt: "2026-09-01T00:00:00Z" },
    { source: "utility-statement", amount: "412.5", observedAt: "2026-09-03T00:00:00Z" },
  ],
};

test("confirms matching independent readings at the later observation", () => {
  const result = reconcileDomesticEnergyExchange({ exchange: confirmedExchange });
  assert.deepEqual(result.reconciliation, {
    status: "confirmed",
    difference: null,
    confirmedAt: "2026-09-03T00:00:00Z",
  });
});

test("keeps the exact discrepancy when independent readings disagree", () => {
  const exchange = {
    ...confirmedExchange,
    readings: [
      { source: "home-meter", amount: "398.0", observedAt: "2026-09-01T00:00:00Z" },
      { source: "utility-statement", amount: "371.2", observedAt: "2026-09-03T00:00:00Z" },
    ],
  };
  const result = reconcileDomesticEnergyExchange({ exchange });
  assert.deepEqual(result.reconciliation, { status: "disputed", difference: "26.8", confirmedAt: null });
});

test("uses an explicitly declared tolerance", () => {
  const exchange = {
    ...confirmedExchange,
    readings: [
      { source: "home-meter", amount: "398.0", observedAt: "2026-09-01T00:00:00Z" },
      { source: "utility-statement", amount: "371.2", observedAt: "2026-09-03T00:00:00Z" },
    ],
  };
  assert.equal(reconcileDomesticEnergyExchange({ exchange, tolerance: "30" }).reconciliation.status, "confirmed");
});

test("does not treat two readings from one source as confirmation", () => {
  const exchange = {
    ...confirmedExchange,
    readings: [
      { source: "home-meter", amount: "150", observedAt: "2026-08-15T00:00:00Z" },
      { source: "home-meter", amount: "150", observedAt: "2026-08-20T00:00:00Z" },
    ],
  };
  assert.deepEqual(reconcileDomesticEnergyExchange({ exchange }).reconciliation, {
    status: "awaiting-independent-reading",
    difference: null,
    confirmedAt: null,
  });
});

test("refuses malformed input", () => {
  assert.throws(() => reconcileDomesticEnergyExchange({}), /exchange is required/u);
  assert.throws(() => reconcileDomesticEnergyExchange({ exchange: { readings: [] } }), /at least two readings/u);
  assert.throws(() => reconcileDomesticEnergyExchange({ exchange: confirmedExchange, tolerance: "-1" }), /non-negative/u);
});
