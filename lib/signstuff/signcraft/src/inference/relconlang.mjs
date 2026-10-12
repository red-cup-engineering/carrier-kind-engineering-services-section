// relconlang.mjs — RelConLang surface text intake, moved into the kernel from the deleted
// witnessed-field-machine-service organism (a minimal direct parser against
// data/manifest.json's own particle tables; the corpus is regular by design).
// Corrected on the move: "ta" is POTENTIAL per data/stance-system.json, not the against-only reading per
// data/manifest.json's rwil list, which is the falsehood, replaced. Every row carries the
// knowledge reading.

import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** @typedef {{e:string, a:string, v:string, t:number, reading:string}} Row */
/** @typedef {{s:string, P:string, o:string|null, reading:string, aspect:string|null, event:string}} Cell */

const told = (forTold, againstTold) => readingOfSides("knowledge", forTold, againstTold);

/** Clause-initial reading particles (manifest rwil, corrected against data/stance-system.json's
 * particles: ta and na both tell for only). */
const READING_PARTICLES = { ta: told(true, false), na: told(true, false), sha: told(true, true), mu: told(false, false) };
/** Clause-initial dialogue-force particles (manifest rwil: communicating.dialogueForce). */
const FORCE_PARTICLES = { ku: "question", du: "request", se: "answer", ha: "acknowledgement" };
/** Information-structure particles that mark the NEXT nominal (manifest roleStrategies, markerPosition "before"). */
const INFO_BEFORE = { fi: "focus", ko: "contrast", ri: "repair" };
/** Role/info particles that mark the PRECEDING nominal (manifest roleStrategies, markerPosition "after"). */
const AFTER_MARK = { ga: "role:nsubj", ma: "info:topic", pa: "role:provenance" };
/** Oblique particles that mark the NEXT nominal (manifest roleStrategies, markerPosition "before"). */
const OBL_BEFORE = { lo: "obl:locus", ke: "obl:kind" };

const VERB_ROOTS = new Set(["ran", "nes", "lin", "mor", "tem", "vom", "dav", "ren", "nul", "kod", "kan", "var"]);
const VERB_SUFFIX = { ai: "aspect:inchoative", en: "aspect:process", um: "aspect:settled", o: "aspect:release" };
const PRONOUNS = new Set(["mi", "tu", "sa", "ni"]);
const NOUN_ROOTS = new Set([
  "kelu", "rama", "tilo", "sava", "nara", "voma", "davu", "rena", "nulu", "koda", "kano", "luma", "hena", "vara",
]);
const CCOMP_MARK = "ve";
const DOBJ_MARK = "do";

const isNominal = (tok) => PRONOUNS.has(tok) || NOUN_ROOTS.has(tok);
function verbInfo(tok) {
  const [root, suffix] = tok.split("-");
  if (!VERB_ROOTS.has(root)) return null;
  if (suffix === undefined) return { root, feature: null };
  const feature = VERB_SUFFIX[suffix];
  return feature ? { root, feature } : null;
}

/**
 * Read one nominal phrase starting at `idx`: an optional info-before marker, the nominal
 * itself, and an optional after-marker.
 * @param {string[]} tokens @param {number} idx
 * @returns {{word:string, infoMark:?string, afterMark:?string, nextIdx:number} | null}
 */
function readNominal(tokens, idx) {
  let i = idx;
  let infoMark = null;
  if (INFO_BEFORE[tokens[i]] !== undefined) { infoMark = INFO_BEFORE[tokens[i]]; i += 1; }
  if (!isNominal(tokens[i])) return null;
  const word = tokens[i];
  i += 1;
  let afterMark = null;
  if (AFTER_MARK[tokens[i]] !== undefined) { afterMark = tokens[i]; i += 1; }
  return { word, infoMark, afterMark, nextIdx: i };
}

/**
 * Parse one clause's tokens from `idx`, appending rows keyed to a fresh event entity
 * `${eventBase}#c${cursor.clause}`. Recurses once for a `do ve`/`ve`-introduced ccomp.
 * @param {string[]} tokens @param {number} idx @param {string} eventBase
 * @param {object} reading @param {{clause:number, t:number}} cursor @param {Row[]} rows
 * @returns {{ event:string, nextIdx:number } | { error:string }}
 */
