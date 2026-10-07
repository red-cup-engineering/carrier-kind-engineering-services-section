/**
 * Derived milestone states for the canonical work hierarchy.
 *
 * A milestone is a recognizable state of a parent work item: a named set of
 * conditions, never an assigned task. Its lifecycle is derived from the same
 * FOUR-valued judgement used by claim sessions; it is never asserted directly.
 */

export function milestoneCell(slug) {
  return `milestone:${slug}`;
}

export function milestoneAdmissionClaim(milestone) {
  return Object.freeze({
    cell: milestoneCell(milestone.slug),
    reading: "held",
    conditions: milestone.conditions.map((condition) =>
      Object.freeze({ cell: condition.cell, target: condition.target })),
    ...(milestone.composesInto === undefined ? {} : { composesInto: milestone.composesInto }),
  });
}

export function deriveMilestoneStatus(
  milestone,
  judgement,
  options = {},
) {
  const conditions = Object.freeze(milestone.conditions.map((condition) => {
    const settled = judgement.get(condition.cell);
    const met = settled === condition.target;
    const necessarilyReading = options.necessarily?.get(condition.cell);
    return Object.freeze({
      cell: condition.cell,
      target: condition.target,
      ...(settled === undefined ? {} : { settled }),
      met,
      ...(necessarilyReading === undefined ? {} : { necessarily: necessarilyReading === condition.target }),
    });
  }));
  const gap = Object.freeze(conditions.filter((condition) => !condition.met).map((condition) => condition.cell));
  const reached = milestone.conditions.length > 0 && gap.length === 0;
  const necessarilyReached = reached && conditions.every((condition) => condition.necessarily === true);
  const bypassWitness = options.bypassWitness ?? Object.freeze([]);
  const status = reached
    ? "reached"
    : bypassWitness.length > 0 ? "bypassed" : "pending";
  return Object.freeze({
    kind: "metroplat.running.milestone-status",
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
