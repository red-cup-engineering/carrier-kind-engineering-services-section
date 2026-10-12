/**
 * @red-cup-engineering/agent-operations-management-engine/reporting — operational analytics.
 *
 * Burndown, burnup, throughput, velocity, and cycle/lead time over task timing —
 * pure functions with an explicit day axis and no hidden clock.
 */

export {
  burndown,
  burnup,
  throughput,
  velocity,
  durations,
  averageDurations,
  meanOf,
} from "./metrics.mjs";
export type { TaskTiming, BurnPoint, DurationMetric } from "./metrics.mjs";
