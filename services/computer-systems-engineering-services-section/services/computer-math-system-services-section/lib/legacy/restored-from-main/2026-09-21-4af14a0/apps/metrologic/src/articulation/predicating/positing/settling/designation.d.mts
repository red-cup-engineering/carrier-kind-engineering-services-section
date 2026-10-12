import type { Cell } from "../../predication.mjs";
import type { Valuation } from "../fiber.mjs";
/** The cells designated by a valuation (charge potential or stable). */
export declare function readDesignatedCellsOfValuation(valuation: Valuation): readonly Cell[];
