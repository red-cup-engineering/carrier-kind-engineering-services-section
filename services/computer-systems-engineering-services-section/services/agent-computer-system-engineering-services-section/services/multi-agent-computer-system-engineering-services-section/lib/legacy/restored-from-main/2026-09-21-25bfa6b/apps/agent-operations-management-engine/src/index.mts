/**
 * @red-cup-engineering/agent-operations-management-engine — the practice of managing an organization's work,
 * as one category package downstream of @red-cup-engineering/agentic-organization-engine and @red-cup-engineering/relating.
 *
 * The package realizes the work-management capabilities that were scattered
 * across the ecosystem — the operations manifold's planning surface, the
 * organizing work/governance record, the ledger accounting — into one coherent
 * practice whose capability set meets or beats Asana, Todoist, and Odoo:
 *
 * - structuring  — portfolios, projects, milestones, sections, tasks, subtasks,
 *                  dependencies, tags (the work-breakdown structure).
 * - scheduling   — working calendars, recurrence, critical-path timelines.
 * - prioritizing — priority bands, manual ranking, weighted/WSJF scoring,
 *                  capacity-bounded sprint selection.
 * - flowing      — workflow statuses as a state machine, kanban boards, WIP.
 * - assigning    — assignment to-office, δ-dispatch ranking, workload balancing.
 * - governing    — fleet/swarm approval gates on the bilattice network-sheaf.
 * - automating   — when/if/then rules, recurring-task spawning.
 * - accounting   — time tracking, estimate-vs-actual, double-entry budgets.
 * - reporting    — burndown, burnup, throughput, velocity, cycle/lead time.
 * - viewing      — list, calendar, timeline/Gantt, table view models.
 *
 * Each carrier holds its facts as cells over minted relating terms and descends
 * to the organizing work record, so a managed plan is one cell graph, never a
 * private data model. The root morphism `operate` reads an operation plan into
 * its derived operational state.
 */

export * as structuring from "./structuring/index.mjs";
export * as scheduling from "./scheduling/index.mjs";
export * as prioritizing from "./prioritizing/index.mjs";
export * as flowing from "./flowing/index.mjs";
export * as assigning from "./assigning/index.mjs";
export * as governing from "./governing/index.mjs";
export * as automating from "./automating/index.mjs";
export * as accounting from "./accounting/index.mjs";
export * as reporting from "./reporting/index.mjs";
export * as viewing from "./viewing/index.mjs";

export {
  NAMESPACE,
  term,
  predicate,
  fact,
  facts,
  affirmed,
  denied,
  valued,
  settle,
  statusName,
} from "./terms.mjs";
export type { PathPart } from "./terms.mjs";

export { actions } from "./actions.mjs";
export {
  planAction,
  operateAction,
  scheduleAction,
  flowAction,
  prioritizeAction,
  assignAction,
  reportAction,
  viewAction,
  recurAction,
  governAction,
  accountAction,
  automateAction,
} from "./actions.mjs";

export {
  evalManaging,
  scriptActions,
  scriptMorphisms,
} from "./package-bin.mjs";
export type {
  ScriptAction,
  BoundaryDocument,
  ScriptMorphism,
  ScriptMorphismRegistry,
} from "./package-bin.mjs";

import { findCycle, topologicalOrder, type Dependency } from "./structuring/dependency.mjs";
import type { Task } from "./structuring/task.mjs";
import { flowSnapshot, STANDARD_WORKFLOW, type FlowSnapshot, type Workflow } from "./flowing/index.mjs";

/** An operation plan: the managed work and its precedence, read under a
 *  workflow. */
export interface OperationPlan {
  readonly tasks: readonly Task[];
  readonly dependencies?: readonly Dependency[];
  readonly workflow?: Workflow;
}

/** The derived operational state of a plan. */
export interface OperationReading {
  readonly kind: "managing.operation.reading";
  readonly taskCount: number;
  /** A dependency cycle, when one exists — the plan is invalid while it does. */
  readonly cycle: readonly string[] | null;
  /** A topological execution order, when the plan is acyclic. */
  readonly order: readonly string[] | null;
  /** Flow snapshot across status categories. */
  readonly flow: FlowSnapshot;
  /** Whether the plan is well-formed (acyclic). */
  readonly valid: boolean;
}

/**
 * Read an operation plan into its derived operational state: the dependency
 * validity (acyclicity), an execution order, and the flow snapshot.
 *
 * Domain: `OperationPlan`. Codomain: `OperationReading`. Law: `valid` iff the
 * dependency graph is acyclic; `order` is defined exactly when valid.
 */
export function operate(plan: OperationPlan): OperationReading {
  const workflow = plan.workflow ?? STANDARD_WORKFLOW;
  const deps = plan.dependencies ?? [];
  const cycle = findCycle(deps);
  const valid = cycle === null;
  const keys = plan.tasks.map((t) => t.key);
  const order = valid ? topologicalOrder(keys, deps) : null;
  return Object.freeze({
    kind: "managing.operation.reading" as const,
    taskCount: plan.tasks.length,
    cycle,
    order,
    flow: flowSnapshot(workflow, plan.tasks),
    valid,
  });
}
