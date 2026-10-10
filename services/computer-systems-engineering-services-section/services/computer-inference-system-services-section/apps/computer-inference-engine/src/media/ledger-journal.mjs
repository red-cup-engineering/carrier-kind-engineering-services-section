/**
 * The media ledgers' one log: each ledger is a semantic-record journal (a witness journal of told,
 * content-addressed records) beside the name its SQLite store had, and nothing is updated in place.
 * A ledger named `…/allowance-ledger.sqlite` keeps its journal at `…/allowance-ledger.journal`; the
 * SQLite file, where one is left from before, is read once, read-only, into the journal, and a
 * receipt in the journal marks that admission so it is never repeated (`admitSqlOnce`).
 *
 * Readers fold the journal and see what other processes appended. A writer whose admission depends
 * on what it reads (a hold fitting its allowance, a compare-and-set) runs inside `exclusively`, a
 * lock directory beside the journal, so consumers on one host serialize as they did on the SQLite
 * store's IMMEDIATE transactions. A lock left by a process that died is taken over once stale.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

export const HELD = Object.freeze({ for: true, against: false });
const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 15_000;
const pause = new Int32Array(new SharedArrayBuffer(4));

/** The journal root a ledger named by `storePath` keeps. */
export const ledgerJournalRoot = (storePath) => {
  if (typeof storePath !== "string" || !storePath.trim()) throw new TypeError("ledger store path is required");
  return `${resolve(storePath).replace(/\.sqlite$/u, "")}.journal`;
};

/** Recording instants that strictly increase within the process, so journal order is append order. */
function instants() {
  let last = 0;
  return () => {
    const now = Math.max(Date.now(), last + 1);
    last = now;
    return new Date(now).toISOString();
  };
}
const recordedAt = instants();

/** One ledger's journal: `record(category, record)` appends a held record; `read(category)` folds them in append order. */
export function openLedgerJournal(storePath, objectKind) {
  const root = ledgerJournalRoot(storePath);
  mkdirSync(root, { recursive: true });
  const journal = createSemanticRecordJournal({ root, objectKind });
  return Object.freeze({
    root,
    record: (category, record) => journal.record({ category, recordedAt: recordedAt(), told: HELD, record }),
    read: (category) => journal.query({ category }).filter((row) => row.told?.for && !row.told?.against).map((row) => row.record),
    exclusively: (work) => exclusively(root, work),
  });
}

function exclusively(root, work) {
  const lock = join(root, ".lock");
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try { mkdirSync(lock); break; } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let age = 0;
      try { age = Date.now() - statSync(lock).mtimeMs; } catch { continue; }
      if (age > LOCK_STALE_MS) { rmSync(lock, { recursive: true, force: true }); continue; }
      if (Date.now() > deadline) throw new Error(`ledger journal ${root} is held by another writer`);
      Atomics.wait(pause, 0, 0, 5);
    }
  }
  try { return work(); } finally { rmSync(lock, { recursive: true, force: true }); }
}

/**
 * Admit a SQLite store left at `storePath` into the journal once: `rowsOf(database)` returns
 * `[category, record]` pairs, read with the database open read-only. Returns the receipt (the
 * earlier one when already admitted), or null when there is no SQLite file.
 */
export function admitSqlOnce(ledger, storePath, rowsOf) {
  const receiptPath = join(ledger.root, "sql-admission.json");
  if (existsSync(receiptPath)) return JSON.parse(readFileSync(receiptPath, "utf8"));
  if (!/\.sqlite$/u.test(storePath) || !existsSync(storePath) || statSync(storePath).size === 0) return null;
  return ledger.exclusively(() => {
    if (existsSync(receiptPath)) return JSON.parse(readFileSync(receiptPath, "utf8"));
    const database = new DatabaseSync(storePath, { readOnly: true });
    let rows;
    try {
      const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
      rows = rowsOf(database, tables);
    } finally { database.close(); }
    const counts = {};
    for (const [category, record] of rows) { ledger.record(category, record); counts[category] = (counts[category] ?? 0) + 1; }
    const receipt = Object.freeze({ type: "LedgerSqlAdmission", version: 1, from: resolve(storePath), at: new Date().toISOString(), counts });
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
    return receipt;
  });
}
