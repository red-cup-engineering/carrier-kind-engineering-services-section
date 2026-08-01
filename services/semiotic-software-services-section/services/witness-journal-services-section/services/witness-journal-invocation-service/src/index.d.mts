// Hand-written declaration file. This package ships plain .mjs (no build
// step, no TypeScript source) — this file exists only so strict TypeScript
// consumers can typecheck against it.

import type { JsonValue } from "@red-cup-engineering/json-file-codec-service";
import type { WitnessJournalEntry } from "@red-cup-engineering/witness-journal-entry-service";

/** One scripted play: a caller invoked a verb with args (and, optionally, an
 *  action descriptor of a shape this package does not claim), producing a
 *  value at a witness time. */
export interface Invocation {
  readonly caller: JsonValue;
  readonly verb: string;
  readonly args: Record<string, JsonValue>;
  readonly action?: JsonValue;
  readonly value: JsonValue;
  readonly at: JsonValue;
}

export interface TracedInvocationEntry {
  readonly entry: WitnessJournalEntry;
  readonly trace: number;
}

export type LatestPerCellView = {
  readonly [cellKey: string]: {
    readonly e: JsonValue;
    readonly a: JsonValue;
    readonly value: JsonValue;
    readonly time: JsonValue;
  };
};

export declare function feedNameFor(namespace: string, at: JsonValue): string;
export declare function invocationEntry(invocation: Invocation): WitnessJournalEntry;
export declare function witnessInvocation(
  dataRoot: string,
  namespace: string,
  invocation: Invocation,
): { readonly appended: number };
export declare function filesystemInvocationWitness(
  dataRoot: string,
  namespace: string,
): (invocation: Invocation) => void;
export declare function readInvocations(
  dataRoot: string,
  namespace: string,
  at: JsonValue,
): readonly TracedInvocationEntry[];
export declare function filesystemInvocationLogReader(
  dataRoot: string,
  namespace: string,
  now?: () => string,
): () => readonly TracedInvocationEntry[];
export declare function projectInvocations(dataRoot: string, namespace: string, at: JsonValue): LatestPerCellView;
