/**
 * assignment - placing work with an office and reading dispatch readiness.
 *
 * Assignment is to-office, never to a session or person directly: the office
 * owns the work, and whoever currently holds the office picks it up by the
 * residual eligibility gap. This is the management binding over organizing's
 * office/authority carrier, not a dependency on the old experimental
 * dispatch algebra.
 */

import { officeEligibility, type OfficeEligibilityDecision } from "@red-cup-engineering/agentic-organization-engine";
import type { PredicationTerm } from "@lenticule-science/metrologic/articulation/predicating";
import { term } from "../terms.mjs";

export interface Fiber {
  readonly kind: "managing.capability-fiber";
  readonly axis: "capability" | "authority";
  readonly names: readonly string[];
  readonly terms: readonly PredicationTerm[];
}

export interface Office {
  readonly kind: "managing.office";
  readonly term: PredicationTerm;
  readonly name: string;
  readonly authorities: readonly string[];
  readonly capabilities: readonly string[];
}

export interface Assignment {
  readonly kind: "managing.assignment";
  readonly term: PredicationTerm;
  readonly task: string;
  readonly toOffice: PredicationTerm;
  readonly office: string;
  readonly requiredCapabilities: readonly string[];
  readonly requiredAuthorities: readonly string[];
}

export interface RankedAssignment {
  readonly kind: "managing.assignment.rank";
  readonly assignment: Assignment;
  readonly decision: OfficeEligibilityDecision;
  readonly ready: boolean;
  readonly rank: number;
}

/** Build a capability/authority fiber from coordinate names. */
export function capabilityFiber(names: readonly string[], axis: "capability" | "authority" = "capability"): Fiber {
  return Object.freeze({
    kind: "managing.capability-fiber" as const,
    axis,
    names: Object.freeze([...names]),
    terms: Object.freeze(names.map((name) => term(axis, name))),
  });
}

/** Define an office: its conferred authorities and structural capability section. */
export function defineOffice(name: string, options: { readonly authorities?: readonly string[]; readonly capabilities?: readonly string[] } = {}): Office {
  return Object.freeze({
    kind: "managing.office" as const,
    term: term("office", name),
    name,
    authorities: Object.freeze([...(options.authorities ?? [])]),
    capabilities: Object.freeze([...(options.capabilities ?? [])]),
  });
}

/** Assign a task to an office, declaring the capabilities and authorities the work requires. */
export function assignToOffice(input: {
  readonly task: string;
  readonly office: string;
  readonly requiredCapabilities?: readonly string[];
  readonly requiredAuthorities?: readonly string[];
}): Assignment {
  return Object.freeze({
    kind: "managing.assignment" as const,
    term: term("assignment", input.task, input.office),
    task: input.task,
    toOffice: term("office", input.office),
    office: input.office,
    requiredCapabilities: Object.freeze([...(input.requiredCapabilities ?? [])]),
    requiredAuthorities: Object.freeze([...(input.requiredAuthorities ?? [])]),
  });
}

/** Rank the open work an office holds for its current incumbent, ready-first. */
export function rankOfficeWork(
  assignments: readonly Assignment[],
  office: Office,
  agentCapabilities: readonly string[],
): readonly RankedAssignment[] {
  return Object.freeze(assignments
    .filter((assignment) => assignment.office === office.name)
    .map((assignment) => {
      const decision = officeEligibility({
        kind: "organizing.office-eligibility-request" as const,
        capabilities: Object.freeze([...agentCapabilities, ...office.capabilities]),
        officeAuthorities: office.authorities,
        requiresCapabilities: assignment.requiredCapabilities,
        requiresAuthorities: assignment.requiredAuthorities,
      });
      const missing = decision.missingCapabilities.length + decision.missingAuthorities.length;
      return Object.freeze({
        kind: "managing.assignment.rank" as const,
        assignment,
        decision,
        ready: decision.eligible,
        rank: decision.eligible ? 0 : missing,
      });
    })
    .sort((left, right) => Number(right.ready) - Number(left.ready) || left.rank - right.rank));
}
