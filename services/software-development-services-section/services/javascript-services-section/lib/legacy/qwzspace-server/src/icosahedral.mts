/**
 * Icosahedral cut-and-project: the genuine three-dimensional quasicrystal.
 *
 * meme-geometry's `cut-and-project` is one-dimensional — a 2-lattice cut to a
 * line. Three-dimensional space is the next honest step up the *same*
 * construction, not a tuple of three lines: the six-dimensional integer
 * lattice ℤ⁶ projected to physical ℝ³ along the six five-fold axes of an
 * icosahedron. It is the canonical aperiodic order of three-space (the
 * mathematics of real icosahedral quasicrystals), and it falls out of
 * meme-geometry's existing field arithmetic without extending that package:
 *
 *   - ℚ(√5) is degree two, so each physical coordinate is an element of the
 *     SAME field meme-geometry already gives — `unit + root·√5`. The golden
 *     ratio τ = (1+√5)/2 lives there. Coordinates are produced by the cut;
 *     they are not posited.
 *   - Because the field has exactly two embeddings, the *internal* projection
 *     (the potentiality space whose window decides realization) is the
 *     componentwise Galois conjugate √5 ↦ −√5 of the physical projection —
 *     literally `quadraticConjugate`, the same swap the 1-D scheme uses, just
 *     in three components. Internal dimension = 6 − 3 = 3.
 *
 * Two layers, one construction:
 *
 *   - EXACT (this is the source of truth). `physicalProjection`,
 *     `internalProjection`, `siteRealization`, `squaredDistance` decide a
 *     single site's geometry exactly in ℚ(√5) — no float ever touches a sign
 *     or comparison. meme-algebra's exact arithmetic is the von-Neumann-ordinal
 *     settlement substrate; it is correct but heavy (≈ tens of ms per site), so
 *     the exact layer answers *one* decidable question at a time.
 *   - FLOAT (the boundary read). Enumerating a whole world is a boundary read —
 *     exactly the role `quadraticToNumber` plays for the 1-D scheme. `modelSet`
 *     screens sites with double-precision projections, thousands per
 *     millisecond. Lattice sites stay exact integer data; only the window
 *     *filter* reads through floats. For a RATIONAL window this is not an
 *     approximation: an internal coordinate is `(a+b/2) − (b/2)√5`, which
 *     equals a rational bound only when b = 0 (then it is an integer, never
 *     equal to a strict rational bound) — so there are no boundary ties and the
 *     float sign provably matches the exact sign. `rationalWindow` /
 *     `defaultWindow` are rational for this reason.
 *
 * Which physical scale or orientation a world reads this at is a correspondence
 * question, asked at the render boundary, never an input to the scheme.
 */

import type { Rational } from "@emsenn/relating/analysis";
import { fromRatio, quadraticToNumber, ratFromInt } from "@emsenn/relating/writing";
import {
  quadraticAdd,
  quadraticAddRational,
  quadraticCompare,
  quadraticConjugate,
  quadraticEqual,
  quadraticFromRational,
  quadraticLeq,
  quadraticLess,
  quadraticMultiply,
  quadraticRational,
  quadraticScale,
  quadraticSubtract,
  sameRadicand,
  type QuadraticRational,
} from "@emsenn/relating/geometry";

/** The radicand of the icosahedral field ℚ(√5). */
export const ICOSAHEDRAL_RADICAND = 5;

/** The golden ratio τ = (1+√5)/2, exact in ℚ(√5). */
export const tau = (): QuadraticRational =>
  quadraticRational(ICOSAHEDRAL_RADICAND, fromRatio(1, 2), fromRatio(1, 2));

/** τ and its Galois conjugate τ̄ = (1−√5)/2 as doubles — the float layer's
 *  whole knowledge of the field. */
const TAU = (1 + Math.sqrt(5)) / 2;
const TAU_BAR = (1 - Math.sqrt(5)) / 2;

/** a + b·τ as an exact element of ℚ(√5). The integer-combination basis the
 *  icosahedral projection produces — each physical coordinate has this form. */
const intPlusIntTau = (unitPart: number, tauPart: number): QuadraticRational =>
  quadraticAddRational(quadraticScale(tau(), ratFromInt(tauPart)), ratFromInt(unitPart));

/** A point of ℚ(√5)³ — an exact physical or internal coordinate triple. */
export interface QVec3 {
  readonly kind: "qwzspace.icosahedral.qvec3";
  readonly x: QuadraticRational;
  readonly y: QuadraticRational;
  readonly z: QuadraticRational;
}

export const qvec3 = (x: QuadraticRational, y: QuadraticRational, z: QuadraticRational): QVec3 =>
  Object.freeze({ kind: "qwzspace.icosahedral.qvec3" as const, x, y, z });

