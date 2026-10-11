import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
/**
 * src/search/import-sql-revision-index - the read-once admission of an SQLite FTS5 archive index left
 * from before CAIRN kept its archive index in a journal: the only place the archive index still reads
 * SQL. The file is opened read-only and its bodies, texts, occurrences and cursors are staged into
 * the journal in batches, so nothing indexed before is lost; a receipt recorded once the whole file
 * is read keeps it from being read again, and an admission that stopped part way is read again
 * whole (bodies and occurrences already held are kept once).
 */
import { closeSync, openSync, readSync, lstatSync, existsSync, mkdtempSync, copyFileSync, rmSync } from "node:fs";

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
function sourceIdentity(file){
 const held=lstatSync(file);if(!held.isFile()||held.isSymbolicLink()||held.size>256*1024*1024)throw new Error('Historical revision index requires bounded regular custody');
 for(const suffix of ['-wal','-journal'])if(existsSync(file+suffix)){const sidecar=lstatSync(file+suffix);if(!sidecar.isFile()||sidecar.isSymbolicLink()||sidecar.size!==0)throw new Error('Historical revision index has unresolved transaction custody');}
 const hash=createHash('sha256'),fd=openSync(file,'r'),buffer=Buffer.alloc(1024*1024);let total=0;
 try{for(;;){const size=readSync(fd,buffer,0,buffer.length,null);if(!size)break;total+=size;if(total>256*1024*1024)throw new Error('Historical revision source bound exhausted');hash.update(buffer.subarray(0,size));}return hash.digest('hex');}finally{closeSync(fd);}
}
export function importSqlRevisionIndex(file, store, {expectedSha256}={}) {
  if(!/^[a-f0-9]{64}$/u.test(expectedSha256??'')||sourceIdentity(file)!==expectedSha256)throw new Error('Historical revision source identity is required and must match');
  if(resolve(store.root)===resolve(file)+'.journal')throw new Error('Historical index receiving requires a distinct native destination');
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
  const scratch=mkdtempSync(join(tmpdir(),'revision-index-offline-receiving-')),snapshot=join(scratch,'source.sqlite');let db;
  try {
    copyFileSync(file,snapshot);if(sourceIdentity(snapshot)!==expectedSha256)throw new Error('Historical revision snapshot changed');
    db = new DatabaseSync(snapshot,{readOnly:true});db.exec('PRAGMA query_only=on');db.exec('BEGIN');
    let rows=0,bytes=0;const bounded=query=>({*[Symbol.iterator](){for(const row of db.prepare(query).iterate()){bytes+=Buffer.byteLength(JSON.stringify(row));if(++rows>100000||bytes>128*1024*1024)throw new Error('Historical revision representation bound exhausted');yield row;}}});
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')").all().map((row) => row.name));
    if (!["body", "body_text", "occurrence", "cursor"].every((table) => tables.has(table))) {
      throw new Error('Historical revision index lacks its required custody tables');
    }
    let bodies = 0, occurrences = 0, staged = 0;
    const step = () => { if (++staged % BATCH === 0) store.flush(); };
    try {
      for (const row of bounded("SELECT body.id AS id, body.title AS title, body.bytes AS bytes, body_text.text AS text FROM body JOIN body_text ON body_text.id = body.id")) {
        if (store.admitBody(row.id, row.title, row.bytes, row.text)) bodies += 1;
        step();
      }
      for (const row of bounded("SELECT id, source, path, revision, at, deleted FROM occurrence")) {
        store.occur(row.id, row.source, row.path, row.revision, row.at, row.deleted === 1);
        occurrences += 1;
        step();
      }
      const tips = new Map();
      for (const row of bounded("SELECT source, tip FROM cursor")) {
        if (tips.has(row.source)) tips.get(row.source).push(row.tip); else tips.set(row.source, [row.tip]);
      }
      for (const [source, held] of tips) store.setCursor(source, held);
      store.flush();
      db.exec('COMMIT');if(sourceIdentity(file)!==expectedSha256)throw new Error('Historical revision original source changed');
      const receipt = Object.freeze({ from: file, sourceSha256:expectedSha256, bodies, occurrences, sources: tips.size });
      store.recordAdmission(receipt);
      return receipt;
    } catch (error) {
      store.discard();
      throw error;
    }
  } finally { db?.close();rmSync(scratch,{recursive:true,force:true}); }
}
