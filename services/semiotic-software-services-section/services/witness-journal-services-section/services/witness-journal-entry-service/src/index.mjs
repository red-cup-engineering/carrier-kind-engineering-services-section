// witness-journal-entry-service — pure entry law.
//
// A witness-journal entry is EAVT: E (subject token), A (predicate — an RMN
// term), V (object), T (time). An entry carries no charge (a charge is a
// reading, a projection computed over entries by the state service, never a
// field stored on one entry) and no stored trace (a trace is an entry's
// ordinal in its journal, computed by the log service at read time, never
// carried by the entry itself). This module only builds and validates
// entries; it performs no I/O and knows nothing about a journal's append
// order.
//
// Predicate validation: the Law says A is an RMN term. The relation-model-
// notation seat that will check RMN term shape is a sibling section not yet
// built at the time of this extraction, so `entry`/`isEntry` accept any
// present JSON value for A. A caller that already has RMN term checking may
// pass a `predicateIsValid` hook to `entry`; leaving it unset validates only
// that A is present JSON, never that it is well-formed RMN.

import { isJsonValue, canonical } from "@red-cup-engineering/json-file-codec-service";
import {
  eavtId,
  eavtRecord,
  isEavtShape,
} from "@red-cup-engineering/json-file-codec-service/jsonl/eavt";

/**
 * @typedef {{ readonly e: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 *             readonly a: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 *             readonly v: import("@red-cup-engineering/json-file-codec-service").JsonValue,
 *             readonly t: import("@red-cup-engineering/json-file-codec-service").JsonValue }} WitnessJournalEntry
 */

function present(value) {
  return value !== undefined;
}

/**
 * Assert that a value is shaped like a witness-journal entry: an object with
 * present, JSON-valued `e`, `a`, `v`, `t`, or the four-element tuple spelling
 * `[e, a, v, t]`. Throws a `TypeError` naming the first law it breaks.
 *
 * @param {unknown} value
 */
export function assertValidEntry(value) {
  if (Array.isArray(value)) {
    if (value.length !== 4) {
      throw new TypeError("witness-journal entry: tuple spelling must have exactly four parts [e, a, v, t]");
    }
    if (!isEavtShape(value)) {
      throw new TypeError("witness-journal entry: tuple parts must all be JSON values");
    }
    return;
  }
  if (typeof value !== "object" || value === null) {
    throw new TypeError("witness-journal entry: must be an object with e, a, v, t or a four-element tuple");
  }
  for (const field of /** @type {const} */ (["e", "a", "v", "t"])) {
    if (!present(/** @type {Record<string, unknown>} */ (value)[field])) {
      throw new TypeError(`witness-journal entry: field "${field}" is required`);
    }
    if (!isJsonValue(/** @type {Record<string, unknown>} */ (value)[field])) {
      throw new TypeError(`witness-journal entry: field "${field}" must be a JSON value`);
    }
  }
}

/**
 * Whether a value is shaped like a witness-journal entry (object or tuple
 * spelling). Never throws.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isEntry(value) {
  try {
    assertValidEntry(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a valid tuple-or-object row into the canonical `{e, a, v, t}`
 * entry record. Throws if the row is not entry-shaped.
 *
 * @param {unknown} row
 * @returns {WitnessJournalEntry}
 */
export function asEntry(row) {
  assertValidEntry(row);
  return /** @type {WitnessJournalEntry} */ (eavtRecord(/** @type {any} */ (row)));
}

/**
 * Build one witness-journal entry, subject-predicate-object-time.
 *
 * `predicateIsValid`, if supplied, is consulted after presence/JSON-value
 * checks — the seam a future RMN-term checker plugs into without this
 * package needing to depend on the notation section.
 *
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} subject
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} predicate
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} object
 * @param {import("@red-cup-engineering/json-file-codec-service").JsonValue} time
 * @param {{ readonly predicateIsValid?: (predicate: import("@red-cup-engineering/json-file-codec-service").JsonValue) => boolean }} [options]
 * @returns {WitnessJournalEntry}
 */
export function entry(subject, predicate, object, time, options = {}) {
  const candidate = { e: subject, a: predicate, v: object, t: time };
  assertValidEntry(candidate);
  if (options.predicateIsValid !== undefined && !options.predicateIsValid(predicate)) {
    throw new TypeError("witness-journal entry: predicate (A) failed the supplied RMN-term check");
  }
  return /** @type {WitnessJournalEntry} */ (eavtRecord(candidate));
}

/**
 * The content identity of an entry: a hash of its canonical `{e, a, v, t}`
 * form. An unchanged entry re-witnessed later hashes identically, which is
 * the whole dedup law — a repeated witness costs nothing.
 *
 * @param {WitnessJournalEntry | readonly [unknown, unknown, unknown, unknown]} row
 * @returns {string}
 */
export function entryId(row) {
  return eavtId(/** @type {any} */ (asEntry(row)));
}

/**
 * Whether two entries are the same witness by canonical content, irrespective
 * of field order or tuple-vs-object spelling.
 *
 * @param {unknown} left
 * @param {unknown} right
 * @returns {boolean}
 */
export function sameEntry(left, right) {
  return canonical(/** @type {any} */ (asEntry(left))) === canonical(/** @type {any} */ (asEntry(right)));
}
