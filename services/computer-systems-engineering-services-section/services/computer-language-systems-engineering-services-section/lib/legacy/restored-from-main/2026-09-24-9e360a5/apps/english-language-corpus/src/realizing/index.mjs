

export { frameToClause } from "@red-cup-engineering/communicating/speaking/generating/realize";
export { realizeClause } from "@red-cup-engineering/communicating/speaking/generating/realize";
export { planToText } from "@red-cup-engineering/communicating/speaking/generating/plan";
export { plan } from "@red-cup-engineering/communicating/speaking/generating/plan";
export { default as realize } from "./section.mjs";
export { realizeSection } from "@red-cup-engineering/communicating/speaking/generating/section";
export { sectionFromText } from "@red-cup-engineering/communicating/speaking/generating/section-from-text";
export { model, emptyCorpus, predict, settleNext, PRECEDES, DENIES } from "./model.mjs";
export { recall } from "@red-cup-engineering/communicating/speaking/generating/model";
export { ingest } from "@red-cup-engineering/communicating/speaking/generating/model";

import { realizeClause } from "@red-cup-engineering/communicating/speaking/generating/realize";
import { planToText } from "@red-cup-engineering/communicating/speaking/generating/plan";
import { plan } from "@red-cup-engineering/communicating/speaking/generating/plan";

/** Generate prose from a sequence of role frames. The primary high-level entry point.
 * @example
 *   generate([{verb: "chase", agent: "the dog", patient: "the cat"}])
 */
export function generate(
  frames,
  opts,
) {
  const textPlan = plan(frames, opts);
  return planToText(textPlan, (spec) => realizeClause(spec).text);
}
