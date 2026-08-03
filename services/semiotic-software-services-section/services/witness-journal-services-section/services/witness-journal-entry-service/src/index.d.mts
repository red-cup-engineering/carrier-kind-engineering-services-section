// Hand-written declaration file. This package ships plain .mjs (no build
// step, no TypeScript source) — this file exists only so strict TypeScript
// consumers can typecheck against it.

import type { JsonValue } from "@red-cup-engineering/json-file-codec-service";
import type { Tm } from "@red-cup-engineering/punctuated-name-derivation-service";
import type { SemioticResourceNameAddress } from "@red-cup-engineering/semiotic-resource-name-addressing-service";
import type { NormalizedSemanticContentIdentity } from "@red-cup-engineering/semantic-content-identify-service";

/** Non-semantic JSON compatibility spelling of an EAVT row. */
export interface WitnessJournalEntry {
  readonly e: JsonValue;
  readonly a: JsonValue;
  readonly v: JsonValue;
  readonly t: JsonValue;
}

/** Semiotic EAVT source row. E/A/V are stored as SRN surfaces. */
export interface Seavt {
  readonly e: string;
  readonly a: string;
  readonly v: string;
  readonly t: JsonValue;
}

/** SEAVT semantic readout. E/A/V are their derived closed RMN paths. */
export interface SeavtReadout {
  readonly e: Tm;
  readonly a: Tm;
  readonly v: Tm;
  readonly t: JsonValue;
}

/** Addressed SEAVT readout; the source SEAVT row does not store these tokens or claims. */
export interface AddressedSeavtReadout {
  readonly e: SemioticResourceNameAddress;
  readonly a: SemioticResourceNameAddress;
  readonly v: SemioticResourceNameAddress;
  readonly t: JsonValue;
}

export type EntryTuple = readonly [e: JsonValue, a: JsonValue, v: JsonValue, t: JsonValue];
export type SeavtTuple = readonly [e: string, a: string, v: string, t: JsonValue];

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
export declare function sameEntry(left: unknown, right: unknown): boolean;

export declare function assertValidSeavt(value: unknown): asserts value is Seavt | SeavtTuple;
export declare function isSeavt(value: unknown): boolean;
export declare function asSeavt(row: unknown): Seavt;
export declare function seavt(entity: string, attribute: string, value: string, time: JsonValue): Seavt;
export declare function readSeavt(row: unknown): SeavtReadout;
export declare function readAddressedSeavt(row: unknown): AddressedSeavtReadout;
export interface SeavtSemanticMaterial {
  readonly kind: "witness-journal.seavt.semantic-content";
  readonly version: 2;
  readonly coordinates: Pick<AddressedSeavtReadout, "e" | "a" | "v">;
  readonly witness: {
    readonly kind: "witness-journal.seavt.time-custody-witness";
    readonly version: 1;
    readonly time: JsonValue;
    readonly custody: JsonValue;
  };
}
export interface SeavtSemanticContentIdentity extends NormalizedSemanticContentIdentity {
  readonly source: Seavt;
  readonly material: SeavtSemanticMaterial;
  readonly witnessIdentity: NormalizedSemanticContentIdentity;
}
export declare function identifySeavtSemanticContent(
  row: unknown,
  custody: JsonValue,
): SeavtSemanticContentIdentity;
