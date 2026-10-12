/**
 * @packageDocumentation
 *
 * Unified paraconsistent Monitor aggregate over all source-code subsystems.
 *
 * The Monitor (M) phase of the MAPE-K loop produces three independent signals:
 *
 *   - **policy** — FOUR-valued charge over all local-import rulings
 *   - **topology** — FOUR-valued charge per source module (via `moduleTopologyValuation`)
 *   - **build-order** — structural conformance of the module dependency graph
 *
 * Each subsystem is characterised by an `EvidenceRecord` derived from its
 * `FourCensus` summary via `evidenceRecordOfFourCensus`.  The package-level
 * charge is then the Belnap knowledge-lattice join of all subsystem records:
 * positive mass accumulates from conformant (held/contested) findings; negative
 * mass accumulates from non-conformant (denied/contested) findings.  The join
 * is paraconsistency-preserving — it cannot cancel contradictions.
 *
 * The resulting `SourceCodeMonitorAggregate` is the unified Monitor output that
 * the Analyze (A) phase can consume as a single paraconsistent verdict.
 *
 * `SubsystemChargeEntry` and `subsystemEntry` now live in the monitoring
 * substrate (`src/monitoring/substrate/aggregate.mts`) so any domain can
 * produce the same structure.  This file re-exports them for backward
 * compatibility and uses `addEvidenceRecords` from lib for the lattice join.
 *
 * @metroplatSubject source-code
 */
import {
  addEvidenceRecords,
  chargeOfEvidenceRecord,
  chargeValueName,
  evidenceRecord,
  valueOf,
  type ChargeValueName,
  type EvidenceRecord,
  type FourCensus,
} from "../../lib/values/index.mts";
import { contentAddress } from "../../lib/identity/index.mts";
import type { JsonValue } from "../../lib/codecs/json/core.mts";
import type { SourceCodePolicyEvaluation } from "./policy.mts";
import { moduleTopologyValuation, type ModuleTopologyValuation } from "./topology/valuation.mts";
import { subsystemEntry } from "../substrate/aggregate.mts";

// Re-export substrate types for backward compatibility — existing consumers
// importing SubsystemChargeEntry from this module continue to work.
export type { SubsystemChargeEntry } from "../substrate/aggregate.mts";
export { subsystemEntry } from "../substrate/aggregate.mts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Unified paraconsistent Monitor aggregate.
 *
 * This is the canonical Monitor output for the source-code domain: a single
 * content-addressed artifact carrying the package-level charge and per-subsystem
 * evidence, ready for consumption by the MAPE-K Analyze phase. */
export interface SourceCodeMonitorAggregate {
  readonly kind: "metroplat.monitoring.source-code.aggregate";
  /** Content address of this aggregate (over source/observation/charge/subsystems/record). */
  readonly id: string;
  readonly source: string;
  readonly topology: string;
  readonly observation: string;
  /** Package-level paraconsistent charge: the knowledge-lattice join of all subsystems.
   *  `held` → entire codebase conforms. `denied` → violations exist with no conformance.
   *  `contested` → both conformant and violating evidence present (expected for most real codebases).
   *  `unknown` → no evidence observed (empty corpus). */
  readonly charge: ChargeValueName;
  /** Joined EvidenceRecord: pos = total conformant findings, neg = total non-conformant findings.
   *  Suitable for use as a `recordOf` input to `recordHistoryOfStages` for temporal tracking. */
  readonly record: EvidenceRecord;
  /** Per-subsystem breakdown in subsystem order. */
  readonly subsystems: readonly import("../substrate/aggregate.mts").SubsystemChargeEntry[];
  readonly evidence: readonly string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Derive a build-order FourCensus from policy rulings.
 *
 * A build-order ruling is a single topology-level verdict: if the module
 * dependency graph is acyclic, it is `held`; otherwise `denied`.
 * Unknown means no build-order ruling was observed. */
function buildOrderCensus(evaluation: SourceCodePolicyEvaluation): FourCensus {
  const ruling = evaluation.rulings.find(
    (r) => r.kind === "metroplat.monitoring.source-code.module-build-order-ruling",
  );
  if (ruling === undefined) return Object.freeze({ held: 0, denied: 0, contested: 0, unknown: 1 });
  if (ruling.judgement === "held") return Object.freeze({ held: 1, denied: 0, contested: 0, unknown: 0 });
  if (ruling.judgement === "denied") return Object.freeze({ held: 0, denied: 1, contested: 0, unknown: 0 });
  if (ruling.judgement === "contested") return Object.freeze({ held: 0, denied: 0, contested: 1, unknown: 0 });
  return Object.freeze({ held: 0, denied: 0, contested: 0, unknown: 1 });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive the unified paraconsistent Monitor aggregate from a completed
 * source-code policy evaluation.
 *
 * The function computes three subsystem signals and joins them using
 * `subsystemEntry` and `addEvidenceRecords` from the monitoring substrate:
 *
 * 1. **policy** — ruling-level census from `evaluation.summary`
 * 2. **topology** — module-level census from `moduleTopologyValuation(evaluation).summary`
 * 3. **build-order** — single topology-level conformance verdict
 *
 * The package charge is the knowledge-lattice join of the three evidence records:
 * `pos = Σ conformant`, `neg = Σ non-conformant` across all subsystems.
 *
 * The returned `SourceCodeMonitorAggregate.record` can be fed directly into
 * `recordHistoryOfStages` to track how package-level health changes over time. */
export function readSourceCodeMonitorAggregate(
  evaluation: SourceCodePolicyEvaluation,
  topology?: ModuleTopologyValuation,
): SourceCodeMonitorAggregate {
  // Derive (or reuse) topology valuation — allows callers to pass an already-computed
  // valuation to avoid redundant work when both are needed.
  const tv = topology ?? moduleTopologyValuation(evaluation);

  // Per-subsystem evidence — built with the substrate's subsystemEntry helper.
  const policyEntry = subsystemEntry("policy", evaluation.summary, [
    `rulings:${evaluation.rulings.length}`,
  ]);
  const topologyEntry = subsystemEntry("topology", tv.summary, [
    `modules-valued:${tv.modules.length}`,
  ]);
  const buildOrderEntry = subsystemEntry("build-order", buildOrderCensus(evaluation));

  const subsystems = Object.freeze([policyEntry, topologyEntry, buildOrderEntry]);

  // Package-level: join all subsystem records using addEvidenceRecords from lib.
  const packageRecord = subsystems.reduce<EvidenceRecord>(
    (acc, entry) => addEvidenceRecords(acc, entry.record),
    evidenceRecord(0, 0),
  );
  const packageCharge = chargeValueName(valueOf(chargeOfEvidenceRecord(packageRecord)));

  const semantic = Object.freeze({
    kind: "metroplat.monitoring.source-code.aggregate" as const,
    source: evaluation.source,
    topology: evaluation.topology,
    observation: evaluation.observation,
    charge: packageCharge,
    record: packageRecord,
    subsystems,
  });

  return Object.freeze({
    ...semantic,
    id: contentAddress(semantic as unknown as JsonValue),
    evidence: Object.freeze([
      `source:${evaluation.source}`,
      `charge:${packageCharge}`,
      `subsystems:${subsystems.length}`,
      `pos:${packageRecord.pos}`,
      `neg:${packageRecord.neg}`,
      `policy-charge:${policyEntry.charge}`,
      `topology-charge:${topologyEntry.charge}`,
      `build-order-charge:${buildOrderEntry.charge}`,
      "lattice:belnap-knowledge-join-of-subsystem-records",
    ]),
  });
}
