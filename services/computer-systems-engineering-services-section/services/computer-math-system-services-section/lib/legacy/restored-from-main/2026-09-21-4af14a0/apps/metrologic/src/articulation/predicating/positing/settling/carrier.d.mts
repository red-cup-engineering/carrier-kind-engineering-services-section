/**
 * settling/carrier — ranked-readings carriers.
 *
 * A small helper: wrap a list of readings with its Natural rank, and select a
 * sub-kind of readings into its own ranked carrier. Used by the gap and
 * consistency analyses to bundle and partition their per-cell readings.
 */
import { type Natural } from "./analysis/exact-number.mjs";
/** A list of readings with its Natural rank. */
export interface RankedReadingsCarrier<Kind extends string, Reading> {
    readonly kind: Kind;
    readonly readings: readonly Reading[];
    readonly rank: Natural;
}
/** Wrap readings with their count as rank. */
export declare const rankedReadings: <Kind extends string, Reading>(kind: Kind, readings: readonly Reading[]) => RankedReadingsCarrier<Kind, Reading>;
/** Select a sub-kind of readings into its own ranked carrier. */
export declare const selectRankedReadings: <Kind extends string, Reading, Selected extends Reading>(kind: Kind, readings: readonly Reading[], select: (reading: Reading) => reading is Selected) => RankedReadingsCarrier<Kind, Selected>;
