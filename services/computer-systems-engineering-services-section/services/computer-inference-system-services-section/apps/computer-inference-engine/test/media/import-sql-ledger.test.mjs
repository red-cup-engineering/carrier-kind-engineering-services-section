import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeLegacySqlite } from "./write-legacy-sqlite.mjs";
import { accountCapacitySqlRows, admitSqlOnce, allowanceLedgerSqlRows } from "../../src/media/import-sql-ledger.mjs";
import { openLedgerJournal } from "../../src/media/ledger-journal.mjs";

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
const SQL = /node:sql|better-sqlite|sqlite3|libsql|sql\.js|DatabaseSync|CREATE (VIRTUAL )?TABLE|INSERT (OR [A-Z]+ )?INTO|SELECT [^"`']* FROM/u;

test("SQL is read only in the read-once admission: no other module of the engine holds any", () => {
  const holding = readdirSync(source, { recursive: true }).map(String)
    .filter((file) => file.endsWith(".mjs") && !path.basename(file).startsWith("import-sql-"))
    .filter((file) => SQL.test(readFileSync(path.join(source, file), "utf8")));
  assert.deepEqual(holding, []);
});

test("a ledger's SQLite rows are read once into its journal, with a receipt", (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), "import-sql-ledger-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const storePath = path.join(directory, "allowance-ledger.sqlite");
  writeLegacySqlite(storePath, [
    `CREATE TABLE allowance_evidence (allowance TEXT NOT NULL, source TEXT NOT NULL, at TEXT NOT NULL, entry TEXT NOT NULL);
    CREATE TABLE account_capacity (key TEXT PRIMARY KEY, version INTEGER NOT NULL, value TEXT NOT NULL);`,
    ["INSERT INTO allowance_evidence VALUES (?, ?, ?, ?)", "pool", "s1", "2026-10-02T08:00:00.000Z", JSON.stringify({ type: "spend" })],
    ["INSERT INTO account_capacity VALUES (?, ?, ?)", "acct", 3, JSON.stringify({ reservations: [] })],
  ]);

  const ledger = openLedgerJournal(storePath, "test.ledger");
  const receipt = admitSqlOnce(ledger, storePath, Object.assign(
    (legacy) => [...allowanceLedgerSqlRows(legacy), ...accountCapacitySqlRows(legacy)],
    { tables: [...allowanceLedgerSqlRows.tables, ...accountCapacitySqlRows.tables] },
  ));
  assert.deepEqual(receipt.counts, { evidence: 1, window: 1 });
  assert.deepEqual(ledger.read("evidence"), [{ allowance: "pool", source: "s1", at: "2026-10-02T08:00:00.000Z", entry: { type: "spend" } }]);
  assert.deepEqual(ledger.read("window"), [{ key: "acct", version: 3, value: { reservations: [] } }]);
  // A table the store never had reads as nothing; a second admission returns the first receipt.
  assert.deepEqual(admitSqlOnce(ledger, storePath, () => { throw new Error("read again"); }), receipt);
  assert.equal(ledger.read("hold").length, 0);
  assert.equal(admitSqlOnce(openLedgerJournal(path.join(directory, "none.sqlite"), "test.ledger"), path.join(directory, "none.sqlite"), allowanceLedgerSqlRows), null);
});
