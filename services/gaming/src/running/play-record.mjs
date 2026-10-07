/**
 * Play record — the stored form of a play (Def. 7.3): the moves in the order they were made,
 * each in a `{ seq, intent, ts? }` entry with strictly increasing `seq`.
 *
 * The record is the single source of truth for a run; the position is recomputed from it by
 * `replayPlay` (`./rules.mjs`), never kept beside it. A move (and each event `extend`
 * produces) is game-declared data under one envelope, a plain object with a non-empty string
 * `kind`; this module enforces only the envelope and the record's own order. The entry key
 * stays `intent` because stored runs carry it.
 */

import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";

function hasKindEnvelope(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x) && typeof x.kind === "string" && x.kind !== "";
}

export const isMove = hasKindEnvelope;
export const isGameEvent = hasKindEnvelope;

/** Validate a candidate play record without trusting its type; every error is collected. */
export function validatePlayRecord(data) {
  if (!Array.isArray(data)) return { valid: false, errors: ["play record must be an array of entries"] };
  const errors = [];
  let previousSeq;
  data.forEach((entry, index) => {
    const where = `entry[${index}]`;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      errors.push(`${where}: must be an object`);
      return;
    }
    if (!Number.isInteger(entry.seq)) {
      errors.push(`${where}.seq: must be an integer`);
    } else {
      if (previousSeq !== undefined && entry.seq <= previousSeq) {
        errors.push(`${where}.seq: must be strictly greater than the previous entry's seq (got ${entry.seq} after ${previousSeq})`);
      }
      previousSeq = entry.seq;
    }
    if (!hasKindEnvelope(entry.intent)) errors.push(`${where}.intent: must be an object with a non-empty string "kind"`);
    if (entry.ts !== undefined && !Number.isFinite(entry.ts)) errors.push(`${where}.ts: when present, must be a finite number`);
  });
  return { valid: errors.length === 0, errors };
}

/** Canonical JSON text of a record: two records with the same content encode to the same bytes. */
export function encodePlayRecord(record) {
  return canonicalJson(record);
}

/** Parse and validate a record; throws with every validation error rather than returning a
 *  partially trusted value. */
export function decodePlayRecord(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new SyntaxError(`decodePlayRecord: invalid JSON: ${err.message}`);
  }
  const result = validatePlayRecord(parsed);
  if (!result.valid) throw new TypeError(`decodePlayRecord: invalid play record:\n  ${result.errors.join("\n  ")}`);
  return parsed;
}

/** A new record with `move` appended. `seq` defaults to one past the last entry (0 when
 *  empty); an explicit `seq` must still exceed the last one. */
export function appendMove(record, move, options) {
  if (!Array.isArray(record)) throw new TypeError("appendMove: record must be an array");
  if (!isMove(move)) throw new TypeError('appendMove: move must be an object with a non-empty string "kind"');
  const previousSeq = record.length > 0 ? record[record.length - 1].seq : undefined;
  if (previousSeq !== undefined && !Number.isSafeInteger(previousSeq)) throw new TypeError("appendMove: the record's last seq must be a safe integer");
  const seq = options?.seq ?? (previousSeq === undefined ? 0 : previousSeq + 1);
  if (!Number.isSafeInteger(seq)) throw new TypeError("appendMove: seq must be a safe integer");
  if (previousSeq !== undefined && seq <= previousSeq) {
    throw new RangeError(`appendMove: seq ${seq} is not strictly greater than the record's last seq ${previousSeq}`);
  }
  if (options?.ts !== undefined && !Number.isFinite(options.ts)) throw new TypeError("appendMove: ts must be a finite number");
  return [...record, options?.ts === undefined ? { seq, intent: move } : { seq, intent: move, ts: options.ts }];
}
