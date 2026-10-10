/**
 * src/search/revision-journal - what CAIRN's archive index holds, kept as a reading of a semantic
 * record journal: the bodies (git blob id, title, size), each body's text, the occurrences that say
 * where a body stood, and the tips each source was last read at. Ranked search is a semiotic-eavt
 * term index over the same journal, keyed by blob id, with diacritics folded away.
 *
 * Every record carries many lines in one string, split under the journal's string bound, because
 * each record costs the journal an admission, an identity and a witness however small it is.
 * Bodies, occurrences and cursors are small and folded into memory when the journal opens. Texts
 * are not held: they are kept under their own object kind, and a semiotic-eavt field index over the
 * blob ids each text record carries reads back only the records holding the text asked for.
 */
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { carriedBytes, createTermIndex, foldedWords, TERM_INDEX_RECORD_BYTES } from "@red-cup-engineering/semiotic-eavt-services-section/term-index";
import { createFieldIndex } from "@red-cup-engineering/semiotic-eavt-services-section/field-index";

const KIND = "cairn.revision-index";
const BODIES = "revision-index.bodies";
const OCCURRENCES = "revision-index.occurrences";
const CURSORS = "revision-index.cursors";
const TEXT = "revision-index.text";
const ADMISSIONS = "revision-index.sql-admissions";
const HELD = Object.freeze({ for: true, against: false });
const SNIPPET_WORDS = 24;

const TEXT_KIND = `${KIND}.text`;
const occurrenceKey = (id, source, path, revision) => `${id}\u0000${source}\u0000${path}\u0000${revision}`;
const placeKey = (source, path, revision) => `${source}\u0000${path}\u0000${revision}`;
const linesOf = (record) => record.lines.split("\n").map((line) => JSON.parse(line));
const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

/** A text's pieces, each small enough that its line stays under half a record's bound. */
function chunksOf(text) {
  const chunks = [];
  for (let start = 0; start < text.length;) {
    let size = Math.min(text.length - start, 32 * 1024);
    for (;;) {
      let end = start + size;
      if (end < text.length && /[\ud800-\udbff]/u.test(text[end - 1])) end -= 1;
      if (carriedBytes(text.slice(start, end)) <= TERM_INDEX_RECORD_BYTES / 2 || size <= 1) {
        chunks.push(text.slice(start, end));
        start = end;
        break;
      }
      size = Math.floor(size / 2);
    }
  }
  return chunks.length === 0 ? [""] : chunks;
}

/** Up to SNIPPET_WORDS words of `text` around the first word the query holds, matches marked «». */
export function snippetOf(text, query) {
  const wanted = new Set(foldedWords(query));
  const found = [...text.matchAll(/[\p{L}\p{N}]+/gu)];
  const first = found.findIndex((match) => wanted.has(foldedWords(match[0])[0]));
  if (first === -1) return text.slice(0, 160);
  const from = Math.max(0, first - Math.floor(SNIPPET_WORDS / 4)), to = Math.min(found.length, from + SNIPPET_WORDS);
  let snippet = from > 0 ? "…" : "", at = found[from].index;
  for (const match of found.slice(from, to)) {
    snippet += text.slice(at, match.index);
    snippet += wanted.has(foldedWords(match[0])[0]) ? `«${match[0]}»` : match[0];
    at = match.index + match[0].length;
  }
  return to < found.length ? `${snippet}…` : snippet;
}

/**
 * The archive index's journal at `root`. Changes are staged (`admitBody`, `occur`, `setCursor`) and
 * recorded together by `flush`: texts first, then bodies, occurrences and cursors, then the term
 * index, so a body the index knows always has its text. `discard` drops what is staged. A body
 * whose terms were never recorded (a flush that stopped after its bodies) is put again on open.
 */
