/**
 * settling/invariant — the closure invariant and closure equivalence of settlings.
 */
import { cellSet, cellCoincides } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { cellSetRepresentatives } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell-set";
import { readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
/** The closure invariant: one step per non-Scott firing with its deduped additions. */
export function readClosureInvariantOfSettlementFiltration(carrier) {
    const nonScottAdditions = Object.freeze(readNonScottFiringsOfSettlementFiltration(carrier).firings.map((increment) => Object.freeze({
        kind: "predication.settling.closureInvariantStep",
        stage: increment.source,
        additions: cellSet(cellSetRepresentatives(increment.added.cells)),
    })));
    return Object.freeze({ kind: "predication.settling.closureInvariant", nonScottAdditions });
}
/** Compare two settlings by closure invariant (stage-for-stage, cell-for-cell up to coincidence). */
export function readClosureEquivalenceOfSettlementFiltration(left, right) {
    const leftInvariant = readClosureInvariantOfSettlementFiltration(left);
    const rightInvariant = readClosureInvariantOfSettlementFiltration(right);
    const leftAdditions = leftInvariant.nonScottAdditions;
    const rightAdditions = rightInvariant.nonScottAdditions;
    const equivalent = leftAdditions.length === rightAdditions.length
        && leftAdditions.every((leftStage, index) => {
            const rightStage = rightAdditions[index];
            return leftStage.additions.cells.length === rightStage.additions.cells.length
                && leftStage.additions.cells.every((leftCell) => rightStage.additions.cells.some((rightCell) => cellCoincides(leftCell, rightCell)));
        });
    return equivalent
        ? Object.freeze({ kind: "predication.settling.closureEquivalence:witness", left: leftInvariant, right: rightInvariant })
        : Object.freeze({ kind: "predication.settling.closureEquivalence-obstruction", left: leftInvariant, right: rightInvariant });
}