function parseClause(tokens, idx, eventBase, reading, cursor, rows) {
  const event = `${eventBase}#c${cursor.clause}`;
  cursor.clause += 1;
  const push = (a, v) => rows.push({ e: event, a, v, t: cursor.t++, reading });

  let i = idx;
  let subjectPhrase = readNominal(tokens, i);
  if (!subjectPhrase) return { error: `expected a nominal (subject) at token ${i} ('${tokens[i]}')` };
  // A fronted oblique reads as a nominal phrase whose after-mark is "pa" (provenance).
  if (subjectPhrase.afterMark === "pa") {
    push("obl:provenance", subjectPhrase.word);
    i = subjectPhrase.nextIdx;
    subjectPhrase = readNominal(tokens, i);
    if (!subjectPhrase) return { error: `expected a subject nominal after fronted oblique at token ${i}` };
  }
  push("nsubj", subjectPhrase.word);
  if (subjectPhrase.infoMark) push(`info:${subjectPhrase.infoMark}`, subjectPhrase.word);
  if (subjectPhrase.afterMark === "ma") push("info:topic", subjectPhrase.word);
  i = subjectPhrase.nextIdx;

  const verb = verbInfo(tokens[i]);
  if (!verb) return { error: `expected a verb at token ${i} ('${tokens[i] ?? "<end>"}')` };
  push("verb", verb.root);
  if (verb.feature) push("verbFeature", verb.feature);
  i += 1;

  if (tokens[i] === DOBJ_MARK && tokens[i + 1] === CCOMP_MARK) i += 1; // "do ve" — do introduces the ccomp slot
  if (tokens[i] === CCOMP_MARK) {
    i += 1;
    const embedded = parseClause(tokens, i, eventBase, reading, cursor, rows);
    if (embedded.error) return embedded;
    push("ccomp", embedded.event);
    i = embedded.nextIdx;
  } else {
    if (tokens[i] === DOBJ_MARK) i += 1;
    const objectPhrase = readNominal(tokens, i);
    if (objectPhrase) {
      push("dobj", objectPhrase.word);
      if (objectPhrase.infoMark) push(`info:${objectPhrase.infoMark}`, objectPhrase.word);
      if (objectPhrase.afterMark === "ma") push("info:topic", objectPhrase.word);
      i = objectPhrase.nextIdx;
    }
  }

  // trailing oblique chain: lo/ke NOMINAL, repeated
  while (OBL_BEFORE[tokens[i]] !== undefined) {
    const kind = OBL_BEFORE[tokens[i]];
    const oblPhrase = readNominal(tokens, i + 1);
    if (!oblPhrase) break;
    push(kind, oblPhrase.word);
    i = oblPhrase.nextIdx;
  }

  return { event, nextIdx: i };
}

/**
 * Tokenize one RelConLang surface line: strip a trailing sentence terminator, split on
 * whitespace (manifest `segmentation`: punctuation boundary, space word boundary).
 * @param {string} text @returns {string[]}
 */
export function tokenize(text) {
  return text.trim().replace(/[.!?]$/, "").split(/\s+/).filter(Boolean);
}

/**
 * Parse one RelConLang unit (an agency-sample line, one dialogue turn, or one register line)
 * into witnessed rows.
 * @param {{id:string, text:string}} unit
 * @param {{startTime?:number}} [opts]
 * @returns {{ok:true, rows:Row[], nextTime:number} | {ok:false, id:string, text:string, reason:string}}
 */
export function parseLine(unit, opts = {}) {
  const tokens = tokenize(unit.text);
  if (tokens.length === 0) return { ok: false, id: unit.id, text: unit.text, reason: "empty line" };

  let i = 0;
  let reading = told(true, false); // default: fresh cell measures POTENTIAL (metrologic posit's own default)
  let force = null;
  for (let guard = 0; guard < 2; guard += 1) {
    if (READING_PARTICLES[tokens[i]] !== undefined) { reading = READING_PARTICLES[tokens[i]]; i += 1; }
    else if (FORCE_PARTICLES[tokens[i]] !== undefined) { force = FORCE_PARTICLES[tokens[i]]; i += 1; }
    else break;
  }
  const cursor = { clause: 0, t: opts.startTime ?? 0 };
  const rows = [];
  if (force) rows.push({ e: `${unit.id}#c0`, a: "discourse", v: force, t: cursor.t++, reading });

  const result = parseClause(tokens, i, unit.id, reading, cursor, rows);
  if (result.error) return { ok: false, id: unit.id, text: unit.text, reason: result.error };
  if (result.nextIdx !== tokens.length) {
    return {
      ok: false, id: unit.id, text: unit.text,
      reason: `unconsumed tokens from ${result.nextIdx}: '${tokens.slice(result.nextIdx).join(" ")}'`,
    };
  }
  return { ok: true, rows, nextTime: cursor.t };
}

