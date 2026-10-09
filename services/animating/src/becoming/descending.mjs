/**
 * descending — the agency descent engine: ONE traversal of relating's
 * `articulate → predicate → posit → settle`, read four ways.
 *
 * This is the load-bearing claim of the package made executable: animating is
 * not a new morphism but the AGENCY READING of the relating descent. So the
 * engine runs the relating descent exactly once over a membrane log and holds the
 * carrier at each of the four closure regimes — the articulation cells (aperiodic),
 * the predication site (transfinite), the posited presheaf (Scott-continuous), and
 * the settlement filtration with its fixed-point readings (finite). The four stage
 * morphisms (`animate`/`enact`/`labor`/`individuate`) and the interior agent are
 * READINGS of this one `DescentState`. The substrate is the Sign packages: SignCell's
 * cells, SignGraph's site, SignCraft's settle; this engine derives nothing they provide.
 */

import { claimValue, isUtterance, tokenValue, utterance } from "@red-cup-engineering/signcell/cell";
import { settleMembrane } from "@red-cup-engineering/signcraft/membrane";
import { cones } from "@red-cup-engineering/signcraft/settle";

export { utterance };

/**
 * Admit a seed from the wire into a membrane log. A seed is either newline-
 * separated `token|claim` lines (the string wire) or a JSON array whose items are
 * `[token, claim]`, `{ token, claim }`, or `{ subject, predicate }`. Each item
 * becomes one utterance `[token, claim]` — the aperiodic articulation pairing.
 */
export function admitSeed(input) {
  if (typeof input === "string") {
    const lines = input.split("\n").map((line) => line.trim()).filter((line) => line !== "");
    if (lines.length === 0) throw new TypeError("admitSeed: a seed requires at least one `token|claim` line");
    return Object.freeze(lines.map((line) => {
      const bar = line.indexOf("|");
      if (bar < 0) throw new TypeError(`admitSeed: seed line ${JSON.stringify(line)} must be \`token|claim\``);
      return utterance(line.slice(0, bar).trim(), line.slice(bar + 1).trim());
    }));
  }
  if (Array.isArray(input) && input.length > 0) {
    return Object.freeze(input.map((item, index) => admitSeedItem(item, index)));
  }
  throw new TypeError("admitSeed: expected a `token|claim` string or a non-empty JSON array of seed items");
}

function admitSeedItem(item, index) {
  if (isUtterance(item)) return item;
  if (Array.isArray(item) && item.length === 2) return utterance(item[0], item[1]);
  if (item !== null && typeof item === "object" && !Array.isArray(item)) {
    const record = item;
    const token = record["token"] ?? record["subject"];
    const claim = record["claim"] ?? record["predicate"];
    if (token !== undefined && claim !== undefined) return utterance(token, claim);
  }
  throw new TypeError(`admitSeed: seed item ${index} must be [token, claim], { token, claim }, or { subject, predicate }`);
}

/** Run the descent once over a membrane log: the membrane tells its cells (relating's membrane — a denial
 *  tells the claim's cell against), each witnessed by its utterance; the posited valuation settles under
 *  the site's transport; the state holds the site, the settlement, its settled section, and the four cones. */
export function descend(utterances) {
  if (utterances.length === 0) throw new TypeError("descend: an empty seed founds no agent");
  const settlement = settleMembrane(utterances);
  return Object.freeze({ utterances: Object.freeze([...utterances]), site: settlement.site, settlement, section: settlement.settled, cones: cones(settlement) });
}

/** Render one membrane utterance as a `token|claim` label (for the becoming seed reading). */
export function utteranceLabel(carrier) {
  return `${String(tokenValue(carrier))}|${String(claimValue(carrier))}`;
}

/** Read the settlement of the shared agency descent. */
export const settleUtterances = (witnesses) => descend(witnesses).settlement;

/** Read the four cones of the shared agency descent. */
export const conesOfUtterances = (witnesses) => descend(witnesses).cones;
