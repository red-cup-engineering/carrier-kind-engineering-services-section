import type { ChargeValue, ChargeValueName } from "../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
/** The four Diataxis mode names, using the package's public spelling. */
export type DiataxisModeName = "tutorial" | "how-to" | "explanation" | "reference";
/** A Diataxis mode read over the package's FOUR charge value. */
export interface DiataxisMode {
    readonly kind: "diataxis.mode";
    readonly name: DiataxisModeName;
    readonly charge: ChargeValue;
    readonly application: boolean;
    readonly cognition: boolean;
}
/** A duality edge between two Diataxis modes. */
export interface DiataxisDualityEdge {
    readonly kind: "diataxis.duality-edge";
    readonly duality: "lookup" | "doing" | "antipode";
    readonly from: DiataxisMode;
    readonly to: DiataxisMode;
}
/** The finite Diataxis read carried by FOUR. */
export interface DiataxisReading {
    readonly kind: "diataxis.reading";
    readonly modes: readonly DiataxisMode[];
    readonly lookupDual: readonly DiataxisDualityEdge[];
    readonly doingDual: readonly DiataxisDualityEdge[];
    readonly antipode: readonly DiataxisDualityEdge[];
}
/** All Diataxis mode names. */
export declare const diataxisModeNames: readonly DiataxisModeName[];
/** Whether a string names a Diataxis mode. */
export declare function isDiataxisModeName(value: string): value is DiataxisModeName;
/** Coerce a string to a Diataxis mode name, or throw. */
export declare function asDiataxisModeName(value: string): DiataxisModeName;
/** Construct a Diataxis mode and its package charge reading. */
export declare function diataxisMode(name: DiataxisModeName): DiataxisMode;
/** All four Diataxis modes. */
export declare const diataxisModes: readonly DiataxisMode[];
/** The name of a Diataxis mode. */
export declare const diataxisModeName: (mode: DiataxisMode) => DiataxisModeName;
/** Read the package FOUR charge value carried by a Diataxis mode. */
export declare function chargeValueOfDiataxisMode(mode: DiataxisMode | DiataxisModeName): ChargeValue;
/** Read the Diataxis mode corresponding to a package FOUR charge value. */
export declare function diataxisModeOfCharge(value: ChargeValue | ChargeValueName): DiataxisMode;
/** Whether a Diataxis mode is application-facing. */
export declare function diataxisApplication(mode: DiataxisMode | DiataxisModeName): boolean;
/** Whether a Diataxis mode is cognition-facing. */
export declare function diataxisCognition(mode: DiataxisMode | DiataxisModeName): boolean;
/** Lookup duality: tutorial <-> reference, with how-to and explanation fixed. */
export declare function diataxisLookupDual(mode: DiataxisMode | DiataxisModeName): DiataxisMode;
/** Doing duality: how-to <-> explanation, with tutorial and reference fixed. */
export declare function diataxisDoingDual(mode: DiataxisMode | DiataxisModeName): DiataxisMode;
/** The composite diagonal duality on the Diataxis four. */
export declare function diataxisAntipode(mode: DiataxisMode | DiataxisModeName): DiataxisMode;
/** Return the finite Diataxis reading carried by the package FOUR charge square.
 *
 * The returned value contains all four modes plus the three transported diagonal
 * edge sets: lookup duality, doing duality, and their composite antipode.
 */
export declare function diataxisReading(): DiataxisReading;
