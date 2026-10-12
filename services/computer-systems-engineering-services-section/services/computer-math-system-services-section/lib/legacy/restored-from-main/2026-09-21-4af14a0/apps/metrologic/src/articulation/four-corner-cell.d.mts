/**
 * articulating/four-corner-cell — finite bridge for
 * RelMath.Articulating.FourCornerCell.
 *
 * Lean names the articulation corners by phase:
 *   absurd=(false,false), potential=(true,false), stable=(true,true), active=(false,true).
 *
 * The charge algebra is literally the same named Bool x Bool carrier:
 *   absurd=(false,false), potential=(true,false), stable=(true,true), active=(false,true).
 * This bridge witnesses the identity rather than rotating one vocabulary into another.
 */
import type { ArticulationCell, AperiodicArticulationCell } from "@red-cup-engineering/computer-data-engine/utterance";
import { type ChargeValue, type ChargeValueName } from "../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export type FourCornerName = "potential" | "active" | "absurd" | "stable";
export type FourCornerChargeAlias = "kBot" | "tTop" | "kTop" | "tBot";
export interface FourCornerStatus {
    readonly kind: "fourCorner.status";
    readonly tokenArticulated: boolean;
    readonly claimArticulated: boolean;
}
export interface FourCornerReading {
    readonly kind: "fourCorner.reading";
    readonly status: FourCornerStatus;
    readonly corner: FourCornerName;
    readonly chargeAlias: FourCornerChargeAlias;
    readonly chargeName: ChargeValueName;
    readonly charge: ChargeValue;
    readonly sameCoordinates: true;
}
export interface FourCornerCellReceipt {
    readonly kind: "fourCornerCell.receipt:witness";
    readonly readings: readonly FourCornerReading[];
    readonly cellReading: FourCornerReading;
    readonly cornerRoundTrip: true;
    readonly chargeCoordinateRoundTrip: true;
    readonly articulationPhaseIsChargeByCoordinates: true;
    readonly initialAbsurdIsKnowledgeBottom: boolean;
}
export declare const fourCornerNames: readonly FourCornerName[];
export declare function cornerOfStatus(tokenArticulated: boolean, claimArticulated: boolean): FourCornerName;
export declare function statusOfCorner(corner: FourCornerName): FourCornerStatus;
export declare function chargeNameOfCorner(corner: FourCornerName): ChargeValueName;
export declare function readFourCorner(tokenArticulated: boolean, claimArticulated: boolean): FourCornerReading;
export declare function fourCornerOfArticulationCell(cell: ArticulationCell | AperiodicArticulationCell): FourCornerReading;
export declare function fourCornerCellReceipt(cell: ArticulationCell | AperiodicArticulationCell): FourCornerCellReceipt;
