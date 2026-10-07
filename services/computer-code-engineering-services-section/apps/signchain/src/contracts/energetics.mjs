/**
 * contracts/energetics - the energetic law governing whether a move descends
 * well-foundedly, accumulates monotonically, or pays a coordination cost. The law
 * is read off the phase's regime.
 */

/** A contract-level energetic law governing whether a move descends, accumulates, or pays coordination cost. */

export function energeticObligation(spec) {
  return Object.freeze({
    kind: "metroplat.energetic-obligation",
    id: spec.id,
    law: spec.law,
    behavior: spec.behavior,
    source: spec.source,
    target: spec.target,
    invariant: spec.invariant,
    ...(spec.measure === undefined ? {} : { measure: spec.measure }),
    evidenceRequired: spec.evidenceRequired,
  });
}

/** The energetic law a phase's regime imposes: a finite settling descends well-foundedly, a
 * Scott settling accumulates monotonically, and a settling whose `H¹` does not vanish pays
 * a coordination cost. */
export function energeticLawForPhase(phase) {
  switch (phase.energy) {
    case "decreasing":
      return "well-founded-descent";
    case "accumulating":
      return "monotone-accumulation";
    case "costed":
      return "coordination-cost";
  }
  throw new TypeError(`energeticLawForPhase: ${phase.id} has no regime energy`);
}

export function phaseEnergeticObligation(options

) {
  return energeticObligation({
    id: options.id,
    law: energeticLawForPhase(options.phase),
    behavior: options.phase.energy,
    source: options.source,
    target: options.target,
    invariant: options.invariant,
    ...(options.measure === undefined ? {} : { measure: options.measure }),
    evidenceRequired: options.evidenceRequired ?? options.phase.coordinationCost === "evidenced",
  });
}
