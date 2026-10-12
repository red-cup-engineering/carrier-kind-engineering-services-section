import { articulate, mark, utterEvidenceSet } from "@lenticule-science/metrologic/articulation/predicating/positing/utterance";
import { cellIdentity, predicate, predicationSite } from "@lenticule-science/metrologic/articulation/predicating/positing/predication";
import { posit, valuationOfCharge } from "./positing/fiber.mjs";
import { valueOf, witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { fixedPointReadings } from "./positing/settling/fixed-point-reading.mjs";
import { fixedPoints } from "./positing/settling/fixed-point.mjs";
import { sectionOf } from "./positing/settling/graph/section.mjs";

function keyOf(entry) {
    return JSON.stringify([entry.subject, entry.predicate, entry.object === undefined ? null : entry.object]);
}

/**
 * Read the induced knowledge-least section for an append-only evidence trace.
 * Each evidence item contributes a potential utterance; the resulting charge
 * is measured from the settled carrier, never admitted on the item itself.
 */
export function deriveLessons(entries) {
    if (entries.length === 0)
        return Object.freeze([]);
    const utterances = utterEvidenceSet(entries);
    const generated = utterances.map((carrier) => predicate(articulate(carrier)));
    const site = predicationSite(generated.flatMap((generatedSite) => [
        ...generatedSite.cells.cells,
        ...generatedSite.specializations,
    ]));
    const readings = fixedPointReadings(fixedPoints(posit(
        site,
        valuationOfCharge(site, witnessedPotential(mark(utterances))),
    )));
    const section = sectionOf(readings.knowledgeLeast);
    const accumulated = new Map();
    const order = [];
    for (let index = 0; index < entries.length; index += 1) {
        const evidence = entries[index];
        const key = keyOf(evidence);
        let record = accumulated.get(key);
        if (record === undefined) {
            record = { evidence, carrier: utterances[index], provenance: [] };
            accumulated.set(key, record);
            order.push(key);
        }
        if (evidence.provenance !== undefined)
            record.provenance.push(evidence.provenance);
    }
    return Object.freeze(order.map((key) => {
        const record = accumulated.get(key);
        const target = predicate(articulate(record.carrier)).cells.cells[0];
        const entry = section.entries.find((candidate) => cellIdentity(candidate.cell, target).kind === "predication.identity:witness");
        return Object.freeze({
            subject: record.evidence.subject,
            predicate: record.evidence.predicate,
            ...(record.evidence.object === undefined ? {} : { object: record.evidence.object }),
            value: entry === undefined ? "absurd" : valueOf(entry.charge).name,
            provenance: Object.freeze([...record.provenance]),
        });
    }));
}
