import { readLedgerReport } from "./reports.mjs";

const READING_REPORTS = Object.freeze({
  balanceSheet: "balance-sheet",
  incomeStatement: "income-statement",
  reconcile: "reconcile",
  stats: "stats",
  accounts: "accounts",
});

/**
 * Reads the standard set of ledger reports a books page needs in one call — balance sheet,
 * income statement, the reconcile worklist, journal statistics, and the account list — by
 * composing `readLedgerReport` once per reading against the same journal. Contains no report
 * logic of its own.
 * @param {{ journal: ({ path: string } | { text: string, format?: ("beancount"|"hledger") }),
 *   begin?: string, end?: string, account?: string, depth?: number, status?: string,
 *   payee?: string, requireMeta?: string, now?: string }} input
 * @returns {Promise<{ kind: "ledger-readings", readings: { balanceSheet: object,
 *   incomeStatement: object, reconcile: object, stats: object, accounts: object } }>}
 * @throws {TypeError} When `input.journal` names neither `path` nor `text`.
 */
export async function readSetOfLedgerReadings(input) {
  if (!input || typeof input !== "object") throw new TypeError("read-set-of-ledger-readings: input must be an object");
  const { journal, ...filters } = input;
  const entries = await Promise.all(
    Object.entries(READING_REPORTS).map(async ([key, report]) => [key, await readLedgerReport({ journal, report, ...filters })]),
  );
  return Object.freeze({ kind: "ledger-readings", readings: Object.freeze(Object.fromEntries(entries)) });
}
