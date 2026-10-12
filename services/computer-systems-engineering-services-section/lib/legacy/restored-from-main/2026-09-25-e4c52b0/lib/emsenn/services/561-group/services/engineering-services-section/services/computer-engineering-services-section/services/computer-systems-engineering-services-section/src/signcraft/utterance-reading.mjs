/**
 * utterance-reading - ergonomic readers over the lawful utterance descent.
 */
import { articulate } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { freePredicationSite, predicate, predicationSite, presentPredicationSite } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { composeFibers, meme, posit, valuationOfCharge } from "./fiber.mjs";
import { fixedPoints } from "./fixed-point.mjs";
import { fixedPointReadings } from "./fixed-point-reading.mjs";
import { freeSettlementFiltration, settleKnowledge } from "./valuation-closure.mjs";
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

/** Posit a whole log of utterances once: predicate each, glue into one site, posit. */
function positLog(utterances) {
  const generated = utterances.map((carrier) => predicate(articulate(carrier)));
  const site = predicationSite(generated.flatMap((s) => [...s.cells.cells, ...s.specializations]));
  // Self-witness every cell with its own subject mark, in the absence of
  // independent evidence — the same convention `witnessedPotential` names.
  const valuation = composeFibers(
    site.cells.cells.map((cell) => meme(cell, witnessedPotential(cell.subject.mark))),
    site.base,
  );
  return posit(site, valuation);
}

/** Settle a log of utterances into its settlement filtration (the ordinal closure). */
export function settleUtteranceLog(utterances) {
  return settleKnowledge(positLog(utterances));
}

/** Read the knowledge-/truth-least fixed-point readings of a settled log of utterances. */
export function fixedPointReadingsOfUtteranceLog(utterances) {
  return fixedPointReadings(fixedPoints(positLog(utterances)));
}
