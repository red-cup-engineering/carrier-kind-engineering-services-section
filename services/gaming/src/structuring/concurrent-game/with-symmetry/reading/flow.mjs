/**
 * The flow criterion â€” Csikszentmihalyi's challengeâ†”skill matching.
 *
 * Flow (Csikszentmihalyi 1975, 1990) is "the state of complete absorption that
 * occurs when the challenge of an activity matches the actor's skill" (corpus,
 * flow journal 2026-05-24).  The diagnostic 2Ã—2: challenge above skill produces
 * anxiety/frustration; skill above challenge produces boredom; a calibrated
 * match produces flow.  The corpus gives flow precise algebraic content as
 * correspondence (10) of the cultural-ludic embedding: "*Challenge* = the
 * situation-fiber's complexity ... *Skill* = the player-fiber's complexity",
 * and the match "IS the challenge-skill match in Csikszentmihalyi's sense".
 *
 * We realize challenge and skill as *commensurable counts* so the band check is
 * apples-to-apples:
 *
 *   - **challenge** = the structural complexity of the arena = its number of
 *     legal one-move extensions reachable from the empty play â€” the breadth of
 *     the situation the player must engage (the "number of predicates / bypass
 *     adjacencies" of the situation-fiber, read structurally).
 *   - **skill** = the repertoire of a strategy = the breadth of its own
 *     move-vocabulary, the distinct moves it commits to across *all* the
 *     positions it admits â€” the size of the player's fiber.
 *
 * Challenge and skill are *independent* magnitudes (corpus: situation-fiber
 * complexity versus player-fiber complexity), so either may exceed the other.
 * Flow is the regime where they come *within a band* of each other; outside it,
 * skill short of challenge is *anxiety* (the situation overwhelms â€” the
 * corpus's "challenge too high" frustration), and skill in excess of challenge
 * is *boredom* (the player's repertoire outruns what the board demands).  Both
 * obstruction outcomes are reachable.
 */

import { arenaEvents } from "../arena.mjs";
import { emptyPlay, extend, positionOf } from "../strategizing/play.mjs";
import { ratCompare, ratSubtract } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { fromRatio } from "@red-cup-engineering/exact-number-data-service/exact-number";


/**
 * The challenge of an arena: the breadth of its opening situation â€” every event
 * that legally extends the empty play.  This is the structural complexity the
 * player must meet on the first move; a board offering one forced opening is
 * trivial, a board offering many is demanding.
 */
export function challengeOf(arena       )                   {
  const start = emptyPlay();
  const openings = arenaEvents(arena)
    .filter((e) => extend(arena, start, e.id) !== null)
    .map((e) => e.id);
  return Object.freeze({
    kind: "game-analysis.flow.challenge"         ,
    arena,
    value: openings.length,
    openings: Object.freeze(openings),
  });
}

/**
 * The skill of a strategy: the breadth of its own repertoire â€” every distinct
 * move it commits across *all* the positions it admits, not just openings.  An
 * intrinsic magnitude of the player's fiber: it may fall short of the arena's
 * challenge (under-skilled, anxiety) or run beyond it (over-skilled, boredom),
 * so the two are genuinely independent (corpus, flow journal).
 */
export function skillOf(strategy          )               {
  const repertoire           = [];
  for (const p of strategy.plays) {
    for (const move of p.moves) {
      if (!repertoire.includes(move)) repertoire.push(move);
    }
  }
  return Object.freeze({
    kind: "game-analysis.flow.skill"         ,
    strategy,
    value: repertoire.length,
    repertoire: Object.freeze(repertoire),
  });
}

                   

                   
                   

                    

const DEFAULT_BAND = fromRatio(1, 4);

/**
 * Judge flow from a challenge and a skill measure.  Flow holds when the
 * mismatch $|challenge - skill|$ is within `bandÂ·challenge` â€” challenge and
 * skill are commensurable counts, so the comparison is exact.  Outside the
 * band: skill below challenge is *anxiety* (the corpus's frustration regime,
 * challenge too high), skill above challenge is *boredom* (capacity exceeds
 * demand).  The default band is a quarter of the challenge; degenerate
 * (zero-challenge) boards admit flow only with zero skill.
 */
export function flowJudgment(
  challenge                  ,
  skill              ,
  band           = DEFAULT_BAND,
)               {
  const signedGap = challenge.value - skill.value;
  const mismatch = Math.abs(signedGap);
  // mismatch â‰¤ band Â· challenge  â‡”  mismatch (as /challenge) within band.
  const mismatchFraction =
    challenge.value === 0 ? fromRatio(mismatch, 1) : fromRatio(mismatch, challenge.value);
  if (ratCompare(mismatchFraction, band) <= 0) {
    return Object.freeze({
      kind: "game-analysis.flow:witness"         ,
      challenge,
      skill,
      gap: signedGap,
      band,
    });
  }
  return Object.freeze({
    kind: "game-analysis.flow-obstruction"         ,
    challenge,
    skill,
    reason: signedGap > 0 ? ("anxiety"         ) : ("boredom"         ),
    mismatch,
    band,
  });
}

/** Convenience: judge flow directly from an arena and a strategy on it. */
export function flow(arena       , strategy          , band           = DEFAULT_BAND)               {
  return flowJudgment(challengeOf(arena), skillOf(strategy), band);
}

/** Whether an arena and strategy are in flow at the given (or default) band. */
export const inFlow = (arena       , strategy          , band           = DEFAULT_BAND)          =>
  flow(arena, strategy, band).kind === "game-analysis.flow:witness";

/** The signed challenge âˆ’ skill difference as an exact `Rational` fraction of
 *  challenge â€” the position on Csikszentmihalyi's flow diagonal. */
export function flowBalance(challenge                  , skill              )           {
  if (challenge.value === 0) return fromRatio(0, 1);
  return ratSubtract(
    fromRatio(challenge.value, challenge.value),
    fromRatio(skill.value, challenge.value),
  );
}
