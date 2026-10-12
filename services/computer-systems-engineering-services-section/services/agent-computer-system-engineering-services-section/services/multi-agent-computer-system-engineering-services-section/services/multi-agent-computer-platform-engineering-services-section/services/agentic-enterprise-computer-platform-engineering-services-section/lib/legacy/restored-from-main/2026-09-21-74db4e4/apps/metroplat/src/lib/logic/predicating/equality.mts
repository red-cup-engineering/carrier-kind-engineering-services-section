/**
 * predicating/equality — finite executable runtime surface.
 *
 * Equality is derived by diagonal existential image, not admitted as a primitive:
 * classical equality uses the truth-order existential over the diagonal terminal,
 * while paraconsistent equality uses the knowledge-order existential.
 */
import { termCoincides, type PredicationTerm } from "@red-cup-engineering/computer-data-engine/predication";
import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  joinTruthValue,
  meetTruthValue,
  type ChargeValue,
  type ChargeValueName,
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";

export interface EqualityCell {
  readonly kind: "predicating.equality.cell";
  readonly subject: PredicationTerm;
  readonly object: PredicationTerm;
  readonly diagonal: boolean;
  readonly classical: ChargeValue;
  readonly paraconsistent: ChargeValue;
}

export interface PredicatingEqualityReceipt {
  readonly kind: "predicating.equality.receipt:witness";
  readonly cells: readonly EqualityCell[];
  readonly classicalDiagonal: ChargeValueName;
  readonly classicalOffDiagonal: ChargeValueName;
  readonly paraconsistentDiagonal: ChargeValueName;
  readonly paraconsistentOffDiagonal: ChargeValueName;
  readonly reflexiveClassical: true;
  readonly reflexiveParaconsistent: true;
  readonly sameSupport: true;
  readonly derivedFromDiagonal: true;
}

export interface FiniteFibration {
  readonly kind: "predicating.equality.finiteFibration";
  readonly bases: readonly string[];
  readonly fibers: readonly (readonly string[])[];
}

export interface FibrationQuantifierReceipt {
  readonly kind: "predicating.equality.truthQuantifier:witness";
  readonly fibration: FiniteFibration;
  readonly valuation: Readonly<Record<string, ChargeValueName>>;
  readonly existsTruth: Readonly<Record<string, ChargeValueName>>;
  readonly forallTruth: Readonly<Record<string, ChargeValueName>>;
  readonly emptyFiberExistsTruth: ChargeValueName;
  readonly emptyFiberForallTruth: ChargeValueName;
  readonly singletonFiberIdentity: boolean;
  readonly truthOrderAdjunctionFinite: true;
}

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

export function truthJoinList(values: readonly ChargeValue[]): ChargeValue {
  return values.reduce((acc, value) => joinTruthValue(acc, value), chargeValue("denied"));
}

export function truthMeetList(values: readonly ChargeValue[]): ChargeValue {
  return values.reduce((acc, value) => meetTruthValue(acc, value), chargeValue("held"));
}

export function knowledgeJoinList(values: readonly ChargeValue[]): ChargeValue {
  return values.reduce((acc, value) => joinKnowledgeValue(acc, value), chargeValue("unknown"));
}

export function diagonalFiber(subject: PredicationTerm, object: PredicationTerm): readonly [PredicationTerm] | readonly [] {
  return termCoincides(subject, object) ? Object.freeze([subject] as const) : Object.freeze([]);
}

export function classicalEq(subject: PredicationTerm, object: PredicationTerm): ChargeValue {
  return truthJoinList(diagonalFiber(subject, object).map(() => chargeValue("held")));
}

export function paraconsistentEq(subject: PredicationTerm, object: PredicationTerm): ChargeValue {
  return knowledgeJoinList(diagonalFiber(subject, object).map(() => chargeValue("contested")));
}

const plainTerm = (term: PredicationTerm): PredicationTerm => Object.freeze({
  kind: term.kind,
  hand: term.hand,
  mark: Object.freeze({
    kind: term.mark.kind,
    value: term.mark.value,
  }),
}) as PredicationTerm;

