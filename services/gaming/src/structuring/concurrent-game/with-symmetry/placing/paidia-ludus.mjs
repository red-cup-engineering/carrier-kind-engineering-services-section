/**
 * The paidiaâ†”ludus spectrum as a structured axis (Caillois 1958).
 *
 * `ludus.mts` measures *where* a structure sits on Caillois's spectrum â€” the
 * `ludusIndex`, the exact fraction of event pairs that are causally comparable,
 * a Rational in $[0, 1]$ with pure paidia at $0$ and pure ludus at $1$.  This
 * module turns that scalar into a *structured axis*: named bands (the corpus's
 * paidia / ludus journals make the spectrum a continuum, not a binary, so a
 * Caillois-faithful reading places a structure in a band rather than asserting
 * a sharp paidia/ludus dichotomy), and the four-categories Ã— paidia-ludus grid.
 *
 * Bands (paidia journal Â§"paidia coexists within ludus"; ludus journal worked
 * examples â€” improv "near-paidia", RPG "moderate ludus", chess/athletics
 * "heavily ludus"):
 *
 *   - `pure-paidia`   fraction $= 0$        â€” free, concurrent, no sequencing
 *   - `near-paidia`   $0 < f \le 1/4$       â€” light ludus scaffolding (improv)
 *   - `balanced`      $1/4 < f < 3/4$       â€” paidia and ludus in tension (RPG)
 *   - `near-ludus`    $3/4 \le f < 1$       â€” heavily rule-bound (athletics)
 *   - `pure-ludus`    fraction $= 1$        â€” total order, every move sequenced
 *
 * The four Caillois modes (agon, alea, mimicry, ilinx) are *not* derived from
 * the event structure â€” the corpus's ludus journal says ludus "makes the four
 * categories most visible" but gives no structureâ†’category recipe, so the
 * category is a *declared* coordinate, not a computed one.  The grid pairs a
 * declared category with a computed band: ludus journal "ludus clarifies the
 * Caillois modes" â€” the modes are most distinct at the ludus end.
 */

import { ratCompare } from "@red-cup-engineering/exact-number-data-service/exact-number";
import {

  ludusIndex,
} from "./ludus.mjs";
import { fromRatio } from "@red-cup-engineering/exact-number-data-service/exact-number";


/** The five bands of the axis, paidia-end first. */
export const paidiaLudusBands = ()                             =>
  Object.freeze(["pure-paidia", "near-paidia", "balanced", "near-ludus", "pure-ludus"]         );

const oneQuarter           = fromRatio(1, 4);
const threeQuarters           = fromRatio(3, 4);
const zero           = fromRatio(0, 1);
const one           = fromRatio(1, 1);

/**
 * Place an exact fraction in $[0, 1]$ into its band by exact Rational
 * comparison (no float rounding â€” house style is exact arithmetic):
 * $0$ â†’ pure-paidia, $(0, 1/4]$ â†’ near-paidia, $(1/4, 3/4)$ â†’ balanced,
 * $[3/4, 1)$ â†’ near-ludus, $1$ â†’ pure-ludus.
 */
export function bandOfFraction(fraction          )                  {
  if (ratCompare(fraction, zero) === 0) return "pure-paidia";
  if (ratCompare(fraction, one) === 0) return "pure-ludus";
  if (ratCompare(fraction, oneQuarter) <= 0) return "near-paidia";
  if (ratCompare(fraction, threeQuarters) >= 0) return "near-ludus";
  return "balanced";
}

/**
 * Place a structure on the paidiaâ†”ludus axis: compute its `ludusIndex`, read
 * out the band.  A structure with fewer than two events has no fraction (the
 * `ludusIndex` obstruction) and therefore no band â€” that is an obstruction,
 * not a default to either pole.
 */
export function paidiaLudusPlacement(structure                     )                      {
  const index = ludusIndex(structure);
  if (index.kind === "game-geometry.ludusIndex-obstruction") {
    return Object.freeze({
      kind: "game-geometry.paidiaLudusPlacement-obstruction"         ,
      eventCount: index.eventCount,
    });
  }
  return Object.freeze({
    kind: "game-geometry.paidiaLudusPlacement"         ,
    index,
    fraction: index.fraction,
    band: bandOfFraction(index.fraction),
  });
}

/** The band of a structure, or `null` when fewer than two events present a fraction. */
export function bandOf(structure                     )                         {
  const judgment = paidiaLudusPlacement(structure);
  return judgment.kind === "game-geometry.paidiaLudusPlacement" ? judgment.band : null;
}

/** Whether the placement is on the free (paidia) half of the axis (fraction $< 1/2$). */
export const leansPaidia = (judgment                     )          =>
  judgment.kind === "game-geometry.paidiaLudusPlacement"
  && ratCompare(judgment.fraction, fromRatio(1, 2)) < 0;

/** Whether the placement is on the rule-bound (ludus) half of the axis (fraction $> 1/2$). */
export const leansLudus = (judgment                     )          =>
  judgment.kind === "game-geometry.paidiaLudusPlacement"
  && ratCompare(judgment.fraction, fromRatio(1, 2)) > 0;

// â”€â”€â”€ The four Caillois categories Ã— paidia-ludus grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * The four Caillois modes: agon (competition), alea (chance), mimicry
 * (simulation), ilinx (vertigo).  Names only â€” the corpus gives no
 * structureâ†’category derivation; the category is declared, not computed.
 */
export const cailloisCategories = ()                              =>
  Object.freeze(["agon", "alea", "mimicry", "ilinx"]         );

export function isCailloisCategory(value         )                            {
  return value === "agon" || value === "alea" || value === "mimicry" || value === "ilinx";
}

                                        

                                                             

const clarifiedBands = new Set                 (["near-ludus", "pure-ludus"]);

/**
 * Place a declared Caillois mode on the grid against a structure's computed
 * band.  `clarified` records the ludus-journal claim that the modes are most
 * distinct at the ludus end â€” `null` when the structure presents no band.
 */
export function cailloisGridCell(
  category                  ,
  structure                     ,
)                          {
  const band = bandOf(structure);
  if (band === null) return null;
  return Object.freeze({
    kind: "game-geometry.cailloisGridCell"         ,
    category,
    band,
    clarified: clarifiedBands.has(band),
  });
}

export function isPaidiaLudusPlacement(value         )                                {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value                                 ;
  return candidate.kind === "game-geometry.paidiaLudusPlacement"
    && typeof candidate.band === "string";
}
