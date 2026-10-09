/**
 * girard — René Girard's MIMETIC SCAPEGOAT mechanism as PATHOLOGICAL CONSENSUS (frontier register §5).
 *
 * Girard's sacrificial crisis is a community dissolved into undifferentiated mimetic rivalry — in the
 * package's terms a field SATURATED with ⊤ (held contradictions everywhere). The scapegoat mechanism
 * resolves it by unanimity-minus-one: the collective converges on a single victim, EXPELS them, and the
 * remainder emerges unanimous and at peace. It is a forced convergence by EXPULSION — a coerced `secede`
 * imposed on one member rather than a chosen withdrawal — and so it is the malign twin of `consensusClose`
 * (consensus reached by sacrifice, not agreement) and the most violent case of recuperation (the crisis's
 * ⊤ discharged onto a body).
 *
 * The detector reads the signature across a before/after pair: high prior contestation, exactly one
 * member removed and removed NOT by their own choice, and posterior unanimity among the remainder.
 *
 * Reuses `contestedCells` (`recuperation.mts`) for the ⊤-saturation reading; re-derives nothing.
 */
import { contestedCells } from "./recuperation.mjs";

const memberNames = (field) =>
  field.members.map((member) => String((member.agent).name ?? ""));

/** The scapegoat reading over a before/after transition. */

    

  

  

  

/**
 * scapegoatDetector — detect Girard's scapegoat mechanism across a before/after transition: a field in
 * sacrificial crisis (contested ⊤ present) resolved by coercively expelling exactly one member, after
 * which the remainder is unanimous. This is consensus reached by expulsion rather than agreement — a
 * coerced secession imposed on a victim, distinct from a voluntary withdrawal (`voluntary` true), and the
 * worst case of recuperation (the crisis discharged onto a body).
 */
export function scapegoatDetector(before, after, expelled, voluntary) {
  const priorContested = contestedCells(before);
  const posteriorContested = contestedCells(after);
  const beforeNames = memberNames(before);
  const afterNames = memberNames(after);
  const expelledPresentBefore = beforeNames.includes(expelled);
  const expelledAbsentAfter = !afterNames.includes(expelled);
  const exactlyOneRemoved = before.members.length - after.members.length === 1;
  const unanimousAfter = posteriorContested === 0;
  const coerced = !voluntary;
  return Object.freeze({
    kind: "socializing.scapegoat",
    priorContested,
    posteriorContested,
    expelledPresentBefore,
    expelledAbsentAfter,
    exactlyOneRemoved,
    unanimousAfter,
    coerced,
    scapegoat: priorContested > 0 && exactlyOneRemoved && expelledPresentBefore && expelledAbsentAfter && unanimousAfter && coerced,
  });
}
