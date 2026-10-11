import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
/**
 * The media ledgers' read-once admission of a SQLite store left from before they kept a journal:
 * the only place a ledger still reads SQL. `admitSqlOnce` opens the file read-only, reads it with
 * one of the row readers below, records each row into the ledger's journal and writes a receipt
 * beside the journal so the admission is never repeated.
 */
import { existsSync, readFileSync, lstatSync, writeFileSync, mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Admit a SQLite store left at `storePath` into the journal once: `rowsOf(database, tables)`
 * returns `[category, record]` pairs, read with the database open read-only. Returns the receipt
 * (the earlier one when already admitted), or null when there is no SQLite file.
 */
export function admitSqlOnce(ledger, storePath, rowsOf, {expectedSha256}={}) {
  if(!/^[a-f0-9]{64}$/u.test(expectedSha256??''))throw new Error('Historical ledger source identity is required');
  if(!existsSync(storePath))return null;
  if(resolve(ledger.root)===resolve(storePath).replace(/\.sqlite$/u,'')+'.journal')throw new Error('Historical receiving requires a distinct native destination');
  const held=lstatSync(storePath);if(!held.isFile()||held.isSymbolicLink()||held.size>64*1024*1024)throw new Error('Historical ledger source is not bounded regular custody');
  const digest=()=>createHash('sha256').update(readFileSync(storePath)).digest('hex');
  if(digest()!==expectedSha256)throw new Error('Historical ledger source identity changed');
  for(const suffix of ['-wal','-journal'])if(existsSync(storePath+suffix)){const sidecar=lstatSync(storePath+suffix);if(!sidecar.isFile()||sidecar.isSymbolicLink()||sidecar.size!==0)throw new Error('Historical ledger source has unresolved transaction custody');}
  const previous=()=>{const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));if(receipt.sourceSha256!==expectedSha256)throw new Error('Historical ledger receiving identity conflict');return receipt;};
  const receiptPath = join(ledger.root, "sql-admission.json");
  if (existsSync(receiptPath)) return previous();
  if (!/\.sqlite$/u.test(storePath) || !existsSync(storePath) || lstatSync(storePath).size === 0) return null;
  return ledger.exclusively(() => {
    if (existsSync(receiptPath)) return previous();
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
    const scratch=mkdtempSync(join(tmpdir(),'inference-ledger-receiving-')),snapshot=join(scratch,'source.sqlite');
    let database,rows;
    try {
      copyFileSync(storePath,snapshot);if(createHash('sha256').update(readFileSync(snapshot)).digest('hex')!==expectedSha256)throw new Error('Historical ledger snapshot identity changed');
      database=new DatabaseSync(snapshot,{readOnly:true});
      const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
      database.exec('PRAGMA query_only=on');database.exec('BEGIN');
      let totalRows=0,totalBytes=0;const bounded={prepare(query){if(!/^SELECT\b/iu.test(query))throw new Error('Historical ledger requires read-only queries');return {all(){const result=[];for(const row of database.prepare(query).iterate()){totalBytes+=Buffer.byteLength(JSON.stringify(row));if(++totalRows>20000||totalBytes>64*1024*1024)throw new Error('Historical ledger representation bound exhausted');result.push(row);}return result;}};}};
      rows = rowsOf(bounded, tables);database.exec('COMMIT');
    } finally { database?.close();rmSync(scratch,{recursive:true,force:true}); }
    if(digest()!==expectedSha256)throw new Error('Historical ledger source changed before receiving');
    const counts = {};
    for (const [category, record] of rows) { ledger.record(category, record); counts[category] = (counts[category] ?? 0) + 1; }
    const receipt = Object.freeze({ type: "LedgerSqlAdmission", version: 2, sourceSha256: expectedSha256, from: resolve(storePath), at: new Date().toISOString(), counts });
    if(digest()!==expectedSha256)throw new Error('Historical ledger original source changed during receiving');
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
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
