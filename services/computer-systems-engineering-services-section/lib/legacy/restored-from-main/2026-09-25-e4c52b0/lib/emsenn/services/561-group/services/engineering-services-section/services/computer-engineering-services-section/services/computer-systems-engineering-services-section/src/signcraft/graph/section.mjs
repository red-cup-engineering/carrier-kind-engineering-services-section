/**
 * @packageDocumentation
 *
 * settling/section — a section of a meme topology under one extremum.
 *
 * Flattens a fixed-point reading's sheaf section into charged entries, queried
 * by subject (predications-for) or predicate (subjects-for), partitioned by the
 * four charge values under their dynamical names (potential / active / stable /
 * absurd), and summarized as vitals (cells, contradictions, residue, regime).
 */
import { bottom, joinKnowledge, valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { termCoincides, predicateCoincides } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { count } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
/** The section of a fixed-point reading (its sheaf section flattened). */
export function sectionOf(reading) {
    if (typeof reading !== "object" || reading === null || reading.kind !== "meme-topology.fixedPointReading") {
        throw new TypeError("sectionOf: expected a fixed-point reading");
    }
    const entries = reading.extremum.sheaf.section.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => Object.freeze({
        kind: "meme-topology.section.entry",
        cell: assignment.cell,
        charge: assignment.charge,
    })));
    return Object.freeze({
        kind: "meme-topology.section.carrier",
        order: reading.order,
        bound: reading.bound,
        entries: Object.freeze(entries),
    });
}
/** The entries whose subject coincides with a term. */
export function predicationsFor(section, subject) {
    return Object.freeze(section.entries.filter((entry) => termCoincides(entry.cell.subject, subject)));
}
/** The entries whose predicate coincides with a predicate. */
export function subjectsFor(section, predicate) {
    return Object.freeze(section.entries.filter((entry) => predicateCoincides(entry.cell.predicate, predicate)));
}
/** The charge at a cell; an unmatched cell reads `absurd` (absence is data). */
export function chargeAtValues(section, subject, predicate, object) {
    const objectInput = object ?? subject;
    return section.entries
        .filter((entry) => termCoincides(entry.cell.subject, subject)
        && predicateCoincides(entry.cell.predicate, predicate)
        && termCoincides(entry.cell.object, objectInput))
        .reduce((acc, entry) => joinKnowledge(acc, entry.charge), bottom);
}
/** Partition a section into the four charge buckets. */
export function partitionSection(section) {
    const potential = [];
    const active = [];
    const stable = [];
    const absurd = [];
    for (const entry of section.entries) {
        const name = valueOf(entry.charge).name;
        if (name === "potential")
            potential.push(entry);
        else if (name === "active")
            active.push(entry);
        else if (name === "stable")
            stable.push(entry);
        else
            absurd.push(entry);
    }
    return Object.freeze({
        kind: "meme-topology.section.partition",
        potential: Object.freeze(potential),
        active: Object.freeze(active),
        stable: Object.freeze(stable),
        absurd: Object.freeze(absurd),
    });
}
/** The vitals of a section under a classification. */
export function topologyVitals(section, classification) {
    const partition = partitionSection(section);
    return Object.freeze({
        kind: "meme-topology.vitals",
        cells: count(section.entries),
        contradictions: count(partition.stable),
        residue: count(partition.absurd),
        regime: classification.regime,
    });
}
