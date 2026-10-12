/**
 * geometry/spatial/cut-and-project — 1-D cut-and-project schemes over ℤ².
 *
 * A scheme is an irrational quadratic slope α. A site (m,n) projects physically
 * to m + nα (the cut) and internally to its Galois conjugate m + nᾱ; an internal
 * window decides which sites are realized — acceptance is a judgment, not a hidden
 * filter. The accepted physical coordinates form a model set whose gap spectrum
 * is the aperiodic order the scheme produces.
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import { fromInt, fromInteger, intAdd, type Integer } from "@red-cup-engineering/computer-data-engine/exact-number";
import {
  quadraticAddRational, quadraticCompare, quadraticConjugate, quadraticEqual, quadraticIsRational,
  quadraticLeq, quadraticLess, quadraticScale, quadraticSubtract, sameRadicand, type QuadraticRational,
} from "./quadratic.mts";


/** A 1-D cut-and-project scheme: an irrational quadratic slope. */
export interface CutProjectScheme {
  readonly kind: "meme-geometry.cutProject.scheme";
  readonly slope: QuadraticRational;
}

/** Construct a scheme; throws if the slope is rational (a rational cut is periodic). */
export const cutProjectScheme = (slope: QuadraticRational): CutProjectScheme => {
  if (quadraticIsRational(slope)) throw new TypeError("cutProjectScheme: slope must be irrational — a rational cut is periodic");
  return Object.freeze({ kind: "meme-geometry.cutProject.scheme" as const, slope });
};

/** A site of ℤ²: integer coordinates (unit, slopeCount) for m + nα. */
export interface LatticeSite {
  readonly kind: "meme-geometry.cutProject.latticeSite";
  readonly unit: Integer;
  readonly slopeCount: Integer;
}

/** Construct a lattice site from integer coordinates. */
export const latticeSite = (unit: number, slopeCount: number): LatticeSite =>
  Object.freeze({ kind: "meme-geometry.cutProject.latticeSite" as const, unit: fromInt(unit), slopeCount: fromInt(slopeCount) });

/** Translate a site by integer offsets. */
export const translateSite = (site: LatticeSite, unit: number, slopeCount: number): LatticeSite =>
  Object.freeze({ kind: "meme-geometry.cutProject.latticeSite" as const, unit: intAdd(site.unit, fromInt(unit)), slopeCount: intAdd(site.slopeCount, fromInt(slopeCount)) });

/** The cut: (m, n) ↦ m + nα. */
export const physicalProjection = (scheme: CutProjectScheme, site: LatticeSite): QuadraticRational =>
  quadraticAddRational(quadraticScale(scheme.slope, fromInteger(site.slopeCount)), fromInteger(site.unit));

/** Internal space: (m, n) ↦ m + nᾱ (the conjugate of the cut). */
export const internalProjection = (scheme: CutProjectScheme, site: LatticeSite): QuadraticRational =>
  quadraticConjugate(physicalProjection(scheme, site));

/** Half-open interval [lower, upper) in internal space. */
export interface AcceptanceWindow {
  readonly kind: "meme-geometry.cutProject.window";
  readonly lower: QuadraticRational;
  readonly upper: QuadraticRational;
}

/** Construct a half-open window; throws if bounds differ in field or are not ordered. */
export const acceptanceWindow = (lower: QuadraticRational, upper: QuadraticRational): AcceptanceWindow => {
  if (!sameRadicand(lower, upper)) throw new TypeError("acceptanceWindow: bounds live in one field");
  if (!quadraticLess(lower, upper)) throw new TypeError("acceptanceWindow: lower must be strictly below upper");
  return Object.freeze({ kind: "meme-geometry.cutProject.window" as const, lower, upper });
};

/** An accepted site, with its physical and internal projections. */
export interface WindowAcceptanceWitness {
  readonly kind: "meme-geometry.cutProject.acceptance:witness";
  readonly site: LatticeSite;
  readonly physical: QuadraticRational;
  readonly internal: QuadraticRational;
}

/** A rejected site, with the window that excluded it. */
export interface WindowAcceptanceObstruction {
  readonly kind: "meme-geometry.cutProject.acceptance-obstruction";
  readonly site: LatticeSite;
  readonly internal: QuadraticRational;
  readonly window: AcceptanceWindow;
}

/** The result of testing a site against a window. */
export type WindowAcceptanceJudgment = WindowAcceptanceWitness | WindowAcceptanceObstruction;

/** Whether a site is accepted by a window. */
export function windowAcceptance(scheme: CutProjectScheme, site: LatticeSite, window: AcceptanceWindow): WindowAcceptanceJudgment {
  if (!sameRadicand(scheme.slope, window.lower)) throw new TypeError("windowAcceptance: scheme and window fields differ");
  const internal = internalProjection(scheme, site);
  return quadraticLeq(window.lower, internal) && quadraticLess(internal, window.upper)
    ? Object.freeze({ kind: "meme-geometry.cutProject.acceptance:witness" as const, site, physical: physicalProjection(scheme, site), internal })
    : Object.freeze({ kind: "meme-geometry.cutProject.acceptance-obstruction" as const, site, internal, window });
}

