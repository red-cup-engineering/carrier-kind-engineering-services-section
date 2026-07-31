// Hand-written declaration file. This package ships plain .mjs (no build
// step, no TypeScript source) — this file exists only so strict TypeScript
// consumers can typecheck against it.

import type { JsonValue } from "@red-cup-engineering/json-file-codec-service";

/** A witness-journal entry: E (subject), A (predicate), V (object), T (time).
 *  No charge, no trace — both are computed elsewhere, never stored here. */
export interface WitnessJournalEntry {
  readonly e: JsonValue;
  readonly a: JsonValue;
  readonly v: JsonValue;
  readonly t: JsonValue;
}

export type EntryTuple = readonly [e: JsonValue, a: JsonValue, v: JsonValue, t: JsonValue];

export declare function assertValidEntry(value: unknown): asserts value is WitnessJournalEntry | EntryTuple;
export declare function isEntry(value: unknown): boolean;
export declare function asEntry(row: unknown): WitnessJournalEntry;
export declare function entry(
  subject: JsonValue,
  predicate: JsonValue,
  object: JsonValue,
  time: JsonValue,
  options?: { readonly predicateIsValid?: (predicate: JsonValue) => boolean },
): WitnessJournalEntry;
export declare function entryId(row: WitnessJournalEntry | EntryTuple): string;
export declare function sameEntry(left: unknown, right: unknown): boolean;
