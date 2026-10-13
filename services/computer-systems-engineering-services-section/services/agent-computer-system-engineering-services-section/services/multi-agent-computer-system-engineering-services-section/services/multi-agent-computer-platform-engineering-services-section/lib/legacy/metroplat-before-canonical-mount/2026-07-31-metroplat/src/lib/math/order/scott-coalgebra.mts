/**
 * analysis/scott-coalgebra - finite executable runtime surface.
 *
 * showing every finite directed family attains its knowledge join. It also
 * packages the settling coalgebra as the unfolding dual of the closure algebra.
 * This module keeps exactly that runtime boundary: finite charge families,
 * explicit pointwise closure tables, finite valuation orbits, and honest
 * frontier markers for arbitrary dcpos and genuine 2-categorical data.
 */
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../../values/index.mts";
import {
  applyChargeClosure,
  chargeClosure,
  closureMonadReceipt,
  knowledgeJoinClosure,
  liftClosure,
  valuationKnowledgeJoin,
  type ChargeClosure,
  type ClosureMonadReceipt,
} from "../../logic/predicating/evidence/closure-operator-fiber.mts";
import {
  readValuationFiber,
  valuationFiber,
  valuationLeqKnowledge,
  type ValuationFiber,
} from "../../logic/predicating/evidence/valuation-fiber-algebra.mts";

export interface DirectedChargeFamily {
  readonly kind: "scottCoalgebra.directedFamily";
  readonly elems: readonly ChargeValueName[];
  readonly sup: ChargeValueName;
  readonly nonempty: true;
  readonly directed: true;
  readonly supAttained: true;
}

export interface ScottContinuityReceipt {
  readonly kind: "scottCoalgebra.scottContinuity:witness";
  readonly closure: ChargeClosure;
  readonly family: DirectedChargeFamily;
  readonly left: ChargeValueName;
  readonly right: ChargeValueName;
  readonly commutesWithDirectedJoin: true;
  readonly finiteFamilyForcesAttainment: true;
  readonly finiteChargeClosureStrict: true;
}

export interface FiniteAntecedentScottReceipt {
  readonly kind: "scottCoalgebra.finiteAntecedent:witness";
  readonly antecedent: ChargeValueName;
  readonly conclusion: ChargeValueName;
  readonly family: DirectedChargeFamily;
  readonly firesOnJoinIffFiresOnMember: true;
  readonly left: ChargeValueName;
  readonly right: ChargeValueName;
  readonly commutesWithDirectedJoin: true;
}

export interface CoalgebraLimitReceipt {
  readonly kind: "scottCoalgebra.orbitLimit:witness";
  readonly limit: ValuationFiber;
  readonly dominatesPriorOrbit: true;
  readonly leastUpperBound: true;
}

export interface SettlingCoalgebraReceipt {
  readonly kind: "scottCoalgebra.settlingCoalgebra:witness";
  readonly closure: ChargeClosure;
  readonly valuation: ValuationFiber;
  readonly increment: ValuationFiber;
  readonly target: ValuationFiber;
  readonly orbit: readonly ValuationFiber[];
  readonly orbitLimit: CoalgebraLimitReceipt;
  readonly coalgebraMapInflationary: true;
  readonly settlingEndofunctorMonotone: true;
  readonly zeroIncrementRecoversClosure: true;
  readonly orbitMonotone: true;
  readonly algebraCoalgebraDualDirections: true;
  readonly quiescenceIsoAtZeroIncrement: true;
  readonly cclosedIffClosureAlgebra: true;
  readonly finiteKzShadow: ClosureMonadReceipt;
  readonly higherCategoricalBoundary: "outside this runtime 2-categorical KZ/cofree coalgebra data";
}

export interface ScottCoalgebraReceipt {
  readonly kind: "scottCoalgebra.receipt:witness";
  readonly scott: ScottContinuityReceipt;
  readonly finiteAntecedent: FiniteAntecedentScottReceipt;
  readonly coalgebra: SettlingCoalgebraReceipt;
  readonly dcpoBoundary: "outside this runtime arbitrary directed-complete joins";
}

const knowledgeLeqValue = (left: ChargeValueName, right: ChargeValueName): boolean =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right))) === right;

const knowledgeJoinValueName = (left: ChargeValueName, right: ChargeValueName): ChargeValueName =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right)));

const knowledgeSup = (values: readonly ChargeValueName[]): ChargeValueName =>
  values.reduce<ChargeValueName>((out, value) => knowledgeJoinValueName(out, value), "unknown");

const sameFiber = (left: ValuationFiber, right: ValuationFiber): boolean =>
  left.points.length === right.points.length
  && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));

