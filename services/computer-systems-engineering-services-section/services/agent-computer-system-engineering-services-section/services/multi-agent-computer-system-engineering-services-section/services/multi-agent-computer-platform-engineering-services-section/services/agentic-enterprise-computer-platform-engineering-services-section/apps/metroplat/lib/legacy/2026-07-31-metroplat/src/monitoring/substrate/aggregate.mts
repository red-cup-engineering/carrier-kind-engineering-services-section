/**
 * @packageDocumentation
 *
 * Domain-neutral MAPE-K Monitor aggregate.
 *
 * The aggregate primitive turns a list of named *subsystem* signals — each
 * carrying a `FourCensus` of findings — into a single content-addressed
 * `MonitorAggregate`: the canonical Monitor (M) output ready for the
 * Analyze (A) phase of the MAPE-K loop.
 *
 * The join is paraconsistency-preserving: positive and negative evidence
 * accumulate independently across subsystems; contradictions are never
 * cancelled.  This is the same guarantee `joinChargesKnowledge` provides
 * at the node level, lifted to the subsystem level.
 *
 * ## Why this is the substrate and not the application
 *
 * Source-code monitoring (`readSourceCodeMonitorAggregate`) was the first
 * domain to need this pattern.  Proof-health monitoring (`readProofHealthMonitorAggregate`)
 * is the second.  The pattern — join N named subsystem FourCensuses into one
 * package charge — belongs to the platform, not to any single domain.  New
 * domains plug in by calling `subsystemEntry` and `readMonitorAggregate`.
 */
import {
  addEvidenceRecords,
  chargeOfEvidenceRecord,
  chargeValueName,
  evidenceRecord,
  evidenceRecordOfFourCensus,
  valueOf,
  type ChargeValueName,
  type EvidenceRecord,
  type FourCensus,
} from "../../lib/values/index.mts";
import { contentAddress } from "../../lib/identity/index.mts";
import type { JsonValue } from "../../lib/codecs/json/core.mts";

// ---------------------------------------------------------------------------
// SubsystemChargeEntry
// ---------------------------------------------------------------------------

/**
 * Per-subsystem paraconsistent charge entry within a `MonitorAggregate`.
 *
 * One entry per named subsystem.  The `record` field is suitable for direct
 * use in `addEvidenceRecords` joins and in `recordHistoryOfStages` temporal
 * tracking. */
export interface SubsystemChargeEntry {
  /** Subsystem name for diagnostics (e.g. `"policy"`, `"topology"`, `"math-laws"`). */
  readonly name: string;
  /** FOUR-valued charge derived from this subsystem's census. */
  readonly charge: ChargeValueName;
  /** Evidence record: pos = conformant (held+contested), neg = non-conformant (denied+contested). */
  readonly record: EvidenceRecord;
  /** The raw FOUR-census this subsystem contributed. */
  readonly census: FourCensus;
  readonly evidence: readonly string[];
}

/**
 * Construct a `SubsystemChargeEntry` from a `FourCensus`.
 *
 * `extra` is an optional list of additional evidence strings appended after the
 * standard diagnostic fields (subsystem name, charge, census counts). */
export function subsystemEntry(
  name: string,
  census: FourCensus,
  extra: readonly string[] = [],
): SubsystemChargeEntry {
  const record = evidenceRecordOfFourCensus(census);
  const charge = chargeValueName(valueOf(chargeOfEvidenceRecord(record)));
  return Object.freeze({
    name,
    charge,
    record,
    census,
    evidence: Object.freeze([
      `subsystem:${name}`,
      `charge:${charge}`,
      `held:${census.held}`,
      `denied:${census.denied}`,
      `contested:${census.contested}`,
      `unknown:${census.unknown}`,
      ...extra,
    ]),
  });
}

// ---------------------------------------------------------------------------
// MonitorAggregate
// ---------------------------------------------------------------------------

/**
 * The generic, content-addressed Monitor (M) output.
 *
 * Every monitoring domain — source-code, proof-health, infrastructure,
 * supply-chain, knowledge-graph — produces a `MonitorAggregate` by calling
 * `readMonitorAggregate`.  Domain-specific aggregates may embed or extend this
 * structure with domain-specific fields. */
export interface MonitorAggregate {
  readonly kind: "metroplat.monitoring.aggregate";
  /** Content address of this aggregate (over name/charge/record/subsystems). */
  readonly id: string;
  /** Domain name that produced this aggregate. */
  readonly name: string;
  /**
   * Domain-level paraconsistent charge: the knowledge-lattice join of all
   * subsystem records.
   *
   * - `"held"` → all subsystems conform
   * - `"denied"` → violations with no conformance
   * - `"contested"` → mixed evidence (normal for complex real-world domains)
   * - `"unknown"` → no subsystems observed */
  readonly charge: ChargeValueName;
  /**
   * Joined evidence record: `pos = Σ subsystem.pos`, `neg = Σ subsystem.neg`.
   * Suitable for `recordHistoryOfStages` to track domain health over time. */
  readonly record: EvidenceRecord;
  /** Per-subsystem breakdown in subsystem order. */
  readonly subsystems: readonly SubsystemChargeEntry[];
  readonly evidence: readonly string[];
}

/**
 * Produce a content-addressed `MonitorAggregate` from a list of subsystem
 * charge entries.
 *
 * The package-level charge is the knowledge-lattice join of all subsystem
 * evidence records: `pos` and `neg` accumulate independently (no cancellation).
 *
 * Passing an empty `subsystems` list produces `charge: "unknown"`.
 *
 * This is the canonical factory.  Domain-specific Monitor functions call this
 * and optionally wrap the result in a richer domain-specific type. */
export function readMonitorAggregate(
  name: string,
  subsystems: readonly SubsystemChargeEntry[],
): MonitorAggregate {
  const zero = evidenceRecord(0, 0);
  const packageRecord = subsystems.reduce<EvidenceRecord>(
    (acc, entry) => addEvidenceRecords(acc, entry.record),
    zero,
  );
  const packageCharge = chargeValueName(valueOf(chargeOfEvidenceRecord(packageRecord)));

  const semantic = Object.freeze({
    kind: "metroplat.monitoring.aggregate" as const,
    name,
    charge: packageCharge,
    record: packageRecord,
    subsystems: Object.freeze([...subsystems]),
  });

  return Object.freeze({
    ...semantic,
    id: contentAddress(semantic as unknown as JsonValue),
    evidence: Object.freeze([
      `name:${name}`,
      `charge:${packageCharge}`,
      `subsystems:${subsystems.length}`,
      `pos:${packageRecord.pos}`,
      `neg:${packageRecord.neg}`,
      "lattice:belnap-knowledge-join-of-subsystem-records",
      ...subsystems.map((s) => `subsystem-${s.name}:${s.charge}`),
    ]),
  });
}
