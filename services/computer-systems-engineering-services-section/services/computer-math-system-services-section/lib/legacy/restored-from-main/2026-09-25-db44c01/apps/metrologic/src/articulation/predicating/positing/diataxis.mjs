/**
 * positing/diataxis — Diataxis as a reading of FOUR.
 *
 * The package-side Diataxis surface is deliberately small: it reads the
 * tutorial / how-to / explanation / reference four as the four readings (SignCell,
 * SignChain) instead of introducing a parallel value algebra.
 *
 * The mapping is by bilattice role, not by label coincidence with RelMath
 * `Corner` names:
 *
 * - tutorial -> package `absurd` (knowledge bottom)
 * - how-to -> package `potential` (truth side present)
 * - explanation -> package `active` (falsity side present)
 * - reference -> package `stable` (knowledge top)
 *
 * With that transport, lookup duality is conflation and doing duality is
 * negation. This is the code-backed Diataxis slice:
 * a total finite read over FOUR. It deliberately stops before Diataxis coverage
 * analysis, learning-cycle closure, or documentation generation.
 *
 * The broader content/Lean artifact proves the Diataxis quartet as another face
 * of the recurring FOUR. This package module is the Node carrier read that is
 * actually exported today: modes, reading transport, two axis reads, and the
 * three transported duality edge families.
 *
 * @example
 * ```ts
 * readingOfDiataxisMode("reference")
 * // "stable"
 *
 * diataxisLookupDual("tutorial").name   // a mode
 * // "reference"
 *
 * diataxisDoingDual("how-to").name
 * // "explanation"
 * ```
 *
 * @packageDocumentation
 */
import { readingAs, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell";
import { conflateReading, gauge, negateReading } from "@red-cup-engineering/computer-code-engineering-services-section/signchain/bilattice";
/** All Diataxis mode names. */
export const diataxisModeNames = Object.freeze(["tutorial", "how-to", "explanation", "reference"]);
const readingByMode = {
    tutorial: "absurd",
    "how-to": "potential",
    explanation: "active",
    reference: "stable",
};
const modeByReading = {
    absurd: "tutorial",
    potential: "how-to",
    active: "explanation",
    stable: "reference",
};
/** Whether a string names a Diataxis mode. */
export function isDiataxisModeName(value) {
    return diataxisModeNames.includes(value);
}
/** Coerce a string to a Diataxis mode name, or throw. */
export function asDiataxisModeName(value) {
    if (!isDiataxisModeName(value)) {
        throw new TypeError(`not a Diataxis mode name: ${JSON.stringify(value)} (expected one of ${diataxisModeNames.join(", ")})`);
    }
    return value;
}
const modeNameOf = (mode) => typeof mode === "string" ? asDiataxisModeName(mode) : mode.name;
/** Construct a Diataxis mode and its reading: application is the for side, cognition the against side. */
export function diataxisMode(name) {
    const reading = readingByMode[name];
    const [application, cognition] = sidesOfReading(reading);
    return Object.freeze({ kind: "diataxis.mode", name, reading, application, cognition });
}
/** All four Diataxis modes. */
export const diataxisModes = Object.freeze(diataxisModeNames.map(diataxisMode));
/** The name of a Diataxis mode. */
export const diataxisModeName = (mode) => mode.name;
/** The reading (knowledge family) a Diataxis mode names. */
export function readingOfDiataxisMode(mode) {
    return readingByMode[modeNameOf(mode)];
}
/** The Diataxis mode a reading (any family) names. */
export function diataxisModeOfReading(value) {
    return diataxisMode(modeByReading[readingAs("knowledge", value)]);
}
/** Whether a Diataxis mode is application-facing. */
export function diataxisApplication(mode) {
    return sidesOfReading(readingOfDiataxisMode(mode))[0];
}
/** Whether a Diataxis mode is cognition-facing. */
export function diataxisCognition(mode) {
    return sidesOfReading(readingOfDiataxisMode(mode))[1];
}
/** Lookup duality: tutorial <-> reference, with how-to and explanation fixed. */
export function diataxisLookupDual(mode) {
    return diataxisModeOfReading(conflateReading(readingOfDiataxisMode(mode)));
}
/** Doing duality: how-to <-> explanation, with tutorial and reference fixed. */
export function diataxisDoingDual(mode) {
    return diataxisModeOfReading(negateReading(readingOfDiataxisMode(mode)));
}
/** The composite diagonal duality on the Diataxis four. */
export function diataxisAntipode(mode) {
    return diataxisModeOfReading(gauge("double", readingOfDiataxisMode(mode)));
}
const dualityEdge = (duality, from, to) => Object.freeze({
    kind: "diataxis.duality-edge",
    duality,
    from,
    to,
});
/** Return the finite Diataxis reading carried by the four readings.
 *
 * The returned value contains all four modes plus the three transported diagonal
 * edge sets: lookup duality, doing duality, and their composite antipode.
 */
export function diataxisReading() {
    const modes = diataxisModes;
    return Object.freeze({
        kind: "diataxis.reading",
        modes,
        lookupDual: Object.freeze(modes.map((mode) => dualityEdge("lookup", mode, diataxisLookupDual(mode)))),
        doingDual: Object.freeze(modes.map((mode) => dualityEdge("doing", mode, diataxisDoingDual(mode)))),
        antipode: Object.freeze(modes.map((mode) => dualityEdge("antipode", mode, diataxisAntipode(mode)))),
    });
}
