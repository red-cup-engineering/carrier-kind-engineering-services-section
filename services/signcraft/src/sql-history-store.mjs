import { semanticBytes, semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import {
  bindHistoryArchive,
  checkpointHistory,
  historySubjectCells,
  historySubjectKey,
  restoreHistory,
  validateHistory,
} from "./history.mjs";

const CHUNK_CHARACTERS = 180_000;

function encodeJson(value, label) {
  const text = JSON.stringify(value, (_key, item) => {
    if (item === undefined || typeof item === "bigint" || typeof item === "function" || typeof item === "symbol") {
      throw new TypeError(`${label} must contain only JSON values`);
    }
    if (typeof item === "number" && !Number.isFinite(item)) throw new TypeError(`${label} numbers must be finite`);
    return item;
  });
  if (text === undefined) throw new TypeError(`${label} must be a JSON value`);
  return text;
}

function chunksOf(text) {
  const chunks = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + CHUNK_CHARACTERS, text.length);
    // Keep UTF-16 surrogate pairs together so each SQLite TEXT value is valid Unicode.
    if (end < text.length) {
      const last = text.charCodeAt(end - 1);
      if (last >= 0xd800 && last <= 0xdbff) end -= 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks.length ? chunks : [""];
}

function decodeChunks(rows, expected, label) {
  if (!Number.isSafeInteger(expected) || expected < 1 || rows.length !== expected) {
    throw new TypeError(`${label} has incomplete chunk data`);
  }
  let result = "";
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.part !== index) throw new TypeError(`${label} chunks are not contiguous`);
    result += row.payload;
  }
  return result;
}

function splitAndWrite(sql, table, keyColumn, keyValue, text) {
  sql.exec(`DELETE FROM ${table} WHERE ${keyColumn} = ?`, keyValue);
  const chunks = chunksOf(text);
  for (let part = 0; part < chunks.length; part += 1) {
    sql.exec(`INSERT INTO ${table} (${keyColumn},part,payload) VALUES (?,?,?)`, keyValue, part, chunks[part]);
  }
  return chunks.length;
}

// Rewrite a chunked value over the rows it already holds: each kept part is updated in place, so a
// value that keeps its size writes one row per part rather than deleting and inserting every part.
function rewriteChunks(sql, table, keyColumn, keyValue, text, heldParts) {
  const chunks = chunksOf(text);
  for (let part = 0; part < chunks.length; part += 1) {
    if (part < heldParts) sql.exec(`UPDATE ${table} SET payload = ? WHERE ${keyColumn} = ? AND part = ?`, chunks[part], keyValue, part);
    else sql.exec(`INSERT INTO ${table} (${keyColumn},part,payload) VALUES (?,?,?)`, keyValue, part, chunks[part]);
  }
  if (heldParts > chunks.length) sql.exec(`DELETE FROM ${table} WHERE ${keyColumn} = ? AND part >= ?`, keyValue, chunks.length);
  return chunks.length;
}

function readChunked(sql, table, keyColumn, keyValue, count, label) {
  const rows = [...sql.exec(`SELECT part,payload FROM ${table} WHERE ${keyColumn} = ? ORDER BY part`, keyValue)];
  return JSON.parse(decodeChunks(rows, count, label));
}

// Revisions written before the log, one chunked row set each: the oldest part of the archive.
function revisionRows(sql) {
  const headers = [...sql.exec(
    "SELECT revision_id,sequence,parts FROM signcraft_history_revisions ORDER BY sequence",
  )];
  return headers.map((header) => {
    const rows = [...sql.exec(
      "SELECT part,payload FROM signcraft_history_revision_chunks WHERE revision_id = ? ORDER BY part",
      header.revision_id,
    )];
    return JSON.parse(decodeChunks(rows, header.parts, `revision ${header.revision_id}`));
  });
}

// Each log entry is the revisions one commit admitted, in order, as one chunked value.
function logEntries(sql, from) {
  const entries = [];
  let current = null;
  for (const row of sql.exec("SELECT sequence,part,parts,payload FROM signcraft_history_log WHERE sequence >= ? ORDER BY sequence,part", from)) {
    if (current?.sequence !== row.sequence) {
      if (current) entries.push(current);
      current = { sequence: row.sequence, parts: row.parts, rows: [] };
    }
    current.rows.push(row);
  }
  if (current) entries.push(current);
  return entries.map((entry) => ({ sequence: entry.sequence, revisions: JSON.parse(decodeChunks(entry.rows, entry.parts, `log entry ${entry.sequence}`)) }));
}

