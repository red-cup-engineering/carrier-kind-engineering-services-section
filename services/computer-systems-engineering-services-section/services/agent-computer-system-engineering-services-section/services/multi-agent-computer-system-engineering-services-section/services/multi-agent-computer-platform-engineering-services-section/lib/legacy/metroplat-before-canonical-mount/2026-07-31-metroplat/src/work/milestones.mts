/**
 * Derived milestone states for the canonical work hierarchy.
 *
 * A milestone is a recognizable state of a parent work item: a named set of
 * conditions, never an assigned task. Its lifecycle is derived from the same
 * FOUR-valued judgement used by claim sessions; it is never asserted directly.
 */
import type { JsonValue } from "../lib/codecs/json/core.mts";
import type { ChargeValueName } from "../lib/values/index.mts";

export interface MilestoneCondition {
  readonly cell: string;
  readonly target: ChargeValueName;
}

export interface MilestoneClaim {
  readonly slug: string;
  readonly conditions: readonly MilestoneCondition[];
  readonly composesInto?: string;
}

export function milestoneCell(slug: string): string {
  return `milestone:${slug}`;
}

export function milestoneAdmissionClaim(milestone: MilestoneClaim): JsonValue {
  return Object.freeze({
    cell: milestoneCell(milestone.slug),
    charge: "held" as const,
    conditions: milestone.conditions.map((condition) =>
      Object.freeze({ cell: condition.cell, target: condition.target })),
    ...(milestone.composesInto === undefined ? {} : { composesInto: milestone.composesInto }),
  }) as unknown as JsonValue;
}

export type MilestoneLifecycleStatus = "pending" | "reached" | "bypassed";

export interface MilestoneConditionEvidence {
  readonly cell: string;
  readonly target: ChargeValueName;
  readonly settled?: ChargeValueName;
  readonly met: boolean;
  readonly necessarily?: boolean;
}

export interface MilestoneStatusReadout {
  readonly kind: "metroplat.running.milestone-status";
  readonly slug: string;
  readonly status: MilestoneLifecycleStatus;
  readonly reached: boolean;
  readonly necessarilyReached: boolean;
  readonly conditions: readonly MilestoneConditionEvidence[];
  readonly gap: readonly string[];
  readonly composesInto?: string;
  readonly bypassEvidence?: readonly string[];
}

export interface DeriveMilestoneStatusOptions {
  readonly necessarily?: ReadonlyMap<string, ChargeValueName>;
  readonly bypassWitness?: readonly string[];
}

export function deriveMilestoneStatus(
  milestone: MilestoneClaim,
  judgement: ReadonlyMap<string, ChargeValueName>,
  options: DeriveMilestoneStatusOptions = {},
): MilestoneStatusReadout {
  const conditions: readonly MilestoneConditionEvidence[] = Object.freeze(milestone.conditions.map((condition) => {
    const settled = judgement.get(condition.cell);
    const met = settled === condition.target;
    const necessarilyCharge = options.necessarily?.get(condition.cell);
    return Object.freeze({
      cell: condition.cell,
      target: condition.target,
      ...(settled === undefined ? {} : { settled }),
      met,
      ...(necessarilyCharge === undefined ? {} : { necessarily: necessarilyCharge === condition.target }),
    });
  }));
  const gap = Object.freeze(conditions.filter((condition) => !condition.met).map((condition) => condition.cell));
  const reached = milestone.conditions.length > 0 && gap.length === 0;
  const necessarilyReached = reached && conditions.every((condition) => condition.necessarily === true);
  const bypassWitness = options.bypassWitness ?? Object.freeze([]);
  const status: MilestoneLifecycleStatus = reached
    ? "reached"
    : bypassWitness.length > 0 ? "bypassed" : "pending";
  return Object.freeze({
    kind: "metroplat.running.milestone-status" as const,
    slug: milestone.slug,
    status,
    reached,
    necessarilyReached,
    conditions,
    gap,
    ...(milestone.composesInto === undefined ? {} : { composesInto: milestone.composesInto }),
    ...(bypassWitness.length === 0 ? {} : { bypassEvidence: Object.freeze([...bypassWitness]) }),
  });
}
