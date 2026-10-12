/**
 * task — the unit of managed work.
 *
 * A task is the management-level carrier that descends to an @red-cup-engineering/agentic-organization-engine
 * `WorkItem`: it names a goal, may sit under a parent task (a subtask), belongs
 * to a project and section, carries tags and an assignee office, and reads its
 * work-type off its closure structure (the inquiry/derivation/procedure/process
 * quartet). The carrier holds its own relational `facts` (cells over minted
 * terms) so a managed plan is a cell graph, and exposes `asWorkItem` for the
 * capability-preserving descent to the organizing work record.
 */

import { classifyWork, type WorkClosure as TaskClosure, type WorkType } from "@red-cup-engineering/agentic-computation-engine";
import {
  workItem,
  workTask,
  type WorkItem,
} from "@red-cup-engineering/agentic-organization-engine";
import type { Cell, CellSet, PredicationTerm } from "@lenticule-science/metrologic/articulation/predicating";
import { fact, facts, predicate, term } from "../terms.mjs";

/** A managed task identifier. */
export type TaskId = PredicationTerm;

/** The lifecycle phase of a task as a workflow status label (see flowing/). */
export type TaskStatusLabel = string;

/** Inputs admitted at the task boundary. */
export interface TaskInput {
  /** Stable identifier within the operation. */
  readonly id: string;
  /** Human title — the goal the task settles. */
  readonly title: string;
  readonly description?: string;
  /** Project this task belongs to. */
  readonly project?: string;
  /** Section within the project. */
  readonly section?: string;
  /** Parent task id when this is a subtask. */
  readonly parent?: string;
  /** Milestone this task contributes to. */
  readonly milestone?: string;
  /** Labels/tags. */
  readonly tags?: readonly string[];
  /** Office or agent the task is assigned to (assignment is to-office; see assigning/). */
  readonly assignee?: string;
  /** Status label (see flowing/). Defaults to `todo`. */
  readonly status?: TaskStatusLabel;
  /** Priority label (see prioritizing/). */
  readonly priority?: string;
  /** Closure structure from which the work-type is derived. When absent the task
   *  is treated as a fully-settled `process`. */
  readonly closure?: TaskClosure;
}

/** A managed task carrier. */
export interface Task {
  readonly kind: "managing.task";
  readonly id: TaskId;
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly project?: string;
  readonly section?: string;
  readonly parent?: string;
  readonly milestone?: string;
  readonly tags: readonly string[];
  readonly assignee?: string;
  readonly status: TaskStatusLabel;
  readonly priority?: string;
  readonly workType: WorkType;
  readonly facts: CellSet;
}

const EMPTY_CLOSURE: TaskClosure = Object.freeze({
  kind: "computing.work-closure" as const,
  goalCells: Object.freeze([]),
  rules: Object.freeze([]),
});

/** Construct a managed task. */
export function task(input: TaskInput): Task {
  const id = term("task", input.id);
  const workType = classifyWork(input.closure ?? EMPTY_CLOSURE).value;
  const tags = Object.freeze([...(input.tags ?? [])]);
  const status = input.status ?? "todo";
  const cells: Cell[] = [
    fact(id, predicate("task", "title"), term("title", input.title)),
    fact(id, predicate("task", "status"), term("status", status)),
    fact(id, predicate("task", "work-type"), term("work-type", workType)),
  ];
  if (input.project !== undefined) cells.push(fact(id, predicate("task", "project"), term("project", input.project)));
  if (input.section !== undefined) cells.push(fact(id, predicate("task", "section"), term("section", input.section)));
  if (input.parent !== undefined) cells.push(fact(id, predicate("task", "parent"), term("task", input.parent)));
  if (input.milestone !== undefined) cells.push(fact(id, predicate("task", "milestone"), term("milestone", input.milestone)));
  if (input.assignee !== undefined) cells.push(fact(id, predicate("task", "assignee"), term("office", input.assignee)));
  if (input.priority !== undefined) cells.push(fact(id, predicate("task", "priority"), term("priority", input.priority)));
  for (const tag of tags) cells.push(fact(id, predicate("task", "tag"), term("tag", tag)));

  return Object.freeze({
    kind: "managing.task" as const,
    id,
    key: input.id,
    title: input.title,
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.project === undefined ? {} : { project: input.project }),
    ...(input.section === undefined ? {} : { section: input.section }),
    ...(input.parent === undefined ? {} : { parent: input.parent }),
    ...(input.milestone === undefined ? {} : { milestone: input.milestone }),
    tags,
    ...(input.assignee === undefined ? {} : { assignee: input.assignee }),
    status,
    ...(input.priority === undefined ? {} : { priority: input.priority }),
    workType,
    facts: facts(cells),
  });
}

/** Whether a task is a subtask of another. */
export function isSubtask(value: Task): boolean {
  return value.parent !== undefined;
}

/** The capability-preserving descent to an organizing `WorkItem`. The task's title
 *  becomes the single goal cell of the underlying work task; the assignee office,
 *  when present, becomes the work item's office. */
export function asWorkItem(value: Task): WorkItem {
  const goal = fact(value.id, predicate("task", "goal"), term("title", value.title));
  const underlying = workTask({ term: value.id, goals: [goal] });
  return workItem({
    term: value.id,
    task: underlying,
    ...(value.assignee === undefined ? {} : { office: term("office", value.assignee) }),
  });
}