export const qvec3Equal = (left: QVec3, right: QVec3): boolean =>
  quadraticEqual(left.x, right.x) && quadraticEqual(left.y, right.y) && quadraticEqual(left.z, right.z);

/** Lexicographic compare (x then y then z) — a total order for stable sorting
 *  of realized sites. Not a metric claim, just a deterministic ordering. */
export const qvec3Compare = (left: QVec3, right: QVec3): -1 | 0 | 1 => {
  const cx = quadraticCompare(left.x, right.x);
  if (cx !== 0) return cx;
  const cy = quadraticCompare(left.y, right.y);
  if (cy !== 0) return cy;
  return quadraticCompare(left.z, right.z);
};

/** A site of the six-dimensional integer lattice ℤ⁶. The coordinates are exact
 *  integers — the lattice itself is never approximated. */
export interface LatticeSite6 {
  readonly kind: "qwzspace.icosahedral.site";
  readonly coords: readonly [number, number, number, number, number, number];
}

export const latticeSite6 = (
  k0: number, k1: number, k2: number, k3: number, k4: number, k5: number,
): LatticeSite6 => {
  const coords = [k0, k1, k2, k3, k4, k5] as const;
  for (const value of coords) {
    if (!Number.isSafeInteger(value)) throw new TypeError("latticeSite6: coordinates must be safe integers");
  }
  return Object.freeze({ kind: "qwzspace.icosahedral.site" as const, coords });
};

export const sameSite = (left: LatticeSite6, right: LatticeSite6): boolean =>
  left.coords.every((value, index) => value === right.coords[index]);

export const translateSite6 = (
  site: LatticeSite6,
  d0: number, d1: number, d2: number, d3: number, d4: number, d5: number,
): LatticeSite6 => latticeSite6(
  site.coords[0] + d0, site.coords[1] + d1, site.coords[2] + d2,
  site.coords[3] + d3, site.coords[4] + d4, site.coords[5] + d5,
);

// ---------- the cut, exact ----------

/**
 * The cut: ℤ⁶ → ℝ³ along the six five-fold icosahedral axes. The basis images
 * are the icosahedron's vertices (cyclic permutations of (±1, ±τ, 0)), one
 * representative per antipodal pair:
 *
 *   e0 ↦ ( 1,  τ,  0)   e1 ↦ (−1,  τ,  0)
 *   e2 ↦ ( 0,  1,  τ)   e3 ↦ ( 0, −1,  τ)
 *   e4 ↦ ( τ,  0,  1)   e5 ↦ ( τ,  0, −1)
 *
 * Collecting coefficients gives each coordinate as `integer + integer·τ`,
 * exact in ℚ(√5). The conventional uniform normalization 1/√(2+τ) is a real
 * scalar outside ℚ(√5); it scales physical space uniformly and so leaves the
 * model set's structure invariant, applied only at the float boundary.
 */
export const physicalProjection = (site: LatticeSite6): QVec3 => {
  const [k0, k1, k2, k3, k4, k5] = site.coords;
  return qvec3(
    intPlusIntTau(k0 - k1, k4 + k5),
    intPlusIntTau(k2 - k3, k0 + k1),
    intPlusIntTau(k4 - k5, k2 + k3),
  );
};

/** Internal space: the Galois conjugate √5 ↦ −√5 of the physical projection,
 *  componentwise. This is the potentiality space; its window decides which
 *  sites are realized. Exactly the conjugate because ℚ(√5) has two embeddings. */
export const internalProjection = (site: LatticeSite6): QVec3 => {
  const physical = physicalProjection(site);
  return qvec3(
    quadraticConjugate(physical.x),
    quadraticConjugate(physical.y),
    quadraticConjugate(physical.z),
  );
};

// ---------- the window ----------

/** An axis-aligned box [lower, upper) in internal ℚ(√5)³ space — the
 *  acceptance window. The canonical icosahedral window is the rhombic
 *  triacontahedron (the internal projection of the 6-cube); a box is a valid,
 *  decidable window that still yields aperiodic order, and is the honest first
 *  primitive. */
export interface AcceptanceWindow3 {
  readonly kind: "qwzspace.icosahedral.window";
  readonly lower: QVec3;
  readonly upper: QVec3;
  /** True when both bounds are rational (zero √5 part) on every axis — the
   *  condition under which the float enumerator provably agrees with the exact
   *  judgment. `rationalWindow` guarantees it. */
  readonly rational: boolean;
}

