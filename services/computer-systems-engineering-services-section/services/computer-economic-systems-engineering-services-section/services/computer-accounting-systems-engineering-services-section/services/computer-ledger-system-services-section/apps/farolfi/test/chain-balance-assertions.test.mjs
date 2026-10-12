import assert from "node:assert/strict";
import test from "node:test";

import { composeCommodityDirective } from "../src/ledger/maintenance/chain-balance-assertions.mjs";

const input = (readings) => ({
  readings, account: "Assets:Digital-Assets:Hive:Liquid", commodity: "HIVE", directiveDate: "2026-10-03", cutoff: "2026-10-02",
  sourceId: "CHAIN-HIVE-20261002", observedAt: "2026-10-03T00:00:00.000Z", chainTag: "HIVE", commodityTag: "HIVE", dateStampValue: "20261002",
});

test("an account's balance is asserted only when every custody wallet it aggregates was read", () => {
  const whole = composeCommodityDirective(input([{ label: "a", checked: true, value: "1.5" }, { label: "b", checked: true, value: "2" }]));
  assert.match(whole.directive, /^2026-10-03 balance Assets:Digital-Assets:Hive:Liquid 3\.5 HIVE/u);
  const partial = composeCommodityDirective(input([{ label: "a", checked: true, value: "1.5" }, { label: "b", checked: false, reason: "timeout" }]));
  assert.equal(partial.directive, null);
  assert.deepEqual(partial.failed, [{ label: "b", reason: "timeout" }]);
});
