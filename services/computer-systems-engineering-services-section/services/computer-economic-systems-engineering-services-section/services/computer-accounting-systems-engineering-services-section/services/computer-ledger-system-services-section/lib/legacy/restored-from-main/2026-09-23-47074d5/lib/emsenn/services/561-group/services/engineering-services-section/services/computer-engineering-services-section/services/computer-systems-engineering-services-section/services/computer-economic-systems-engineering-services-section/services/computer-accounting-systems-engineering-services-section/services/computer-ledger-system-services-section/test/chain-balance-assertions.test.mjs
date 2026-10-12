import assert from "node:assert/strict";
import { test } from "node:test";
import {
  composeCommodityDirective, dateStamp, directiveDateForCutoff, hiveEngineSymbolTotals,
  hiveWalletReadings, reconciliationId, sumCheckedWallets,
} from "../src/chain-balance-assertions.mjs";

test("directiveDateForCutoff: the directive lands one day after the cutoff", () => {
  assert.equal(directiveDateForCutoff("2026-09-04"), "2026-09-05");
  assert.equal(directiveDateForCutoff("2026-08-31"), "2026-09-01");
});

test("dateStamp: compact YYYYMMDD form", () => {
  assert.equal(dateStamp("2026-09-04"), "20260904");
});

test("reconciliationId: REC-<dateStamp>-<chain>-<commodity>", () => {
  assert.equal(reconciliationId("20260904", "HIVE", "HIVE"), "REC-20260904-HIVE-HIVE");
});

test("sumCheckedWallets: sums only checked readings, excludes failed ones from the sum", () => {
  const readings = [
    { label: "A", checked: true, value: "10.5" },
    { label: "B", checked: false, reason: "timeout" },
    { label: "C", checked: true, value: "2.25" },
  ];
  const { sum, used, failed } = sumCheckedWallets(readings);
  assert.equal(sum, "12.75");
  assert.deepEqual(used, ["A", "C"]);
  assert.deepEqual(failed, [{ label: "B", reason: "timeout" }]);
});

test("sumCheckedWallets: a failed wallet is never written as zero -- all-failed yields no sum", () => {
  const readings = [{ label: "A", checked: false, reason: "unreachable" }];
  const { sum, used, failed } = sumCheckedWallets(readings);
  assert.equal(sum, null);
  assert.deepEqual(used, []);
  assert.deepEqual(failed, [{ label: "A", reason: "unreachable" }]);
});

test("hiveWalletReadings: a whole-fetch failure fails every wallet with the same reason", () => {
  const wallets = [
    { account: "Assets:...:Michael561", publicAccount: "michael561" },
    { account: "Assets:...:Emsenn0", publicAccount: "emsenn0" },
  ];
  const readings = hiveWalletReadings(wallets, null, "Hive get_accounts failed: network down", "balance");
  assert.deepEqual(readings, [
    { label: "Assets:...:Michael561", checked: false, reason: "Hive get_accounts failed: network down" },
    { label: "Assets:...:Emsenn0", checked: false, reason: "Hive get_accounts failed: network down" },
  ]);
});

test("hiveWalletReadings: a wallet missing from the response fails only that wallet", () => {
  const wallets = [
    { account: "Assets:...:Michael561", publicAccount: "michael561" },
    { account: "Assets:...:Emsenn0", publicAccount: "emsenn0" },
  ];
  const accountsByName = new Map([["michael561", { balance: "1.000 HIVE" }]]);
  const readings = hiveWalletReadings(wallets, accountsByName, null, "balance");
  assert.deepEqual(readings, [
    { label: "Assets:...:Michael561", checked: true, value: "1.000" },
    { label: "Assets:...:Emsenn0", checked: false, reason: "account emsenn0 not present in get_accounts response" },
  ]);
});

test("hiveEngineSymbolTotals: sums balance + stake per symbol across every wallet row", () => {
  const balances = [
    { account: "michael561", symbol: "LEO", balance: "10.0", stake: "5.0" },
    { account: "emsenn0", symbol: "LEO", balance: "3.0" },
    { account: "michael561", symbol: "BEE", balance: "0.1" },
  ];
  const totals = hiveEngineSymbolTotals(balances);
  assert.equal(totals.get("LEO"), "18");
  assert.equal(totals.get("BEE"), "0.1");
});

test("composeCommodityDirective: renders the assertion text for a small fixture of observations", () => {
  const readings = [
    { label: "Assets:Digital-Assets:Hive:Custody:Michael561", checked: true, value: "100.000" },
    { label: "Assets:Digital-Assets:Hive:Custody:Emsenn0", checked: true, value: "42.423" },
  ];
  const result = composeCommodityDirective({
    readings,
    account: "Assets:Digital-Assets:Hive:Liquid",
    commodity: "HIVE",
    directiveDate: "2026-09-05",
    cutoff: "2026-09-04",
    sourceId: "CHAIN-HIVE-20260904",
    observedAt: "2026-09-04T12:00:00.000Z",
    chainTag: "HIVE",
    commodityTag: "HIVE",
    dateStampValue: "20260904",
  });
  assert.equal(result.amount, "142.423");
  assert.equal(result.directive, [
    "2026-09-05 balance Assets:Digital-Assets:Hive:Liquid 142.423 HIVE",
    '  reconciliation_id: "REC-20260904-HIVE-HIVE"',
    '  cutoff: "2026-09-04"',
    '  source_id: "CHAIN-HIVE-20260904"',
    '  source_balance: "142.423"',
    '  observed_at: "2026-09-04T12:00:00.000Z"',
  ].join("\n"));
});

test("composeCommodityDirective: no directive when every wallet failed", () => {
  const readings = [{ label: "A", checked: false, reason: "unreachable" }];
  const result = composeCommodityDirective({
    readings,
    account: "Assets:Digital-Assets:Hive:Liquid",
    commodity: "HIVE",
    directiveDate: "2026-09-05",
    cutoff: "2026-09-04",
    sourceId: "CHAIN-HIVE-20260904",
    observedAt: "2026-09-04T12:00:00.000Z",
    chainTag: "HIVE",
    commodityTag: "HIVE",
    dateStampValue: "20260904",
  });
  assert.equal(result.directive, null);
  assert.equal(result.amount, null);
  assert.deepEqual(result.failed, [{ label: "A", reason: "unreachable" }]);
});