const isRationalBound = (bounds: readonly QuadraticRational[]): boolean =>
  bounds.every((bound) => quadraticEqual(bound, quadraticFromRational(ICOSAHEDRAL_RADICAND, asRationalUnit(bound))));

// Read a quadratic's unit part by reconstructing a pure-rational quadratic and
// comparing — avoids reaching into meme-geometry internals.
function asRationalUnit(bound: QuadraticRational): Rational {
  // bound.unit is the rational unit part; meme-geometry exposes it on the value.
  return bound.unit;
}

export const acceptanceWindow3 = (lower: QVec3, upper: QVec3): AcceptanceWindow3 => {
  for (const axis of ["x", "y", "z"] as const) {
    if (!sameRadicand(lower[axis], upper[axis])) throw new TypeError("acceptanceWindow3: bounds live in one field");
    if (!quadraticLess(lower[axis], upper[axis])) throw new TypeError(`acceptanceWindow3: lower.${axis} must be strictly below upper.${axis}`);
  }
  const rational = isRationalBound([lower.x, lower.y, lower.z, upper.x, upper.y, upper.z]);
  return Object.freeze({ kind: "qwzspace.icosahedral.window" as const, lower, upper, rational });
};

/** A symmetric rational box window of half-extent `numerator/denominator` on
 *  every internal axis. Rational by construction, so the float enumerator is
 *  exact against it — the recommended world window. */
export const rationalWindow = (numerator: number, denominator = 1): AcceptanceWindow3 => {
  const half = quadraticFromRational(ICOSAHEDRAL_RADICAND, fromRatio(numerator, denominator));
  const lower = quadraticScale(half, ratFromInt(-1));
  return acceptanceWindow3(qvec3(lower, lower, lower), qvec3(half, half, half));
};

/** The default acceptance window — a rational half-extent-3/2 box, a sensible
 *  world whose realized density is golden and whose enumeration is exact. */
export const defaultWindow = (): AcceptanceWindow3 => rationalWindow(3, 2);

// ---------- exact single-site realization (source of truth) ----------

export interface SiteRealizedWitness {
  readonly kind: "qwzspace.icosahedral.realized:witness";
  readonly site: LatticeSite6;
  readonly physical: QVec3;
  readonly internal: QVec3;
}

export interface SiteUnrealizedObstruction {
  readonly kind: "qwzspace.icosahedral.realized-obstruction";
  readonly site: LatticeSite6;
  readonly internal: QVec3;
  readonly window: AcceptanceWindow3;
}

export type SiteRealizationJudgment = SiteRealizedWitness | SiteUnrealizedObstruction;

const insideBoxExact = (point: QVec3, window: AcceptanceWindow3): boolean =>
  (["x", "y", "z"] as const).every((axis) =>
    quadraticLeq(window.lower[axis], point[axis]) && quadraticLess(point[axis], window.upper[axis]));

/** Whether a site is realized, decided exactly in ℚ(√5): its internal
 *  projection lies in the window. A judgment, not a filter — the obstruction
 *  names why a site is not a place. This is the decidable source of truth; the
 *  float `modelSet` agrees with it for rational windows. */
export const siteRealization = (site: LatticeSite6, window: AcceptanceWindow3): SiteRealizationJudgment => {
  const internal = internalProjection(site);
  return insideBoxExact(internal, window)
    ? Object.freeze({
      kind: "qwzspace.icosahedral.realized:witness" as const,
      site,
      physical: physicalProjection(site),
      internal,
    })
    : Object.freeze({
      kind: "qwzspace.icosahedral.realized-obstruction" as const,
      site,
      internal,
      window,
    });
};

/** Squared physical distance between two exact points, as an exact ℚ(√5)
 *  element — comparison of separations never touches a float. (Σ dᵢ²) stays in
 *  the field because `quadraticMultiply` is closed on ℚ(√5). */
export const squaredDistance = (left: QVec3, right: QVec3): QuadraticRational => {
  const dx = quadraticSubtract(left.x, right.x);
  const dy = quadraticSubtract(left.y, right.y);
  const dz = quadraticSubtract(left.z, right.z);
  return quadraticAdd(quadraticAdd(quadraticMultiply(dx, dx), quadraticMultiply(dy, dy)), quadraticMultiply(dz, dz));
};

// ---------- the float boundary read (worldgen workhorse) ----------

/** The uniform icosahedral normalization 1/√(2+τ): the real scalar that makes
 *  the six basis images unit icosahedron vertices. Applied only in physical
 *  float reads. */
export const ICOSAHEDRAL_NORMALIZATION = 1 / Math.sqrt(2 + TAU);

/** A plain float ℝ³ coordinate — the render boundary read. Exactness ends
 *  here, exactly as `quadraticToNumber` is the boundary of the 1-D scheme. */
