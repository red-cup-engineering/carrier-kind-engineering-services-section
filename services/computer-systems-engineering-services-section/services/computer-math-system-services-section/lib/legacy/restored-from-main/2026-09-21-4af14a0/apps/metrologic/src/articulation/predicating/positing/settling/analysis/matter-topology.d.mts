/**
 * analysis/matter-topology - finite contact-network rigidity receipts.
 *
 * Executable shadow of RelMath.Aperiodic.MatterTopology: a material bears load
 * exactly when its contact nerve has nonzero H1 cycle rank, and one redundant
 * contact raises that rank by one.
 */
import { type CoverNerveCarrier } from "./coordination-cohomology.mjs";
export interface MatterTopologyReceipt {
    readonly kind: "aperiodic.matterTopology.receipt:witness";
    readonly nerve: CoverNerveCarrier;
    readonly h1Rank: number;
    readonly loadBearing: boolean;
    readonly notForest: boolean;
    readonly loadBearingIffNotForest: true;
    readonly jammed: CoverNerveCarrier;
    readonly jammedH1Rank: number;
    readonly jammingClick: true;
    readonly percolationFrontier: "condensate density does not alone force load-bearing topology";
}
export declare const loadBearing: (nerve: CoverNerveCarrier) => boolean;
export declare function redundantContact(nerve: CoverNerveCarrier): CoverNerveCarrier;
export declare function receipt(nerve?: CoverNerveCarrier): MatterTopologyReceipt;