export function equalityCell(subject: PredicationTerm, object: PredicationTerm): EqualityCell {
  const diagonal = termCoincides(subject, object);
  return Object.freeze({
    kind: "predicating.equality.cell" as const,
    subject: plainTerm(subject),
    object: plainTerm(object),
    diagonal,
    classical: classicalEq(subject, object),
    paraconsistent: paraconsistentEq(subject, object),
  });
}

export function predicatingEqualityReceipt(entities: readonly PredicationTerm[]): PredicatingEqualityReceipt {
  const cells = Object.freeze(entities.flatMap((subject) => entities.map((object) => equalityCell(subject, object))));
  const diagonalCells = cells.filter((cell) => cell.diagonal);
  const offDiagonalCells = cells.filter((cell) => !cell.diagonal);
  const supportAgreement = cells.every((cell) =>
    (chargeValueName(cell.classical) === "held") === (chargeValueName(cell.paraconsistent) === "contested"),
  );
  const reflexiveClassical = diagonalCells.every((cell) => chargeValueName(cell.classical) === "held");
  const reflexiveParaconsistent = diagonalCells.every((cell) => chargeValueName(cell.paraconsistent) === "contested");
  const sameSupport = supportAgreement && offDiagonalCells.every((cell) =>
    chargeValueName(cell.classical) === "denied" && chargeValueName(cell.paraconsistent) === "unknown",
  );
  if (!reflexiveClassical || !reflexiveParaconsistent || !sameSupport) {
    throw new TypeError("predicatingEqualityReceipt: diagonal equality laws failed");
  }
  return Object.freeze({
    kind: "predicating.equality.receipt:witness" as const,
    cells,
    classicalDiagonal: "held" as const,
    classicalOffDiagonal: "denied" as const,
    paraconsistentDiagonal: "contested" as const,
    paraconsistentOffDiagonal: "unknown" as const,
    reflexiveClassical: true as const,
    reflexiveParaconsistent: true as const,
    sameSupport: true as const,
    derivedFromDiagonal: true as const,
  });
}

export function finiteFibration(bases: readonly string[], fibers: readonly (readonly string[])[]): FiniteFibration {
  if (bases.length !== fibers.length) throw new RangeError("finiteFibration: one fiber per base is required");
  return Object.freeze({
    kind: "predicating.equality.finiteFibration" as const,
    bases: Object.freeze([...bases]),
    fibers: Object.freeze(fibers.map((fiber) => Object.freeze([...fiber]))),
  });
}

const readValuation = (valuation: Readonly<Record<string, ChargeValueName>>, point: string): ChargeValue =>
  chargeValue(valuation[point] ?? "unknown");

export function truthQuantifierReceipt(
  fibration: FiniteFibration,
  valuation: Readonly<Record<string, ChargeValueName>>,
): FibrationQuantifierReceipt {
  const existsTruth: Record<string, ChargeValueName> = {};
  const forallTruth: Record<string, ChargeValueName> = {};
  fibration.bases.forEach((base, index) => {
    const fiber = fibration.fibers[index] ?? [];
    const values = fiber.map((point) => readValuation(valuation, point));
    existsTruth[base] = chargeValueName(truthJoinList(values));
    forallTruth[base] = chargeValueName(truthMeetList(values));
  });
  const singletonFiberIdentity = fibration.bases.every((base, index) => {
    const fiber = fibration.fibers[index] ?? [];
    return fiber.length !== 1 || (existsTruth[base] === (valuation[fiber[0] as string] ?? "unknown") && forallTruth[base] === (valuation[fiber[0] as string] ?? "unknown"));
  });
  return Object.freeze({
    kind: "predicating.equality.truthQuantifier:witness" as const,
    fibration,
    valuation: freezeRecord({ ...valuation }),
    existsTruth: freezeRecord(existsTruth),
    forallTruth: freezeRecord(forallTruth),
    emptyFiberExistsTruth: "denied" as const,
    emptyFiberForallTruth: "held" as const,
    singletonFiberIdentity,
    truthOrderAdjunctionFinite: true as const,
  });
}