export function openRevisionJournal({ root, now = () => new Date().toISOString() }) {
  const journal = createSemanticRecordJournal({ root, objectKind: KIND });
  const terms = createTermIndex({ root, objectKind: `${KIND}.terms`, tokenize: foldedWords, now });
  const bodies = new Map();          // id -> { title, bytes }
  const occurrences = new Map();     // id -> [{ source, path, revision, at, deleted }]
  const occurrenceKeys = new Set();  // id, source, path, revision
  const places = new Set();          // source, path, revision
  const cursors = new Map();         // source -> [tip]
  let sequence = 0;
  let admission = null;
  let staged;
  const restage = () => { staged = { texts: new Map(), bodies: new Map(), occurrences: [], cursors: new Map() }; };
  restage();

  function holdOccurrence([id, source, path, revision, at, deleted]) {
    const key = occurrenceKey(id, source, path, revision);
    if (occurrenceKeys.has(key)) return false;
    occurrenceKeys.add(key);
    places.add(placeKey(source, path, revision));
    const held = occurrences.get(id);
    const occurrence = { source, path, revision, at, deleted: deleted === 1 };
    if (held) held.push(occurrence); else occurrences.set(id, [occurrence]);
    return true;
  }
  for (const row of journal.query({ category: BODIES })) {
    sequence = Math.max(sequence, row.record.sequence + 1);
    for (const [id, title, bytes] of linesOf(row.record)) bodies.set(id, { title, bytes });
  }
  for (const row of journal.query({ category: OCCURRENCES })) {
    sequence = Math.max(sequence, row.record.sequence + 1);
    for (const line of linesOf(row.record)) holdOccurrence(line);
  }
  for (const row of [...journal.query({ category: CURSORS })].sort((left, right) => left.record.sequence - right.record.sequence)) {
    sequence = Math.max(sequence, row.record.sequence + 1);
    cursors.set(row.record.source, row.record.tips === "" ? [] : row.record.tips.split("\n"));
  }

  for (const row of journal.query({ category: ADMISSIONS })) admission = row.record;

  /** The text of one body as its records hold it, or undefined. */
  function textOf(id) {
    if (staged.texts.has(id)) return staged.texts.get(id);
    if (!bodies.has(id)) return undefined;
    const parts = [];
    for (const { record } of texts.get("blob", id)) {
      for (const [line, part, count, chunk] of linesOf(record)) if (line === id) parts[part] = { count, chunk };
    }
    if (parts.length === 0 || parts.length !== parts[0].count || parts.some((part) => part === undefined)) throw new TypeError(`archive text ${id} has incomplete parts`);
    return parts.map((part) => part.chunk).join("");
  }

  const texts = createFieldIndex({ root, objectKind: TEXT_KIND, category: TEXT, fields: { blob: (record) => linesOf(record).map(([id]) => id) } });
  const missing = [...bodies.keys()].filter((id) => terms.revisionOf(id) === undefined);
  if (missing.length > 0) terms.revise(({ put }) => { for (const id of missing) put(id, id, `${bodies.get(id).title}\n${textOf(id)}`); });

  function record(category, kind, lines, objectKind = KIND, fields = {}) {
    let batch = [], bytes = 0;
    const flush = () => {
      if (batch.length === 0) return;
      journal.record({ category, objectKind, record: { kind, sequence, ...fields, lines: batch.join("\n") }, recordedAt: now(), told: HELD });
      sequence += 1;
      batch = [];
      bytes = 0;
    };
    for (const line of lines) {
      const size = carriedBytes(line) + 4;
      if (bytes + size > TERM_INDEX_RECORD_BYTES) flush();
      batch.push(line);
      bytes += size;
    }
    flush();
  }

  const store = Object.freeze({
    root: journal.root,
    /** Whether a body is held or staged. */
    hasBody: (id) => bodies.has(id) || staged.bodies.has(id),
    /** Stage a body's text under its blob id. */
    admitBody(id, title, bytes, text) {
      if (store.hasBody(id)) return false;
      staged.bodies.set(id, { title, bytes });
      staged.texts.set(id, text);
      return true;
    },
    /** Stage where a body stood; an occurrence already held is kept once. */
    occur(id, source, path, revision, at, deleted) {
      staged.occurrences.push([id, source, path, revision, at ?? null, deleted ? 1 : 0]);
    },
    /** Whether a source has held something at a path and revision. */
    seen: (source, path, revision) => places.has(placeKey(source, path, revision)) || staged.occurrences.some((line) => line[1] === source && line[2] === path && line[3] === revision),
    /** The tips a source was last read at. */
    cursorOf: (source) => staged.cursors.get(source) ?? cursors.get(source) ?? [],
    /** Stage the tips a source has now been read at. */
    setCursor(source, tips) { staged.cursors.set(source, [...tips]); },
    /** Record what is staged. */
    flush() {
      const { texts: newTexts, bodies: newBodies, occurrences: newOccurrences, cursors: newCursors } = staged;
      restage();
      record(TEXT, "cairn.revision-index.text.v1", [...newTexts].flatMap(([id, text]) => {
        const chunks = chunksOf(text);
        return chunks.map((chunk, part) => JSON.stringify([id, part, chunks.length, chunk]));
      }), TEXT_KIND);
      record(BODIES, "cairn.revision-index.bodies.v1", [...newBodies].map(([id, { title, bytes }]) => JSON.stringify([id, title, bytes])));
      for (const [id, body] of newBodies) bodies.set(id, body);
      const fresh = newOccurrences.filter((line) => holdOccurrence(line));
      record(OCCURRENCES, "cairn.revision-index.occurrences.v1", fresh.map((line) => JSON.stringify(line)));
      for (const [source, tips] of newCursors) {
        journal.record({ category: CURSORS, record: { kind: "cairn.revision-index.cursor.v1", sequence, source, tips: tips.join("\n") }, recordedAt: now(), told: HELD });
        sequence += 1;
        cursors.set(source, tips);
      }
      if (newTexts.size > 0) terms.revise(({ put }) => { for (const [id, text] of newTexts) put(id, id, `${newBodies.get(id).title}\n${text}`); });
    },
    /** The receipt of the SQLite index read into this journal, or null. */
    get admission() { return admission; },
    /** Record that an SQLite index was read in whole, so it is never read again. */
    recordAdmission(receipt) {
      admission = { kind: "cairn.revision-index.sql-admission.v1", ...receipt };
      journal.record({ category: ADMISSIONS, record: admission, recordedAt: now(), told: HELD });
    },
    /** Drop what is staged. */
    discard: restage,
    textOf,
    /** Where a body stood, per source and path: first and last time, and whether it was deleted there; latest first. */
    occurrencesOf(id) {
      const stood = new Map();
      for (const { source, path, at, deleted } of occurrences.get(id) ?? []) {
        const key = `${source}\u0000${path}`, held = stood.get(key);
        if (!held) { stood.set(key, { source, path, first: at, last: at, deleted: deleted ? 1 : 0 }); continue; }
        if (at !== null && (held.first === null || at < held.first)) held.first = at;
        if (at !== null && (held.last === null || at > held.last)) held.last = at;
        if (deleted) held.deleted = 1;
      }
      return [...stood.values()].sort((left, right) => (left.last === right.last ? 0 : left.last === null ? 1 : right.last === null ? -1 : byCodePoint(right.last, left.last)));
    },
    title: (id) => bodies.get(id)?.title,
    /** Blob ids holding every word of the query, best first by BM25. */
    search: (query, { limit }) => terms.search(query, { limit }),
    /** Blob ids matching an FTS5-style expression (words, prefix*, "phrases", AND, OR, NOT, parentheses), best first; other syntax is refused. */
    match: (expression, { limit }) => terms.match(expression, { limit, textOf }),
    get size() { return bodies.size; },
    /** Occurrences and the latest time per source, by source. */
    sources() {
      const sources = new Map();
      for (const held of occurrences.values()) {
        for (const { source, at } of held) {
          const known = sources.get(source) ?? { source, occurrences: 0, latest: null };
          known.occurrences += 1;
          if (at !== null && (known.latest === null || at > known.latest)) known.latest = at;
          sources.set(source, known);
        }
      }
      return [...sources.values()].sort((left, right) => byCodePoint(left.source, right.source));
    },
  });
  return store;
}
