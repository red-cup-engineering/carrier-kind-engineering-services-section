import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evmCustodyWallets, hiveCustodyWallets, hiveEngineAccountFor, hiveEngineSymbolAccounts,
  hiveEngineUnclassifiedSymbols, parseNoteRecords,
} from "../src/ledger-metadata.mjs";

const FIXTURE_LEDGER = `
2026-08-27 open Assets:Digital-Assets:Hive:Custody:Michael561
2026-08-27 note Assets:Digital-Assets:Hive:Custody:Michael561 "Hive account michael561"
  inventory: "hive-account"
  public_account: "michael561"
  role: "archivist"

2026-08-27 open Assets:Digital-Assets:Hive:Custody:Emsenn0
2026-08-27 note Assets:Digital-Assets:Hive:Custody:Emsenn0 "Hive account emsenn0"
  inventory: "hive-account"
  public_account: "emsenn0"

2026-08-27 open Assets:Digital-Assets:EVM:Custody:SIGMUND-WALLET:Index-0
2026-08-27 note Assets:Digital-Assets:EVM:Custody:SIGMUND-WALLET:Index-0 "EVM address 0xAAA"
  inventory: "evm-address"
  address: "0xAAA"

2026-08-27 open Assets:Digital-Assets:EVM:Custody:YANAGI
2026-08-27 note Assets:Digital-Assets:EVM:Custody:YANAGI "EVM address 0xBBB"
  inventory: "evm-external-address"
  address: "0xBBB"
  chain: "base"

2026-08-28 balance Assets:Digital-Assets:HiveEngine:Unclassified 5100.0 AFIT
  reconciliation_id: "REC-1"
2026-08-28 balance Assets:Digital-Assets:HiveEngine:Unclassified 0.13474406 BEE
  reconciliation_id: "REC-2"
2026-08-28 balance Assets:Digital-Assets:HiveEngine:Collectibles 1 ZINGALPHA-1831
  reconciliation_id: "REC-3"
`;

test("parseNoteRecords: reads account, narration, and indented metadata", () => {
  const records = parseNoteRecords(FIXTURE_LEDGER);
  const michael = records.find((r) => r.account === "Assets:Digital-Assets:Hive:Custody:Michael561");
  assert.equal(michael.narration, "Hive account michael561");
  assert.equal(michael.metadata.public_account, "michael561");
  assert.equal(michael.metadata.role, "archivist");
});

test("hiveCustodyWallets: only inventory hive-account wallets, keyed by public_account", () => {
  const wallets = hiveCustodyWallets(FIXTURE_LEDGER);
  assert.deepEqual(wallets, [
    { account: "Assets:Digital-Assets:Hive:Custody:Michael561", publicAccount: "michael561" },
    { account: "Assets:Digital-Assets:Hive:Custody:Emsenn0", publicAccount: "emsenn0" },
  ]);
});

test("evmCustodyWallets: only inventory evm-address wallets, excluding evm-external-address", () => {
  const wallets = evmCustodyWallets(FIXTURE_LEDGER);
  assert.deepEqual(wallets, [
    { account: "Assets:Digital-Assets:EVM:Custody:SIGMUND-WALLET:Index-0", address: "0xAAA" },
  ]);
  assert.ok(!wallets.some((w) => w.account.includes("YANAGI")), "YANAGI (evm-external-address) must be excluded");
});

test("hiveEngineSymbolAccounts: maps each symbol to its first-seen account", () => {
  const map = hiveEngineSymbolAccounts(FIXTURE_LEDGER);
  assert.equal(map.AFIT, "Assets:Digital-Assets:HiveEngine:Unclassified");
  assert.equal(map["ZINGALPHA-1831"], "Assets:Digital-Assets:HiveEngine:Collectibles");
});

test("hiveEngineAccountFor: known symbol keeps its recorded account, unknown symbol defaults to Unclassified", () => {
  const map = hiveEngineSymbolAccounts(FIXTURE_LEDGER);
  assert.equal(hiveEngineAccountFor("ZINGALPHA-1831", map), "Assets:Digital-Assets:HiveEngine:Collectibles");
  assert.equal(hiveEngineAccountFor("NEVER-SEEN", map), "Assets:Digital-Assets:HiveEngine:Unclassified");
});

test("hiveEngineUnclassifiedSymbols: distinct symbols under Unclassified only, sorted", () => {
  assert.deepEqual(hiveEngineUnclassifiedSymbols(FIXTURE_LEDGER), ["AFIT", "BEE"]);
});
