import { negateReading, samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * Polarity — Player/Opponent duality, the $(-)^\perp$ of concurrent game systems,
 * realized as a Belnap class of the meme-algebra bilattice reading.
 *
 * The theory-of-computing claim (CGS is the theory of computing) makes
 * Player/Opponent duality the dualizing operation $(-)^\perp$ of the
 * $*$-autonomous category $\mathbf{CGS}$.  The ludics journal pins the
 * correspondence to the reading exactly:
 *
 *   - positive polarity (Proponent / Player commits "told true")  ↔ $t = (1,0)$ ↔ reading `potential`
 *   - negative polarity (Opponent     commits "told false")       ↔ $f = (0,1)$ ↔ reading `active`
 *
 * So a polarity IS a reading value, and the dual $(-)^\perp$ that swaps Player
 * and Opponent IS the meme-algebra gauge `negate`: it swaps the truth/falsity
 * coordinates, carrying `potential` to `active` and back.  We do not reinvent
 * duality; we borrow the apex's negation.
 */

const POSITIVE = Object.freeze({ kind: "game.polarity", name: "positive" });
const NEGATIVE = Object.freeze({ kind: "game.polarity", name: "negative" });

export const polarityNames = () =>
  Object.freeze(["positive", "negative"]);

export function polarity(name) {
  return name === "positive" ? POSITIVE : NEGATIVE;
}

export const positive = () => POSITIVE;
export const negative = () => NEGATIVE;

export const polarityName = (p) => p.name;

/** Player/Opponent duality $(-)^\perp$: swaps Proponent and Opponent. */
export function dual(p) {
  return p.name === "positive" ? NEGATIVE : POSITIVE;
}

export const samePolarity = (left, right) => left.name === right.name;

/**
 * The Belnap reading of a polarity — the meme-apex shadow of the game object.
 * positive ↦ potential = (told-true), negative ↦ active = (told-false).
 */
export function polarityReading(p) {
  return (p.name === "positive" ? "potential" : "active");
}

/**
 * Recover the polarity committed by a reading value, where one is committed.
 * `potential` (t) is positive, `active` (f) is negative; the give-up value
 * `stable` ($\top$) and the no-action value `absurd` ($\bot$) commit no polarity.
 */
export function readingPolarity(value) {
  if (samePoint(value, "potential")) return POSITIVE;
  if (samePoint(value, "active")) return NEGATIVE;
  return null;
}

export function isPolarityName(value) {
  return value === "positive" || value === "negative";
}

export function isPolarity(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.polarity" && isPolarityName(candidate.name);
}

export function asPolarity(value) {
  if (isPolarity(value)) return value;
  if (isPolarityName(value)) return polarity(value);
  throw new TypeError(`not a game polarity: ${JSON.stringify(value)} (expected one of ${polarityNames().join(", ")})`);
}

/**
 * Witness that $(-)^\perp$ on polarity coincides with `negate` on the reading:
 * `polarityReading(dual(p))` equals `negateReading(polarityReading(p))` for every p.
 * The dualizing operation of the game is the gauge negation of the apex.
 */

export function dualityIsNegation(p) {
  const dualReading = polarityReading(dual(p));
  const negatedReading = negateReading(polarityReading(p));
  return samePoint(dualReading, negatedReading)
    ? Object.freeze({ kind: "game.polarity.dualityIsNegation:witness", polarity: p, dualReading, negatedReading })
    : Object.freeze({ kind: "game.polarity.dualityIsNegation-obstruction", polarity: p, dualReading, negatedReading });
}
