/**
 * settling/invariant — the closure invariant and closure equivalence of settlings.
 */
import { cellSet, cellCoincides } from "@red-cup-engineering/computer-data-engine/predication";
import { cellSetRepresentatives } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/cell-set";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mts";
import type { Settlement, SettlingClosureEquivalenceJudgment, SettlingClosureInvariant } from "@lenticule-science/metrologic/settling/settlement";

/** The closure invariant: one step per non-Scott firing with its deduped additions. */
export function readClosureInvariantOfSettlementFiltration(filtration: Settlement): SettlingClosureInvariant {
  const nonScottAdditions = Object.freeze(readNonScottFiringsOfSettlementFiltration(filtration).firings.map((increment) => Object.freeze({
    kind: "predication.settling.closureInvariantStep" as const,
    stage: increment.source,
    additions: cellSet(cellSetRepresentatives(increment.added.cells)),
  })));
  return Object.freeze({ kind: "predication.settling.closureInvariant" as const, nonScottAdditions });
}

/** Compare two settlings by closure invariant (stage-for-stage, cell-for-cell up to coincidence). */
export function readClosureEquivalenceOfSettlementFiltration(left: Settlement, right: Settlement): SettlingClosureEquivalenceJudgment {
  const leftInvariant = readClosureInvariantOfSettlementFiltration(left);
  const rightInvariant = readClosureInvariantOfSettlementFiltration(right);
  const leftAdditions = leftInvariant.nonScottAdditions;
  const rightAdditions = rightInvariant.nonScottAdditions;
  const equivalent = leftAdditions.length === rightAdditions.length
    && leftAdditions.every((leftStage, index) => {
      const rightStage = rightAdditions[index]!;
      return leftStage.additions.cells.length === rightStage.additions.cells.length
        && leftStage.additions.cells.every((leftCell) => rightStage.additions.cells.some((rightCell) => cellCoincides(leftCell, rightCell)));
    });
  return equivalent
    ? Object.freeze({ kind: "predication.settling.closureEquivalence:witness" as const, left: leftInvariant, right: rightInvariant })
    : Object.freeze({ kind: "predication.settling.closureEquivalence-obstruction" as const, left: leftInvariant, right: rightInvariant });
}
