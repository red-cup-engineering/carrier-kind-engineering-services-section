/**
 * settling/learning-depth — learning depth as a read of closure regimes.
 *
 * This is the package-side executable slice of the learning-cycle frontier. It
 * does not model learners, lessons, educational measurement, or a learning
 * cycle. It reads already-admitted closure-regime data as the four learning
 * depths named by the content notes:
 *
 * - finite regime -> rote
 * - Scott regime -> automatization
 * - transfinite regime -> conceptual-change
 * - aperiodic regime -> adaptive-expertise
 *
 * The classifier is the existing closure-regime classifier. This module only
 * transports that carrier into learning-depth vocabulary.
 *
 * RelMath's `ClosureOrdinalRegime` owns the four-regime classifier and the
 * strict finite spine. This module is the Node vocabulary transport from that
 * regime carrier to the current learning-depth names.
 *
 * @example
 * ```ts
 * const admitted = closureRegimeData(true, false, true);
 * if (admitted.kind === "settling.closureRegimeData:witness") {
 *   learningDepthOfRegimeData(admitted.data).name;
 *   // "automatization"
 * }
 * ```
 *
 * @packageDocumentation
 */
import type { ClosureRegime } from "./closure.mjs";
import { type ClosureRegimeData } from "./value-category.mjs";
/** The public names of the four learning-depth reads. */
export type LearningDepthName = "rote" | "automatization" | "conceptual-change" | "adaptive-expertise";
/** A learning-depth read transported from a closure regime. */
export interface LearningDepth {
    readonly kind: "learning.depth";
    readonly name: LearningDepthName;
    readonly regime: ClosureRegime;
    readonly closureOrdinalRegime: "finite" | "scott" | "transfinite" | "aperiodic";
    readonly learningReading: "finite-practice" | "limit-practice" | "post-limit-restructuring" | "open-ended-adaptation";
}
/** All learning-depth names in regime order. */
export declare const learningDepthNames: readonly LearningDepthName[];
/** Read a closure regime as its learning-depth carrier. */
export declare function learningDepthOfRegime(regime: ClosureRegime): LearningDepth;
/** Classify admitted closure-regime data and read it as a learning depth. */
export declare const learningDepthOfRegimeData: (data: ClosureRegimeData) => LearningDepth;
