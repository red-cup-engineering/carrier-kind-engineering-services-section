/**
 * settling/designation — the designated cells of a valuation.
 *
 * Every cell whose charge value is held or contested, across all fibers.
 * Contested is retained so a held contradiction is not collapsed to falsity — the
 * paraconsistent stance: designation keeps both-affirmed-and-denied as present.
 */
import { chargeValue, sameChargeValue, valueOf } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import type { Cell } from "@red-cup-engineering/computer-data-engine/predication";
import type { Valuation } from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";

/** The cells designated by a valuation (charge held or contested). */
export function readDesignatedCellsOfValuation(valuation: Valuation): readonly Cell[] {
  return Object.freeze(valuation.fibers.flatMap((fiber) =>
    fiber.assignments
      .filter((assignment) => {
        const value = valueOf(assignment.charge);
        return sameChargeValue(value, chargeValue("held")) || sameChargeValue(value, chargeValue("contested"));
      })
      .map((assignment) => assignment.cell)));
}
