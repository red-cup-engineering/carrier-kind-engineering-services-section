/**
 * projecting — wire-safe projections of knowing's real carriers (counts + bounded
 * samples), the boundary codec separating composable carriers from serialization.
 */
export {
  projectOrdinal,
  projectIncrement,
  projectCell,
  projectSite,
  projectLesson,
  projectLearning,
  projectExplanation,
  projectCurriculum,
  projectNextStep,
  projectKnowledge,
  projectResearch,

} from "./projecting.mjs";

export * from "./schemas.mjs";
