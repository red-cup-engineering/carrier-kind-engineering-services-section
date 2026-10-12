/**
 * @packageDocumentation
 *
 * Domain-neutral Belnap charge assignment over any network of evidence-bearing
 * nodes.
 *
 * The core primitive is `joinChargesKnowledge`: it takes a sequence of
 * `ChargeValueName` values — each representing one independent observation about
 * a node or edge — and produces the single paraconsistent charge that summarises
 * them all, without cancellation.
 *
 * The source-code monitoring domain uses this to derive per-module charges from
 * local-import policy rulings.  Any new domain — network topology, supply-chain
 * edges, agent dependency graphs, knowledge-graph assertions — can use the same
 * primitive directly.
 *
 * ## The guarantee
 *
 * `joinChargesKnowledge` is a join in the Belnap *knowledge* lattice:
 *
 *   ⊥_K (absurd) ≤_K potential ≤_K stable ≥_K active ≥_K ⊥_K
 *
 * It accumulates evidence independently on both the positive (for) and negative
 * (against) dimensions.  Contradictions are preserved, never cancelled.  A node
 * with both conformant and violating evidence will always be `stable`, never
 * silently resolved to either verdict.
 */
import {
  chargeValueName,
  type ChargeValueName,
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import {
  chargeValueOfEvidenceRecord,
  evidenceRecord,
  type FourCensus,
} from "@red-cup-engineering/computer-data-engine/evidence-record";


// ---------------------------------------------------------------------------
// Evidence accumulation
// ---------------------------------------------------------------------------

/**
 * Map a `ChargeValueName` to its positive and negative evidence contribution.
 *
 * - `"potential"` → positive mass only
 * - `"active"` → negative mass only
 * - `"stable"` → both positive and negative mass
 * - `"absurd"` → no mass either way (identity element of the join) */
export function chargeEvidence(charge: ChargeValueName): { readonly pos: 0 | 1; readonly neg: 0 | 1 } {
  return Object.freeze({
    pos: charge === "potential" || charge === "stable" ? 1 : 0,
    neg: charge === "active" || charge === "stable" ? 1 : 0,
  });
}

// ---------------------------------------------------------------------------
// Knowledge-lattice join
// ---------------------------------------------------------------------------

/**
 * Join a sequence of `ChargeValueName` values in the Belnap knowledge lattice.
 *
 * Each charge is treated as an independent observation.  The join accumulates
 * positive and negative evidence separately:
 *
 * - any positive evidence → result has positive mass
 * - any negative evidence → result has negative mass
 * - both present           → `"stable"`
 * - neither present        → `"absurd"`
 *
 * An empty sequence returns `"absurd"` (no evidence observed).
 *
 * This is the correct aggregation for any stream of per-node evidence:
 * each item is a distinct piece of evidence; joining them accumulates
 * without cancellation (Belnap's paraconsistency guarantee). */
export function joinChargesKnowledge(charges: readonly ChargeValueName[]): ChargeValueName {
  if (charges.length === 0) return "absurd";
  let totalPos = 0;
  let totalNeg = 0;
  for (const charge of charges) {
    const { pos, neg } = chargeEvidence(charge);
    totalPos += pos;
    totalNeg += neg;
  }
  return chargeValueName(chargeValueOfEvidenceRecord(evidenceRecord(totalPos, totalNeg)));
}

// ---------------------------------------------------------------------------
// FourCensus helpers
// ---------------------------------------------------------------------------

/**
 * Count how many entries fall into each of the four Belnap charge classes.
 *
 * Accepts any array of objects with a `charge: ChargeValueName` field —
 * module entries, node entries, subsystem entries, or any other valued entity.
 *
 * Returns a `FourCensus` suitable for passing to `evidenceRecordOfFourCensus`
 * or to `subsystemEntry` in `src/monitoring/substrate/aggregate.mts`. */
export function fourCensusOf(
  entries: ReadonlyArray<{ readonly charge: ChargeValueName }>,
): FourCensus {
  let potential = 0;
  let active = 0;
  let stable = 0;
  let absurd = 0;
  for (const entry of entries) {
    if (entry.charge === "potential") potential += 1;
    else if (entry.charge === "active") active += 1;
    else if (entry.charge === "stable") stable += 1;
    else absurd += 1;
  }
  return Object.freeze({ potential, active, stable, absurd });
}
