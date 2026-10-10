/**
 * src/search/import-sql-revision-index - the read-once admission of an SQLite FTS5 archive index left
 * from before CAIRN kept its archive index in a journal: the only place the archive index still reads
 * SQL. The node runtime holds none: read-legacy-sqlite.py receives the file (read-only, immutable,
 * bounded; see legacy-sqlite-reader.mjs) and its bodies, texts, occurrences and cursors are staged into
 * the journal in batches, so nothing indexed before is lost; a receipt recorded once the whole file
 * is read keeps it from being read again, and an admission that stopped part way is read again
 * whole (bodies and occurrences already held are kept once).
 */
import { closeSync, openSync, readSync } from "node:fs";
import { readLegacySqlite } from "./legacy-sqlite-reader.mjs";

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
  const specs = [
    { table: "body", join: { table: "body_text", on: "id", columns: ["text"] } },
    { table: "occurrence" },
    { table: "cursor" },
  ];
  return readLegacySqlite(file, specs, (legacy) => {
    if (!["body", "body_text", "occurrence", "cursor"].every((table) => legacy.has(table))) {
      const receipt = Object.freeze({ from: file, bodies: 0, occurrences: 0, sources: 0 });
      store.recordAdmission(receipt);
      return receipt;
    }
    let bodies = 0, occurrences = 0, staged = 0;
    const step = () => { if (++staged % BATCH === 0) store.flush(); };
    try {
      for (const row of legacy.rows("body")) {
        if (store.admitBody(row.id, row.title, row.bytes, row["body_text.text"])) bodies += 1;
        step();
      }
      for (const row of legacy.rows("occurrence")) {
        store.occur(row.id, row.source, row.path, row.revision, row.at, row.deleted === 1);
        occurrences += 1;
        step();
      }
      const tips = new Map();
      for (const row of legacy.rows("cursor")) {
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
  });
}
