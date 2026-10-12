/**
 * studying — KnowingEntry → KnowingTrace: the trace reading, nested under introducing.
 *
 * Second derivative. Studying opens the entry `introducing` read through its settling
 * trace — SignCraft's `increments` over the settlement the
 * entry holds. The trace is the whole derivation that built the settlement (the
 * ≤_k-monotone closure orbit's increments). Reads only @red-cup-engineering/relating.
 * Its codomain (KnowingTrace) is the domain of the next steps, `explaining` and
 * `learning`.
 */
import { increments } from "@red-cup-engineering/signcraft/settle";

/** Knowing's trace carrier: the entry opened through its settling-orbit increments. */

/** study : KnowingEntry → KnowingTrace. */
export function studying(entry) {
  return Object.freeze({
    kind: "knowing.trace",
    entry,
    trace: increments(entry.settlement),
  });
}