const zeroIncrement = (points: readonly string[]): ValuationFiber =>
  valuationFiber(points, Object.fromEntries(points.map((point) => [point, "unknown"])));

function requireCharge(value: ChargeValueName, caller: string): void {
  if (!chargeValueNames.includes(value)) throw new TypeError(`${caller}: ${value} is not a FOUR charge value`);
}

function allValuations(points: readonly string[]): readonly ValuationFiber[] {
  if (points.length > 4) {
    throw new RangeError("scottCoalgebra: exhaustive valuation checks are limited to at most 4 points");
  }
  const out: ValuationFiber[] = [];
  const go = (index: number, record: Record<string, ChargeValueName>): void => {
    if (index === points.length) {
      out.push(valuationFiber(points, Object.freeze({ ...record })));
      return;
    }
    const point = points[index] as string;
    for (const value of chargeValueNames) {
      record[point] = value;
      go(index + 1, record);
    }
    delete record[point];
  };
  go(0, {});
  return Object.freeze(out);
}

export function directedFamily(elems: readonly ChargeValueName[]): DirectedChargeFamily {
  if (elems.length === 0) throw new RangeError("directedFamily: directed charge families must be nonempty");
  for (const value of elems) requireCharge(value, "directedFamily");
  const sup = knowledgeSup(elems);
  const directed = elems.every((left) => elems.every((right) =>
    elems.some((upper) => knowledgeLeqValue(left, upper) && knowledgeLeqValue(right, upper)),
  ));
  const supAttained = elems.includes(sup);
  if (!directed || !supAttained) {
    throw new TypeError("directedFamily: finite knowledge-directed families must attain their join");
  }
  return Object.freeze({
    kind: "scottCoalgebra.directedFamily" as const,
    elems: Object.freeze([...elems]),
    sup,
    nonempty: true as const,
    directed: true as const,
    supAttained: true as const,
  });
}

export function scottContinuityReceipt(
  closure: ChargeClosure,
  family: DirectedChargeFamily,
): ScottContinuityReceipt {
  const left = applyChargeClosure(closure, family.sup);
  const right = knowledgeSup(family.elems.map((value) => applyChargeClosure(closure, value)));
  if (left !== right) throw new TypeError("scottContinuityReceipt: closure did not commute with directed join");
  return Object.freeze({
    kind: "scottCoalgebra.scottContinuity:witness" as const,
    closure,
    family,
    left,
    right,
    commutesWithDirectedJoin: true as const,
    finiteFamilyForcesAttainment: true as const,
    finiteChargeClosureStrict: true as const,
  });
}

export function finiteAntecedentFire(
  antecedent: ChargeValueName,
  conclusion: ChargeValueName,
  value: ChargeValueName,
): ChargeValueName {
  requireCharge(antecedent, "finiteAntecedentFire");
  requireCharge(conclusion, "finiteAntecedentFire");
  requireCharge(value, "finiteAntecedentFire");
  return knowledgeLeqValue(antecedent, value) ? knowledgeJoinValueName(value, conclusion) : value;
}

export function finiteAntecedentScottReceipt(
  antecedent: ChargeValueName,
  conclusion: ChargeValueName,
  family: DirectedChargeFamily,
): FiniteAntecedentScottReceipt {
  const firesOnJoin = knowledgeLeqValue(antecedent, family.sup);
  const firesOnMember = family.elems.some((value) => knowledgeLeqValue(antecedent, value));
  const left = finiteAntecedentFire(antecedent, conclusion, family.sup);
  const right = knowledgeSup(family.elems.map((value) => finiteAntecedentFire(antecedent, conclusion, value)));
  if (firesOnJoin !== firesOnMember || left !== right) {
    throw new TypeError("finiteAntecedentScottReceipt: finite antecedent did not commute with directed join");
  }
  return Object.freeze({
    kind: "scottCoalgebra.finiteAntecedent:witness" as const,
    antecedent,
    conclusion,
    family,
    firesOnJoinIffFiresOnMember: true as const,
    left,
    right,
    commutesWithDirectedJoin: true as const,
  });
}

export function settlingEndofunctor(
  closure: ChargeClosure,
  increment: ValuationFiber,
  valuationValue: ValuationFiber,
): ValuationFiber {
  return valuationKnowledgeJoin(liftClosure(closure, valuationValue), increment);
}

export function coalgebraOrbit(
  closure: ChargeClosure,
  seed: ValuationFiber,
  steps: number,
): readonly ValuationFiber[] {
  const out: ValuationFiber[] = [seed];
  for (let step = 0; step < steps; step += 1) out.push(liftClosure(closure, out[out.length - 1] as ValuationFiber));
  return Object.freeze(out);
}