export interface FloatVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Float physical position of a site — the fast path that skips the exact
 *  field, normalized to icosahedral unit scale. The render position. */
export const physicalFloat = (site: LatticeSite6): FloatVec3 => {
  const [k0, k1, k2, k3, k4, k5] = site.coords;
  return Object.freeze({
    x: ((k0 - k1) + (k4 + k5) * TAU) * ICOSAHEDRAL_NORMALIZATION,
    y: ((k2 - k3) + (k0 + k1) * TAU) * ICOSAHEDRAL_NORMALIZATION,
    z: ((k4 - k5) + (k2 + k3) * TAU) * ICOSAHEDRAL_NORMALIZATION,
  });
};

/** Float internal projection of a site — unnormalized, matching the exact
 *  internal coordinates the window is compared against. */
export const internalFloat = (site: LatticeSite6): FloatVec3 => {
  const [k0, k1, k2, k3, k4, k5] = site.coords;
  return Object.freeze({
    x: (k0 - k1) + (k4 + k5) * TAU_BAR,
    y: (k2 - k3) + (k0 + k1) * TAU_BAR,
    z: (k4 - k5) + (k2 + k3) * TAU_BAR,
  });
};

/** Convert an exact point to floats (normalized physical scale). */
export const physicalToFloat = (point: QVec3): FloatVec3 => Object.freeze({
  x: quadraticToNumber(point.x) * ICOSAHEDRAL_NORMALIZATION,
  y: quadraticToNumber(point.y) * ICOSAHEDRAL_NORMALIZATION,
  z: quadraticToNumber(point.z) * ICOSAHEDRAL_NORMALIZATION,
});

export interface RealizedSite {
  readonly kind: "qwzspace.icosahedral.realizedSite";
  readonly site: LatticeSite6;
  /** The render position (float, normalized). */
  readonly physical: FloatVec3;
  /** The internal projection (float, unnormalized) — its distance from the
   *  window centre is how "deep" a place sits, a natural danger/grade signal. */
  readonly internal: FloatVec3;
}

export interface ModelSet {
  readonly kind: "qwzspace.icosahedral.modelSet";
  readonly window: AcceptanceWindow3;
  readonly radius: number;
  readonly exact: boolean;
  readonly realized: readonly RealizedSite[];
}

/**
 * Every site with all declared required coordinates in [−radius, radius] that the window
 * realizes — the world's places out to a horizon — enumerated through the
 * float boundary read. (2·radius+1)⁶ sites are screened, thousands per ms.
 * `exact` reports whether the result is provably the exact model set (true for
 * a rational window). The radius is an honest finite horizon on the infinite
 * aperiodic lattice; stream further sites by translating the lattice when the
 * player moves.
 */
export const modelSet = (window: AcceptanceWindow3, radius: number): ModelSet => {
  if (!Number.isSafeInteger(radius) || radius < 0) throw new TypeError("modelSet: radius must be a non-negative integer");
  const loX = quadraticToNumber(window.lower.x), hiX = quadraticToNumber(window.upper.x);
  const loY = quadraticToNumber(window.lower.y), hiY = quadraticToNumber(window.upper.y);
  const loZ = quadraticToNumber(window.lower.z), hiZ = quadraticToNumber(window.upper.z);
  const realized: RealizedSite[] = [];
  for (let k0 = -radius; k0 <= radius; k0 += 1)
  for (let k1 = -radius; k1 <= radius; k1 += 1)
  for (let k2 = -radius; k2 <= radius; k2 += 1)
  for (let k3 = -radius; k3 <= radius; k3 += 1)
  for (let k4 = -radius; k4 <= radius; k4 += 1)
  for (let k5 = -radius; k5 <= radius; k5 += 1) {
    const ix = (k0 - k1) + (k4 + k5) * TAU_BAR;
    if (ix < loX || ix >= hiX) continue;
    const iy = (k2 - k3) + (k0 + k1) * TAU_BAR;
    if (iy < loY || iy >= hiY) continue;
    const iz = (k4 - k5) + (k2 + k3) * TAU_BAR;
    if (iz < loZ || iz >= hiZ) continue;
    const site = latticeSite6(k0, k1, k2, k3, k4, k5);
    realized.push(Object.freeze({
      kind: "qwzspace.icosahedral.realizedSite" as const,
      site,
      physical: physicalFloat(site),
      internal: Object.freeze({ x: ix, y: iy, z: iz }),
    }));
  }
  return Object.freeze({
    kind: "qwzspace.icosahedral.modelSet" as const,
    window,
    radius,
    exact: window.rational,
    realized: Object.freeze(realized),
  });
};
