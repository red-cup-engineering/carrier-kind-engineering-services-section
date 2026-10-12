/**
 * introducing — SettledResearch → KnowingEntry: the entry reading of a research act.
 *
 * First derivative of a research act `r : X → C Y` (see ../category). introducing
 * reads the settled codomain `C Y` as knowing's ENTRY: that the act settled at all,
 * at what closure depth, with what first-cohomology obstruction. It reads relating's
 * SignCraft settlement DIRECTLY (`classify`'s depth, `firstCohomology`) — the same primitives animating's
 * `becoming` reads, here given knowing's epistemic reading rather than an agency one,
 * depending on no package but @red-cup-engineering/relating. Its codomain
 * (KnowingEntry) is the domain of the next step, `studying`.
 */
import { classify, firstCohomology } from "@red-cup-engineering/signcraft/settle";

/** The closure depth of a settlement, as relating reads it. */

/** Knowing's entry carrier: the settled region read at its entry — the settlement it
 *  reached, its closure depth, and its first-cohomology obstruction. */

/** introduce : SettledResearch → KnowingEntry. */
export function introducing(research) {
  return Object.freeze({
    kind: "knowing.entry",
    settlement: research.settlement,
    depth: classify(research.settlement).depth,
    firstCohomology: firstCohomology(research.settlement),
  });
}
