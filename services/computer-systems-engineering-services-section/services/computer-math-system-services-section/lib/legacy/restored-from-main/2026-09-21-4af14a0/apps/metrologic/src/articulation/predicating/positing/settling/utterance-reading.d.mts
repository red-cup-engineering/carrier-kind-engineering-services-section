/**
 * utterance-reading - ergonomic readers over the lawful utterance descent.
 */
import { type UtteranceCarrier } from "@red-cup-engineering/computer-data-engine/utterance";
import type { ChargeCarrier } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type MemeTopologyFixedPointReadings } from "./fixed-point-reading.mjs";
import { type SettlementClosureProfile } from "./valuation-closure.mjs";
import type { SettlementFiltration } from "./object.mjs";
export interface UtteranceSettlementAdmission {
    readonly utterance: UtteranceCarrier;
    readonly charge: ChargeCarrier;
}
export declare function settleUtterances(admissions: readonly UtteranceSettlementAdmission[], closureProfile: SettlementClosureProfile): SettlementFiltration;
export declare function fixedPointReadingsOfUtterances(admissions: readonly UtteranceSettlementAdmission[], closureProfile: SettlementClosureProfile): MemeTopologyFixedPointReadings;
