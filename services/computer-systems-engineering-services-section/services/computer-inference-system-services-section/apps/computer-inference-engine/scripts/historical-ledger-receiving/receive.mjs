import { withHistoricalSnapshot } from "./custody.mjs";
/**
 * Explicit offline receiving, never called by native opening. The media ledgers' read-once admission of a SQLite store left from before they kept a journal:
 * the only place a ledger still touches SQL, and the node runtime holds none: read-legacy-sqlite.py
 * (read-only, immutable, bounded; see legacy-sqlite-reader.mjs) receives the file. `admitSqlOnce`
 * reads it with one of the row readers below, records each row into the ledger's journal and writes
 * a receipt beside the journal so the admission is never repeated.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readLegacySqlite } from "@red-cup-engineering/historical-sql-reader-service";

/**
 * Admit a SQLite store left at `storePath` into the journal once: `rowsOf(legacy)` returns
 * `[category, record]` pairs from the received file (`legacy.has(table)`, `legacy.rows(table)`) and
 * names the tables it reads in `rowsOf.tables` (`[{ table, order? }]`). Returns the receipt (the
 * earlier one when already admitted). Missing or unresolved original custody refuses.
 */
export function admitSqlOnce(ledger, storePath, rowsOf, {expectedSha256, python}={}) {
 return withHistoricalSnapshot(storePath, ledger.root, expectedSha256, (snapshot, verify) => {
  const receiptPath = join(ledger.root, "sql-admission.json");
  const previous=()=>{const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));if(receipt.sourceSha256!==expectedSha256)throw new Error('Historical ledger receiving identity conflict');return receipt;};
  if (existsSync(receiptPath)) return previous();
  return ledger.exclusively(() => {
    if (existsSync(receiptPath)) return previous();
    const rows = readLegacySqlite(snapshot, rowsOf.tables, (legacy) => {
      if(!rowsOf.tables.some(({table})=>legacy.has(table)))throw new Error('Historical ledger source has no recognized tables');
      return [...rowsOf(legacy)];
    }, {python});
    verify();
    const counts = {};
    for (const [category, record] of rows) { ledger.record(category, record); counts[category] = (counts[category] ?? 0) + 1; }
    const receipt = Object.freeze({ type: "LedgerSqlAdmission", version: 2, sourceSha256:expectedSha256, from: resolve(storePath), at: new Date().toISOString(), counts });
    verify();
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode:0o600 });
    return receipt;
  });
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
allowanceLedgerSqlRows.tables = Object.freeze([{ table: "allowance_evidence", requiredColumns: ["allowance", "source", "at", "entry"], order: "at" }, { table: "allowance_hold", requiredColumns: ["id", "allowance", "state", "hold"], order: "rowid" }, { table: "allowance_declaration", requiredColumns: ["allowance", "at", "declaration"], order: "allowance" }]);

/** What a SQLite account capacity store held, as the journal records it. */
export function accountCapacitySqlRows(legacy) {
  return legacy.has("account_capacity")
    ? [...legacy.rows("account_capacity")].map((row) => ["window", { key: row.key, version: row.version, value: parsed(row.value) }])
    : [];
}
accountCapacitySqlRows.tables = Object.freeze([{ table: "account_capacity", requiredColumns: ["key", "version", "value"], order: "key" }]);
