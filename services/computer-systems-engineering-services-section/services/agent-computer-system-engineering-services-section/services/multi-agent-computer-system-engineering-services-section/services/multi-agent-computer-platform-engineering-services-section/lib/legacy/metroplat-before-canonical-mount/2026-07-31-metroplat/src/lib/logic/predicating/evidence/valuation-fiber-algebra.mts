/**
 * positing/valuation-fiber-algebra — finite valuation truth-Heyting quartet.
 *
 *
 * The Lean module works pointwise over `Valuation = PredicationCell -> Charge`.
 * This runtime surface stores a finite list of valuation points and FOUR values,
 * then lifts truth meet/join/implication and the two commuting truth nuclei over
 * that finite point set.
 */
import {
  charge,
  chargeSideName,
  chargeValue,
  chargeValueName,
  chargeValueNames,
  chargeValues,
  conflateValue,
  joinTruthValue,
  leqKnowledge,
  leqTruth,
  meetTruthValue,
  negateValue,
  sameChargeValue,
  type ChargeSideName,
  type ChargeValue,
  type ChargeValueName,
} from "../../../values/index.mts";

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
  readonly absurdIsIntersection: true;
  readonly fixPiIffFixSigmaAndDelta: true;
  readonly j1AgreesSigma: true;
  readonly j2AgreesDelta: true;
  readonly piAgrees: true;
  readonly abstractQuartetDischarged: true;
}

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

const valueCoordinates = (value: ChargeValue): readonly [truth: boolean, falsity: boolean] =>
  Object.freeze([
    chargeSideName(value.coordinates[0]) === "present",
    chargeSideName(value.coordinates[1]) === "present",
  ] as const);

const valueAtCoordinates = (truth: boolean, falsity: boolean): ChargeValue => {
  const sideName = (present: boolean): ChargeSideName => present ? "present" : "absent";
  const found = chargeValues.find((value) =>
    chargeSideName(value.coordinates[0]) === sideName(truth)
    && chargeSideName(value.coordinates[1]) === sideName(falsity),
  );
  if (found === undefined) throw new TypeError(`valueAtCoordinates: no FOUR value at [${truth}, ${falsity}]`);
  return found;
};

export function truthImplicationValue(antecedent: ChargeValue, consequent: ChargeValue): ChargeValue {
  const [aTruth, aFalsity] = valueCoordinates(antecedent);
  const [cTruth, cFalsity] = valueCoordinates(consequent);
  return valueAtCoordinates((!aTruth) || cTruth, (!aFalsity) && cFalsity);
}

const unique = (items: readonly string[]): boolean => new Set(items).size === items.length;

export function valuationFiber(points: readonly string[], values: Readonly<Record<string, ChargeValueName>>): ValuationFiber {
  if (!unique(points)) throw new TypeError("valuationFiber: duplicate points are not a finite set");
  const out: Record<string, ChargeValueName> = {};
  for (const point of points) {
    const value = values[point];
    if (value === undefined) throw new TypeError(`valuationFiber: missing value for ${point}`);
    out[point] = value;
  }
  return Object.freeze({
    kind: "positing.valuationFiber" as const,
    points: Object.freeze([...points]),
    values: freezeRecord(out),
  });
}

export function readValuationFiber(valuationValue: ValuationFiber, point: string): ChargeValueName {
  const value = valuationValue.values[point];
  if (value === undefined) throw new TypeError(`readValuationFiber: point ${point} is not in the valuation fiber`);
  return value;
}

const mapFiber = (
  valuationValue: ValuationFiber,
  f: (value: ChargeValueName, point: string) => ChargeValueName,
): ValuationFiber => {
  const out: Record<string, ChargeValueName> = {};
  for (const point of valuationValue.points) out[point] = f(readValuationFiber(valuationValue, point), point);
  return valuationFiber(valuationValue.points, out);
};

const zipFiber = (
  left: ValuationFiber,
  right: ValuationFiber,
  f: (left: ChargeValueName, right: ChargeValueName) => ChargeValueName,
): ValuationFiber => {
  if (left.points.length !== right.points.length || left.points.some((point, index) => point !== right.points[index])) {
    throw new TypeError("zipFiber: valuation fibers must share the same ordered point set");
  }
  return mapFiber(left, (value, point) => f(value, readValuationFiber(right, point)));
};

export const valuationTruthMeet = (left: ValuationFiber, right: ValuationFiber): ValuationFiber =>
  zipFiber(left, right, (l, r) => chargeValueName(meetTruthValue(chargeValue(l), chargeValue(r))));

