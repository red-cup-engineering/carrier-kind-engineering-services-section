/**
 * @packageDocumentation
 *
 * Per-module FOUR-valued (Belnap) charge assignment over the source-code topology.
 *
 * This completes the paraconsistent Monitor (M) phase of the MAPE-K loop.
 * `moduleTopologyValuation` accepts an evaluated source-code policy and derives
 * a `ModuleTopologyValuation`: a record that assigns every observed source module
 * a charge from its keyed local-import claims. Evidence is joined only when it
 * concerns the same import edge. A held ruling for one edge and a denied ruling
 * for another establish a denied module-conformance claim; they are not opposing
 * evidence about one claim and must not become a FOUR contradiction.
 *
 * Without this step, the topology is an **unvalued structural precursor** — the
 * import graph, cohomology, and build order are computed, but no module receives
 * a paraconsistent truth value.  After this step, the Monitor surface is complete:
 * each module is `held` (all imports conform), `denied` (at least one import
 * violates policy), `contested` (conformant and violating imports co-exist), or
 * `unknown` (no import rulings observed — a leaf or otherwise uncheckable module).
 *
 * The join primitive (`joinChargesKnowledge`) and census helper (`fourCensusOf`)
 * live in `src/monitoring/substrate/valuation.mts` and are domain-neutral:
 * any monitoring domain with a graph of evidence-bearing nodes can use them.
 *
 * @metroplatSubject source-code
 */
import {
  contentAddress } from "../../../lib/identity/index.mts";
import type { JsonValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import type { ChargeValueName,
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import type {
  FourCensus,
} from "@red-cup-engineering/computer-data-engine/evidence-record";

import { joinChargesKnowledge, fourCensusOf } from "../../substrate/valuation.mts";
import type { SourceCodePolicyEvaluation } from "../policy.mts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** The paraconsistent charge for one source module derived from its observed
 *  local-import rulings. */
export interface ModuleChargeEntry {
  /** Module path relative to the package root (the `from` party in rulings). */
  readonly path: string;
  /** FOUR-valued conformance charge joined across all local-import rulings
   *  where this module is the importer. */
  readonly charge: ChargeValueName;
  /** Number of local-import rulings that contributed evidence for this charge. */
  readonly rulingCount: number;
  readonly evidence: readonly string[];
}

/** Complete paraconsistent valuation of the source-code topology.
 *
 * This is the artifact that makes `monitoring/source-code` a proper Monitor:
 * it assigns every observed source module a FOUR-valued charge derived from
 * the policy evaluation rather than leaving it as an unvalued structural node. */
export interface ModuleTopologyValuation {
  readonly kind: "metroplat.monitoring.source-code.module-topology-valuation";
  /** Content address of this valuation record (computed over source/topology/
   *  observation/modules/summary — not over evidence or id itself). */
  readonly id: string;
  readonly source: string;
  readonly topology: string;
  readonly observation: string;
  /** Per-module paraconsistent charges, sorted by path.
   *  Modules with no local-import rulings do not appear here; their charge is
   *  implicitly `unknown` — no evidence either way was observed. */
  readonly modules: readonly ModuleChargeEntry[];
  /** Aggregate FOUR-census over all valued modules. */
  readonly summary: FourCensus;
  readonly evidence: readonly string[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive the FOUR-valued paraconsistent charge for each source module from
 * a completed source-code policy evaluation.
 *
 * Only modules that appear as the `from` party in at least one
 * `local-import-ruling` receive an explicit charge entry.  Modules with no
 * observed import rulings — leaf modules or modules outside the scanned
 * corpus — have no entry; their charge is implicitly `unknown`.
 *
 * `module-build-order` and `normalization-cut` rulings are structural: they
 * apply to the whole topology rather than individual modules, so they do not
 * contribute to per-module charges here.
 *
 * The charge join uses `joinChargesKnowledge` from the monitoring substrate —
 * the same Belnap knowledge-lattice join available to any monitoring domain.
 */
export function moduleTopologyValuation(
  evaluation: SourceCodePolicyEvaluation,
): ModuleTopologyValuation {
  // First join evidence only under its actual claim key: one directed import.
  const chargesByModule = new Map<string, Map<string, ChargeValueName[]>>();

  for (const ruling of evaluation.rulings) {
    if (ruling.kind !== "metroplat.monitoring.source-code.local-import-ruling") continue;
    const moduleClaims = chargesByModule.get(ruling.from) ?? new Map<string, ChargeValueName[]>();
    const charges = moduleClaims.get(ruling.to) ?? [];
    charges.push(ruling.judgement);
    moduleClaims.set(ruling.to, charges);
    chargesByModule.set(ruling.from, moduleClaims);
  }

  // Derive per-module entries, sorted deterministically by path.
  const modules: readonly ModuleChargeEntry[] = Object.freeze(
    [...chargesByModule.entries()]
      .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
      .map(([path, claims]) => {
        const edgeCharges = [...claims.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([, charges]) => joinChargesKnowledge(charges));
        // Module conformance is the Belnap knowledge-lattice join of its
        // import-conformance claims — the same `joinChargesKnowledge` used
        // within an edge is used across edges, so the source-code domain has
        // exactly one charge-combination rule rather than a second,
        // hand-rolled conjunction that disagreed with it on mixed evidence.
        const charge: ChargeValueName = joinChargesKnowledge(edgeCharges);
        const rulingCount = [...claims.values()].reduce((total, charges) => total + charges.length, 0);
        return Object.freeze({
          path,
          charge,
          rulingCount,
          evidence: Object.freeze([
            `rulings:${rulingCount}`,
            `import-claims:${edgeCharges.length}`,
            `charge:${charge}`,
            ...edgeCharges.slice(0, 4).map((value, index) => `import-claim-${index}:${value}`),
          ]),
        });
      }),
  );

  const summary = fourCensusOf(modules);

  // Content-address over the semantic payload only (not id/evidence).
  const semantic = Object.freeze({
    kind: "metroplat.monitoring.source-code.module-topology-valuation" as const,
    source: evaluation.source,
    topology: evaluation.topology,
    observation: evaluation.observation,
    modules,
    summary,
  });

  return Object.freeze({
    ...semantic,
    id: contentAddress(semantic as unknown as JsonValue),
    evidence: Object.freeze([
      `source:${evaluation.source}`,
      `modules-valued:${modules.length}`,
      `held:${summary.held}`,
      `denied:${summary.denied}`,
      `contested:${summary.contested}`,
      `unknown:${summary.unknown}`,
      "lattice:belnap-knowledge-join-of-local-import-rulings",
      "policy:local-import-rulings-only",
    ]),
  });
}
