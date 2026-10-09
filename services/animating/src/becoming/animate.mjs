/**
 * animate — stage 1 of the agency descent: relating's `articulate` read as agency.
 *
 * `animate` projects a `DescentState` to its APERIODIC reading: the becoming
 * carrier, the agency seed in pure potential. It is the `animate` face — "that
 * anything comes to be at all, the event before the thing" — and the `question`
 * moment of inquiry. Nothing has been predicated, posited, or settled yet; the
 * reading reports the membrane utterances articulated and the count of aperiodic
 * cells they founded. This is one of the four readings of the single descent
 * (`enact`/`labor`/`individuate` are the others); they are not analogies but the
 * same structure met at four regimes.
 */

import { utteranceLabel } from "./descending.mjs";
import { spineCoordinates } from "./spine.mjs";

/** Read the becoming (aperiodic / animate) carrier off a descent state. */
export function animate(state) {
  const result = {
    kind: "animating.becoming",
    ...spineCoordinates("articulating"),
    face: "animate",
    epistemic: "question",
    seed: state.utterances.map(utteranceLabel),
    cells: state.utterances.length,
    openAbove: true,
  };
  return result;
}