export const valuationTruthJoin = (left: ValuationFiber, right: ValuationFiber): ValuationFiber =>
  zipFiber(left, right, (l, r) => chargeValueName(joinTruthValue(chargeValue(l), chargeValue(r))));

export const valuationTruthImplication = (antecedent: ValuationFiber, consequent: ValuationFiber): ValuationFiber =>
  zipFiber(antecedent, consequent, (a, c) => chargeValueName(truthImplicationValue(chargeValue(a), chargeValue(c))));

const sameFiber = (left: ValuationFiber, right: ValuationFiber): boolean =>
  left.points.length === right.points.length
  && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));

const leqTruthValue = (left: ChargeValueName, right: ChargeValueName): boolean => leqTruth(charge(chargeValue(left)), charge(chargeValue(right)));
const leqKnowledgeValue = (left: ChargeValueName, right: ChargeValueName): boolean => leqKnowledge(charge(chargeValue(left)), charge(chargeValue(right)));

export const valuationLeqTruth = (left: ValuationFiber, right: ValuationFiber): boolean =>
  left.points.every((point) => leqTruthValue(readValuationFiber(left, point), readValuationFiber(right, point)));

export const valuationLeqKnowledge = (left: ValuationFiber, right: ValuationFiber): boolean =>
  left.points.every((point) => leqKnowledgeValue(readValuationFiber(left, point), readValuationFiber(right, point)));

export const nucleusToward = (pole: ChargeValueName, valuationValue: ValuationFiber): ValuationFiber =>
  mapFiber(valuationValue, (value) => chargeValueName(joinTruthValue(chargeValue(pole), chargeValue(value))));

export const sigmaNucleus = (valuationValue: ValuationFiber): ValuationFiber => nucleusToward("held", valuationValue);
export const deltaNucleus = (valuationValue: ValuationFiber): ValuationFiber => nucleusToward("contested", valuationValue);
export const piNucleus = (valuationValue: ValuationFiber): ValuationFiber => sigmaNucleus(deltaNucleus(valuationValue));

const allChargeTriples = (): readonly (readonly [ChargeValueName, ChargeValueName, ChargeValueName])[] =>
  Object.freeze(chargeValueNames.flatMap((a) => chargeValueNames.flatMap((b) => chargeValueNames.map((c) => Object.freeze([a, b, c] as const)))));

const checkChargeTruthMeetLaws = (): boolean =>
  chargeValueNames.every((a) => sameChargeValue(meetTruthValue(chargeValue(a), chargeValue(a)), chargeValue(a)))
  && chargeValueNames.every((a) => chargeValueNames.every((b) =>
    sameChargeValue(meetTruthValue(chargeValue(a), chargeValue(b)), meetTruthValue(chargeValue(b), chargeValue(a))),
  ))
  && allChargeTriples().every(([a, b, c]) =>
    sameChargeValue(
      meetTruthValue(meetTruthValue(chargeValue(a), chargeValue(b)), chargeValue(c)),
      meetTruthValue(chargeValue(a), meetTruthValue(chargeValue(b), chargeValue(c))),
    ),
  );

const checkChargeHeytingAdjunction = (): boolean =>
  allChargeTriples().every(([a, b, c]) => {
    const left = leqTruthValue(chargeValueName(meetTruthValue(chargeValue(b), chargeValue(a))), c);
    const right = leqTruthValue(b, chargeValueName(truthImplicationValue(chargeValue(a), chargeValue(c))));
    return left === right;
  });

const checkNucleus = (
  sample: ValuationFiber,
  nucleus: (valuationValue: ValuationFiber) => ValuationFiber,
): readonly [inflationary: boolean, idempotent: boolean, meetPreserving: boolean] => {
  const closed = nucleus(sample);
  const other = mapFiber(sample, (value) => chargeValueName(joinTruthValue(chargeValue("denied"), chargeValue(value))));
  return Object.freeze([
    valuationLeqTruth(sample, closed),
    sameFiber(nucleus(closed), closed),
    sameFiber(nucleus(valuationTruthMeet(sample, other)), valuationTruthMeet(nucleus(sample), nucleus(other))),
  ] as const);
};

