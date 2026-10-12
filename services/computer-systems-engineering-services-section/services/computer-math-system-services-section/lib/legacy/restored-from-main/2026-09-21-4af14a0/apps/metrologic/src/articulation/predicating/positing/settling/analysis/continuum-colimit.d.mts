/**
 * analysis/continuum-colimit - finite Scott-colimit limit shape.
 *
 * Executable shadow for `RelMath.Lorentzian.ContinuumColimit`: over the finite
 * FOUR charge lattice, a directed sprinkling tower attains its knowledge join,
 * and any monotone integer functional reaches its join value at a stage. This
 * is the colimit shape, not the analytic Ricci-scalar magnitude.
 */
import { type ChargeValueName } from "../../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type DirectedChargeFamily } from "./scott-coalgebra.mjs";
export type ChargeFunctional = (value: ChargeValueName) => number;
export interface ChuMatrixCell {
    readonly point: string;
    readonly state: string;
    readonly charge: ChargeValueName;
}
export interface ActionJoinReceipt {
    readonly kind: "lorentzian.continuumColimit.actionJoin:witness";
    readonly family: DirectedChargeFamily;
    readonly joinValue: ChargeValueName;
    readonly stageValues: Readonly<Record<ChargeValueName, number>>;
    readonly joinFunctionalValue: number;
    readonly boundsEveryStage: true;
    readonly realizedAmongStages: true;
}
export interface ActionLimitAttainedReceipt {
    readonly kind: "lorentzian.continuumColimit.actionLimit:witness";
    readonly attainedAt: ChargeValueName;
    readonly value: number;
    readonly dominatesEveryStage: true;
    readonly finiteStageAttainment: true;
}
export interface ContinuumColimitReceipt {
    readonly kind: "lorentzian.continuumColimit:witness";
    readonly actionJoin: ActionJoinReceipt;
    readonly limit: ActionLimitAttainedReceipt;
    readonly scottColimitNotEpsilonDelta: true;
    readonly finiteCarrierForcesAttainment: true;
    readonly magnitudeBoundary: "metric Ricci-scalar contraction remains frontier";
}
export interface ChuInformationActionColimitReceipt {
    readonly kind: "lorentzian.chuActionColimit.receipt:witness";
    readonly sourceModule: "RelMath.Lorentzian.ChuActionColimit";
    readonly theorems: readonly [
        "RelMath.Lorentzian.ChuActionColimit.kContent_mono",
        "RelMath.Lorentzian.ChuActionColimit.observedKnowledge_mono",
        "RelMath.Lorentzian.ChuActionColimit.chu_info_action_continuum_attained",
        "RelMath.Lorentzian.ChuActionColimit.chu_action_colimit"
    ];
    readonly cells: readonly ChuMatrixCell[];
    readonly observedKnowledge: ChargeValueName;
    readonly observedKnowledgeContent: number;
    readonly actionJoin: ActionJoinReceipt;
    readonly contentMonotone: true;
    readonly observedKnowledgeMonotone: true;
    readonly continuumValueAttained: true;
    readonly boundary: "FOUR information action only; Mobius gravitational BD action remains proof-side frontier";
}
export declare const chargeInformationRank: ChargeFunctional;
export declare const kContent: ChargeFunctional;
export declare function observedKnowledge(cells: readonly ChuMatrixCell[]): ChargeValueName;
/** A monotone functional commutes with the finite directed join. */
export declare function actionCommutesWithJoin(family: DirectedChargeFamily, functional?: ChargeFunctional): ActionJoinReceipt;
/** The continuum colimit value is reached at a finite stage of the tower. */
export declare function actionLimitAttained(join: ActionJoinReceipt): ActionLimitAttainedReceipt;
/** Bundle the finite Scott-colimit reading of the continuum-limit shape. */
export declare function continuumColimitReceipt(family?: DirectedChargeFamily, functional?: ChargeFunctional): ContinuumColimitReceipt;
/** Bundle the Chu/FOUR information-action colimit over a finite reveal prefix. */
export declare function chuInformationActionColimitReceipt(cells?: readonly ChuMatrixCell[]): ChuInformationActionColimitReceipt;
