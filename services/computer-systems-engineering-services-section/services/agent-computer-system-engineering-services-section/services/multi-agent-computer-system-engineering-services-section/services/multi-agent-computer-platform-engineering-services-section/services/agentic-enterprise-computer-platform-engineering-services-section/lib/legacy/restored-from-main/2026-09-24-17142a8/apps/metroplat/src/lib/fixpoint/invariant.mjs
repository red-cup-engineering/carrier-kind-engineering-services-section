/**
 * settling/invariant — the closure invariant and closure equivalence of settlings.
 */
import { cellSet } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { cellSetRepresentatives } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell-set";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";

/** The closure invariant: one step per non-Scott firing with its deduped additions. */
export function readClosureInvariantOfSettlementFiltration(filtration) {
  const nonScottAdditions = Object.freeze(readNonScottFiringsOfSettlementFiltration(filtration).firings.map((increment) => Object.freeze({
    kind: "predication.settling.closureInvariantStep",
    stage: increment.source,
    additions: cellSet(cellSetRepresentatives(increment.added.cells)),
  })));
  return Object.freeze({ kind: "predication.settling.closureInvariant", nonScottAdditions });
}
