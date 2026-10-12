// The public surface of editing: lint rules that judge prose with FOUR evidence.
// Primary entry point: lint(text) → Verdict.

export { allRules } from "./rules/index.mjs";
export { weaselRules } from "./rules/index.mjs";
export { wordyRules } from "./rules/index.mjs";
export { jargonRules } from "./rules/index.mjs";
export { passiveRule } from "./rules/index.mjs";
export { clicheRules } from "./rules/index.mjs";
export { doubletRules } from "./rules/index.mjs";
export { spellingRules } from "./rules/index.mjs";
export { nominalizationRules } from "./rules/index.mjs";
export { oneIdeaPerSentenceRule, expletiveOpeningRule, structureRules } from "./rules/index.mjs";
export { acronymRule, acronymRules } from "./rules/index.mjs";
export { preferContractionsRule, avoidContractionsRule, contractionRules } from "./rules/index.mjs";
export { abstractRules, ruleImplications } from "./rules/index.mjs";

export { detect, stripMarkdown } from "./detect.mjs";
export { report, verdict } from "./report.mjs";

import { detect } from "./detect.mjs";
import { verdict as computeVerdict } from "./report.mjs";

/** Lint text and return a verdict. The primary entry point. */
export function lint(text, opts) {
  const result = detect(text, opts);
  return computeVerdict(result);
}
