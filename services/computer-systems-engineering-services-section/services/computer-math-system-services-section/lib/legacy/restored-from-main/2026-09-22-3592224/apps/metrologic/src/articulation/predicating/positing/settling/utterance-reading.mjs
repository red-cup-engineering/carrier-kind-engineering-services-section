/**
 * utterance-reading - ergonomic readers over the lawful utterance descent.
 */
import { articulate } from "@lenticule-science/metrologic/articulation/predicating/positing/utterance";
import { freePredicationSite, predicate, presentPredicationSite } from "@lenticule-science/metrologic/articulation/predicating/positing/predication";
import { composeFibers, posit, valuationOfCharge } from "../fiber.mjs";
import { fixedPoints } from "./fixed-point.mjs";
import { fixedPointReadings } from "./fixed-point-reading.mjs";
import { freeSettlementFiltration, } from "./valuation-closure.mjs";
import { relateRelations } from "./topology.mjs";
function generatorsOfUtterances(admissions, closureProfile) {
    if (admissions.length === 0)
        throw new TypeError("expected at least one admitted utterance");
    return admissions
        .map(({ utterance, charge }) => {
        const predication = predicate(articulate(utterance));
        const site = presentPredicationSite(predication);
        const valuation = valuationOfCharge(predication, charge);
        return Object.freeze({
            kind: "predication.settlement.filtration.presentation",
            cells: site.cells,
            specializations: site.specializations,
            assignments: valuation.fibers.flatMap((fiber) => fiber.assignments),
            closureProfile,
        });
    })
        .reduce((left, right) => relateRelations(left, right));
}
export function settleUtterances(admissions, closureProfile) {
    return freeSettlementFiltration(generatorsOfUtterances(admissions, closureProfile));
}
export function fixedPointReadingsOfUtterances(admissions, closureProfile) {
    const generators = generatorsOfUtterances(admissions, closureProfile);
    const site = freePredicationSite({
        kind: "predication.site",
        cells: generators.cells,
        specializations: generators.specializations,
    });
    return fixedPointReadings(fixedPoints(posit(site, composeFibers(generators.assignments, site.base))));
}
