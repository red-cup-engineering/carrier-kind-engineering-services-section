import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectJournalFormat, dispatch, dispatchEntries, parseJournalFile } from "@red-cup-engineering/farolfi";
import { consolidateBooks } from "@red-cup-engineering/organizing/accounting/consolidation";
import { readFileText } from "@red-cup-engineering/file-services/read-file";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";

const REPORT_COMMANDS = Object.freeze({
  "balance": "bal",
  "balance-sheet": "bs",
  "income-statement": "is",
  "cashflow": "cashflow",
  "register": "reg",
  "accounts": "accounts",
  "stats": "stats",
  "lots": "lots",
  "valuation": "valuation",
  "reconcile": "reconcile",
  "check": "check",
});

function cliOptionsFrom(input) {
  return {
    format: null,
    output: "json",
    account: input.account ?? null,
    begin: input.begin ?? null,
    end: input.end ?? null,
    depth: input.depth ?? null,
    status: input.status ?? null,
    payee: input.payee ?? null,
    requireMeta: input.requireMeta ?? null,
    to: null,
    reportingCommodity: input.reportingCommodity ?? null,
    help: false,
  };
}

/**
 * Reads one Farolfi accounting report from a Beancount or hledger journal, given an on-disk
 * journal path, inline journal text, or a set of books to read consolidated (a legal entity's
 * holdings book and its micro-enterprises' books; a book not yet written holds nothing).
 * Composes `@red-cup-engineering/farolfi`'s `dispatch` (for a journal), `dispatchEntries` with
 * organizing's `consolidateBooks` (for books) and `detectJournalFormat` (for inline text); it
 * contains no balance, settlement, or report-rendering logic of its own.
 * @param {{ journal: ({ path: string } | { text: string, format?: ("beancount"|"hledger") }
 *     | { books: { book: string, path: string }[] }),
 *   report: ("balance"|"balance-sheet"|"income-statement"|"cashflow"|"register"|"accounts"|
 *     "stats"|"lots"|"valuation"|"reconcile"|"check"),
 *   begin?: string, end?: string, account?: string, depth?: number, status?: string,
 *   payee?: string, requireMeta?: string, reportingCommodity?: string, now?: string }} input
 *   `reportingCommodity` selects the "valuation" report's target commodity (default "USD"),
 *   using the journal's own price directives to convert each position; every other report
 *   ignores it.
 * @returns {Promise<object>} Farolfi's `-o json` report shape for `input.report`, merged with
 *   `{ kind: "ledger-report", report, journal, generatedAt }`; `generatedAt` is `input.now`
 *   when given (for reproducible fabrication examples and tests), else the real current time.
 * @throws {TypeError} When `input.report` is not one of the eleven supported reports, or
 *   `input.journal` names neither `path`, `text` nor `books`.
 */
export async function readLedgerReport(input) {
  if (!input || typeof input !== "object") throw new TypeError("read-ledger-report: input must be an object");
  const command = REPORT_COMMANDS[input.report];
  if (!command) {
    throw new TypeError(`read-ledger-report: report must be one of ${Object.keys(REPORT_COMMANDS).join(", ")}, got ${JSON.stringify(input.report)}`);
  }
  const journal = input.journal;
  if (!journal || typeof journal !== "object") throw new TypeError("read-ledger-report: input.journal must be an object");

  if (Array.isArray(journal.books)) {
    const books = journal.books.map(({ book, path }) => ({ book, path, entries: existsSync(path) ? parseJournalFile(path).entries : [] }));
    const result = dispatchEntries(command, consolidateBooks(books), cliOptionsFrom(input));
    return Object.freeze({
      ...JSON.parse(result.text),
      kind: "ledger-report",
      report: input.report,
      journal: { books: books.map(({ book, path, entries }) => ({ book, path, held: entries.length > 0 })) },
      generatedAt: typeof input.now === "string" ? input.now : new Date().toISOString(),
    });
  }

  let filePath;
  let journalDescriptor;
  let cleanup = async () => {};
  if (typeof journal.path === "string" && journal.path.length > 0) {
    await readFileText(journal.path); // validates the top-level journal is present and readable before farolfi resolves its includes
    filePath = journal.path;
    journalDescriptor = { path: journal.path, format: detectJournalFormat({ path: journal.path }) };
  } else if (typeof journal.text === "string") {
    const format = journal.format === "beancount" || journal.format === "hledger"
      ? journal.format
      : detectJournalFormat({ text: journal.text });
    filePath = join(tmpdir(), `read-ledger-report-${randomUUID()}.${format === "beancount" ? "beancount" : "journal"}`);
    await writeFileText(filePath, journal.text);
    cleanup = () => rm(filePath, { recursive: true, force: true });
    journalDescriptor = { text: true, format };
  } else {
    throw new TypeError("read-ledger-report: input.journal must name a path, text or books");
  }

  try {
    const result = dispatch(command, [filePath], cliOptionsFrom(input));
    return Object.freeze({
      ...JSON.parse(result.text),
      kind: "ledger-report",
      report: input.report,
      journal: journalDescriptor,
      generatedAt: typeof input.now === "string" ? input.now : new Date().toISOString(),
    });
  } finally {
    await cleanup();
  }
}