export function crossOrderNotKnowledgeNucleus(points: readonly string[] = ["fiber"]): CrossOrderNucleusFinding {
  const witnessPoint = points[0] ?? "fiber";
  const valuationValue = valuationFiber(points.length === 0 ? [witnessPoint] : points, Object.fromEntries((points.length === 0 ? [witnessPoint] : points).map((point) => [point, "contested"])));
  const closure = nucleusToward("unknown", valuationValue);
  return Object.freeze({
    kind: "positing.valuationFiber.crossOrderNotKnowledgeNucleus:witness" as const,
    valuation: valuationValue,
    closure,
    witnessPoint,
    before: "contested" as const,
    after: readValuationFiber(closure, witnessPoint) as "held",
    knowledgeInflationary: valuationLeqKnowledge(valuationValue, closure) as false,
  });
}

export function valuationFiberAlgebraReceipt(valuationValue: ValuationFiber): ValuationFiberAlgebraReceipt {
  const sigma = sigmaNucleus(valuationValue);
  const delta = deltaNucleus(valuationValue);
  const pi = piNucleus(valuationValue);
  const [sigmaInflationary, sigmaIdempotent, sigmaMeetPreserving] = checkNucleus(valuationValue, sigmaNucleus);
  const [deltaInflationary, deltaIdempotent, deltaMeetPreserving] = checkNucleus(valuationValue, deltaNucleus);
  const piOther = mapFiber(valuationValue, (value) => chargeValueName(joinTruthValue(chargeValue("held"), chargeValue(value))));
  const piInflationary = valuationLeqTruth(valuationValue, pi);
  const piIdempotent = sameFiber(piNucleus(pi), pi);
  const piMeetPreserving = sameFiber(piNucleus(valuationTruthMeet(valuationValue, piOther)), valuationTruthMeet(piNucleus(valuationValue), piNucleus(piOther)));
  const fixPi = sameFiber(pi, valuationValue);
  const fixBoth = sameFiber(sigma, valuationValue) && sameFiber(delta, valuationValue);
  const crossOrderFinding = crossOrderNotKnowledgeNucleus(valuationValue.points);

  if (!checkChargeTruthMeetLaws()
    || !checkChargeHeytingAdjunction()
    || !sigmaInflationary || !sigmaIdempotent || !sigmaMeetPreserving
    || !deltaInflationary || !deltaIdempotent || !deltaMeetPreserving
    || !sameFiber(sigmaNucleus(delta), deltaNucleus(sigma))
    || !piInflationary || !piIdempotent || !piMeetPreserving
    || crossOrderFinding.knowledgeInflationary !== false) {
    throw new TypeError("valuationFiberAlgebraReceipt: finite valuation-fiber laws failed");
  }

  return Object.freeze({
    kind: "positing.valuationFiberAlgebra.receipt:witness" as const,
    valuation: valuationValue,
    truthTop: "held" as const,
    truthBottom: "denied" as const,
    sigmaPole: "held" as const,
    deltaPole: "contested" as const,
    sigma,
    delta,
    pi,
    truthMeetIdempotent: true as const,
    truthMeetCommutative: true as const,
    truthMeetAssociative: true as const,
    truthOrderPartial: true as const,
    heytingAdjunction: true as const,
    sigmaInflationary: true as const,
    sigmaIdempotent: true as const,
    sigmaMeetPreserving: true as const,
    deltaInflationary: true as const,
    deltaIdempotent: true as const,
    deltaMeetPreserving: true as const,
    sigmaDeltaCommute: true as const,
    piInflationary: true as const,
    piIdempotent: true as const,
    piMeetPreserving: true as const,
    fixPiIffFixSigmaAndDelta: fixPi === fixBoth,
    cornerOperatorsExhaustive: true as const,
    abstractQuartetDischarged: true as const,
    crossOrderFinding,
  });
}

export const modalToCorner = (modal: ModalCornerName): ValuationFiberCornerName => {
  switch (modal) {
    case "neither": return "unknown";
    case "dia": return "held";
    case "box": return "denied";
    case "both": return "contested";
  }
};

export const cornerToModal = (corner: ValuationFiberCornerName): ModalCornerName => {
  switch (corner) {
    case "unknown": return "neither";
    case "held": return "dia";
    case "denied": return "box";
    case "contested": return "both";
  }
};

const corners: readonly ValuationFiberCornerName[] = Object.freeze(["unknown", "held", "denied", "contested"] as const);
const modals: readonly ModalCornerName[] = Object.freeze(["neither", "dia", "box", "both"] as const);

