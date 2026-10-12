/**
 * @red-cup-engineering/agent-operations-management-engine/automating — rules and recurrence.
 *
 * When/if/then automation over operation events (pure, side-effect-free
 * action emission) and the spawning of recurring task instances.
 */

export {
  conditionHolds,
  conditionsHold,
  fireRule,
  fireRules,
} from "./rule.mjs";
export type {
  TriggerType,
  AutomationEvent,
  TaskSnapshot,
  Condition,
  Action,
  ActionTemplate,
  Rule,
} from "./rule.mjs";

export {
  spawnNext,
  firstInstance,
} from "./recurring.mjs";
export type { RecurringTask, SpawnedInstance } from "./recurring.mjs";
