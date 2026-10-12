/**
 * geometry/spatial/cut-and-project — 1-D cut-and-project schemes over ℤ².
 *
 * A scheme is an irrational quadratic slope α. A site (m,n) projects physically
 * to m + nα (the cut) and internally to its Galois conjugate m + nᾱ; an internal
 * window decides which sites are realized — acceptance is a judgment, not a hidden
 * filter. The accepted physical coordinates form a model set whose gap spectrum
 * is the aperiodic order the scheme produces.
 */
import { type Integer } from "../../positing/settling/analysis/exact-number.mjs";
import { type QuadraticRational } from "./quadratic.mjs";
/** A 1-D cut-and-project scheme: an irrational quadratic slope. */
export interface CutProjectScheme {
    readonly kind: "meme-geometry.cutProject.scheme";
    readonly slope: QuadraticRational;
}
/** Construct a scheme; throws if the slope is rational (a rational cut is periodic). */
export declare const cutProjectScheme: (slope: QuadraticRational) => CutProjectScheme;
/** A site of ℤ²: integer coordinates (unit, slopeCount) for m + nα. */
export interface LatticeSite {
    readonly kind: "meme-geometry.cutProject.latticeSite";
    readonly unit: Integer;
    readonly slopeCount: Integer;
}
/** Construct a lattice site from integer coordinates. */
export declare const latticeSite: (unit: number, slopeCount: number) => LatticeSite;
/** Translate a site by integer offsets. */
export declare const translateSite: (site: LatticeSite, unit: number, slopeCount: number) => LatticeSite;
/** The cut: (m, n) ↦ m + nα. */
export declare const physicalProjection: (scheme: CutProjectScheme, site: LatticeSite) => QuadraticRational;
/** Internal space: (m, n) ↦ m + nᾱ (the conjugate of the cut). */
export declare const internalProjection: (scheme: CutProjectScheme, site: LatticeSite) => QuadraticRational;
/** Half-open interval [lower, upper) in internal space. */
export interface AcceptanceWindow {
    readonly kind: "meme-geometry.cutProject.window";
    readonly lower: QuadraticRational;
    readonly upper: QuadraticRational;
}
/** Construct a half-open window; throws if bounds differ in field or are not ordered. */
export declare const acceptanceWindow: (lower: QuadraticRational, upper: QuadraticRational) => AcceptanceWindow;
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
export declare function windowAcceptance(scheme: CutProjectScheme, site: LatticeSite, window: AcceptanceWindow): WindowAcceptanceJudgment;
/** A model set: scheme, window, and accepted witnesses ordered by physical coordinate. */
export interface ModelSetCarrier {
    readonly kind: "meme-geometry.cutProject.modelSet";
    readonly scheme: CutProjectScheme;
    readonly window: AcceptanceWindow;
    readonly accepted: readonly WindowAcceptanceWitness[];
}
/** All sites within |coords| ≤ radius the window admits, ordered by physical coordinate. */
export declare function modelSet(scheme: CutProjectScheme, window: AcceptanceWindow, radius: number): ModelSetCarrier;
/** The model set restricted to physical coordinates in [lower, upper]. */
export declare function restrictModelSet(carrier: ModelSetCarrier, lower: QuadraticRational, upper: QuadraticRational): ModelSetCarrier;
/** The gap structure of a model set: gaps, distinct lengths, and the gap word. */
export interface GapSpectrumCarrier {
    readonly kind: "meme-geometry.cutProject.gapSpectrum";
    readonly gaps: readonly QuadraticRational[];
    readonly distinct: readonly QuadraticRational[];
    readonly word: readonly number[];
}
/** Successive gaps as a word over the distinct (ascending) gap lengths. */
export declare function gapSpectrum(carrier: ModelSetCarrier): GapSpectrumCarrier;
/** The gap word is not periodic with this period (a mismatch was found). */
export interface AperiodicityWitness {
    readonly kind: "meme-geometry.cutProject.aperiodicity:witness";
    readonly period: number;
    readonly mismatchIndex: number;
}
/** The period was not refuted over the sampled stretch. */
export interface AperiodicityObstruction {
    readonly kind: "meme-geometry.cutProject.aperiodicity-obstruction";
    readonly period: number;
}
/** The result of attempting to refute a period. */
export type AperiodicityJudgment = AperiodicityWitness | AperiodicityObstruction;
/** Refute one period over the sampled gap word (finite: refutes one period, not global aperiodicity). */
export declare function refutePeriod(spectrum: GapSpectrumCarrier, period: number): AperiodicityJudgment;
