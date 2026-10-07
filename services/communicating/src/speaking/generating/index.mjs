// The public surface of generating: planning and realizing text from frames.
// Primary entry points: realizeClause(), plan() + planToText().

export { realizeClause, frameToClause } from "./realize.mjs";
export { plan, planToText } from "./plan.mjs";
export { realizeSection, default as realize } from "./section.mjs";
export { sectionFromText } from "./section-from-text.mjs";
export {
  model, emptyCorpus, ingest, recall, predict, settleNext,
  PRECEDES, DENIES,
} from "./model.mjs";

import { realizeClause } from "./realize.mjs";
import { plan, planToText } from "./plan.mjs";

/** Generate prose from a sequence of role frames. The primary high-level entry point.
 * @example
 *   generate([{verb: "chase", agent: "the dog", patient: "the cat"}])
 *   // → "The dog chases the cat."
 */
export function generate(
  frames,
  opts,
) {
  const textPlan = plan(frames, opts);
  return planToText(textPlan, (spec) => realizeClause(spec).text);
}
