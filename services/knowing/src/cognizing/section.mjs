/**
 * cognizing/section — the C(Meme) knowledge-state grain: helpers over a held section.
 *
 * knowing is the comonad on Meme (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md).
 * Its richer carrier is the comonad CONTEXT C(Meme) = a held SECTION of memes (the
 * knower's whole standing body of knowledge — "the depth is the memory"). These
 * helpers fold a collection of memes (SignCells) into that section by the knowledge
 * order ≤_k (coincident cells' evidence merged, SignCell's cell set), summarize it into knowing's own `knowing/knowledge-state`
 * carrier, and read the section back out. The fold is confluent: in FOUR, conflicts
 * accumulate as the ≤_k top (stable) rather than trivializing (settling-monotonicity),
 * so the section always glues (sheaf cohomologyVanishes, H¹=0) — `contested` exposes
 * how many cells hold a both-sides-witnessed contradiction settled stable.
 */

import { cellSet, isCell, knowledgeReading, sameCell } from "@red-cup-engineering/signcell/cell";
import { knowledgeJoinReading, knowledgeMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { closureRegimeName, closureRegimeNames, omegaOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { ofNat, regimeOfOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/ordinal-closure";

/** The knowledge-order standing of a meme (a SignCell): SignChain's knowledge reading of its evidence. */
export const standingOf = (m) => knowledgeReading(m);

/** Whether a cell holds a both-sides-witnessed contradiction. */
const contestedMeme = (m) => m.for.length > 0 && m.against.length > 0;

/** Fold memes into a section: coincident cells joined in the knowledge order (their evidence merged). */
export const foldSection = (memes) => [...cellSet(memes)];

const nestedMeme = (term) => typeof term === "object" && term !== null && (isCell(term) || nestedMeme(term.mark?.value));
/** Whether a meme is reflexive: its subject or object is itself a meme, bare or marked ("knowing that you know"). */
export const reflexiveMeme = (m) => nestedMeme(m.subject) || nestedMeme(m.object);

/** The closure regime of a knowledge orbit (Obsmetrologia `regimeOfOrd`): an orbit at a ≤_k extremum
 *  has settled at a finite stage; an unsettled orbit climbs to ω, Scott-continuously and countably
 *  unless it is reflexive, whose orbit is neither (rumination, aperiodic). */
export const orbitRegime = (settled, reflexive) =>
  closureRegimeName(regimeOfOrdinal(settled ? ofNat(0) : omegaOrdinal(), !reflexive, !reflexive));

/** The regimes a knowledge orbit can read: `orbitRegime`'s image, in completion-cost order. */
export const orbitRegimeSchema = Object.freeze({
  enum: closureRegimeNames.filter((name) => [true, false].some((settled) => [true, false].some((reflexive) => orbitRegime(settled, reflexive) === name))),
});

/** Admit a collection of memes from the wire: an array, or `{ memes: [...] }`. */
export function admitMemes(input, verb) {
  const raw = Array.isArray(input)
    ? input
    : input !== null && typeof input === "object" && Array.isArray((input).memes)
      ? (input).memes
      : null;
  if (raw === null) throw new TypeError(`${verb}: expected an array of memes or { memes: [...] }`);
  const memes = [];
  for (const x of raw) {
    if (!isCell(x)) throw new TypeError(`${verb}: every element must be a meme (a SignCell)`);
    memes.push(x);
  }
  return memes;
}

/** The held memes of a knowledge-state, read back as relating memes. */
export const heldMemesOf = (state) => state.memes;

/** Admit a knowledge-state from the wire, refusing a non-state at the boundary. */
export function admitState(input, verb) {
  if (input !== null && typeof input === "object" && !Array.isArray(input)
    && (input).kind === "knowing.knowledge-state"
    && Array.isArray((input).memes)) {
    return input;
  }
  throw new TypeError(`${verb}: expected a knowing/knowledge-state carrier (knowing.knowledge-state)`);
}

/** The predicate label a meme carries. */
const predicateLabel = (m) => typeof m.predicate === "string" ? m.predicate : JSON.stringify(m.predicate);

/**
 * The canonical structural fingerprint of a held section: the sorted multiset of
 * (predicate-label, ≤_k-standing) over its cells. Two sections are mutually locally
 * derivable iff their fingerprints agree (the H¹-class match, here made concrete).
 */
export function sectionSignature(state) {
  return heldMemesOf(state)
    .map((m) => `${predicateLabel(m)}:${standingOf(m)}`)
    .sort()
    .join("|");
}

/** Summarize a folded section into knowing's own knowledge-state carrier. */
export function summarizeState(base, folded) {
  return {
    kind: "knowing.knowledge-state",
    base,
    memes: folded,
    held: folded.length,
    settled: folded.filter((m) => standingOf(m) === "stable").length,
    contested: folded.filter(contestedMeme).length,
    // the bilattice fold is confluent: conflicts accumulate as the ≤_k top rather than
    // trivializing, so a folded section always glues (sheaf H¹=0). `contested` carries the tension.
    glues: true,
  };
}

/** Build a knowledge-state directly from a collection of memes (fold + summarize). */
export const stateFromMemes = (base, memes) => summarizeState(base, foldSection(memes));

/** A FOUR knowledge-order standing. */

/** The knowledge-order join and meet on the four standings (SignChain's). */
export const joinK = knowledgeJoinReading;
export const meetK = knowledgeMeetReading;

/** The standing of a meme's cell within a held section: absurd (≤_k bottom) when absent. */
export function lookupStanding(state, m) {
  const held = heldMemesOf(state).find((h) => sameCell(h, m));
  return held === undefined ? "absurd" : standingOf(held);
}