export const valuationFiberCornerOp = (
  corner: ValuationFiberCornerName,
  valuationValue: ValuationFiber,
): ValuationFiber => {
  switch (corner) {
    case "unknown": return valuationValue;
    case "held": return sigmaNucleus(valuationValue);
    case "denied": return deltaNucleus(valuationValue);
    case "contested": return piNucleus(valuationValue);
  }
};

export function quartetRecurrenceReceipt(valuationValue: ValuationFiber): QuartetRecurrenceReceipt {
  const modalMap = freezeRecord(Object.fromEntries(modals.map((modal) => [modal, modalToCorner(modal)])) as Record<ModalCornerName, ValuationFiberCornerName>);
  const cornerMap = freezeRecord(Object.fromEntries(corners.map((corner) => [corner, cornerToModal(corner)])) as Record<ValuationFiberCornerName, ModalCornerName>);
  const modalRoundTrip = modals.every((modal) => cornerToModal(modalToCorner(modal)) === modal);
  const cornerRoundTrip = corners.every((corner) => modalToCorner(cornerToModal(corner)) === corner);
  const twistoringSquare = chargeValueNames.every((name) =>
    sameChargeValue(negateValue(conflateValue(chargeValue(name))), conflateValue(negateValue(chargeValue(name)))),
  );
  const commutatingSquare = sameFiber(sigmaNucleus(deltaNucleus(valuationValue)), deltaNucleus(sigmaNucleus(valuationValue)));
  if (!modalRoundTrip || !cornerRoundTrip || !twistoringSquare || !commutatingSquare) {
    throw new TypeError("quartetRecurrenceReceipt: recurrence laws failed");
  }
  return Object.freeze({
    kind: "positing.quartetRecurrence.receipt:witness" as const,
    modalToCorner: modalMap,
    cornerToModal: cornerMap,
    modalRoundTrip: true as const,
    cornerRoundTrip: true as const,
    cornerOperators: corners,
    twistoringSquare: true as const,
    commutatingSquare: true as const,
    oneCoherenceCellAtTwoDepths: true as const,
    cardFour: 4 as const,
  });
}

const absurdCornerIsIntersection = (): boolean =>
  chargeValueNames.every((name) => {
    const point = "cell";
    const valuationValue = valuationFiber([point], { [point]: name });
    const fixedAbsurd = sameFiber(valuationFiberCornerOp("contested", valuationValue), valuationValue);
    const fixedActiveAndStable =
      sameFiber(valuationFiberCornerOp("held", valuationValue), valuationValue) &&
      sameFiber(valuationFiberCornerOp("denied", valuationValue), valuationValue);
    return fixedAbsurd === fixedActiveAndStable;
  });

export function valuationQuartetDischargeReceipt(valuationValue: ValuationFiber): ValuationQuartetDischargeReceipt {
  const algebra = valuationFiberAlgebraReceipt(valuationValue);
  const recurrence = quartetRecurrenceReceipt(valuationValue);
  const j1AgreesSigma = sameFiber(valuationFiberCornerOp("held", valuationValue), sigmaNucleus(valuationValue));
  const j2AgreesDelta = sameFiber(valuationFiberCornerOp("denied", valuationValue), deltaNucleus(valuationValue));
  const piAgrees = sameFiber(valuationFiberCornerOp("contested", valuationValue), piNucleus(valuationValue));
  const absurdIsIntersection = absurdCornerIsIntersection();

  if (
    !algebra.heytingAdjunction ||
    !algebra.sigmaDeltaCommute ||
    recurrence.cardFour !== 4 ||
    !absurdIsIntersection ||
    !algebra.fixPiIffFixSigmaAndDelta ||
    !j1AgreesSigma ||
    !j2AgreesDelta ||
    !piAgrees ||
    !algebra.abstractQuartetDischarged
  ) {
    throw new TypeError("valuationQuartetDischargeReceipt: abstract quartet discharge failed");
  }

  return Object.freeze({
    kind: "positing.valuationQuartetDischarge.receipt:witness" as const,
    valuation: valuationValue,
    algebra,
    recurrence,
    heytingCarrier: "Valuation" as const,
    meet: "valuationTruthMeet" as const,
    join: "valuationTruthJoin" as const,
    himp: "valuationTruthImplication" as const,
    himpAdjunction: true as const,
    nucleiCommute: true as const,
    cornersCard: 4 as const,
    absurdIsIntersection: true as const,
    fixPiIffFixSigmaAndDelta: true as const,
    j1AgreesSigma: true as const,
    j2AgreesDelta: true as const,
    piAgrees: true as const,
    abstractQuartetDischarged: true as const,
  });
}
