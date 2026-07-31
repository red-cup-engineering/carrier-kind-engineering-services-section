// witness-journal-state-service — pure state readout.
//
// Two things live here, and they are not the same thing:
//
//   1. `latestPerCell` — the state readout proper: the minimal sufficient
//      statistic of a journal for "what is the current value of each cell."
//      Delete the log, keep this, and you lose nothing for that one query.
//      It is unconditional: every cell gets exactly one latest-wins answer.
//
//   2. `reading` — a reading is a projection computed OVER witnesses, scoped
//      to a situation (a filter/time-window over the entries being read
//      together). A reading is never a stored field; it is recomputed every
//      time from whichever entries the situation admits. Contradiction shows
//      up ONLY inside a reading, and only when the situation's window
//      contains more than one distinct witnessed value for a cell — narrow
//      the situation and the same cell can stop being contested. Nothing
//      returned by either function carries a `charge` key: the charge is a
//      reading, not a stored property of an entry.
//
// Both functions are pure folds over an array of entries; there is no I/O
// here at all — that is the log service's job.

import { canonical } from "@red-cup-engineering/json-file-codec-service";

/**
 * @typedef {import("@red-cup-engineering/json-file-codec-service").JsonValue} JsonValue
 * @typedef {{ readonly e: JsonValue, readonly a: JsonValue, readonly v: JsonValue, readonly t: JsonValue }} WitnessJournalEntryLike
 */

function cellKeyOf(row) {
  return canonical([row.e, row.a]);
}

/**
 * A pure fold from an append-only entry log to its current state view.
 *
 * One answer per cell (per distinct e/a pair): the value witnessed at the
 * greatest canonical time. Ties (two entries sharing the greatest canonical
 * time for one cell) keep whichever of them was folded first, so the result
 * is deterministic for a given input order.
 *
 * @param {readonly WitnessJournalEntryLike[]} entries
 * @returns {{ readonly [cellKey: string]: { readonly e: JsonValue, readonly a: JsonValue, readonly value: JsonValue, readonly time: JsonValue } }}
 */
export function latestPerCell(entries) {
  /** @type {Map<string, { e: JsonValue, a: JsonValue, value: JsonValue, time: JsonValue }>} */
  const cells = new Map();
  for (const row of entries) {
    const key = cellKeyOf(row);
    const prior = cells.get(key);
    if (prior === undefined || canonical(row.t) > canonical(prior.time)) {
      cells.set(key, { e: row.e, a: row.a, value: row.v, time: row.t });
    }
  }
  /** @type {Record<string, { e: JsonValue, a: JsonValue, value: JsonValue, time: JsonValue }>} */
  const view = {};
  for (const [key, cell] of cells) view[key] = Object.freeze(cell);
  return Object.freeze(view);
}

/**
 * Scope a set of entries to one situation: an optional time window
 * (`since`/`until`, compared as canonical JSON of `t`, inclusive on both
 * ends) and/or an arbitrary `filter` predicate. Omitting `situation`
 * entirely admits every entry — the widest possible situation.
 *
 * @param {readonly WitnessJournalEntryLike[]} entries
 * @param {{ readonly since?: JsonValue, readonly until?: JsonValue, readonly filter?: (row: WitnessJournalEntryLike) => boolean }} [situation]
 * @returns {readonly WitnessJournalEntryLike[]}
 */
export function situationWindow(entries, situation = {}) {
  const sinceKey = situation.since === undefined ? undefined : canonical(situation.since);
  const untilKey = situation.until === undefined ? undefined : canonical(situation.until);
  return entries.filter((row) => {
    const timeKey = canonical(row.t);
    if (sinceKey !== undefined && timeKey < sinceKey) return false;
    if (untilKey !== undefined && timeKey > untilKey) return false;
    if (situation.filter !== undefined && !situation.filter(row)) return false;
    return true;
  });
}

/**
 * A reading: the valuation of every cell touched by the entries a situation
 * admits. Plain, on purpose: this function does not decide what is true, it
 * reports what the admitted witnesses say, including when they disagree.
 * `contested` is true exactly when the situation's window holds more than
 * one distinct value for that cell — a fact about this reading-in-this-
 * situation, not a fact stored anywhere on the journal itself.
 *
 * @param {readonly WitnessJournalEntryLike[]} entries
 * @param {{ readonly since?: JsonValue, readonly until?: JsonValue, readonly filter?: (row: WitnessJournalEntryLike) => boolean }} [situation]
 * @returns {{ readonly [cellKey: string]: {
 *   readonly e: JsonValue,
 *   readonly a: JsonValue,
 *   readonly latest: { readonly value: JsonValue, readonly time: JsonValue },
 *   readonly values: readonly { readonly value: JsonValue, readonly time: JsonValue }[],
 *   readonly contested: boolean,
 * } }}
 */
export function reading(entries, situation = {}) {
  const windowed = situationWindow(entries, situation);
  /** @type {Map<string, { e: JsonValue, a: JsonValue, values: Map<string, { value: JsonValue, time: JsonValue }> }>} */
  const cells = new Map();
  for (const row of windowed) {
    const key = cellKeyOf(row);
    const cell = cells.get(key) ?? { e: row.e, a: row.a, values: new Map() };
    cell.values.set(canonical(row.v), { value: row.v, time: row.t });
    cells.set(key, cell);
  }

  const latest = latestPerCell(windowed);

  /** @type {Record<string, unknown>} */
  const result = {};
  for (const [key, cell] of cells) {
    const values = Object.freeze([...cell.values.values()]);
    result[key] = Object.freeze({
      e: cell.e,
      a: cell.a,
      latest: Object.freeze({ value: latest[key].value, time: latest[key].time }),
      values,
      contested: values.length > 1,
    });
  }
  return Object.freeze(result);
}
