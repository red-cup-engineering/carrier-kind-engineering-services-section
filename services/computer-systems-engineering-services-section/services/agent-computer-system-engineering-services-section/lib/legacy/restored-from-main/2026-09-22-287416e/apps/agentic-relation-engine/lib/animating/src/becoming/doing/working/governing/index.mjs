/**
 * governing — stage 4 of the descent and the interior agent it settles to.
 *
 * `individuate` reads the finite/individual carrier (the glued sheaf, H¹=0); the
 * agent module builds the interior agent that IS that sheaf, read as a
 * perceive→act loop, with the spiral re-entry (`reseed`) it re-poses itself by.
 */
export { individuate } from "./individuate.mjs";

export {
  WORK_KINDS,
  DETERMINATION_OF_WORK_KIND,
  classifyWork,
  settleOperation,
  settleInputsAndPath,
} from "./work-classification.mjs";
export {
  classifySkillfulWork,
  jointProjection,
  advanceMeaning,
  advanceExecution,
  CLOSURE_OF_KIND,
  SKILLFUL_WORK_KINDS,

} from "./skillful-work.mjs";
export {
  skill,
  invokeSkill,
  skillSuccess,
  skillError,

} from "./skill.mjs";
export {
  skillPlayWitness,
  witnessSkillPlay,
  readSkillPlayWitnesses,
  candidateSkillsFromWitnessLog,
  skillEcologyTraceFromWitnessLog,
  skillPracticeFromWitnessLog,
  skillObstructionsFromWitnessLog,
  induceSkillsFromWitnessLog,
  publishSkillEcology,
  closeWitnessedSkillLoop,

} from "./skill-induction.mjs";
export { agentCarrier, skillCarrier } from "./carriers.mjs";

export {
  buildAgent,
  agent,
  perceive,
  act,
  reseed,

} from "./agent.mjs";
