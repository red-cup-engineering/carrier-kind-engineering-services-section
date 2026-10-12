/**
 * @red-cup-engineering/agent-operations-management-engine/assigning — placing work with offices and
 * balancing load.
 *
 * Assignment to-office and δ-dispatch ranking on the organizing eligibility
 * carrier, plus pure workload aggregation.
 */

export {
  capabilityFiber,
  defineOffice,
  assignToOffice,
  rankOfficeWork,
} from "./assignment.mjs";

export {
  workloadByAssignee,
  leastLoaded,
} from "./workload.mjs";
export type { AssigneeLoad, Estimates, Capacities } from "./workload.mjs";
