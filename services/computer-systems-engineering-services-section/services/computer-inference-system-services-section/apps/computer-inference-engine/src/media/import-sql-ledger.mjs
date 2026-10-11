/**
 * The media ledgers' read-once admission of a SQLite store left from before they kept a journal:
 * the only place a ledger still touches SQL, and the node runtime holds none: read-legacy-sqlite.py
 * (read-only, immutable, bounded; see legacy-sqlite-reader.mjs) receives the file. `admitSqlOnce`
 * reads it with one of the row readers below, records each row into the ledger's journal and writes
 * a receipt beside the journal so the admission is never repeated.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readLegacySqlite } from "@red-cup-engineering/computer-system-engine/legacy-sqlite-reader";

/**
 * Admit a SQLite store left at `storePath` into the journal once: `rowsOf(legacy)` returns
 * `[category, record]` pairs from the received file (`legacy.has(table)`, `legacy.rows(table)`) and
 * names the tables it reads in `rowsOf.tables` (`[{ table, order? }]`). Returns the receipt (the
 * earlier one when already admitted), or null when there is no SQLite file.
 */
export function admitSqlOnce(ledger, storePath, rowsOf) {
  const receiptPath = join(ledger.root, "sql-admission.json");
  if (existsSync(receiptPath)) return JSON.parse(readFileSync(receiptPath, "utf8"));
  if (!/\.sqlite$/u.test(storePath) || !existsSync(storePath) || statSync(storePath).size === 0) return null;
  return ledger.exclusively(() => {
    if (existsSync(receiptPath)) return JSON.parse(readFileSync(receiptPath, "utf8"));
    const rows = readLegacySqlite(storePath, rowsOf.tables, (legacy) => [...rowsOf(legacy)]);
    const counts = {};
    for (const [category, record] of rows) { ledger.record(category, record); counts[category] = (counts[category] ?? 0) + 1; }
    const receipt = Object.freeze({ type: "LedgerSqlAdmission", version: 1, from: resolve(storePath), at: new Date().toISOString(), counts });
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
    return receipt;
  });
}

const parsed = (text) => JSON.parse(text);

/** What a SQLite allowance ledger held, as the journal records it. */
export function allowanceLedgerSqlRows(legacy) {
  const all = (table) => (legacy.has(table) ? legacy.rows(table) : []);
  return [
    ...[...all("allowance_evidence")].map((row) => ["evidence", { allowance: row.allowance, source: row.source, at: row.at, entry: parsed(row.entry) }]),
    ...[...all("allowance_hold")].map((row) => ["hold", { id: row.id, allowance: row.allowance, state: row.state, hold: parsed(row.hold) }]),
    ...[...all("allowance_declaration")].map((row) => ["declaration", { allowance: row.allowance, at: row.at, declaration: parsed(row.declaration) }]),
  ];
}
allowanceLedgerSqlRows.tables = Object.freeze([{ table: "allowance_evidence", order: "at" }, { table: "allowance_hold", order: "rowid" }, { table: "allowance_declaration", order: "allowance" }]);

/** What a SQLite account capacity store held, as the journal records it. */
export function accountCapacitySqlRows(legacy) {
  return legacy.has("account_capacity")
    ? [...legacy.rows("account_capacity")].map((row) => ["window", { key: row.key, version: row.version, value: parsed(row.value) }])
    : [];
}
accountCapacitySqlRows.tables = Object.freeze([{ table: "account_capacity", order: "key" }]);
