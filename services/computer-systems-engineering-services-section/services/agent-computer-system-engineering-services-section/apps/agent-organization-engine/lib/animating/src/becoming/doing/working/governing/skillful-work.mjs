import {
  classifyWork,
  DETERMINATION_OF_WORK_KIND,
  settleInputsAndPath,
  settleOperation,

} from "./work-classification.mjs";

export const SKILLFUL_WORK_KINDS = Object.freeze([
  "inquiry", "derivation", "procedure", "process",
]);

export const CLOSURE_OF_KIND = DETERMINATION_OF_WORK_KIND;

/** Project the agent-local reading through the science-owned work algebra. */
export function classifySkillfulWork(determination) {
  return { kind: "animating.agent.work", ...determination, closureKind: classifyWork(determination) };
}

export function jointProjection(work) {
  return classifySkillfulWork(settleInputsAndPath(settleOperation(work)));
}

export function advanceMeaning(work) {
  return classifySkillfulWork(settleOperation(work));
}

export function advanceExecution(work) {
  return classifySkillfulWork(settleInputsAndPath(work));
}