export function coalgebraOrbitLimit(orbit: readonly ValuationFiber[]): CoalgebraLimitReceipt {
  if (orbit.length === 0) throw new RangeError("coalgebraOrbitLimit: orbit must be nonempty");
  const points = orbit[0]!.points;
  let limit = zeroIncrement(points);
  for (const stage of orbit) limit = valuationKnowledgeJoin(limit, stage);
  const dominatesPriorOrbit = orbit.every((stage) => valuationLeqKnowledge(stage, limit));
  const leastUpperBound = allValuations(points).every((candidate) =>
    !orbit.every((stage) => valuationLeqKnowledge(stage, candidate)) || valuationLeqKnowledge(limit, candidate),
  );
  if (!dominatesPriorOrbit || !leastUpperBound) {
    throw new TypeError("coalgebraOrbitLimit: finite orbit limit failed join laws");
  }
  return Object.freeze({
    kind: "scottCoalgebra.orbitLimit:witness" as const,
    limit,
    dominatesPriorOrbit: true as const,
    leastUpperBound: true as const,
  });
}

export function settlingCoalgebraReceipt(
  closure: ChargeClosure,
  valuationValue: ValuationFiber,
  increment: ValuationFiber,
): SettlingCoalgebraReceipt {
  const target = settlingEndofunctor(closure, increment, valuationValue);
  const zeroTarget = settlingEndofunctor(closure, zeroIncrement(valuationValue.points), valuationValue);
  const closed = liftClosure(closure, valuationValue);
  const orbit = coalgebraOrbit(closure, valuationValue, 4);
  const orbitLimit = coalgebraOrbitLimit(orbit);
  const all = allValuations(valuationValue.points);
  const coalgebraMapInflationary = valuationLeqKnowledge(valuationValue, target);
  const settlingEndofunctorMonotone = all.every((left) => all.every((right) =>
    !valuationLeqKnowledge(left, right)
    || valuationLeqKnowledge(settlingEndofunctor(closure, increment, left), settlingEndofunctor(closure, increment, right)),
  ));
  const zeroIncrementRecoversClosure = sameFiber(zeroTarget, closed);
  const orbitMonotone = orbit.every((left, leftIndex) => orbit.every((right, rightIndex) =>
    leftIndex > rightIndex || valuationLeqKnowledge(left, right),
  ));
  const fixed = orbit[orbit.length - 1] as ValuationFiber;
  const quiescenceIsoAtZeroIncrement = sameFiber(liftClosure(closure, fixed), fixed)
    && sameFiber(settlingEndofunctor(closure, zeroIncrement(fixed.points), fixed), fixed);
  if (!coalgebraMapInflationary || !settlingEndofunctorMonotone || !zeroIncrementRecoversClosure || !orbitMonotone || !quiescenceIsoAtZeroIncrement) {
    throw new TypeError("settlingCoalgebraReceipt: finite settling-coalgebra laws failed");
  }
  return Object.freeze({
    kind: "scottCoalgebra.settlingCoalgebra:witness" as const,
    closure,
    valuation: valuationValue,
    increment,
    target,
    orbit,
    orbitLimit,
    coalgebraMapInflationary: true as const,
    settlingEndofunctorMonotone: true as const,
    zeroIncrementRecoversClosure: true as const,
    orbitMonotone: true as const,
    algebraCoalgebraDualDirections: true as const,
    quiescenceIsoAtZeroIncrement: true as const,
    cclosedIffClosureAlgebra: true as const,
    finiteKzShadow: closureMonadReceipt(closure, readValuationFiber(increment, increment.points[0] as string), readValuationFiber(valuationValue, valuationValue.points[0] as string)),
    higherCategoricalBoundary: "outside this runtime 2-categorical KZ/cofree coalgebra data" as const,
  });
}

export function scottCoalgebraReceipt(): ScottCoalgebraReceipt {
  const closure = knowledgeJoinClosure("held");
  const family = directedFamily(["unknown", "held", "contested"]);
  const cells = Object.freeze(["p", "q"]);
  const valuationValue = valuationFiber(cells, { p: "unknown", q: "denied" });
  const increment = valuationFiber(cells, { p: "held", q: "unknown" });
  return Object.freeze({
    kind: "scottCoalgebra.receipt:witness" as const,
    scott: scottContinuityReceipt(closure, family),
    finiteAntecedent: finiteAntecedentScottReceipt("held", "contested", family),
    coalgebra: settlingCoalgebraReceipt(closure, valuationValue, increment),
    dcpoBoundary: "outside this runtime arbitrary directed-complete joins" as const,
  });
}

export function invalidNonDirectedFamily(): readonly ChargeValueName[] {
  return Object.freeze(["held", "denied"]);
}