function archiveRows(sql) {
  return [...revisionRows(sql), ...logEntries(sql, 0).flatMap((entry) => entry.revisions)];
}

function readFrontier(sql) {
  return [...sql.exec(
    "SELECT checkpoint_id,heads,size,functional_predicates,control_parts,next_sequence,next_subject,log_from FROM signcraft_history_frontier WHERE id = 1",
  )][0] ?? null;
}

// The newest reading the store holds: the last log entry past the compacted base, else the base.
function readTip(sql, frontier) {
  const last = [...sql.exec(
    "SELECT sequence,checkpoint_id,heads,since_base,weight FROM signcraft_history_log WHERE part = 0 ORDER BY sequence DESC LIMIT 1",
  )][0];
  const next = last ? last.sequence + 1 : 0;
  if (last && last.sequence >= frontier.log_from) return { ...last, next };
  return { checkpoint_id: frontier.checkpoint_id, heads: frontier.heads, since_base: 0, weight: 0, next };
}

// The reading is kept per subject, in the order the history's index first met each subject, so a
// commit rewrites only the subjects its new revisions touched and a load concatenates the rows back
// into the checkpoint's cells exactly. A row is keyed by its subject's canonical bytes, which never
// change with the index's disposable keys.
const subjectRowKey = (subject) => semanticBytes(subject).toString("hex");

function readingCells(sql) {
  const subjects = [...sql.exec("SELECT subject_key,parts FROM signcraft_history_reading ORDER BY sequence")];
  return subjects.flatMap((subject) => readChunked(
    sql, "signcraft_history_reading_chunks", "subject_key", subject.subject_key, subject.parts, `reading of ${subject.subject_key}`,
  ));
}

function writeSubject(sql, subjectKey, cells, nextSubject) {
  const existing = [...sql.exec("SELECT parts FROM signcraft_history_reading WHERE subject_key = ?", subjectKey)][0];
  if (!cells.length) {
    sql.exec("DELETE FROM signcraft_history_reading_chunks WHERE subject_key = ?", subjectKey);
    sql.exec("DELETE FROM signcraft_history_reading WHERE subject_key = ?", subjectKey);
    return nextSubject;
  }
  const text = encodeJson(cells, `SignCraft reading of ${subjectKey}`);
  const parts = rewriteChunks(sql, "signcraft_history_reading_chunks", "subject_key", subjectKey, text, existing?.parts ?? 0);
  if (existing) {
    if (existing.parts !== parts) sql.exec("UPDATE signcraft_history_reading SET parts = ? WHERE subject_key = ?", parts, subjectKey);
    return nextSubject;
  }
  sql.exec("INSERT INTO signcraft_history_reading (subject_key,sequence,parts) VALUES (?,?,?)", subjectKey, nextSubject, parts);
  return nextSubject + 1;
}

// Each subject's observations in a checkpoint read from its cells, for the subjects named, in the
// checkpoint's order: only a legacy whole checkpoint is read this way, once.
function readingsOf(checkpoint, touched) {
  const readings = new Map();
  for (const value of checkpoint.cells) {
    const at = historySubjectKey(value.subject);
    if (!touched.has(at)) continue;
    if (!readings.has(at)) readings.set(at, { subject: value.subject, cells: [] });
    readings.get(at).cells.push(value);
  }
  for (const [at, subject] of touched) if (!readings.has(at)) readings.set(at, { subject, cells: [] });
  return readings;
}

function writeFrontier(sql, checkpoint, controlText, nextSequence, nextSubject, logFrom) {
  const controlParts = splitAndWrite(sql, "signcraft_history_control_chunks", "id", 1, controlText);
  sql.exec(
    `INSERT INTO signcraft_history_frontier
      (id,checkpoint_id,heads,size,functional_predicates,control_parts,next_sequence,next_subject,log_from)
     VALUES (1,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       checkpoint_id=excluded.checkpoint_id,
       heads=excluded.heads,
       size=excluded.size,
       functional_predicates=excluded.functional_predicates,
       control_parts=excluded.control_parts,
       next_sequence=excluded.next_sequence,
       next_subject=excluded.next_subject,
       log_from=excluded.log_from`,
    checkpoint.id,
    encodeJson(checkpoint.heads, "SignCraft checkpoint heads"),
    checkpoint.size,
    encodeJson(checkpoint.functionalPredicates, "SignCraft functional predicates"),
    controlParts,
    nextSequence,
    nextSubject,
    logFrom,
  );
}

