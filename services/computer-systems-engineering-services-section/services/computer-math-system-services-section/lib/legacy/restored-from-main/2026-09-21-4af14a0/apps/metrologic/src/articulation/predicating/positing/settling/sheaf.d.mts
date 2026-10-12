/**
 * settling/sheaf — the posit presheaf and its gluing.
 *
 * A `PositPresheaf` holds a fiber carrier and the valuation traces accumulated
 * over it (seeded with the fiber's own valuation); a `SheafCarrier` is the
 * single global section those traces glue to. `posit` returns the presheaf;
 * settlement reads it. Imports the predication-site builder directly (not a
 * heavy barrel) — the only structural dependency beyond the fiber types.
 */
import type { FiberCarrier, Valuation } from "../fiber.mjs";
/** A posit presheaf over a predication fiber. */
export interface PositPresheaf {
    readonly kind: "predication.posit.presheaf";
    readonly fiber: FiberCarrier;
    readonly traces: readonly Valuation[];
}
/** A trace through a posit presheaf: the ordered valuations recorded over the fiber. */
export interface PresheafTrace {
    readonly kind: "predication.valuation.sheaf.trace";
    readonly valuations: readonly Valuation[];
}
/** A sheaf carrier: the single global section the presheaf's traces glue to. */
export interface SheafCarrier {
    readonly kind: "predication.valuation.sheaf.carrier";
    readonly section: Valuation;
}
/** The result of commutating a posit presheaf: the saturated carrier and the residue. */
export interface CommutationCarrier {
    readonly kind: "predication.valuation.sheaf.commutation";
    readonly saturated: PositPresheaf;
    readonly residue: readonly Valuation[];
}
/** Construct the posit presheaf over a fiber carrier, seeding its traces. */
export declare function presheaf(fiber: FiberCarrier): PositPresheaf;
/** Build a posit presheaf from a valuation: rebuild a site from its cells, wrap, posit. */
export declare function presheafFromValuation(valuation: Valuation): PositPresheaf;
/** Build a sheaf carrier from a valuation taken as the global section. */
export declare function sheafFromValuation(section: Valuation): SheafCarrier;
/** Commutate a posit presheaf: keep it saturated and expose its traces as residue. */
export declare function commutate(p: PositPresheaf): CommutationCarrier;
