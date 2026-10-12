/**
 * settling/sheaf — the posit presheaf and its gluing.
 *
 * A `PositPresheaf` holds a predication fiber and the valuation traces accumulated
 * over it (seeded with the fiber's own valuation); a `ValuationSheaf` is the
 * single global section those traces glue to. `posit` returns the presheaf;
 * settlement reads it. Imports the predication-site builder directly (not a
 * heavy barrel) — the only structural dependency beyond the fiber types.
 */
import type { PredicationFiber, Valuation } from "../logic/predicating/evidence/fiber.mts";
import { predicationSite } from "../logic/predicating/predication.mts";

/** A posit presheaf over a predication fiber. */
export interface PositPresheaf {
  readonly kind: "predication.posit.presheaf";
  readonly fiber: PredicationFiber;
  readonly traces: readonly Valuation[];
}

/** A trace through a posit presheaf: the ordered valuations recorded over the fiber. */
export interface PresheafTrace {
  readonly kind: "predication.valuation.sheaf.trace";
  readonly valuations: readonly Valuation[];
}

/** A valuation sheaf: the single global section the presheaf's traces glue to. */
export interface ValuationSheaf {
  readonly kind: "predication.valuation.sheaf";
  readonly section: Valuation;
}

/** The result of commutating a posit presheaf: the saturated presheaf and the residue. */
export interface CommutationResult {
  readonly kind: "predication.valuation.sheaf.commutation";
  readonly saturated: PositPresheaf;
  readonly residue: readonly Valuation[];
}

/** Construct the posit presheaf over a predication fiber, seeding its traces. */
export function presheaf(fiber: PredicationFiber): PositPresheaf {
  return Object.freeze({ kind: "predication.posit.presheaf" as const, fiber, traces: Object.freeze([fiber.valuation]) });
}

/** Build a posit presheaf from a valuation: rebuild a site from its cells, wrap, posit. */
export function presheafFromValuation(valuation: Valuation): PositPresheaf {
  const cells = valuation.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell));
  const predication = predicationSite(cells);
  return presheaf(Object.freeze({ kind: "predication.fiber" as const, predication, valuation }));
}

/** Build a valuation sheaf from a valuation taken as the global section. */
export function sheafFromValuation(section: Valuation): ValuationSheaf {
  return Object.freeze({ kind: "predication.valuation.sheaf" as const, section });
}

/** Commutate a posit presheaf: keep it saturated and expose its traces as residue. */
export function commutate(p: PositPresheaf): CommutationResult {
  return Object.freeze({ kind: "predication.valuation.sheaf.commutation" as const, saturated: p, residue: p.traces });
}