/**
 * Extract `{id, text, features}` units from one corpus record: an agency-sample line is one
 * unit; a dialogue-sample record's `turns` are one unit each (ids suffixed `#t<index>`); a
 * register-sample record's `lines` are one unit each (ids suffixed `#l<index>`). `features` is
 * the unit's `expect.features` map (word -> tag[]) when the record carries one, else `{}` —
 * hand-annotated corpus ground truth, not derived by this parser.
 * @param {object} record @returns {{id:string, text:string, features:object}[]}
 */
export function unitsOf(record) {
  if (typeof record.text === "string") return [{ id: record.id, text: record.text, features: record.expect?.features ?? {} }];
  if (Array.isArray(record.turns)) {
    return record.turns.map((turn, idx) => ({ id: `${record.id}#t${idx}`, text: turn.text, features: turn.expect?.features ?? {} }));
  }
  if (Array.isArray(record.lines)) {
    return record.lines.map((line, idx) => ({ id: `${record.id}#l${idx}`, text: line.text, features: line.expect?.features ?? {} }));
  }
  return [];
}

/**
 * Parse a whole corpus (an array of parsed JSONL records) into rows, threading a shared
 * witness-order counter across units and collecting per-unit success/refusal.
 * @param {object[]} records
 * @returns {{rows:Row[], accepted:{id:string,text:string}[], refused:{id:string,text:string,reason:string}[]}}
 */
export function parseCorpus(records) {
  const rows = [];
  const accepted = [];
  const refused = [];
  let t = 0;
  for (const record of records) {
    for (const unit of unitsOf(record)) {
      const result = parseLine(unit, { startTime: t });
      if (result.ok) {
        rows.push(...result.rows);
        t = result.nextTime;
        accepted.push(unit);
      } else {
        refused.push({ id: result.id, text: result.text, reason: result.reason });
      }
    }
  }
  return { rows, accepted, refused };
}

/**
 * The `word -> Set(tag)` feature map collected from every unit's `expect.features` across a
 * whole corpus (hand-annotated corpus ground truth, e.g. `semantic:relation`, `root:k-l`), used
 * to enrich the FCA context saturation borrows concept-mates from (kernel/speak.mjs holeConcepts).
 * @param {object[]} records @returns {Map<string, Set<string>>}
 */
export function collectExpectFeatures(records) {
  const out = new Map();
  for (const record of records) {
    for (const unit of unitsOf(record)) {
      for (const [word, tags] of Object.entries(unit.features ?? {})) {
        if (!out.has(word)) out.set(word, new Set());
        for (const tag of tags) out.get(word).add(tag);
      }
    }
  }
  return out;
}

/**
 * Derive (s,P,o) saturation cells from a parsed row set, one per clause/event: the verb root is
 * the predicate identity, an aspect suffix rides along as a cell feature (never a separate
 * predicate), and a clause whose object slot is filled by an embedded ccomp carries no object
 * (the embedded clause is its own cell). The clause's reading (from its stance particle) is the
 * cell's reading.
 * @param {Row[]} rows @returns {Cell[]}
 */
export function cellsFromRows(rows) {
  const byEvent = new Map();
  for (const row of rows) {
    if (!byEvent.has(row.e)) byEvent.set(row.e, []);
    byEvent.get(row.e).push(row);
  }
  const cells = [];
  for (const [event, evRows] of byEvent) {
    const find = (a) => evRows.find((r) => r.a === a);
    const verbRow = find("verb");
    if (!verbRow) continue; // discourse-only or malformed rows carry no predicate
    const subjRow = find("nsubj");
    const objRow = find("dobj");
    const ccompRow = find("ccomp");
    const aspectRow = find("verbFeature");
    cells.push({
      s: subjRow?.v ?? null,
      P: verbRow.v,
      o: ccompRow ? null : (objRow?.v ?? null),
      reading: verbRow.reading,
      aspect: aspectRow?.v ?? null,
      event,
    });
  }
  return cells;
}

/**
 * Parse a whole corpus straight to (s,P,o) saturation cells (this module's own `parseCorpus` +
 * `cellsFromRows`), the shape kernel/speak.mjs witnesses from.
 * @param {object[]} records @returns {{cells:Cell[], accepted:object[], refused:object[]}}
 */
export function cellCorpus(records) {
  const { rows, accepted, refused } = parseCorpus(records);
  return { cells: cellsFromRows(rows), accepted, refused };
}
