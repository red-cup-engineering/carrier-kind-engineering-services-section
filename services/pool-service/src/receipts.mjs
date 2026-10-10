/** `receipts` — the one place this package calls the house semantic record journal (the one log). */
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

/** The kind every pool receipt is kept under. Receipts recorded before this package moved onto
 * semiotic-eavt (the legacy `data/logs/.../witness-journal-seavt.jsonl` feed) read back under it unchanged. */
export const POOL_RECEIPT_OBJECT_KIND = "pool.receipt";
const journalAt = (journalRoot) => createSemanticRecordJournal({ root: journalRoot, objectKind: POOL_RECEIPT_OBJECT_KIND });

/**
 * Records one pool receipt into the journal rooted at `journalRoot`, told held.
 * @param {string} journalRoot Settlement root the journal is kept under.
 * @param {string} category One of `"release"`, `"admission"`, `"reconciliation"`, `"mismatch"`, `"enterprise-roster"`, `"vote"`, `"cycle-tally"`, `"cycle-split"`, `"cycle-transactions"`, `"base-reconciliation"`, `"disclosure"`.
 * @param {object} record The receipt body to record.
 * @param {string} recordedAt ISO date/time the receipt is recorded at.
 * @returns {{id: string, objectKind: string, appended: number, events: string[], told: {for: boolean, against: boolean}}} The journal's own append result.
 */
export function recordPoolReceipt(journalRoot, category, record, recordedAt) {
  return journalAt(journalRoot).record({ category, record, recordedAt, told: { for: true, against: false } });
}

/** Every pool receipt of one category the journal at `journalRoot` holds, in the order recorded. */
export function poolReceipts(journalRoot, category) {
  return journalAt(journalRoot).query({ category }).map((row) => Object.freeze({ id: row.id, recordedAt: row.recordedAt, record: row.record }));
}
