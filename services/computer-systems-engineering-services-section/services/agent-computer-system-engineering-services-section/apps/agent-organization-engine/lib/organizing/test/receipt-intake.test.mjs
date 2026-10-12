import assert from "node:assert/strict";
import test from "node:test";
import { posting, transaction } from "../src/accounting/ledger.mjs";
import { reconcileReceiptCandidates } from "../src/accounting/receipt-intake.mjs";
import { gradedFromParts } from "@red-cup-engineering/exact-number-data-service/graded";

const usd = (value) => gradedFromParts(BigInt(value), 1n, "USD");
const candidate = (sourceId, amount = 4, meta = {}) => ({
  sourceId,
  evidence: ["ni:///sha-256;witness"],
  transaction: transaction({
    date: "2026-09-07", narration: "External receipt",
    meta: { source_id: sourceId, evidence_ids: JSON.stringify(["ni:///sha-256;witness"]), recognition: "contract-liability", ...meta },
    postings: [posting({ account: "Assets:Cash", amount: usd(amount) }), posting({ account: "Liabilities:Contract", amount: usd(-amount) })],
  }),
});

test("receipt intake is replay-safe, blocks changed payload batches, and holds incomplete evidence", () => {
  const one = candidate("hive:a6308-0");
  const replay = reconcileReceiptCandidates([], [one, one]);
  assert.equal(replay.accepted.length, 1);
  assert.equal(replay.duplicates.length, 1);
  const conflict = reconcileReceiptCandidates([], [one, candidate("hive:a6308-0", 5)]);
  assert.equal(conflict.accepted.length, 0);
  assert.equal(conflict.conflicts.length, 2);
  const missing = reconcileReceiptCandidates([], [{ ...one, evidence: [] }]);
  assert.equal(missing.refused[0].reason, "candidate-identity-or-evidence-missing");
});

test("receipt intake preserves cash advance and collection postings without recognizing revenue", () => {
  const advance = candidate("x402:base:usdc:receiver:hash:0", 4, { recognition: "contract-liability" });
  const collection = candidate("x402:base:usdc:receiver:hash:1", 4, { recognition: "receivable-collection" });
  const report = reconcileReceiptCandidates([], [advance, collection]);
  assert.equal(report.accepted.length, 2);
  assert.equal(report.accepted.some(({ transaction: value }) => value.postings.some(({ account }) => account.startsWith("Income:"))), false);
});

test("a retained legacy source id blocks replay until its evidence is reconciled", () => {
  const incoming = candidate("a6308f23ba5026f1e670e61cea257eaf62524322-0");
  const retained = transaction({
    date: incoming.transaction.date,
    narration: incoming.transaction.narration,
    meta: { source_id: incoming.sourceId, venue: "hive-engine", witness_block: "62583781" },
    postings: incoming.transaction.postings,
  });
  const report = reconcileReceiptCandidates([retained], [incoming]);
  assert.equal(report.accepted.length, 0);
  assert.equal(report.conflicts[0].reason, "retained-source-identity-legacy-ambiguity");
});
