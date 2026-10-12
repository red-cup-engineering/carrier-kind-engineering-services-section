/** Metro valuation wire names over the canonical finite valuation operators. */
import * as canonical from "@lenticule-science/articulating/predicating/positing/valuation-fiber-algebra";
import { toArticulatingName, fromArticulatingName, toArticulatingValue, fromArticulatingValue, type ChargeValue, type ChargeValueName } from "./claim-charge.mts";
export type ValuationFiberCornerName = "unknown" | "held" | "denied" | "contested";
export type ModalCornerName = "neither" | "dia" | "box" | "both";
export interface ValuationFiber {
  readonly kind: "positing.valuationFiber";
  readonly points: readonly string[];
  readonly values: Readonly<Record<string, ChargeValueName>>;
}
export interface CrossOrderNucleusFinding {
  readonly kind: "positing.valuationFiber.crossOrderNotKnowledgeNucleus:witness";
  readonly valuation: ValuationFiber;
  readonly closure: ValuationFiber;
  readonly witnessPoint: string;
  readonly before: "contested";
  readonly after: "held";
  readonly knowledgeInflationary: false;
}
export interface ValuationFiberAlgebraReceipt {
  readonly kind: "positing.valuationFiberAlgebra.receipt:witness";
  readonly valuation: ValuationFiber;
  readonly truthTop: "held";
  readonly truthBottom: "denied";
  readonly sigmaPole: "held";
  readonly deltaPole: "contested";
  readonly sigma: ValuationFiber;
  readonly delta: ValuationFiber;
  readonly pi: ValuationFiber;
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
  readonly valuation: ValuationFiber;
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
export const toCanonical = (v: Pick<ValuationFiber, "points" | "values">): canonical.ValuationFiberCarrier =>
  canonical.valuationFiberCarrier(v.points, Object.fromEntries(Object.entries(v.values).map(([point, name]) => [point, toArticulatingName(name)])));
export const fromCanonical = (v: canonical.ValuationFiberCarrier): ValuationFiber =>
  Object.freeze({ kind: "positing.valuationFiber", points: v.points, values: Object.freeze(Object.fromEntries(Object.entries(v.values).map(([point, name]) => [point, fromArticulatingName(name)]))) });
export const valuationFiber = (points: readonly string[], values: Readonly<Record<string, ChargeValueName>>): ValuationFiber =>
  fromCanonical(toCanonical({ points, values }));
export const readValuationFiber = (v: ValuationFiber, point: string): ChargeValueName =>
  fromArticulatingName(canonical.readValuationFiber(toCanonical(v), point));
export const truthImplicationValue = (left: ChargeValue, right: ChargeValue): ChargeValue =>
  fromArticulatingValue(canonical.truthImplicationValue(toArticulatingValue(left), toArticulatingValue(right)));
export const valuationTruthMeet = (left: ValuationFiber, right: ValuationFiber): ValuationFiber =>
  fromCanonical(canonical.valuationTruthMeet(toCanonical(left), toCanonical(right)));
export const valuationTruthJoin = (left: ValuationFiber, right: ValuationFiber): ValuationFiber =>
  fromCanonical(canonical.valuationTruthJoin(toCanonical(left), toCanonical(right)));
export const valuationTruthImplication = (left: ValuationFiber, right: ValuationFiber): ValuationFiber =>
  fromCanonical(canonical.valuationTruthImplication(toCanonical(left), toCanonical(right)));
export const valuationLeqTruth = (left: ValuationFiber, right: ValuationFiber): boolean =>
  canonical.valuationLeqTruth(toCanonical(left), toCanonical(right));
export const valuationLeqKnowledge = (left: ValuationFiber, right: ValuationFiber): boolean =>
  canonical.valuationLeqKnowledge(toCanonical(left), toCanonical(right));
export const sigmaNucleus = (v: ValuationFiber): ValuationFiber => fromCanonical(canonical.sigmaNucleus(toCanonical(v)));
export const deltaNucleus = (v: ValuationFiber): ValuationFiber => fromCanonical(canonical.deltaNucleus(toCanonical(v)));
export const piNucleus = (v: ValuationFiber): ValuationFiber => fromCanonical(canonical.piNucleus(toCanonical(v)));
export const nucleusToward = (pole: ChargeValueName, v: ValuationFiber): ValuationFiber =>
  fromCanonical(canonical.nucleusToward(toArticulatingName(pole), toCanonical(v)));
export const modalToCorner = (modal: ModalCornerName): ValuationFiberCornerName => fromArticulatingName(canonical.modalToCorner(modal));
export const cornerToModal = (corner: ValuationFiberCornerName): ModalCornerName => canonical.cornerToModal(toArticulatingName(corner));
export const valuationFiberCornerOp = (corner: ValuationFiberCornerName, v: ValuationFiber): ValuationFiber =>
  corner === "unknown" ? v : fromCanonical(canonical.valuationFiberCornerOp(toArticulatingName(corner), toCanonical(v)));
function wireReceipt<T>(value: unknown, key = ""): T {
  if (key === "cornerToModal")
    return Object.freeze(Object.fromEntries(Object.entries(value as canonical.QuartetRecurrenceReceipt["cornerToModal"]).map(([corner, modal]) => [fromArticulatingName(corner as canonical.ValuationFiberCornerName), modal]))) as T;
  if (typeof value === "string" && ["before", "after", "truthTop", "truthBottom", "sigmaPole", "deltaPole", "modalToCorner", "cornerOperators"].includes(key))
    return fromArticulatingName(value as canonical.ValuationFiberCornerName) as T;
  if (Array.isArray(value))
    return Object.freeze(value.map(item => wireReceipt(item, key))) as T;
  if (value !== null && typeof value === "object") {
    if ("kind" in value && value.kind === "positing.valuationFiber.carrier")
      return fromCanonical(value as canonical.ValuationFiberCarrier) as T;
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k === "carrier" ? "valuation" : k, wireReceipt(v, key === "modalToCorner" ? key : k)]))) as T;
  }
  return value as T;
}
export const crossOrderNotKnowledgeNucleus = (points: readonly string[] = ["fiber"]): CrossOrderNucleusFinding =>
  wireReceipt(canonical.crossOrderNotKnowledgeNucleus(points));
export const valuationFiberAlgebraReceipt = (v: ValuationFiber): ValuationFiberAlgebraReceipt =>
  wireReceipt(canonical.valuationFiberAlgebraReceipt(toCanonical(v)));
export const quartetRecurrenceReceipt = (v: ValuationFiber): QuartetRecurrenceReceipt =>
  wireReceipt(canonical.quartetRecurrenceReceipt(toCanonical(v)));
export const valuationQuartetDischargeReceipt = (v: ValuationFiber): ValuationQuartetDischargeReceipt =>
  wireReceipt(canonical.valuationQuartetDischargeReceipt(toCanonical(v)));
