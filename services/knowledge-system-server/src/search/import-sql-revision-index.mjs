/**
 * src/search/import-sql-revision-index - the read-once admission of an SQLite FTS5 archive index left
 * from before CAIRN kept its archive index in a journal: the only place the archive index still reads
 * SQL. The file is opened read-only and its bodies, texts, occurrences and cursors are staged into
 * the journal in batches, so nothing indexed before is lost; a receipt recorded once the whole file
 * is read keeps it from being read again, and an admission that stopped part way is read again
 * whole (bodies and occurrences already held are kept once).
 */
import { closeSync, openSync, readSync } from "node:fs";

const SQLITE_HEADER = "SQLite format 3\u0000";
const BATCH = 500;

/** Whether `file` is an SQLite database (its first sixteen bytes are the SQLite header). */
export function isSqliteFile(file) {
  let descriptor;
  try { descriptor = openSync(file, "r"); } catch { return false; }
  try {
    const header = Buffer.alloc(16);
    return readSync(descriptor, header, 0, 16, 0) === 16 && header.toString("latin1") === SQLITE_HEADER;
  } finally { closeSync(descriptor); }
}

/**
 * Read an SQLite archive index (`body`, `body_text`, `occurrence`, `cursor`) into a revision journal
 * (`openRevisionJournal`), read-only. Returns how much it admitted.
 */
export function importSqlRevisionIndex(file, store) {
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')").all().map((row) => row.name));
    if (!["body", "body_text", "occurrence", "cursor"].every((table) => tables.has(table))) {
      const receipt = Object.freeze({ from: file, bodies: 0, occurrences: 0, sources: 0 });
      store.recordAdmission(receipt);
      return receipt;
    }
    let bodies = 0, occurrences = 0, staged = 0;
    const step = () => { if (++staged % BATCH === 0) store.flush(); };
    try {
      for (const row of db.prepare("SELECT body.id AS id, body.title AS title, body.bytes AS bytes, body_text.text AS text FROM body JOIN body_text ON body_text.id = body.id").iterate()) {
        if (store.admitBody(row.id, row.title, row.bytes, row.text)) bodies += 1;
        step();
      }
      for (const row of db.prepare("SELECT id, source, path, revision, at, deleted FROM occurrence").iterate()) {
        store.occur(row.id, row.source, row.path, row.revision, row.at, row.deleted === 1);
        occurrences += 1;
        step();
      }
      const tips = new Map();
      for (const row of db.prepare("SELECT source, tip FROM cursor").iterate()) {
        if (tips.has(row.source)) tips.get(row.source).push(row.tip); else tips.set(row.source, [row.tip]);
      }
      for (const [source, held] of tips) store.setCursor(source, held);
      store.flush();
      const receipt = Object.freeze({ from: file, bodies, occurrences, sources: tips.size });
      store.recordAdmission(receipt);
      return receipt;
    } catch (error) {
      store.discard();
      throw error;
    }
  } finally { db.close(); }
}