/** A model set: scheme, window, and accepted witnesses ordered by physical coordinate. */
export interface ModelSet {
  readonly kind: "meme-geometry.cutProject.modelSet";
  readonly scheme: CutProjectScheme;
  readonly window: AcceptanceWindow;
  readonly accepted: readonly WindowAcceptanceWitness[];
}

/** All sites within |coords| ≤ radius the window admits, ordered by physical coordinate. */
export function modelSet(scheme: CutProjectScheme, window: AcceptanceWindow, radius: number): ModelSet {
  const accepted: WindowAcceptanceWitness[] = [];
  for (let unit = -radius; unit <= radius; unit += 1) {
    for (let slopeCount = -radius; slopeCount <= radius; slopeCount += 1) {
      const judgment = windowAcceptance(scheme, latticeSite(unit, slopeCount), window);
      if (judgment.kind === "meme-geometry.cutProject.acceptance:witness") accepted.push(judgment);
    }
  }
  accepted.sort((left, right) => quadraticCompare(left.physical, right.physical));
  return Object.freeze({ kind: "meme-geometry.cutProject.modelSet" as const, scheme, window, accepted: Object.freeze(accepted) });
}

/** The model set restricted to physical coordinates in [lower, upper]. */
export function restrictModelSet(modelSetValue: ModelSet, lower: QuadraticRational, upper: QuadraticRational): ModelSet {
  return Object.freeze({
    kind: "meme-geometry.cutProject.modelSet" as const,
    scheme: modelSetValue.scheme,
    window: modelSetValue.window,
    accepted: Object.freeze(modelSetValue.accepted.filter((witness) => quadraticLeq(lower, witness.physical) && quadraticLeq(witness.physical, upper))),
  });
}

/** The gap structure of a model set: gaps, distinct lengths, and the gap word. */
export interface GapSpectrum {
  readonly kind: "meme-geometry.cutProject.gapSpectrum";
  readonly gaps: readonly QuadraticRational[];
  readonly distinct: readonly QuadraticRational[];
  readonly word: readonly number[];
}

/** Successive gaps as a word over the distinct (ascending) gap lengths. */
export function gapSpectrum(modelSetValue: ModelSet): GapSpectrum {
  const gaps: QuadraticRational[] = [];
  for (let index = 1; index < modelSetValue.accepted.length; index += 1) {
    gaps.push(quadraticSubtract(modelSetValue.accepted[index]!.physical, modelSetValue.accepted[index - 1]!.physical));
  }
  const distinct: QuadraticRational[] = [];
  for (const gap of gaps) if (!distinct.some((seen) => quadraticEqual(seen, gap))) distinct.push(gap);
  distinct.sort(quadraticCompare);
  const word = gaps.map((gap) => distinct.findIndex((seen) => quadraticEqual(seen, gap)));
  return Object.freeze({ kind: "meme-geometry.cutProject.gapSpectrum" as const, gaps: Object.freeze(gaps), distinct: Object.freeze(distinct), word: Object.freeze(word) });
}

/** The gap word is not periodic with this period (a mismatch was found). */
export const aperiodicityWitnessSchema = {
  $id: "metroplat/calculus/predicating/geometry/spatial/aperiodicity-witness",
  type: "object",
  required: ["kind", "period", "mismatchIndex"],
  properties: {
    kind: { const: "meme-geometry.cutProject.aperiodicity:witness" },
    period: { type: "number" },
    mismatchIndex: { type: "number" },
  },
  additionalProperties: false,
  title: "AperiodicityWitness",
  description: "A period was refuted at a mismatch index over the sampled gap word.",
} as const;

export type AperiodicityWitness = FromJsonSchema<typeof aperiodicityWitnessSchema>;

/** The period was not refuted over the sampled stretch. */
export const aperiodicityObstructionSchema = {
  $id: "metroplat/calculus/predicating/geometry/spatial/aperiodicity-obstruction",
  type: "object",
  required: ["kind", "period"],
  properties: {
    kind: { const: "meme-geometry.cutProject.aperiodicity-obstruction" },
    period: { type: "number" },
  },
  additionalProperties: false,
  title: "AperiodicityObstruction",
  description: "A period was not refuted over the sampled stretch.",
} as const;

export type AperiodicityObstruction = FromJsonSchema<typeof aperiodicityObstructionSchema>;

/** The result of attempting to refute a period. */
export type AperiodicityJudgment = AperiodicityWitness | AperiodicityObstruction;

/** Refute one period over the sampled gap word (finite: refutes one period, not global aperiodicity). */
export function refutePeriod(spectrum: GapSpectrum, period: number): AperiodicityJudgment {
  if (!Number.isSafeInteger(period) || period < 1) throw new TypeError("refutePeriod: period must be a positive integer");
  for (let index = 0; index + period < spectrum.word.length; index += 1) {
    if (spectrum.word[index] !== spectrum.word[index + period]) {
      return Object.freeze({ kind: "meme-geometry.cutProject.aperiodicity:witness" as const, period, mismatchIndex: index });
    }
  }
  return Object.freeze({ kind: "meme-geometry.cutProject.aperiodicity-obstruction" as const, period });
}
