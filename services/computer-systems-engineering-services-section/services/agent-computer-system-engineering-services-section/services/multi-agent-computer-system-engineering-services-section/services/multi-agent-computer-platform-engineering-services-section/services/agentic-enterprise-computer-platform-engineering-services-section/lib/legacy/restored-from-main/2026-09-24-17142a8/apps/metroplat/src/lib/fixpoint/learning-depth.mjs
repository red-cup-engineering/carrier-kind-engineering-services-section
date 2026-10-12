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
 * transports that filtration into learning-depth vocabulary.
 *
 * the finite `ClosureOrdinalRegime` owns the four-regime classifier and the
 * strict finite spine. This module is the Node vocabulary transport from that
 * regime filtration to the current learning-depth names.
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

import { classifyRegime } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/value-category";
import { learningDepthOfRegime } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/learning-depth";

/** The public names of the four learning-depth reads. */

/** A learning-depth read transported from a closure regime. */

/** All learning-depth names in regime order. */
export const learningDepthNames = Object.freeze([
  "rote",
  "automatization",
  "conceptual-change",
  "adaptive-expertise",
]);

/** Classify admitted closure-regime data and read it as a learning depth. */
export const learningDepthOfRegimeData = (data) =>
  learningDepthOfRegime(classifyRegime(data));
