import type { FiberCarrier, Valuation } from "./predication-fiber.mjs";
import { predicationCarrier } from "@emsenn/meme-algebra";

export interface PresheafCarrier {
  readonly kind: "predication.valuation.sheaf.presheaf";
  readonly fiber: FiberCarrier;
  readonly traces: readonly Valuation[];
}

export interface PresheafTrace {
  readonly kind: "predication.valuation.sheaf.trace";
  readonly valuations: readonly Valuation[];
}

export interface SheafCarrier {
  readonly kind: "predication.valuation.sheaf.carrier";
  readonly section: Valuation;
}

export interface CommutationCarrier {
  readonly kind: "predication.valuation.sheaf.commutation";
  readonly saturated: PresheafCarrier;
  readonly residue: readonly Valuation[];
}

export function presheaf(fiber: FiberCarrier): PresheafCarrier {
  return Object.freeze({ kind: "predication.valuation.sheaf.presheaf" as const, fiber, traces: Object.freeze([fiber.valuation]) });
}

export function presheafFromValuation(valuation: Valuation): PresheafCarrier {
  const cells = valuation.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell));
  const predication = predicationCarrier(cells);
  return presheaf(Object.freeze({ kind: "predication.fiber.carrier" as const, predication, valuation }));
}

export function sheafFromValuation(section: Valuation): SheafCarrier {
  return Object.freeze({ kind: "predication.valuation.sheaf.carrier" as const, section });
}

export function commutate(p: PresheafCarrier): CommutationCarrier {
  return Object.freeze({
    kind: "predication.valuation.sheaf.commutation" as const,
    saturated: p,
    residue: p.traces,
  });
}
