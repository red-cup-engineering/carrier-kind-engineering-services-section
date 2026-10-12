/**
 * Causal observations over SignCell evidence. A revision observes its parents;
 * it never orders concurrent observations by arrival. Functional predicates
 * select causally maximal observations, while other evidence accumulates.
 * Addressed revisions are the authority. A checkpoint retains their active raw
 * evidence and frontier; the durable archive retains their complete ancestry.
 * Query indexes are disposable readings of that carrier.
 */
import { address, admitCell, cell, cellSet, coincides, evidenced, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { bytesToHex, retainedCarrier, semanticBytes, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { PersistentMap } from "./persistent-map.mjs";

// Address arbitrary history content through the same SCA carrier as every cell.
const identify = (body) => address({ subject: "signcraft.history", predicate: "revision", object: body });
// Disposable indexes need structural equality, not a fresh cryptographic address per lookup. Text
// and null terms, the usual case, key by their NFC text directly, which coincides exactly when their
// canonical bytes do; the leading "t" keeps those keys apart from the hex of any other term.
const textual = (term) => term === null || typeof term === "string";
const key = (subject, predicate) => textual(subject) && textual(predicate)
  ? `t${JSON.stringify([subject?.normalize("NFC") ?? null, predicate?.normalize("NFC") ?? null])}`
  : bytesToHex(semanticBytes([subject, predicate]));
const cache = new WeakMap();
const archives = new WeakMap();
// A checkpoint is named over the names of its cells, each named once per frozen cell, so cutting a
// checkpoint costs the cells that changed, not a re-encoding of the whole reading. A checkpoint
// written before this was named over its cells' full bodies; that name is still admitted on restore.
const cellNames = new WeakMap();
const cellName = (value) => {
  let id = cellNames.get(value);
  if (id === undefined) {
    id = semanticId(value);
    if (Object.isFrozen(value)) cellNames.set(value, id);
  }
  return id;
};
const identifyCheckpoint = ({ cells, ...body }) => address({ subject: "signcraft.history", predicate: "checkpoint", object: { ...body, cells: cells.map(cellName) } });
/** The content address of a revision body ({ parents, source, cells }), as observeHistory names it. */
export const identifyRevision = (body) => identify(body);
/** Admit one cell exactly as a revision retains it. */
export const retainHistoryCell = (value) => admitCell(value);
/** The content address of a checkpoint body ({ heads, cells, size, functionalPredicates }), as checkpointHistory names it. */
export const identifyHistoryCheckpoint = (body) => identifyCheckpoint(body);
const identifyWholeCheckpoint = (body) => address({ subject: "signcraft.history", predicate: "checkpoint", object: body });
// Histories whose every revision and checkpoint this module has addressed: built here from admitted
// parts, or checked by restoreHistory. They are frozen, so admitting one again would only re-derive
// the same addresses; restoreHistory returns them as they are.
const admitted = new WeakSet();
const inheritArchive = (prior, next) => {
  if (archives.has(prior)) archives.set(next, archives.get(prior));
  if (admitted.has(prior)) admitted.add(next);
  return next;
};
// How a history was reached from the one it extends: the cells an observation added and the
// readings it superseded, or none for a checkpoint cut, which reads exactly as its source.
const steps = new WeakMap();
// A step names the history it extends, so a history reached by many observations would keep every
// earlier one (and its index) alive. The hops historyChanges follows are bounded, and a chain is
// cut at every Nth history: a pair of histories further apart than a cut is compared by index.
const STEP_CHAIN = 256;
const stepFrom = (history, cells) => {
  const depth = (steps.get(history)?.depth ?? 0) + 1;
  return depth >= STEP_CHAIN ? { from: null, cells, depth: 0 } : { from: history, cells, depth };
};
const diffs = new WeakMap();
const sameSchema = (a, b) => a.functionalPredicates.length === b.functionalPredicates.length
  && a.functionalPredicates.every((predicate, at) => predicate === b.functionalPredicates[at]);
/** The cells that differ between two readings of one schema: those either retains that the other
 * does not. A later history reached by observations is answered from the observations; any other
 * pair compares each subject's retained cells. Histories of different schemas read differently
 * throughout, and have no change set (null). */
export function historyChanges(prior, next) {
  validateHistory(prior);
  validateHistory(next);
  if (prior === next) return frozen([]);
  if (!sameSchema(prior, next)) return null;
  const known = diffs.get(next);
  if (known?.prior === prior) return known.changes;
  const found = [];
  let current = next;
  for (let hops = 0; current !== prior && hops < STEP_CHAIN; hops++) {
    const step = steps.get(current);
    if (!step?.from) break;
    found.push(...step.cells);
    current = step.from;
  }
  if (current === prior) {
    diffs.set(next, { prior, changes: frozen(found) });
    return diffs.get(next).changes;
  }
  const before = indexOf(prior).bySubject, after = indexOf(next).bySubject, changes = [];
  for (const [subjectKey, entry] of after) {
    const old = before.get(subjectKey);
    if (old === entry) continue;
    const kept = new Set(old?.observations.map(({ cell: value }) => value));
    const now = new Set(entry.observations.map(({ cell: value }) => value));
    for (const value of now) if (!kept.has(value)) changes.push(value);
    for (const value of kept) if (!now.has(value)) changes.push(value);
  }
  for (const [subjectKey, entry] of before) if (!after.has(subjectKey)) changes.push(...entry.observations.map(({ cell: value }) => value));
  diffs.set(next, { prior, changes: frozen(changes) });
  return diffs.get(next).changes;
}
// Two channels hear every query. `reading` is a proposal's conflict footprint, which an operation
// may deliberately leave out of (captureHistoryReads); `depending` is what a derivation itself read,
// which nothing hides: the patterns it queried and the inner derivations whose results it used.
let reading = null, depending = null;
const recordRead = (pattern) => {
  if (!reading && !depending) return;
  const at = key(pattern, null), read = Object.freeze(pattern);
  reading?.set(at, read);
  depending?.patterns.set(at, read);
};
/** Capture the actual queries of one synchronous proposal, including absent facts. */
export function captureHistoryReads(operation) {
  const prior = reading, reads = new Map();
  reading = reads;
  try { return { result: operation(), reads: frozen(reads.values()) }; }
  finally { reading = prior; }
}
const frozen = (items) => Object.freeze([...items]);
const meets = (pattern, at) => Object.entries(pattern).every(([role, term]) => coincides(at[role], term));
// Changes are raw observations, whereas queries return projected cells. A concurrent
// functional alternative supplies counterevidence to the other retained objects of
// its subject/predicate, even when that alternative does not match the query object.
const affects = (pattern, at, functional, history) => {
  if (meets(pattern, at)) return true;
  if (!Object.hasOwn(pattern, "object")
    || !Object.entries(pattern).every(([role, term]) => role === "object" || coincides(at[role], term))) return false;
  // Functional membership belongs to the projected target, as in sectionOf: a raw
  // alternative may use a different but canonically equivalent predicate carrier.
  // Removed matching objects are themselves changes. If the object remains, read
  // its projected dependency without recording a new query. Another task's offer
  // stays outside this body's load query, preserving the narrow incremental frame.
  return sectionOf(history, at.subject).some((value) =>
    functional.has(value.predicate) && coincides(value.predicate, at.predicate) && coincides(value.object, pattern.object));
};
/** What a derivation queried, keyed by the role a changed cell is looked up by: its subject when the
 * query named one, else its predicate. Matching accounts for the query projection below. */
function patternsOf(entry) {
  if (entry.patterns) return entry.patterns;
  const subjects = new Map(), predicates = new Map(), open = [];
  const file = (buckets, at, pattern) => {
    if (!buckets.has(at)) buckets.set(at, []);
    buckets.get(at).push(pattern);
  };
  for (const pattern of entry.depends.patterns.values()) {
    if (Object.hasOwn(pattern, "subject")) file(subjects, key(pattern.subject, null), pattern);
    else if (Object.hasOwn(pattern, "predicate")) file(predicates, key(pattern.predicate, null), pattern);
    else open.push(pattern);
  }
  return entry.patterns = { subjects, predicates, open };
}
const changeKeys = new WeakMap();
const keyedChanges = (changes) => {
  if (!changeKeys.has(changes)) changeKeys.set(changes, changes.map((at) => ({ at, subject: key(at.subject, null), predicate: key(at.predicate, null) })));
  return changeKeys.get(changes);
};
/** Ask an inner derivation for its result without hearing its reads: checking whether a reading
 * still holds is not a reading. */
function unheard(ask) {
  const priorReading = reading, priorDepending = depending;
  reading = null;
  depending = null;
  try { return ask(); }
  finally { reading = priorReading; depending = priorDepending; }
}
/** The frame rule: a reading holds of a later history when no changed cell meets anything it
 * queried through its evidence projection and every inner derivation it used still gives the result it used. */
function carries(entry, changes, history) {
  if (changes === null) return false;
  if (changes.length === 0) return true;
  const { subjects, predicates, open } = patternsOf(entry), functional = new Set(history.functionalPredicates);
  if (keyedChanges(changes).some(({ at, subject, predicate }) => (subjects.get(subject) ?? []).some((pattern) => affects(pattern, at, functional, history))
    || (predicates.get(predicate) ?? []).some((pattern) => affects(pattern, at, functional, history))
    || open.some((pattern) => affects(pattern, at, functional, history)))) return false;
  for (const [derivation, results] of entry.depends.nodes) {
    for (const [at, result] of results) if (unheard(() => derivation(history, at)) !== result) return false;
  }
  return true;
}
/** Structural equality of two readings, by identity wherever they share parts. */
function sameReading(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((at) => Object.hasOwn(b, at) && sameReading(a[at], b[at]));
}
// The most recent histories a derivation is carried from, one per key; past this many keys the
// least recently derived is dropped, so departed keys never pin old histories.
const CARRIED_KEYS = 1 << 16;
/** A pure reading of a history, kept per history value and key: a history never changes, so asked
 * again of the same one it returns what it returned, and records the same reads it made, so a
 * caller capturing reads sees them whether the reading was derived or recalled. Asked of a later
 * history, it is carried forward unchanged when nothing it read has changed; derived again to an
 * equal reading, it is the reading it was, so what was derived from it carries too. A derivation
 * reads its history only through recorded queries (sections, patterns, subjects) and derivations. */
export function historyDerivation(derive) {
  const known = new WeakMap(), latest = new Map();
  const derivation = (history, key) => {
    let byKey = known.get(history);
    if (!byKey) known.set(history, byKey = new Map());
    let entry = byKey.get(key);
    if (!entry) {
      const last = latest.get(key);
      if (last && carries(last.entry, historyChanges(last.history, history), history)) entry = last.entry;
      else {
        const priorReading = reading, priorDepending = depending, reads = new Map(), depends = { patterns: new Map(), nodes: new Map() };
        reading = reads;
        depending = depends;
        let result;
        try { result = derive(history, key); }
        finally { reading = priorReading; depending = priorDepending; }
        entry = { result: last && sameReading(last.entry.result, result) ? last.entry.result : result, reads, depends };
      }
      byKey.set(key, entry);
      latest.delete(key);
      latest.set(key, { history, entry });
      if (latest.size > CARRIED_KEYS) latest.delete(latest.keys().next().value);
    }
    if (reading) for (const [at, pattern] of entry.reads) reading.set(at, pattern);
    if (depending) {
      if (!depending.nodes.has(derivation)) depending.nodes.set(derivation, new Map());
      depending.nodes.get(derivation).set(key, entry.result);
    }
    return entry.result;
  };
  return derivation;
}

export function createHistory(functionalPredicates = []) {
  const history = Object.freeze({ kind: "signcraft.history", functionalPredicates: frozen([...new Set(functionalPredicates)].sort()), revisions: frozen([]) });
  admitted.add(history);
  return history;
}

export function validateHistory(history) {
  if (history?.kind !== "signcraft.history" || !Array.isArray(history.revisions) || !Array.isArray(history.functionalPredicates)) throw new TypeError("Expected SignCraft history");
  return history;
}

// A newly built index is private. Appending an observation copies each touched
// predecessor bucket once, so earlier histories retain their own reading.
function addToBucket(buckets, at, subjectKey, subject, copied) {
  let subjects = buckets.get(at);
  if (subjects?.has(subjectKey)) return;
  if (!subjects) {
    subjects = new PersistentMap();
    buckets.set(at, subjects);
  } else if (copied && !copied.has(at)) {
    // A fork shares the bucket's structure with the history it extends; only the path to the new subject is copied.
    subjects = subjects.fork();
    buckets.set(at, subjects);
    copied.add(at);
  }
  subjects.set(subjectKey, subject);
}

// A cell whose object is text names another subject (a place, an owner, a whole of which it is
// part): those references are indexed by predicate and object, so asking what refers to a subject
// reads its referrers, not every cell of the predicate. Other objects are bodies, never keys.
function addQueryIndex(index, value, copied) {
  const subjectKey = key(value.subject, null);
  addToBucket(index.byPredicate, key(value.predicate, null), subjectKey, value.subject, copied);
  if (textual(value.object) && value.object !== null) addToBucket(index.byReference, key(value.predicate, value.object), subjectKey, value.subject, copied);
}

function indexOf(history) {
  validateHistory(history);
  if (cache.has(history)) return cache.get(history);
  const index = { revisions: new PersistentMap(), heads: new Set(), bySubject: new PersistentMap(), byPredicate: new PersistentMap(), byReference: new PersistentMap(), ancestors: new PersistentMap(), readings: new PersistentMap() };
  const functional = new Set(history.functionalPredicates);
  const frontier = history.checkpoint?.heads ?? [];
  for (const id of frontier) {
    index.revisions.set(id, { id, parents: [] });
    index.heads.add(id);
  }
  for (const value of history.checkpoint?.cells ?? []) {
    addQueryIndex(index, value);
    const subjectKey = key(value.subject, null);
    let entry = index.bySubject.get(subjectKey);
    if (!entry) { entry = { subject: value.subject, observations: [] }; index.bySubject.set(subjectKey, entry); }
    entry.observations.push({ revision: null, cell: value });
  }
  const descendants = new Set();
  for (const revision of history.revisions) {
    // Every tail starts after the complete retained frontier. Partial-frontier
    // histories require their archived ancestry before they can be combined.
    if (frontier.length && !revision.parents.some((id) => descendants.has(id)) && !frontier.every((id) => revision.parents.includes(id))) {
      throw new TypeError("History tail does not descend from its checkpoint frontier");
    }
    descendants.add(revision.id);
    const extendsAll = [...index.heads].every((head) => revision.parents.includes(head));
    if (index.revisions.has(revision.id)) throw new TypeError("Duplicate history revision");
    for (const parent of revision.parents) {
      if (!index.revisions.has(parent)) throw new TypeError("History parent is absent or not before its child");
      index.heads.delete(parent);
    }
    index.revisions.set(revision.id, revision);
    index.heads.add(revision.id);
    const written = new Set();
    for (const value of revision.cells) {
      addQueryIndex(index, value);
      const subjectKey = key(value.subject, null);
      let entry = index.bySubject.get(subjectKey);
      if (!entry) { entry = { subject: value.subject, observations: [] }; index.bySubject.set(subjectKey, entry); }
      const at = key(value.subject, value.predicate);
      if (functional.has(value.predicate) && !written.has(at)) {
        entry.observations = entry.observations.filter((old) => !coincides(old.cell.predicate, value.predicate) || (!extendsAll && old.revision !== null && !ancestorsOf(index, revision.id).has(old.revision)));
        written.add(at);
      }
      entry.observations.push({ revision: revision.id, cell: value });
    }
  }
  cache.set(history, index);
  return index;
}

export const historyHeads = (history) => frozen([...indexOf(history).heads].sort());
export const historySubjects = (history) => {
  recordRead({});
  return frozen([...indexOf(history).bySubject.values()].map(({ subject }) => subject));
};
/** The key under which a history's index groups a subject's observations; coincides exactly when the subjects' canonical bytes do. */
export const historySubjectKey = (subject) => key(subject, null);
export const historySize = (history) => history.revisions.reduce((total, revision) => total + revision.cells.length, history.checkpoint?.size ?? 0);

/** Admit a decoded history, checking the content addresses and causal closure. */
export function restoreHistory(source) {
  validateHistory(source);
  if (admitted.has(source)) return source;
  const revisions = source.revisions.map((revision) => {
    const body = retainedCarrier({ parents: frozen(revision.parents), source: revision.source, cells: frozen(revision.cells.map(admitCell)) });
    if (revision.id !== identify(body)) throw new TypeError("History revision does not match its content address");
    return retainedCarrier({ id: revision.id, ...body });
  });
  const checkpoint = source.checkpoint === undefined ? undefined : restoreCheckpoint(source.checkpoint);
  if (checkpoint) {
    if (checkpoint.functionalPredicates.some((predicate) => !source.functionalPredicates.includes(predicate))) throw new TypeError("Checkpoint functional predicates cannot be removed");
    const additions = source.functionalPredicates.filter((predicate) => !checkpoint.functionalPredicates.includes(predicate));
    if (checkpoint.cells.some((value) => additions.includes(value.predicate))) throw new TypeError("New functional readings require archived history");
  }
  const history = Object.freeze({ ...createHistory(source.functionalPredicates), ...(checkpoint ? { checkpoint } : {}), revisions: frozen(revisions) });
  indexOf(history);
  admitted.add(history);
  return history;
}

/** Append one atomic observation, causally after every head visible to the writer. */
export function observeHistory(history, cells, { source = "signcraft" } = {}) {
  validateHistory(history);
  if (cells.length === 0) return history;
  const body = retainedCarrier({ parents: historyHeads(history), source, cells: frozen(cells.map(admitCell)) });
  const revision = retainedCarrier({ id: identify(body), ...body });
  const next = Object.freeze({ ...history, revisions: frozen([...history.revisions, revision]) });
  // Copy only touched subject indexes; readers of the predecessor remain unchanged.
  const prior = indexOf(history);
  const index = { revisions: prior.revisions.fork(), heads: new Set([revision.id]), bySubject: prior.bySubject.fork(), byPredicate: prior.byPredicate.fork(), byReference: prior.byReference.fork(), ancestors: prior.ancestors.fork(), readings: prior.readings.fork() };
  index.revisions.set(revision.id, revision);
  const touched = new Set(), written = new Set(), copied = new Set(), functional = new Set(history.functionalPredicates), superseded = [];
  for (const value of revision.cells) {
    addQueryIndex(index, value, copied);
    const subjectKey = key(value.subject, null);
    if (!touched.has(subjectKey)) {
      index.bySubject.set(subjectKey, { subject: value.subject, observations: [...(prior.bySubject.get(subjectKey)?.observations ?? [])] });
      index.readings.delete(subjectKey);
      touched.add(subjectKey);
    }
    const at = key(value.subject, value.predicate), entry = index.bySubject.get(subjectKey);
    if (functional.has(value.predicate) && !written.has(at)) {
      const kept = [];
      for (const old of entry.observations) {
        if (coincides(old.cell.predicate, value.predicate)) superseded.push(old.cell);
        else kept.push(old);
      }
      entry.observations = kept;
      written.add(at);
    }
    entry.observations.push({ revision: revision.id, cell: value });
  }
  cache.set(next, index);
  steps.set(next, stepFrom(history, frozen([...revision.cells, ...superseded])));
  return inheritArchive(history, next);
}

/** Replay ordered observations without retaining an index for every intermediate history.
 * The projection receives the exact causal parents so domain witnesses retain their
 * original meaning. Every revision uses the same cell admission and address as
 * observeHistory; only the final disposable index is built.
 */
export function replayHistory(history, observations, project = (observation) => observation) {
  validateHistory(history);
  let parents = historyHeads(history);
  const revisions = [...history.revisions];
  for (const observation of observations) {
    const { cells, source = "signcraft" } = project(observation, parents);
    if (cells.length === 0) continue;
    const body = retainedCarrier({ parents, source, cells: frozen(cells.map(admitCell)) });
    const revision = retainedCarrier({ id: identify(body), ...body });
    revisions.push(revision);
    parents = frozen([revision.id]);
  }
  if (revisions.length === history.revisions.length) return history;
  const result = Object.freeze({ ...history, revisions: frozen(revisions) });
  indexOf(result);
  return inheritArchive(history, result);
}

/** Admit decoded revisions that continue a history, each checked against its content address
 *  and its causal parents, so a history too large to admit at once is admitted in bounded spans
 *  that each commit before the next. Only the final index is built, as in replayHistory. */
export function continueHistory(history, revisions) {
  validateHistory(history);
  if (revisions.length === 0) return history;
  const admittedRevisions = revisions.map((revision) => {
    const body = retainedCarrier({ parents: frozen(revision.parents), source: revision.source, cells: frozen(revision.cells.map(admitCell)) });
    if (revision.id !== identify(body)) throw new TypeError("History revision does not match its content address");
    return retainedCarrier({ id: revision.id, ...body });
  });
  const result = Object.freeze({ ...history, revisions: frozen([...history.revisions, ...admittedRevisions]) });
  indexOf(result);
  return inheritArchive(history, result);
}

/** Union complete histories, retaining every concurrent branch and its witnesses. */
export function mergeHistories(...histories) {
  if (histories.length === 0) return createHistory();
  const checkpointIds = new Set(histories.map((history) => history.checkpoint?.id));
  if (checkpointIds.size > 1) return mergeHistories(...histories.map(materializeHistory));
  const checkpoint = histories[0].checkpoint;
  const predicates = [...new Set(histories.flatMap((history) => history.functionalPredicates))].sort();
  if (histories.every((history) => history === histories[0])) return histories[0];
  // Joining an ancestor into its descendant adds no observations. Retain the
  // descendant's existing projection instead of replaying its entire history.
  const distinct = [...new Set(histories)];
  const maximum = Math.max(...distinct.map((history) => history.revisions.length));
  const largest = distinct.filter((history) => history.revisions.length === maximum);
  if (largest.length === 1) {
    const descendant = largest[0];
    if (predicates.length === descendant.functionalPredicates.length && predicates.every((predicate) => descendant.functionalPredicates.includes(predicate))) {
      const known = indexOf(descendant).revisions;
      if (distinct.every((history) => history.revisions.every((revision) => known.has(revision.id)))) return descendant;
    }
  }
  if (checkpoint && predicates.some((predicate) => !checkpoint.functionalPredicates.includes(predicate) && checkpoint.cells.some((value) => value.predicate === predicate))) {
    return mergeHistories(...histories.map(materializeHistory));
  }
  const revisions = new Map();
  for (const history of histories) for (const revision of history.revisions) revisions.set(revision.id, revision);
  const ordered = [], remaining = new Map(), children = new Map();
  const frontier = new Set(checkpoint?.heads ?? []);
  for (const revision of revisions.values()) {
    remaining.set(revision.id, revision.parents.filter((parent) => !frontier.has(parent)).length);
    for (const parent of revision.parents) {
      if (frontier.has(parent)) continue;
      if (!revisions.has(parent)) throw new TypeError("History has a missing parent");
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(revision.id);
    }
  }
  let ready = [...revisions.values()].filter((revision) => remaining.get(revision.id) === 0).map((revision) => revision.id).sort();
  while (ready.length) {
    const next = [];
    for (const id of ready) {
      ordered.push(revisions.get(id));
      for (const child of children.get(id) ?? []) {
        remaining.set(child, remaining.get(child) - 1);
        if (remaining.get(child) === 0) next.push(child);
      }
    }
    ready = next.sort();
  }
  if (ordered.length !== revisions.size) throw new TypeError("History has a causal cycle");
  const merged = inheritArchive(histories.find((history) => archives.has(history)) ?? histories[0], Object.freeze({ ...createHistory(predicates), ...(checkpoint ? { checkpoint } : {}), revisions: frozen(ordered) }));
  if (!histories.every((history) => admitted.has(history))) admitted.delete(merged);
  return merged;
}

function ancestorsOf(index, revision) {
  if (index.ancestors.has(revision)) return index.ancestors.get(revision);
  const found = new Set(), pending = [...index.revisions.get(revision).parents];
  while (pending.length) {
    const parent = pending.pop();
    if (found.has(parent)) continue;
    found.add(parent);
    pending.push(...index.revisions.get(parent).parents);
  }
  index.ancestors.set(revision, found);
  return found;
}

/** The reading of one subject's retained cells: cells of a predicate gather as a cell set, and
 * conflicting functional values carry counterevidence. Pure over the cells it is given, so a store
 * that holds a subject's retained cells reads exactly as a history that indexes them. */
export function historySectionOfCells(functionalPredicates, subject, cells) {
  const functional = new Set(functionalPredicates), byPredicate = new Map();
  for (const value of cells) {
    const predicateKey = key(subject, value.predicate);
    if (!byPredicate.has(predicateKey)) byPredicate.set(predicateKey, []);
    byPredicate.get(predicateKey).push(value);
  }
  const result = [];
  for (const entries of byPredicate.values()) {
    // Revisions already carry SignCell witnesses. Rebuilding a telling log
    // would duplicate every witness into rows only to gather the same cells.
    const section = cellSet(entries);
    for (const value of section) {
      const alternatives = functional.has(value.predicate) ? section.filter((other) => !coincides(value.object, other.object) && other.for.length) : [];
      result.push(alternatives.length ? evidenced(value, { for: value.for, against: [...value.against, ...alternatives.flatMap((other) => other.for)] }) : value);
    }
  }
  return cellSet(result);
}

/** Read one subject as SignCells. Conflicting functional values carry counterevidence. */
function sectionOf(history, subject) {
  const index = indexOf(history), subjectKey = key(subject, null);
  if (index.readings.has(subjectKey)) return index.readings.get(subjectKey);
  const observations = index.bySubject.get(subjectKey)?.observations ?? [];
  const section = historySectionOfCells(history.functionalPredicates, subject, observations.map(({ cell: value }) => value));
  index.readings.set(subjectKey, section);
  return section;
}

/** Query a subject/predicate without observing unrelated cells. */
export function historySection(history, subject, predicate) {
  recordRead({ subject, ...(predicate === undefined ? {} : { predicate }) });
  const section = sectionOf(history, subject);
  return predicate === undefined ? section : frozen(section.filter((at) => coincides(at.predicate, predicate)));
}

/** Pattern queries record their range, including its currently empty part. */
export function queryHistory(history, pattern) {
  recordRead(pattern);
  const index = indexOf(history);
  let subjects;
  if (Object.hasOwn(pattern, "subject")) subjects = [pattern.subject];
  else if (Object.hasOwn(pattern, "predicate")) {
    // Object equality is checked against the retained cells below; a reference
    // narrows the candidates to its referrers before that check.
    const reference = Object.hasOwn(pattern, "object") && textual(pattern.object) && pattern.object !== null;
    const candidates = reference ? index.byReference.get(key(pattern.predicate, pattern.object)) : index.byPredicate.get(key(pattern.predicate, null));
    subjects = [...(candidates?.values() ?? [])];
  } else subjects = [...index.bySubject.values()].map(({ subject }) => subject);
  return frozen(subjects.flatMap((subject) => sectionOf(history, subject)).filter((at) => Object.entries(pattern).every(([role, term]) => coincides(at[role], term))));
}

export function withFunctionalPredicates(history, predicates) {
  validateHistory(history);
  const additions = predicates.filter((predicate) => !history.functionalPredicates.includes(predicate));
  if (!additions.length) return history;
  if (history.checkpoint?.cells.some((value) => additions.includes(value.predicate))) {
    return withFunctionalPredicates(materializeHistory(history), predicates);
  }
  return inheritArchive(history, Object.freeze({ ...history, functionalPredicates: frozen([...new Set([...history.functionalPredicates, ...additions])].sort()) }));
}

/** Project evidence metadata from the retained observations, without a second log. */
export function historyReading(history, subject) {
  return frozen(historySection(history, subject).map((value) => Object.freeze({ ...value, evidence: knowledgeReading(value) })));
}


/** Attach the durable revision carrier without embedding storage machinery in data.
 * The reader returns retained revisions in parent-before-child order. It is used
 * only when a caller needs earlier ancestry, not for ordinary reads or appends.
 */
export function bindHistoryArchive(history, readRevisions) {
  validateHistory(history);
  if (typeof readRevisions !== "function") throw new TypeError("History archive reader must be a function");
  archives.set(history, readRevisions);
  return history;
}

function restoreCheckpoint(source) {
  if (!source || !Array.isArray(source.heads) || !Array.isArray(source.cells)
    || !Array.isArray(source.functionalPredicates) || !Number.isSafeInteger(source.size) || source.size < source.cells.length
    || source.heads.some((head) => typeof head !== "string") || new Set(source.heads).size !== source.heads.length
    || ((source.size === 0) !== (source.heads.length === 0))) throw new TypeError("Invalid history checkpoint");
  const body = { heads: frozen(source.heads), cells: frozen(source.cells.map(admitCell)), size: source.size, functionalPredicates: frozen(source.functionalPredicates) };
  if (source.id !== identifyCheckpoint(body) && source.id !== identifyWholeCheckpoint(body)) throw new TypeError("History checkpoint does not match its content address");
  return Object.freeze({ id: source.id, ...body });
}

/** Cut a current reading at its causal frontier; this is not a new observation.
 * Store the previous revisions in an archive before discarding the input. Raw
 * active cells retain original witnesses, including both sides of conflicts;
 * projected counterevidence is never written back as an observation.
 */
export function checkpointHistory(history) {
  validateHistory(history);
  if (history.checkpoint && !history.revisions.length) return history;
  const index = indexOf(history);
  const body = {
    heads: historyHeads(history),
    cells: frozen([...index.bySubject.values()].flatMap(({ observations }) => observations.map(({ cell: value }) => value))),
    size: historySize(history),
    functionalPredicates: history.functionalPredicates,
  };
  const checkpoint = Object.freeze({ id: identifyCheckpoint(body), ...body });
  const next = Object.freeze({ ...history, checkpoint, revisions: frozen([]) });
  // The cut reads exactly as its source, so it keeps the source's index rather than re-deriving one
  // from every cell; each observation it retains now belongs to the checkpoint, not to a revision.
  cache.set(next, {
    revisions: new PersistentMap(body.heads.map((id) => [id, { id, parents: [] }])),
    heads: new Set(body.heads),
    bySubject: new PersistentMap([...index.bySubject].map(([at, entry]) => [at, entry.observations.every(({ revision }) => revision === null) ? entry
      : { subject: entry.subject, observations: entry.observations.map(({ cell: value }) => ({ revision: null, cell: value })) }])),
    byPredicate: index.byPredicate,
    byReference: index.byReference,
    ancestors: new PersistentMap(),
    readings: index.readings,
  });
  steps.set(next, stepFrom(history, frozen([])));
  return inheritArchive(history, next);
}

/** The raw cells a history's reading retains for one subject, in its checkpoint's order: what a
 * store rewrites for a subject a commit touched, without reading any other subject. */
export function historySubjectCells(history, subject) {
  return frozen(indexOf(history).bySubject.get(key(subject, null))?.observations.map(({ cell: value }) => value) ?? []);
}

/** Recover exactly this world's ancestry, never later observations in its store. */
export function materializeHistory(history) {
  validateHistory(history);
  if (!history.checkpoint) return history;
  const read = archives.get(history);
  if (!read) throw new TypeError("This operation requires the retained history archive");
  const revisions = new Map();
  for (const revision of read()) revisions.set(revision.id, revision);
  for (const revision of history.revisions) revisions.set(revision.id, revision);
  const required = new Set(), pending = [...historyHeads(history)];
  while (pending.length) {
    const id = pending.pop();
    if (required.has(id)) continue;
    const revision = revisions.get(id);
    if (!revision) throw new TypeError("History archive is missing a required revision");
    required.add(id);
    pending.push(...revision.parents);
  }
  const complete = restoreHistory({ kind: "signcraft.history", functionalPredicates: history.functionalPredicates,
    revisions: [...revisions.values()].filter((revision) => required.has(revision.id)) });
  // Authenticate that the archive really contains the checkpoint's past, not
  // merely records with matching frontier labels.
  const baseIds = new Set(), basePending = [...history.checkpoint.heads];
  while (basePending.length) {
    const id = basePending.pop();
    if (baseIds.has(id)) continue;
    baseIds.add(id);
    basePending.push(...revisions.get(id).parents);
  }
  const base = restoreHistory({ kind: "signcraft.history", functionalPredicates: history.checkpoint.functionalPredicates,
    revisions: [...revisions.values()].filter((revision) => baseIds.has(revision.id)) });
  const actual = checkpointHistory(base).checkpoint;
  // Array order may differ after a legal topological merge, while evidence and
  // causal heads are identical. Compare the raw carrier as a set in that case.
  if (actual.id !== history.checkpoint.id && (actual.size !== history.checkpoint.size
    || !coincides(actual.heads, history.checkpoint.heads)
    || !coincides(cellSet(actual.cells), cellSet(history.checkpoint.cells)))) {
    throw new TypeError("History archive does not substantiate its checkpoint");
  }
  return inheritArchive(history, complete);
}
