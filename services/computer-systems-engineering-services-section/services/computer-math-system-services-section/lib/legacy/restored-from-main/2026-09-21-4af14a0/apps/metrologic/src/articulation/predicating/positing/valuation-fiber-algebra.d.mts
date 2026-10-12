/**
 * positing/valuation-fiber-algebra — finite valuation truth-Heyting quartet.
 *
 * Executable shadow of `RelMath.Positing.ValuationFiberAlgebra`,
 * `Obsmetrologia/Language/Positing/ValuationQuartetDischarge.lean`, and the finite recurrence cell
 * in `RelMath.Positing.QuartetRecurrence`.
 *
 * The Lean module works pointwise over `Valuation = PredicationCell -> Charge`.
 * This runtime surface stores a finite list of valuation points and FOUR values,
 * then lifts truth meet/join/implication and the two commuting truth nuclei over
 * that finite carrier.
 */
import { type ChargeValue, type ChargeValueName } from "../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
export type ValuationFiberCornerName = "potential" | "active" | "stable" | "absurd";
export type ModalCornerName = "neither" | "dia" | "box" | "both";
export interface ValuationFiberCarrier {
    readonly kind: "positing.valuationFiber.carrier";
    readonly points: readonly string[];
    readonly values: Readonly<Record<string, ChargeValueName>>;
}
export interface CrossOrderNucleusFinding {
    readonly kind: "positing.valuationFiber.crossOrderNotKnowledgeNucleus:witness";
    readonly valuation: ValuationFiberCarrier;
    readonly closure: ValuationFiberCarrier;
    readonly witnessPoint: string;
    readonly before: "stable";
    readonly after: "potential";
    readonly knowledgeInflationary: false;
}
export interface ValuationFiberAlgebraReceipt {
    readonly kind: "positing.valuationFiberAlgebra.receipt:witness";
    readonly carrier: ValuationFiberCarrier;
    readonly truthTop: "potential";
    readonly truthBottom: "active";
    readonly sigmaPole: "potential";
    readonly deltaPole: "stable";
    readonly sigma: ValuationFiberCarrier;
    readonly delta: ValuationFiberCarrier;
    readonly pi: ValuationFiberCarrier;
    readonly truthMeetIdempotent: true;
    readonly truthMeetCommutative: true;
    readonly truthMeetAssociative: true;
    readonly truthOrderPartial: true;
    readonly heytingAdjunction: true;
    readonly sigmaInflationary: true;
    readonly sigmaIdempotent: true;
    readonly sigmaMeetPreserving: true;
    readonly deltaInflationary: true;
    readonly deltaIdempotent: true;
    readonly deltaMeetPreserving: true;
    readonly sigmaDeltaCommute: true;
    readonly piInflationary: true;
    readonly piIdempotent: true;
    readonly piMeetPreserving: true;
    readonly fixPiIffFixSigmaAndDelta: boolean;
    readonly cornerOperatorsExhaustive: true;
    readonly abstractQuartetDischarged: true;
    readonly crossOrderFinding: CrossOrderNucleusFinding;
}
export interface QuartetRecurrenceReceipt {
    readonly kind: "positing.quartetRecurrence.receipt:witness";
    readonly modalToCorner: Readonly<Record<ModalCornerName, ValuationFiberCornerName>>;
    readonly cornerToModal: Readonly<Record<ValuationFiberCornerName, ModalCornerName>>;
    readonly modalRoundTrip: true;
    readonly cornerRoundTrip: true;
    readonly cornerOperators: readonly ValuationFiberCornerName[];
    readonly twistoringSquare: true;
    readonly commutatingSquare: true;
    readonly oneCoherenceCellAtTwoDepths: true;
    readonly cardFour: 4;
}
export interface ValuationQuartetDischargeReceipt {
    readonly kind: "positing.valuationQuartetDischarge.receipt:witness";
    readonly theorem: "Obsmetrologia.FiberDischarge.valuation_discharges_abstract_quartet";
    readonly theoremFixPi: "Obsmetrologia.FiberDischarge.valuation_quartet_fix_pi_iff";
    readonly carrier: ValuationFiberCarrier;
    readonly algebra: ValuationFiberAlgebraReceipt;
    readonly recurrence: QuartetRecurrenceReceipt;
    readonly heytingCarrier: "Valuation";
    readonly meet: "valuationTruthMeet";
    readonly join: "valuationTruthJoin";
    readonly himp: "valuationTruthImplication";
    readonly himpAdjunction: true;
    readonly nucleiCommute: true;
    readonly cornersCard: 4;
    readonly stableIsIntersection: true;
    readonly fixPiIffFixSigmaAndDelta: true;
    readonly j1AgreesSigma: true;
    readonly j2AgreesDelta: true;
    readonly piAgrees: true;
    readonly abstractQuartetDischarged: true;
}
export declare function truthImplicationValue(antecedent: ChargeValue, consequent: ChargeValue): ChargeValue;
export declare function valuationFiberCarrier(points: readonly string[], values: Readonly<Record<string, ChargeValueName>>): ValuationFiberCarrier;
export declare function readValuationFiber(carrier: ValuationFiberCarrier, point: string): ChargeValueName;
export declare const valuationTruthMeet: (left: ValuationFiberCarrier, right: ValuationFiberCarrier) => ValuationFiberCarrier;
export declare const valuationTruthJoin: (left: ValuationFiberCarrier, right: ValuationFiberCarrier) => ValuationFiberCarrier;
export declare const valuationTruthImplication: (antecedent: ValuationFiberCarrier, consequent: ValuationFiberCarrier) => ValuationFiberCarrier;
export declare const sameValuationFiber: (left: ValuationFiberCarrier, right: ValuationFiberCarrier) => boolean;
export declare const valuationLeqTruth: (left: ValuationFiberCarrier, right: ValuationFiberCarrier) => boolean;
export declare const valuationLeqKnowledge: (left: ValuationFiberCarrier, right: ValuationFiberCarrier) => boolean;
export declare const nucleusToward: (pole: ChargeValueName, carrier: ValuationFiberCarrier) => ValuationFiberCarrier;
export declare const sigmaNucleus: (carrier: ValuationFiberCarrier) => ValuationFiberCarrier;
export declare const deltaNucleus: (carrier: ValuationFiberCarrier) => ValuationFiberCarrier;
export declare const piNucleus: (carrier: ValuationFiberCarrier) => ValuationFiberCarrier;
export declare function crossOrderNotKnowledgeNucleus(points?: readonly string[]): CrossOrderNucleusFinding;
export declare function valuationFiberAlgebraReceipt(carrier: ValuationFiberCarrier): ValuationFiberAlgebraReceipt;
export declare const modalToCorner: (modal: ModalCornerName) => ValuationFiberCornerName;
export declare const cornerToModal: (corner: ValuationFiberCornerName) => ModalCornerName;
export declare const valuationFiberCornerOp: (corner: ValuationFiberCornerName, carrier: ValuationFiberCarrier) => ValuationFiberCarrier;
export declare function quartetRecurrenceReceipt(carrier: ValuationFiberCarrier): QuartetRecurrenceReceipt;
/** Bundle the finite Node discharge of `Obsmetrologia/Language/Positing/ValuationQuartetDischarge.lean`. */
export declare function valuationQuartetDischargeReceipt(carrier: ValuationFiberCarrier): ValuationQuartetDischargeReceipt;
