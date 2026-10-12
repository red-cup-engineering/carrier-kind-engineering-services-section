/**
 * breakdown — the work-breakdown hierarchy: portfolio ⊃ project ⊃ milestone /
 * section ⊃ task ⊃ subtask.
 *
 * These are the containers Asana/Odoo call portfolios, projects, milestones, and
 * sections. Each is a thin carrier holding its identity and membership as cells;
 * a project descends to an @red-cup-engineering/agentic-organization-engine `WorkProject` over the work items of
 * its tasks, so the management hierarchy and the work algebra share one cell
 * graph.
 */

import { workProject, type WorkItem, type WorkProject } from "@red-cup-engineering/agentic-organization-engine";
import type { Cell, CellSet, PredicationTerm } from "@lenticule-science/metrologic/articulation/predicating";
import { fact, facts, predicate, term } from "../terms.mjs";
import { asWorkItem, type Task } from "./task.mjs";

/** A grouping of tasks inside a project (Asana "section", a kanban swimlane). */
export interface Section {
  readonly kind: "managing.section";
  readonly id: PredicationTerm;
  readonly key: string;
  readonly title: string;
  readonly project: string;
  /** Manual ordering rank within the project. */
  readonly order: number;
  readonly facts: CellSet;
}

/** Construct a section. */
export function section(input: { readonly id: string; readonly title: string; readonly project: string; readonly order?: number }): Section {
  const id = term("section", input.id);
  const order = input.order ?? 0;
  return Object.freeze({
    kind: "managing.section" as const,
    id,
    key: input.id,
    title: input.title,
    project: input.project,
    order,
    facts: facts([
      fact(id, predicate("section", "title"), term("title", input.title)),
      fact(id, predicate("section", "project"), term("project", input.project)),
      fact(id, predicate("section", "order"), term("order", order)),
    ]),
  });
}

/** A dated objective a set of tasks contributes to. */
export interface Milestone {
  readonly kind: "managing.milestone";
  readonly id: PredicationTerm;
  readonly key: string;
  readonly title: string;
  readonly project?: string;
  /** Target date as an ISO day (see scheduling/). */
  readonly due?: string;
  readonly facts: CellSet;
}

/** Construct a milestone. */
export function milestone(input: { readonly id: string; readonly title: string; readonly project?: string; readonly due?: string }): Milestone {
  const id = term("milestone", input.id);
  const cells: Cell[] = [fact(id, predicate("milestone", "title"), term("title", input.title))];
  if (input.project !== undefined) cells.push(fact(id, predicate("milestone", "project"), term("project", input.project)));
  if (input.due !== undefined) cells.push(fact(id, predicate("milestone", "due"), term("date", input.due)));
  return Object.freeze({
    kind: "managing.milestone" as const,
    id,
    key: input.id,
    title: input.title,
    ...(input.project === undefined ? {} : { project: input.project }),
    ...(input.due === undefined ? {} : { due: input.due }),
    facts: facts(cells),
  });
}

/** A project — the primary container of managed work. */
export interface Project {
  readonly kind: "managing.project";
  readonly id: PredicationTerm;
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  readonly portfolio?: string;
  /** Owning office/team (assignment is to-office). */
  readonly owner?: string;
  readonly facts: CellSet;
}

/** Construct a project. */
export function project(input: {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly portfolio?: string;
  readonly owner?: string;
}): Project {
  const id = term("project", input.id);
  const cells: Cell[] = [fact(id, predicate("project", "title"), term("title", input.title))];
  if (input.portfolio !== undefined) cells.push(fact(id, predicate("project", "portfolio"), term("portfolio", input.portfolio)));
  if (input.owner !== undefined) cells.push(fact(id, predicate("project", "owner"), term("office", input.owner)));
  return Object.freeze({
    kind: "managing.project" as const,
    id,
    key: input.id,
    title: input.title,
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.portfolio === undefined ? {} : { portfolio: input.portfolio }),
    ...(input.owner === undefined ? {} : { owner: input.owner }),
    facts: facts(cells),
  });
}

/** A portfolio — a collection of projects tracked together. */
export interface Portfolio {
  readonly kind: "managing.portfolio";
  readonly id: PredicationTerm;
  readonly key: string;
  readonly title: string;
  readonly projects: readonly string[];
  readonly facts: CellSet;
}

/** Construct a portfolio. */
export function portfolio(input: { readonly id: string; readonly title: string; readonly projects?: readonly string[] }): Portfolio {
  const id = term("portfolio", input.id);
  const projects = Object.freeze([...(input.projects ?? [])]);
  return Object.freeze({
    kind: "managing.portfolio" as const,
    id,
    key: input.id,
    title: input.title,
    projects,
    facts: facts([
      fact(id, predicate("portfolio", "title"), term("title", input.title)),
      ...projects.map((p) => fact(id, predicate("portfolio", "project"), term("project", p))),
    ]),
  });
}

/** The capability-preserving descent of a project and its tasks to an organizing
 *  `WorkProject` — the work items being exactly the descents of the project's
 *  tasks. */
export function asWorkProject(value: Project, tasks: readonly Task[]): WorkProject {
  const items: readonly WorkItem[] = tasks
    .filter((t) => t.project === value.key)
    .map((t) => asWorkItem(t));
  return workProject({ term: value.id, work: items });
}
