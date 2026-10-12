/**
 * @red-cup-engineering/agent-operations-management-engine/structuring — the work-breakdown structure.
 *
 * The containers (portfolio, project, milestone, section), the unit of work
 * (task, with subtasks), and the precedence relation (dependency) between tasks,
 * each a carrier holding its facts as cells and descending to the organizing work
 * algebra.
 */

export { task, isSubtask, asWorkItem } from "./task.mjs";
export type { Task, TaskId, TaskInput, TaskStatusLabel } from "./task.mjs";

export {
  workConcept,
  workVocabularyBasis,
  conceptsForTerms,
} from "./work-vocabulary.mjs";
export type {
  WorkConcept,
  WorkConceptInput,
  WorkConceptKind,
  WorkTheoryReference,
  WorkVocabularyBasis,
} from "./work-vocabulary.mjs";

export { section, milestone, project, portfolio, asWorkProject } from "./breakdown.mjs";
export type { Section, Milestone, Project, Portfolio } from "./breakdown.mjs";

export {
  dependency,
  adjacency,
  nodesOf,
  findCycle,
  topologicalOrder,
} from "./dependency.mjs";
export type { Dependency, PrecedenceType } from "./dependency.mjs";
