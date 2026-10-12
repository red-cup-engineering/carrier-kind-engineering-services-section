import { claim, tuplet, tupletElement } from "./tuplets.mjs";

const CLAIM_PHASE_SOURCES = [
  "archive:articulating-to-thing:utterance-token-claim-to-settled-entity",
  "archive:swarm-study:articulating-predicating-settling-loop",
];

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function phaseElement(index, phase, token, predicate, object) {
  return tupletElement(index, phase, token, claim(predicate, object, CLAIM_PHASE_SOURCES));
}

function phaseRows(tuple) {
  return tuple.elements.map((element) => ({
    phase: element.role,
    token: element.token,
    predicate: element.claim.predicate,
    value: element.claim.object?.value ?? "",
    count: Number(element.claim.object?.count) || 0,
  }));
}

export function costDescentClaimPhaseTuplet(descent) {
  const fibers = asList(descent.predicated?.fibers);
  const supportPaths = asList(descent.posited?.supportPaths);

  return tuplet("swarm.tuplet.claim_phase_descent", [
    phaseElement(0, "articulating", "cost:graph", "articulates-claim-space", {
      value: descent.articulated?.value ?? "absurd",
      graphKind: descent.articulated?.graphKind ?? "",
      vertices: Number(descent.articulated?.vertices) || 0,
      edges: Number(descent.articulated?.edges) || 0,
      dimensions: descent.articulated?.dimensions ?? {},
    }),
    phaseElement(1, "predicating", "cost:predicate-fibers", "predicates-residue", {
      value: descent.predicated?.value ?? "absurd",
      count: Number(descent.predicated?.fiberCount) || fibers.length,
      unknownIsZero: descent.predicated?.unknownIsZero === true,
      fibers: fibers.map((fiber) => ({
        predicate: fiber.predicate,
        value: fiber.value,
        reason: fiber.reason,
        count: Number(fiber.count) || 0,
        supportPaths: asList(fiber.supportPaths),
      })),
    }),
    phaseElement(2, "positing", "cost:witness-support", "posits-settlement-support", {
      value: descent.posited?.value ?? "absurd",
      admittedGovernanceDecisions: Number(descent.posited?.admittedGovernanceDecisions) || 0,
      costWitnesses: Number(descent.posited?.costWitnesses) || 0,
      traceRows: Number(descent.posited?.traceRows) || 0,
      toolRows: Number(descent.posited?.toolRows) || 0,
      supportPaths,
    }),
    phaseElement(3, "settling", "cost:settlement", "settles-iff-no-residue", {
      value: descent.settled?.value ?? "absurd",
      settled: descent.settled?.settled === true,
      reason: descent.settled?.reason ?? "",
      revisionPolicy: descent.settled?.revisionPolicy ?? "",
    }),
  ], { source: CLAIM_PHASE_SOURCES });
}

export function claimPhaseSummary(tuple) {
  return {
    kind: "swarm.claim_phase.summary",
    tupleKind: tuple.kind,
    phaseCount: tuple.elements.length,
    phases: phaseRows(tuple),
  };
}
