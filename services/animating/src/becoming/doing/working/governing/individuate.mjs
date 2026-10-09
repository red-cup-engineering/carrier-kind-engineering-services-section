/**
 * individuate — stage 4 of the agency descent: relating's `settle` read as agency.
 *
 * `individuate` projects a `DescentState` to its FINITE reading: the governing
 * carrier, the open field brought under a settled, bounded order. It is the
 * `individual` face and the `knowledge` moment. The knowledge-monotone trace has
 * reached its fixed point; the first cohomology measures the obstruction to gluing
 * (one generator per cell added at a non-Scott limit-stage firing). `glued` is
 * H¹ = 0 — the residue drained to zero, the section glues into a sheaf — and
 * `cohomologyRank` is that obstruction's rank (`glued` ⟺ rank 0). Agency is
 * fundamentally a settling phenomenon: it culminates here, in the glued individual
 * sheaf the agent is. Generated WITHIN `labor`: an individual is a shared field
 * settled to a fixed point.
 */
import { classify } from "@red-cup-engineering/signcraft/settle";
import { spineCoordinates } from "../../../spine.mjs";

/** Read the governing (finite / individual) carrier off a descent state. */
export function individuate(state) {
  // The settling's first cohomology: one generator per non-Scott (limit-stage) firing.
  const cohomologyRank = classify(state.settlement).nonScottFirings;
  const result = {
    kind: "animating.becoming.doing.working.governing",
    ...spineCoordinates("settling"),
    face: "individual",
    epistemic: "knowledge",
    settled: true,
    glued: cohomologyRank === 0,
    cohomologyRank,
    cells: state.section.length,
  };
  return result;
}
