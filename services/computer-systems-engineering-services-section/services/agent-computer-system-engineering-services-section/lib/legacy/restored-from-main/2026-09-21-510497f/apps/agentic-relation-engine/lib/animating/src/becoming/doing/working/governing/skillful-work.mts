import {
  classifyWork,
  DETERMINATION_OF_WORK_KIND,
  settleInputsAndPath,
  settleOperation,
  type WorkDetermination,
  type WorkKind,
} from "@lenticule-science/work-science-services-section";

export type SkillfulWorkKind = WorkKind;
export type WorkClosure = WorkDetermination;

export interface SkillfulWork extends WorkDetermination {
  readonly kind: "animating.agent.work";
  readonly closureKind: SkillfulWorkKind;
}

export const SKILLFUL_WORK_KINDS: readonly SkillfulWorkKind[] = Object.freeze([
  "inquiry", "derivation", "procedure", "process",
]);

export const CLOSURE_OF_KIND: Readonly<Record<SkillfulWorkKind, WorkClosure>> = DETERMINATION_OF_WORK_KIND;

/** Project the agent-local reading through the science-owned work algebra. */
export function classifySkillfulWork(determination: WorkClosure): SkillfulWork {
  return { kind: "animating.agent.work", ...determination, closureKind: classifyWork(determination) };
}

export function jointProjection(work: WorkClosure): SkillfulWork {
  return classifySkillfulWork(settleInputsAndPath(settleOperation(work)));
}

export function advanceMeaning(work: WorkClosure): SkillfulWork {
  return classifySkillfulWork(settleOperation(work));
}

export function advanceExecution(work: WorkClosure): SkillfulWork {
  return classifySkillfulWork(settleInputsAndPath(work));
}
