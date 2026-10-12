/**
 * @red-cup-engineering/agent-operations-management-engine/accounting — time and cost for managed work.
 *
 * Timesheets and estimate-versus-actual (in exact minutes), and project cost
 * budgeting on the animating double-entry accounting substrate.
 */

export {
  timeEntry,
  minutesByTask,
  minutesByAssignee,
  billableMinutes,
  estimateVariance,
} from "./time-tracking.mjs";
export type { TimeEntry, EstimateVariance } from "./time-tracking.mjs";

export {
  money,
  costEntry,
  actualCost,
  budgetStatus,
} from "./budget.mjs";
export type { Amount, Transaction, BudgetStatus } from "./budget.mjs";

export {
  DEFAULT_CONTEXT_BUDGET_TOKENS,
  contextBudgetMetrics,
  hookBudgetMetrics,
  estimateTokensFromBytes,
  budgetBandFor,
  contextBudgetBand,
  budgetedJson,
  budgetedString,
  byteLengthOfJson,
  byteLength,
  nonNegativeNumber,
  optionalNonNegativeNumber,
} from "./context-budget.mjs";
export type { ContextBudgetBand, ContextBudgetMetrics } from "./context-budget.mjs";
