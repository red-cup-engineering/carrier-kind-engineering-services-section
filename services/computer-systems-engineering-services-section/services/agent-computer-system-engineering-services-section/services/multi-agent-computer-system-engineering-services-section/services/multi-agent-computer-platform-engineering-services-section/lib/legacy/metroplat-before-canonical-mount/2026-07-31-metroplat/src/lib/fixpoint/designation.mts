/**
 * settling/designation — the designated cells of a valuation.
 *
 * Every cell whose charge value is held or contested, across all fibers.
 * Contested is retained so a held contradiction is not collapsed to falsity — the
 * paraconsistent stance: designation keeps both-affirmed-and-denied as present.
 */
import { chargeValue, sameChargeValue, valueOf } from "../values/index.mts";
import type { Cell } from "../logic/predicating/predication.mts";
import type { Valuation } from "../logic/predicating/evidence/fiber.mts";

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
