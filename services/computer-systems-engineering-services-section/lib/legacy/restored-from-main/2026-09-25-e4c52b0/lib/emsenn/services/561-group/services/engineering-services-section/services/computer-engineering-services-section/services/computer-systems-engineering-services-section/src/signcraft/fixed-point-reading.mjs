/**
 * @packageDocumentation
 *
 * settling/fixed-point-reading — reading the four fixed-point extrema.
 *
 * Each extremum is read into its sheaf cohomology and the information of its
 * section (the section as a relation: points × states → charge, with valuation
 * consistency). The four readings — knowledge/truth × least/greatest — are the
 * complete settled picture of a posit presheaf.
 */
import { chargeValue, joinKnowledgeValue, valueOf } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { relationFromMatrix, relationMatrix } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-relation";
import { termCoincides, predicateCoincides } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { cohomology } from "./cohomology.mjs";
import { count } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { chargeAt } from "./fiber.mjs";
import { entitySet, predicateSet } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { valuationConsistency } from "./valuation-consistency.mjs";
import {} from "./fixed-point.mjs";
import {} from "./sheaf.mjs";
/** Read a single fixed-point extremum. */
export function fixedPointReading(extremum) {
    return Object.freeze({
        kind: "meme-topology.fixedPointReading",
        order: extremum.order,
        bound: extremum.bound,
        extremum,
        cohomology: cohomology(extremum.sheaf),
        information: informationOfSheaf(extremum.sheaf),
    });
}
/** Read all four extrema of a fixed-point carrier. */
export function fixedPointReadings(fixed) {
    return Object.freeze({
        kind: "meme-topology.fixedPointReadings",
        knowledgeLeast: fixedPointReading(fixed.knowledge.least),
        knowledgeGreatest: fixedPointReading(fixed.knowledge.greatest),
        truthLeast: fixedPointReading(fixed.truth.least),
        truthGreatest: fixedPointReading(fixed.truth.greatest),
    });
}
/** The charge a reading's section assigns to a target cell. */
export function readCharge(reading, target) {
    return chargeAt(reading.extremum.sheaf.section, target);
}
/** Construct an information entry. */
export const memeTopologyInformationEntry = (point, state, value) => Object.freeze({ kind: "meme-topology.informationEntry", point, state, value });
/** Construct an entries carrier with rank. */
export const memeTopologyInformationEntries = (entries) => Object.freeze({ kind: "meme-topology.informationEntries", entries: Object.freeze([...entries]), rank: count(entries) });
/** The point entity-set of an entries carrier. */
export const memeTopologyInformationPoints = (entries) => entitySet(entries.entries.map((entry) => entry.point), termCoincides);
/** The state predicate-set of an entries carrier. */
export const memeTopologyInformationStates = (entries) => predicateSet(entries.entries.map((entry) => entry.state), predicateCoincides);
/** The relation matrix over points and states from an entries carrier. */
export const memeTopologyInformationRelationMatrix = (points, states, entries) => relationMatrix(points, states, entries.entries.map((entry) => [entry.point, entry.state, entry.value]), { samePoint: termCoincides, sameState: predicateCoincides });
/** Extract the information of a sheaf (section as a relation + consistency). */
export function informationOfSheaf(sheaf) {
    const entries = [];
    for (const fiber of sheaf.section.fibers) {
        for (const assignment of fiber.assignments) {
            const value = valueOf(assignment.charge);
            const index = entries.findIndex((candidate) => termCoincides(candidate.point, assignment.cell.subject) && predicateCoincides(candidate.state, assignment.cell.predicate));
            if (index < 0)
                entries.push(memeTopologyInformationEntry(assignment.cell.subject, assignment.cell.predicate, value));
            else
                entries[index] = memeTopologyInformationEntry(entries[index].point, entries[index].state, joinKnowledgeValue(entries[index].value, value));
        }
    }
    const entryCarrier = memeTopologyInformationEntries(entries);
    const points = memeTopologyInformationPoints(entryCarrier);
    const states = memeTopologyInformationStates(entryCarrier);
    const informationMatrix = memeTopologyInformationRelationMatrix(points, states, entryCarrier);
    return Object.freeze({
        kind: "meme-topology.information",
        points,
        states,
        entryCarrier,
        relationMatrix: informationMatrix,
        relation: relationFromMatrix(informationMatrix, { absent: chargeValue("absurd") }),
        valuationConsistency: valuationConsistency(sheaf.section),
    });
}
