/**
 * The paidia<->ludus axis (Caillois 1958).
 *
 * Roger Caillois, *Man, Play, and Games* (1958), cuts across his four play
 * modes (agon, alea, mimicry, ilinx) with a single spectrum: from *paidia*
 * (free, unstructured, exuberant play â€” play before it becomes a game) to
 * *ludus* (rule-bound, structured, constrained play â€” play disciplined into a
 * game).  In the corpus this axis is structural: "paidia â†” Scott-continuous
 * closure; ludus â†” non-Scott-continuous â€¦ Sparse fiber â†’ paidia (open-ended,
 * surprising); dense fiber â†’ ludus (deterministic)"
 * (sociology/questions, girard-caillois-substrate-correspondence).
 *
 * On an event structure the same axis is the *density of causal order*.  A
 * structure all of whose events are concurrent (no causal constraints) is pure
 * paidia â€” every move is free, index $0$.  A structure that is a total order
 * (every move strictly sequenced) is pure ludus â€” every move is rule-bound,
 * index $1$.  The `ludusIndex` measures where a structure sits: the fraction of
 * event pairs that are causally comparable, computed exactly as a Rational.
 *
 * Conflict pairs are counted in the denominator (all pairs), not as comparable:
 * a conflict is an *exclusion*, not a sequencing rule, so it reads as freedom,
 * not constraint.  (A total order has no conflicts â€” causally related events
 * cannot conflict â€” so the ludus endpoint is unaffected.)
 */
import { causes, eventIds } from "@red-cup-engineering/playing/structuring/event/structure";

import { fromRatio } from "@red-cup-engineering/exact-number-data-service/exact-number";


const comparable = (structure                     , a        , b        )          =>
  causes(structure, a, b) || causes(structure, b, a);

                                                  

/**
 * The paidia<->ludus index of a structure: the fraction of event pairs that are
 * causally comparable.  Fewer than two events cannot present a fraction â€” that
 * is an obstruction, not a value of $0$ or $1$.
 */
export function ludusIndex(structure                     )                     {
  const ids = eventIds(structure);
  const count = ids.length;
  if (count < 2) {
    return Object.freeze({ kind: "game-geometry.ludusIndex-obstruction"         , eventCount: count });
  }
  let comparablePairs = 0;
  for (let left = 0; left < count; left += 1) {
    for (let right = left + 1; right < count; right += 1) {
      if (comparable(structure, ids[left] , ids[right] )) comparablePairs += 1;
    }
  }
  const totalPairs = (count * (count - 1)) / 2;
  return Object.freeze({
    kind: "game-geometry.ludusIndex"         ,
    comparablePairs,
    totalPairs,
    fraction: fromRatio(comparablePairs, totalPairs),
  });
}

/** Pure paidia â€” every event pair concurrent (index $0$). */
export const isPaidia = (judgment                    )          =>
  judgment.kind === "game-geometry.ludusIndex" && judgment.comparablePairs === 0;

/** Pure ludus â€” every event pair causally ordered (index $1$). */
export const isLudus = (judgment                    )          =>
  judgment.kind === "game-geometry.ludusIndex" && judgment.comparablePairs === judgment.totalPairs;
