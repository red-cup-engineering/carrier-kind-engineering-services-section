import { predicationSite } from "@lenticule-science/metrologic/articulation/predicating/positing/predication";
/** Construct the posit presheaf over a fiber carrier, seeding its traces. */
export function presheaf(fiber) {
    return Object.freeze({ kind: "predication.posit.presheaf", fiber, traces: Object.freeze([fiber.valuation]) });
}
/** Build a posit presheaf from a valuation: rebuild a site from its cells, wrap, posit. */
export function presheafFromValuation(valuation) {
    const cells = valuation.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell));
    const predication = predicationSite(cells);
    return presheaf(Object.freeze({ kind: "predication.fiber.carrier", predication, valuation }));
}
/** Build a sheaf carrier from a valuation taken as the global section. */
export function sheafFromValuation(section) {
    return Object.freeze({ kind: "predication.valuation.sheaf.carrier", section });
}
/** Commutate a posit presheaf: keep it saturated and expose its traces as residue. */
export function commutate(p) {
    return Object.freeze({ kind: "predication.valuation.sheaf.commutation", saturated: p, residue: p.traces });
}
