/** `receipts` — the one place this package calls the house semantic record journal. */
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";

/**
 * Records one pool receipt into the journal rooted at `journalRoot`.
 * @param {string} journalRoot Custody root the journal appends `data/logs/*.jsonl` under.
 * @param {string} category One of `"release"`, `"admission"`, `"reconciliation"`, `"mismatch"`, `"enterprise-roster"`, `"vote"`, `"cycle-tally"`, `"cycle-split"`, `"cycle-transactions"`, `"base-reconciliation"`, `"disclosure"`.
 * @param {object} record The receipt body to record.
 * @param {string} recordedAt ISO date/time the receipt is recorded at.
 * @returns {{id: string, objectKind: string, appended: boolean, appended: boolean}} The journal's own append result.
 */
export function recordPoolReceipt(journalRoot, category, record, recordedAt) {
  const journal = createSemanticRecordJournal({ root: journalRoot, objectKind: "pool.receipt" });
  return journal.record({ category, record, recordedAt, charge: { support: true, refutation: false } });
}
