/**
 * Package-bin footprint — the resource cost of admitting a computing strategy
 * boundary, as a relational read.
 *
 * bin.mts records what a package bin *is* (target, executable, protocol). This
 * records what it *costs* to run: wall time, and — the load that dominates a
 * heavy bin — peak resident memory. A footprint is an empirical reading projected
 * onto the same jsNode fact surface as everything else, so transports surface it
 * the way they surface any other carrier fact, not as a bespoke data model.
 */
import type { UtteranceCarrier } from "@emsenn/relating";
import { jsNodeFact, jsNodeObservation, type Observation } from "../facts.mjs";

/** One empirical reading of a bin run's resource footprint. */
export interface FootprintReading {
  /** Wall-clock duration of the run, in milliseconds. */
  readonly wallMs: number;
  /** Peak resident set size in bytes, when the platform could report it. */
  readonly maxRssBytes?: number;
  /** Process exit code (null on signal termination). */
  readonly exitCode: number | null;
}

export function hasWallMsPredicate(): string {
  return "organizing-with-jsnode.package-bin.has-wall-ms";
}
export function hasMaxRssBytesPredicate(): string {
  return "organizing-with-jsnode.package-bin.has-max-rss-bytes";
}
export function hasExitCodePredicate(): string {
  return "organizing-with-jsnode.package-bin.has-exit-code";
}

/** Project a footprint reading as relational facts on a bin term. */
export function packageBinFootprintFacts(binTerm: string, reading: FootprintReading): readonly UtteranceCarrier[] {
  const facts: UtteranceCarrier[] = [
    jsNodeFact(binTerm, hasWallMsPredicate(), reading.wallMs),
    jsNodeFact(binTerm, hasExitCodePredicate(), reading.exitCode),
  ];
  if (reading.maxRssBytes !== undefined) {
    facts.push(jsNodeFact(binTerm, hasMaxRssBytesPredicate(), reading.maxRssBytes));
  }
  return Object.freeze(facts);
}

export interface PackageBinFootprint {
  readonly kind: "organizing-with-jsnode.package-bin.footprint";
  readonly term: string;
  readonly reading: FootprintReading;
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
}

/** A footprint carrier: the reading, its facts, and the settled observation. */
export function packageBinFootprint(binTerm: string, reading: FootprintReading): PackageBinFootprint {
  const utterances = packageBinFootprintFacts(binTerm, reading);
  return Object.freeze({
    kind: "organizing-with-jsnode.package-bin.footprint" as const,
    term: binTerm,
    reading,
    utterances,
    observation: jsNodeObservation(utterances),
  });
}