// A journal written before the reading was kept per subject held the whole checkpoint as one
// chunked value beside a state row; its reading moves into subject rows once, in one transaction.
function admitWholeCheckpoint(sql, transactionSync) {
  const legacy = [...sql.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'signcraft_history_state'")][0];
  if (!legacy) return;
  transactionSync(() => {
    const state = [...sql.exec(
      "SELECT checkpoint_id,checkpoint_parts,control_parts,next_sequence FROM signcraft_history_state WHERE id = 1",
    )][0];
    if (state && !readFrontier(sql)) {
      const { checkpoint } = readChunked(sql, "signcraft_history_checkpoint_chunks", "id", 1, state.checkpoint_parts, "checkpoint");
      if (checkpoint?.id !== state.checkpoint_id) throw new TypeError("SignCraft checkpoint identity disagrees with its SQLite header");
      const subjects = new Map(checkpoint.cells.map((value) => [historySubjectKey(value.subject), value.subject]));
      let nextSubject = 0;
      for (const { subject, cells } of readingsOf(checkpoint, subjects).values()) {
        nextSubject = writeSubject(sql, subjectRowKey(subject), cells, nextSubject);
      }
      const controlText = decodeChunks(
        [...sql.exec("SELECT part,payload FROM signcraft_history_control_chunks WHERE id = 1 ORDER BY part")],
        state.control_parts,
        "control state",
      );
      writeFrontier(sql, checkpoint, controlText, state.next_sequence, nextSubject, 0);
    }
    sql.exec("DROP TABLE IF EXISTS signcraft_history_checkpoint_chunks");
    sql.exec("DROP TABLE signcraft_history_state");
  });
}

// A history extends the persisted reading when it reads from that very checkpoint, or when it
// carries its whole ancestry (a materialized history, as after a functional predicate widens over
// observed cells) and every persisted head is among its revisions: revisions are content-addressed,
// so the persisted past is then inside the new one.
function extendsTip(history, tip) {
  if (history.checkpoint) return history.checkpoint.id === tip.checkpoint_id;
  const ids = new Set(history.revisions.map((revision) => revision.id));
  return JSON.parse(tip.heads).every((head) => ids.has(head));
}

const subjectsOf = (revisions, touched = new Map()) => {
  for (const revision of revisions) {
    for (const value of revision.cells) touched.set(historySubjectKey(value.subject), value.subject);
  }
  return touched;
};

/**
 * Durable SignCraft journal over a synchronous SQLite binding such as
 * `DurableObjectState.storage.sql`. It is log-structured: a commit appends the
 * content-addressed revisions it admitted as one log entry, normally one row,
 * and rewrites its control state in place, so what a commit writes follows what
 * it admitted, never the size of the reading or of the past. The current reading
 * is a compacted base kept per subject plus the log past it; once that log
 * outgrows its bound (or the schema widens, or a materialized history is
 * committed) the base is compacted, rewriting only the subjects the log touched.
 * The log is never deleted: with the revisions written before it, it is the
 * archive a checkpoint materializes from. Values the control names by address
 * are retained once beside it (`retain`, `content`). `transactionSync` must be
 * the binding's transaction, and the store is its binding's one writer.
 */
export function createSqlHistoryStore({ sql, transactionSync, compactRevisions = 512, compactCharacters = 2_000_000 }) {
  if (!sql || typeof sql.exec !== "function") throw new TypeError("sql must expose exec(query, ...bindings)");
  if (typeof transactionSync !== "function") throw new TypeError("transactionSync must provide atomic SQLite transactions");

  sql.exec(`CREATE TABLE IF NOT EXISTS signcraft_history_frontier (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    checkpoint_id TEXT NOT NULL,
    heads TEXT NOT NULL,
    size INTEGER NOT NULL,
    functional_predicates TEXT NOT NULL,
    control_parts INTEGER NOT NULL,
    next_sequence INTEGER NOT NULL,
    next_subject INTEGER NOT NULL,
    log_from INTEGER NOT NULL DEFAULT 0
  )`);
  // A frontier written before the log reads from an empty log.
  if (![...sql.exec("SELECT name FROM pragma_table_info('signcraft_history_frontier')")].some(({ name }) => name === "log_from")) {
    sql.exec("ALTER TABLE signcraft_history_frontier ADD COLUMN log_from INTEGER NOT NULL DEFAULT 0");
  }
  sql.exec(`CREATE TABLE IF NOT EXISTS signcraft_history_reading (
    subject_key TEXT PRIMARY KEY,
    sequence INTEGER NOT NULL UNIQUE,
    parts INTEGER NOT NULL
  )`);
  sql.exec(`CREATE TABLE IF NOT EXISTS signcraft_history_reading_chunks (
    subject_key TEXT NOT NULL,
    part INTEGER NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (subject_key, part)
  )`);
  sql.exec(`CREATE TABLE IF NOT EXISTS signcraft_history_control_chunks (
    id INTEGER NOT NULL,
    part INTEGER NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (id, part)
  )`);
  sql.exec(`CREATE TABLE IF NOT EXISTS signcraft_history_log (
    sequence INTEGER NOT NULL,
    part INTEGER NOT NULL,
    parts INTEGER NOT NULL,
    checkpoint_id TEXT NOT NULL,
    heads TEXT NOT NULL,
    since_base INTEGER NOT NULL,
    weight INTEGER NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (sequence, part)
  ) WITHOUT ROWID`);
  sql.exec(`CREATE TABLE IF NOT EXISTS signcraft_history_revisions (
    revision_id TEXT PRIMARY KEY,
    sequence INTEGER NOT NULL UNIQUE,
    parts INTEGER NOT NULL
  )`);
  sql.exec(`CREATE TABLE IF NOT EXISTS signcraft_history_revision_chunks (
    revision_id TEXT NOT NULL,
    part INTEGER NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (revision_id, part)
  )`);
  sql.exec(`CREATE TABLE IF NOT EXISTS signcraft_history_content (
    id TEXT PRIMARY KEY,
    parts INTEGER NOT NULL
  )`);
  sql.exec(`CREATE TABLE IF NOT EXISTS signcraft_history_content_chunks (
    id TEXT NOT NULL,
    part INTEGER NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (id, part)
  )`);
  admitWholeCheckpoint(sql, transactionSync);
  const retained = new WeakMap();
  // The control text this store last read or wrote; an unchanged control is not written again.
  let heldControl = null;

  // A value the control state names by its content address instead of carrying, such as the
  // authored definition a world was played under: written once, never again by a commit, and read
  // back only after it is checked against the address that names it.
  function retain(value) {
    const memo = value !== null && typeof value === "object" && Object.isFrozen(value);
    if (memo && retained.has(value)) return retained.get(value);
    const id = semanticId(value);
    const text = encodeJson(value, `SignCraft content ${id}`);
    transactionSync(() => {
      if ([...sql.exec("SELECT parts FROM signcraft_history_content WHERE id = ?", id)][0]) return;
      const parts = splitAndWrite(sql, "signcraft_history_content_chunks", "id", id, text);
      sql.exec("INSERT INTO signcraft_history_content (id,parts) VALUES (?,?)", id, parts);
    });
    if (memo) retained.set(value, id);
    return id;
  }

  function content(id) {
    const header = [...sql.exec("SELECT parts FROM signcraft_history_content WHERE id = ?", id)][0];
    if (!header) throw new TypeError(`SignCraft content ${id} is not retained`);
    const value = readChunked(sql, "signcraft_history_content_chunks", "id", id, header.parts, `content ${id}`);
    if (semanticId(value) !== id) throw new TypeError(`SignCraft content ${id} does not match its address`);
    return value;
  }

  function load() {
    const frontier = readFrontier(sql);
    if (!frontier) return null;
    const functionalPredicates = JSON.parse(frontier.functional_predicates);
    const checkpoint = {
      id: frontier.checkpoint_id,
      heads: JSON.parse(frontier.heads),
      cells: readingCells(sql),
      size: frontier.size,
      functionalPredicates,
    };
    const controlText = decodeChunks(
      [...sql.exec("SELECT part,payload FROM signcraft_history_control_chunks WHERE id = 1 ORDER BY part")],
      frontier.control_parts,
      "control state",
    );
    const entries = logEntries(sql, frontier.log_from);
    // Restoring re-derives the base's content address from the rows, so a reading that lost,
    // gained or reordered an observation is refused here; the log past it is re-admitted by the
    // revisions' own addresses and must reach the reading its last entry recorded.
    let history = restoreHistory({ kind: "signcraft.history", functionalPredicates, checkpoint, revisions: entries.flatMap((entry) => entry.revisions) });
    if (entries.length) {
      history = checkpointHistory(history);
      const tip = readTip(sql, frontier);
      if (history.checkpoint.id !== tip.checkpoint_id) throw new TypeError("SignCraft log does not reach the checkpoint it recorded");
    }
    history = bindHistoryArchive(history, () => archiveRows(sql));
    heldControl = controlText;
    return Object.freeze({ history, control: JSON.parse(controlText) });
  }

  // The revisions a materialized history adds to the archive: those not already in it, each
  // agreeing with any archived revision of its address.
  function unarchived(revisions) {
    const archived = new Map(archiveRows(sql).map((revision) => [revision.id, revision]));
    return revisions.filter((revision) => {
      const stored = archived.get(revision.id);
      if (!stored) return true;
      if (encodeJson(stored, `stored SignCraft revision ${revision.id}`) !== encodeJson(revision, `SignCraft revision ${revision.id}`)) {
        throw new TypeError(`SignCraft revision ${revision.id} has conflicting content`);
      }
      return false;
    });
  }

  function compact(checkpointed, touched, controlText, frontier, logFrom) {
    let nextSubject = frontier?.next_subject ?? 0;
    for (const subject of touched.values()) nextSubject = writeSubject(sql, subjectRowKey(subject), historySubjectCells(checkpointed, subject), nextSubject);
    writeFrontier(sql, checkpointed.checkpoint, controlText, frontier?.next_sequence ?? 0, nextSubject, logFrom);
  }

  function commit(history, control) {
    validateHistory(history);
    const validated = restoreHistory(history);
    const checkpointed = checkpointHistory(validated);
    if (!checkpointed.checkpoint?.id) throw new TypeError("SignCraft checkpoint must carry a content identity");
    const controlText = encodeJson(control, "SignCraft control state");

    transactionSync(() => {
      const frontier = readFrontier(sql);
      if (!frontier) {
        if (history.checkpoint) throw new TypeError("Cannot import a foreign SignCraft checkpoint into an empty store");
        const fresh = validated.revisions;
        if (fresh.length) appendLog(0, fresh, checkpointed, 0, 0);
        compact(checkpointed, subjectsOf(fresh), controlText, null, fresh.length ? 1 : 0);
        return;
      }
      const tip = readTip(sql, frontier);
      if (!extendsTip(history, tip)) throw new TypeError("SignCraft history does not extend this store's persisted checkpoint");
      const fresh = history.checkpoint ? validated.revisions : unarchived(validated.revisions);
      const encoded = fresh.length ? encodeJson(fresh, "SignCraft log entry") : "";
      const sinceBase = tip.since_base + fresh.length, weight = tip.weight + encoded.length;
      if (fresh.length) appendLog(tip.next, fresh, checkpointed, sinceBase, weight, encoded);
      const widened = JSON.stringify(checkpointed.checkpoint.functionalPredicates) !== frontier.functional_predicates;
      if (!history.checkpoint || widened || sinceBase > compactRevisions || weight > compactCharacters) {
        // A materialized history re-reads every subject it observes, once; otherwise the base
        // takes only the subjects the log past it touched.
        const touched = history.checkpoint ? subjectsOf(fresh, subjectsOf(logEntries(sql, frontier.log_from).flatMap((entry) => entry.revisions)))
          : subjectsOf(validated.revisions);
        compact(checkpointed, touched, controlText, frontier, fresh.length ? tip.next + 1 : tip.next);
        return;
      }
      if (controlText === heldControl) return;
      const parts = rewriteChunks(sql, "signcraft_history_control_chunks", "id", 1, controlText, frontier.control_parts);
      if (parts !== frontier.control_parts) sql.exec("UPDATE signcraft_history_frontier SET control_parts = ? WHERE id = 1", parts);
    });
    heldControl = controlText;
    return bindHistoryArchive(checkpointed, () => archiveRows(sql));
  }

  function appendLog(sequence, revisions, checkpointed, sinceBase, weight, encoded = encodeJson(revisions, "SignCraft log entry")) {
    const chunks = chunksOf(encoded);
    const heads = encodeJson(checkpointed.checkpoint.heads, "SignCraft checkpoint heads");
    for (let part = 0; part < chunks.length; part += 1) {
      sql.exec(
        "INSERT INTO signcraft_history_log (sequence,part,parts,checkpoint_id,heads,since_base,weight,payload) VALUES (?,?,?,?,?,?,?,?)",
        sequence, part, chunks.length, checkpointed.checkpoint.id, heads, sinceBase, weight, chunks[part],
      );
    }
  }

  return Object.freeze({ load, commit, retain, content });
}
