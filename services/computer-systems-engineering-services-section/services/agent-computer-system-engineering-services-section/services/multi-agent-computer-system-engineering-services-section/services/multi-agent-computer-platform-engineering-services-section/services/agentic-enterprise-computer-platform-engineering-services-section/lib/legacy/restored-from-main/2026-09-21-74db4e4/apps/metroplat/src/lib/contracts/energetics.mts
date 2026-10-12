/**
 * contracts/energetics - the energetic law governing whether a move
 * descends, accumulates, jams, relaxes, or pays boundary/coordination cost.
 */

import type { PhaseSignature } from "./phase.mts";

export type EnergyBehavior = "ignored" | "decreasing" | "accumulating" | "jamming" | "relaxing" | "costed";
export type EnergeticLaw =
  | "well-founded-descent"
  | "monotone-accumulation"
  | "metastable-basin"
  | "coordination-cost"
  | "boundary-cost"
  | "idempotent-growth"
  | "relaxation"
  | "none";

/** A contract-level energetic law governing whether a move descends, accumulates, jams, relaxes, or pays boundary/coordination cost. */
export interface EnergeticObligation {
  readonly kind: "metroplat.energetic-obligation";
  readonly id: string;
  readonly law: EnergeticLaw;
  readonly behavior: EnergyBehavior;
  readonly source: string;
  readonly target: string;
  readonly invariant: string;
  readonly measure?: string;
  readonly evidenceRequired: boolean;
}

export function energeticObligation(spec: Omit<EnergeticObligation, "kind">): EnergeticObligation {
  return Object.freeze({
    kind: "metroplat.energetic-obligation" as const,
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

function energeticLawForPhase(phase: PhaseSignature): EnergeticLaw {
  switch (phase.energy) {
    case "decreasing":
      return "well-founded-descent";
    case "accumulating":
      return "monotone-accumulation";
    case "jamming":
      return "metastable-basin";
    case "relaxing":
      return "relaxation";
    case "costed":
      return phase.coordinationCost === "evidenced" || phase.coordinationCost === "global" ? "coordination-cost" : "boundary-cost";
    case "ignored":
      return "none";
  }
}

export function phaseEnergeticObligation(options: {
  readonly id: string;
  readonly phase: PhaseSignature;
  readonly source: string;
  readonly target: string;
  readonly invariant: string;
  readonly measure?: string;
  readonly evidenceRequired?: boolean;
}): EnergeticObligation {
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
