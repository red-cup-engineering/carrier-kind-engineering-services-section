import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  custodyAccountsFor,
  deriveLedgerForAccount,
  runFarolfiReport,
  runHiveAutoLedger,
} from "../hive-auto-ledger-cli.mjs";

test("custodyAccountsFor: capitalizes the account name into the house naming pattern", () => {
  const custody = custodyAccountsFor("michael561");
  assert.equal(custody.hive, "Assets:Digital-Assets:Hive:Custody:Michael561");
  assert.equal(custody.hiveEngine, "Assets:Digital-Assets:HiveEngine:Custody:Michael561");
});

function fakeClientFactory(chainAccount) {
  return () => ({ async getAccounts() { return [chainAccount]; } });
}

test("deriveLedgerForAccount: back-derives an opening balance for a bounded window from the chain's current balance", async () => {
  const chainAccount = { name: "emsenn0", created: "2021-02-11T21:25:36", balance: "10.000 HIVE", hbd_balance: "0.000 HBD", vesting_shares: "0.000000 VESTS" };
  const composed = await deriveLedgerForAccount(
    { account: "emsenn0", rangeStart: "2026-06-01", rangeEnd: "2026-09-01" },
    {
      clientFactory: fakeClientFactory(chainAccount),
      readHiveHistoryImpl: async () => ({ operations: [
        { index: 1, kind: "transfer", trxId: "t1", timestamp: "2026-06-05T00:00:00", payload: { from: "someone", to: "emsenn0", amount: "3.000 HIVE", memo: "" } },
      ] }),
      readHiveEngineHistoryImpl: async () => ({ entries: [], fills: [] }),
      fetchHiveEngineBalancesImpl: async () => [],
    },
  );
  // window added 3 HIVE; chain now shows 10 HIVE; the inferred opening is 7 HIVE, but the historical boundary is unverified.
  assert.equal(composed.openingBalances.hive, "7");
  assert.equal(composed.ledgerResult.balanceComparison.find((b) => b.commodity === "HIVE").match, true);
});

test("deriveLedgerForAccount: a whole-history run (no rangeStart) uses a literal zero opening, so the closing assertion is a real check, not tautological", async () => {
  const chainAccount = { name: "michael561", created: "2024-11-28T17:31:09", balance: "5.000 HIVE", hbd_balance: "0.000 HBD", vesting_shares: "0.000000 VESTS" };
  const composed = await deriveLedgerForAccount(
    { account: "michael561" }, // no rangeStart: whole history since creation
    {
      clientFactory: fakeClientFactory(chainAccount),
      // deliberately omits the transfer that would actually explain the 5 HIVE, simulating a
      // real derivation bug (an unhandled or miscounted operation)
      readHiveHistoryImpl: async () => ({ operations: [] }),
      readHiveEngineHistoryImpl: async () => ({ entries: [], fills: [] }),
      fetchHiveEngineBalancesImpl: async () => [],
    },
  );
  assert.equal(composed.openingBalances.hive, "0");
  const hiveRow = composed.ledgerResult.balanceComparison.find((b) => b.commodity === "HIVE");
  assert.equal(hiveRow.computedClosing, "0");
  assert.equal(hiveRow.match, false); // 0 computed vs 5 on chain: correctly caught, not masked
});

test("deriveLedgerForAccount: scopes the Hive-Engine chain comparison to liquid balance alone, never balance+stake (a staked position lives in its own :Staked sub-account)", async () => {
  const chainAccount = { name: "michael561", created: "2024-11-28T17:31:09", balance: "0.000 HIVE", hbd_balance: "0.000 HBD", vesting_shares: "0.000000 VESTS" };
  const composed = await deriveLedgerForAccount(
    { account: "michael561", rangeStart: "2024-11-28", rangeEnd: "2026-09-05" },
    {
      clientFactory: fakeClientFactory(chainAccount),
      readHiveHistoryImpl: async () => ({ operations: [] }),
      readHiveEngineHistoryImpl: async () => ({
        entries: [{ transactionId: "he1", timestamp: "2024-12-01T00:00:00.000Z", operation: "tokens_stake", symbol: "MUSIC", quantity: "0.003817", from: "michael561", to: "michael561", account: "michael561" }],
        fills: [],
      }),
      // the chain currently shows 0 liquid + 0.003817 staked MUSIC (a real michael561 shape)
      fetchHiveEngineBalancesImpl: async () => [{ account: "michael561", symbol: "MUSIC", balance: "0", stake: "0.003817" }],
    },
  );
  assert.equal(composed.chainClosingBalances.hiveEngine.MUSIC, "0");
  const musicRow = composed.ledgerResult.balanceComparison.find((b) => b.commodity === "MUSIC");
  assert.equal(musicRow.match, true);
  assert.equal(musicRow.computedClosing, "0");
});

test("deriveLedgerForAccount: throws when the chain account does not exist", async () => {
  await assert.rejects(() => deriveLedgerForAccount(
    { account: "nobody" },
    { clientFactory: () => ({ async getAccounts() { return [undefined]; } }), readHiveHistoryImpl: async () => ({ operations: [] }), readHiveEngineHistoryImpl: async () => ({ entries: [], fills: [] }), fetchHiveEngineBalancesImpl: async () => [] },
  ), /account not found/);
});

test("runFarolfiReport: resolves the real published farolfi bin and reports exit 0 over a trivial ledger", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hive-auto-ledger-farolfi-test-"));
  const out = join(dir, "trivial.beancount");
  try {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(out, '2026-01-01 open Assets:Cash\n2026-01-01 open Equity:Opening-Balances\n2026-01-01 * "seed"\n  Assets:Cash  1 USD\n  Equity:Opening-Balances  -1 USD\n');
    const result = await runFarolfiReport("bal", out);
    assert.equal(result.exitCode, 0);
    assert.ok(result.text.includes("USD"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("runHiveAutoLedger: writes the ledger, runs bean-check, and runs farolfi's balance and valuation reports over the real file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hive-auto-ledger-test-"));
  const out = join(dir, "ledger.beancount");
  try {
    const chainAccount = { name: "emsenn0", created: "2026-06-01T00:00:00", balance: "1.000 HIVE", hbd_balance: "0.000 HBD", vesting_shares: "0.000000 VESTS" };
    const result = await runHiveAutoLedger(
      { account: "emsenn0", rangeStart: "2026-06-01", rangeEnd: "2026-09-01", out },
      {
        clientFactory: fakeClientFactory(chainAccount),
        readHiveHistoryImpl: async () => ({ operations: [] }),
        readHiveEngineHistoryImpl: async () => ({ entries: [], fills: [] }),
        fetchHiveEngineBalancesImpl: async () => [],
        checkLedgerImpl: () => ({ ok: true, report: { findings: [] } }),
      },
    );
    assert.equal(result.check.ok, true);
    assert.equal(result.coverage.status, "unresolved");
    assert.equal(result.evidence.balanceEvidence.boundaryAlignment, "not-established");
    assert.equal(result.evidence.balanceEvidence.openingBasis, "derived-from-live-closing-minus-window-delta");
    const { readFile } = await import("node:fs/promises");
    const delivered = await readFile(out, "utf8");
    assert.ok(delivered.includes("live-balances-not-established-at-history-cutoff"));
    assert.ok(result.balanceReport.text.length > 0);
    assert.equal(result.balanceReport.exitCode, 0);
    assert.equal(result.valuationReport.exitCode, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
