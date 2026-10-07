import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { admitHiveAccountLedgerMark } from "@red-cup-engineering/derive-hive-account-ledger-service";
import { runHiveAutoLedger } from "../hive-auto-ledger-cli.mjs";

test("a balanced ledger carries unresolved history and exact observations in its delivered file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rowan-hive-ledger-evidence-"));
  const chainAccount = { name: "evidenceaccount", created: "2026-01-01T00:00:00", balance: "0.000 HIVE", hbd_balance: "0.000 HBD", vesting_shares: "0.000000 VESTS" };
  const hiveHistory = { operations: [{ index: 1, kind: "unrecognized_resource_change", trxId: "evidence-transaction", timestamp: "2026-01-02T00:00:00", payload: { resource: "future-commodity", amount: "12345678901234567890.000001" } }], refusals: [{ reason: "witness-disagreement", nodes: ["primary", "secondary"] }] };
  const heHistory = { entries: [], fills: [], refusals: [{ reason: "unclassified-operation", transactionId: "engine-transaction" }] };
  try {
    const result = await runHiveAutoLedger({ account: chainAccount.name, rangeEnd: "2026-01-03", out: join(dir, "account.beancount") }, {
      clientFactory: () => ({ getAccounts: async () => [chainAccount] }),
      readHiveHistoryImpl: async () => hiveHistory,
      readHiveEngineHistoryImpl: async () => heHistory,
      fetchHiveEngineBalancesImpl: async () => [],
    });
    assert.equal(result.check.ok, true, "accounting validity must not erase coverage failures");
    assert.equal(result.coverage.status, "unresolved");
    assert.deepEqual(result.coverage.unresolved.map((r) => r.source), ["hive-history", "hive-engine-history", "ledger-derivation"]);
    const delivered = await readFile(result.out, "utf8");
    const record = delivered.split("\n").find((line) => line.startsWith("; hive-ledger-evidence "));
    const evidence = JSON.parse(record.slice("; hive-ledger-evidence ".length));
    assert.deepEqual(evidence.hiveHistory, hiveHistory);
    assert.deepEqual(evidence.hiveEngineHistory, heHistory);
    assert.deepEqual(evidence.coverage, result.coverage);
    assert.equal(admitHiveAccountLedgerMark(evidence.ledgerDerivation).ok, true);
    assert.deepEqual(evidence.ledgerDerivation.content, result.ledgerResult);
    assert.equal(admitHiveAccountLedgerMark({ ...evidence.ledgerDerivation, content: { ...evidence.ledgerDerivation.content, account: "other" } }).ok, false);
    assert.equal(evidence.hiveHistory.operations[0].payload.amount, "12345678901234567890.000001");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("ledger export refuses missing custody before network access or writing", async () => {
  let touched = false;
  await assert.rejects(runHiveAutoLedger({ account: "emsenn0" }, { clientFactory: () => { touched = true; throw Error("unexpected network"); } }), /explicit out destination/);
  assert.equal(touched, false);
});

