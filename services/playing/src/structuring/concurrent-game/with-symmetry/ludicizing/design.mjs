/**
 * Designs — Girard's dialogical objects, realized as reading valuations.
 *
 * The ludics correspondence theorem (corpus, "A Girard design corresponds to a
 * partial valuation $v_\mathfrak{D} : E \times E \dashrightarrow \mathbf{L}^\bowtie$")
 * states that a design IS a partial valuation from loci into the bilattice
 * reading.  The four polarity-states of a locus map bijectively onto the four
 * reading values of meme-algebra:
 *
 *   - Proponent acts (positive)      ↦ `potential` = $t = (1,0)$
 *   - Opponent acts (negative)       ↦ `active`    = $f = (0,1)$
 *   - Daimon $\dagger$ (give up)      ↦ `stable`    = $\top = (1,1)$  (designated)
 *   - no action (undefined region)   ↦ `absurd`    = $\bot = (0,0)$  (the default)
 *
 * A design is therefore not a new datatype — it is a configuration of the meme
 * apex: a finite reading labelling of the locus tree.  Loci outside the support
 * carry $\bot$.
 */
import { locusKey, locusFromKey, root } from "./locus.mjs";
import { samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const ACT_TO_CHARGE = {
  proponent: "potential",
  opponent: "active",
  daimon: "stable",
  none: "absurd",
};

  

const isAbsurd = (value) => samePoint(value, "absurd");

export function design(labelling = []) {
  const map = new Map();
  const source = Array.isArray(labelling)
    ? (labelling).map((e) => [e.locusKey, e.reading])
    : [...(labelling).entries()];
  for (const [key, value] of source) {
    if (!isAbsurd(value)) map.set(key, value);
  }
  const entries = [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, value]) => Object.freeze({ kind: "game.design.entry", locusKey: key, reading: value }));
  return Object.freeze({ kind: "game.design", entries: Object.freeze(entries) });
}

export const emptyDesign = () => design([]);

/** The act committed at a locus → its reading value. */
export const actReading = (act) => (ACT_TO_CHARGE[act]);

/** Build a design from an act labelling of loci. */
export function designFromActs(acts) {
  const map = new Map();
  for (const [key, act] of acts) map.set(key, actReading(act));
  return design(map);
}

/** The Daimon design at a single locus — "give up by asserting and denying", reading $\top$. */
export const daimon = (xi = root()) =>
  design(new Map([[locusKey(xi), "stable"]]));

/** The reading a design assigns to a locus; loci outside the support carry $\bot$ (`absurd`). */
export function designReading(d, xi) {
  const key = locusKey(xi);
  return d.entries.find((e) => e.locusKey === key)?.reading ?? "absurd";
}

export function designAct(d, xi) {
  const value = designReading(d, xi);
  if (samePoint(value, "potential")) return "proponent";
  if (samePoint(value, "active")) return "opponent";
  if (samePoint(value, "stable")) return "daimon";
  return "none";
}

/** The loci a design actually commits at (its support — the non-$\bot$ region). */
export const support = (d) =>
  Object.freeze(d.entries.map((e) => locusFromKey(e.locusKey)));

export const supportKeys = (d) =>
  Object.freeze(d.entries.map((e) => e.locusKey));

export function isDesign(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  return candidate.kind === "game.design" && Array.isArray(candidate.entries);
}
