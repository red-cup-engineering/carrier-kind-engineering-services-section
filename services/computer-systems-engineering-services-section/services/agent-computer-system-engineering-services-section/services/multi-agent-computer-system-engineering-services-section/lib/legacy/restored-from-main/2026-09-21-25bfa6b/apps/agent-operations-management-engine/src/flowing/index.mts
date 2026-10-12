/**
 * @red-cup-engineering/agent-operations-management-engine/flowing — workflow lifecycle and kanban flow.
 *
 * Statuses as an explicit state machine with charge-valued completion, and the
 * board projection with WIP limits and cumulative-flow snapshots.
 */

export {
  workflow,
  STANDARD_WORKFLOW,
  categoryOf,
  canTransition,
  applyTransition,
  isDone,
  completionCharge,
} from "./status.mjs";
export type { Status, StatusCategory, Workflow } from "./status.mjs";

export {
  board,
  wipBreaches,
  flowSnapshot,
} from "./board.mjs";
export type { Board, BoardColumn, WipLimits, FlowSnapshot } from "./board.mjs";
