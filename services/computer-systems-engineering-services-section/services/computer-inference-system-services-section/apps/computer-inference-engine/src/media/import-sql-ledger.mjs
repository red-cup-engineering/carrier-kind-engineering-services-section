/**
 * The media ledgers' read-once admission of a SQLite store left from before they kept a journal:
 * the only place a ledger still reads SQL. `admitSqlOnce` opens the file read-only, reads it with
 * one of the row readers below, records each row into the ledger's journal and writes a receipt
 * beside the journal so the admission is never repeated.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Admit a SQLite store left at `storePath` into the journal once: `rowsOf(database, tables)`
 * returns `[category, record]` pairs, read with the database open read-only. Returns the receipt
 * (the earlier one when already admitted), or null when there is no SQLite file.
 */
export function admitSqlOnce(ledger, storePath, rowsOf) {
  const receiptPath = join(ledger.root, "sql-admission.json");
  if (existsSync(receiptPath)) return JSON.parse(readFileSync(receiptPath, "utf8"));
  if (!/\.sqlite$/u.test(storePath) || !existsSync(storePath) || statSync(storePath).size === 0) return null;
  return ledger.exclusively(() => {
    if (existsSync(receiptPath)) return JSON.parse(readFileSync(receiptPath, "utf8"));
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
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

/** What a SQLite allowance ledger held, as the journal records it. */
export function allowanceLedgerSqlRows(database, tables) {
  const all = (table, sql) => (tables.has(table) ? database.prepare(sql).all() : []);
  return [
    ...all("allowance_evidence", "SELECT allowance, source, at, entry FROM allowance_evidence ORDER BY at")
      .map((row) => ["evidence", { allowance: row.allowance, source: row.source, at: row.at, entry: JSON.parse(row.entry) }]),
    ...all("allowance_hold", "SELECT id, allowance, state, hold FROM allowance_hold ORDER BY rowid")
      .map((row) => ["hold", { id: row.id, allowance: row.allowance, state: row.state, hold: JSON.parse(row.hold) }]),
    ...all("allowance_declaration", "SELECT allowance, at, declaration FROM allowance_declaration ORDER BY allowance")
      .map((row) => ["declaration", { allowance: row.allowance, at: row.at, declaration: JSON.parse(row.declaration) }]),
  ];
}

/** What a SQLite account capacity store held, as the journal records it. */
export function accountCapacitySqlRows(database, tables) {
  return tables.has("account_capacity")
    ? database.prepare("SELECT key, version, value FROM account_capacity ORDER BY key").all()
      .map((row) => ["window", { key: row.key, version: row.version, value: JSON.parse(row.value) }])
    : [];
}
