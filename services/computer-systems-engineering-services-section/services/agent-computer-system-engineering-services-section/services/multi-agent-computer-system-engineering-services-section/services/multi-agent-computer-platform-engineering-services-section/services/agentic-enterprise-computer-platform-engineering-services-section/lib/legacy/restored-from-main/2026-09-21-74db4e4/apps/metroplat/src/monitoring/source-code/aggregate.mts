/**
 * @packageDocumentation
 *
 * Keyed paraconsistent Monitor evidence over source-code claims.
 *
 * The Monitor (M) phase of the MAPE-K loop produces three independent signals:
 *
 *   - **policy** — FOUR-valued charge over all local-import rulings
 *   - **topology** — FOUR-valued charge per source module (via `moduleTopologyValuation`)
 *   - **build-order** — structural conformance of the module dependency graph
 *
 * A FOUR charge is a valuation of one claim, never a summary of counts from
 * unrelated claims.  This projection therefore keeps one entry per local-import
 * claim and one entry for the build-order claim.  Repeated evidence for the same
 * key joins in FOUR; distinct keys remain distinct.
 *
 * @metroplatSubject source-code
 */
import { joinChargesKnowledge } from "../substrate/valuation.mts";
import type { ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { contentAddress } from "../../lib/identity/index.mts";
import type { JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { SourceCodePolicyEvaluation } from "./policy.mts";
import type { ModuleTopologyValuation } from "./topology/valuation.mts";

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
  /** One FOUR valuation per actual claim, sorted by stable claim key. */
  readonly claims: readonly SourceCodeMonitorClaim[];
  readonly evidence: readonly string[];
  /** Exact admitted corpus scope when the aggregate was produced by a filesystem operation. */
  readonly sourceDirs?: readonly string[];
  readonly files?: number;
  /** True means the charge describes only the admitted prefix, not the complete requested corpus. */
  readonly truncated?: true;
}

export interface SourceCodeMonitorClaim {
  readonly key: string;
  readonly charge: ChargeValueName;
  readonly evidence: readonly string[];
}

export interface SourceCodeMonitorScope {
  readonly sourceDirs: readonly string[];
  readonly files: number;
  readonly truncated: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function claim(key: string, charges: readonly ChargeValueName[]): SourceCodeMonitorClaim {
  const charge = joinChargesKnowledge(charges);
  return Object.freeze({ key, charge, evidence: Object.freeze([
    `claim:${key}`, `evidence-count:${charges.length}`, `charge:${charge}`,
    ...charges.map((value, index) => `evidence-${index}:${value}`),
  ]) });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive the unified paraconsistent Monitor aggregate from a completed
 * source-code policy evaluation.
 *
 * The optional topology valuation is accepted only to preserve the operation's
 * evaluation boundary; aggregate claims are derived from primary rulings, not
 * from topology counts. */
export function readSourceCodeMonitorAggregate(
  evaluation: SourceCodePolicyEvaluation,
  topology?: ModuleTopologyValuation,
  scope?: SourceCodeMonitorScope,
): SourceCodeMonitorAggregate {
  void topology;
  const chargesByKey = new Map<string, ChargeValueName[]>();
  for (const ruling of evaluation.rulings) {
    const key = ruling.kind === "metroplat.monitoring.source-code.local-import-ruling"
      ? `local-import:${ruling.from}->${ruling.to}`
      : ruling.kind === "metroplat.monitoring.source-code.module-build-order-ruling"
        ? "module-build-order"
        : undefined;
    if (key === undefined) continue;
    const charges = chargesByKey.get(key) ?? [];
    charges.push(ruling.judgement);
    chargesByKey.set(key, charges);
  }
  const claims = Object.freeze([...chargesByKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, charges]) => claim(key, charges)));

  const semantic = Object.freeze({
    kind: "metroplat.monitoring.source-code.aggregate" as const,
    source: evaluation.source,
    topology: evaluation.topology,
    observation: evaluation.observation,
    claims,
    ...(scope === undefined ? {} : {
      sourceDirs: Object.freeze([...scope.sourceDirs]),
      files: scope.files,
      ...(scope.truncated ? { truncated: true as const } : {}),
    }),
  });

  return Object.freeze({
    ...semantic,
    id: contentAddress(semantic as unknown as JsonValue),
    evidence: Object.freeze([
      `source:${evaluation.source}`,
      `claims:${claims.length}`,
      ...(scope === undefined ? [] : [
        `files:${scope.files}`,
        `scope:${scope.truncated ? "truncated" : "complete"}`,
      ]),
      "lattice:belnap-join-only-within-claim-key",
    ]),
  });
}
