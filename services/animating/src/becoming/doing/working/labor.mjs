/**
 * labor — stage 3 of the agency descent: relating's `posit` read as agency.
 *
 * `labor` projects a `DescentState` to its SCOTT-CONTINUOUS reading: the working
 * carrier, acting made shared and ongoing on a common field. It is the `agentic`
 * face and the `belief` moment. The value-free fiber is now packaged as a valued
 * presheaf whose stalks take bilattice readings, seeded with the knowledge-least
 * (bottom) valuation on every cell; assertion raises it along a knowledge-monotone
 * trace. `valuations` counts that trace — the settlement closure orbit from the
 * bottom seed to the fixed point (`filtration.stages`), the Scott-continuous
 * dynamic object itself (the presheaf's own `traces` holds only the bottom seed and
 * is not the raised trace). `working` reads the whole orbit; `governing` reads its
 * fixed point — two readings of the one settlement. Value enters the descent here.
 * The knowing faculty (teaching/learning over interior state) seats
 * at this stage; `labor` provides the field it mounts on. Generated WITHIN `enact`:
 * a shared field is a deed posited with value.
 */
import { cohomologyOfCells } from "@red-cup-engineering/signgraph/cohomology";
import { spineCoordinates } from "../../spine.mjs";


/** The working field's finite H0/H1: its site's cells read as SignGraph's wall graph. */
function workingCohomologyReceipt(cells, valuations) {
  const cohomology = cohomologyOfCells(cells);
  return Object.freeze({
    kind: "animating.working.cohomology",
    cells: cells.length,
    valuations,
    h0: cohomology.zeroCohomology.rank,
    h1: cohomology.firstCohomology.rank,
    vanishing: cohomology.firstCohomology.vanishing,
  });
}

/** Read the working (Scott-continuous / agentic) carrier off a descent state. */
export function labor(state) {
  const cells = state.site.cells;
  const valuations = state.settlement.stages.length;
  const result = {
    kind: "animating.becoming.doing.working",
    ...spineCoordinates("positing"),
    face: "agentic",
    epistemic: "belief",
    faculty: "knowing",
    cells: cells.length,
    valuations,
    valued: true,
    cohomology: workingCohomologyReceipt(cells, valuations),
  };
  return result;
}
