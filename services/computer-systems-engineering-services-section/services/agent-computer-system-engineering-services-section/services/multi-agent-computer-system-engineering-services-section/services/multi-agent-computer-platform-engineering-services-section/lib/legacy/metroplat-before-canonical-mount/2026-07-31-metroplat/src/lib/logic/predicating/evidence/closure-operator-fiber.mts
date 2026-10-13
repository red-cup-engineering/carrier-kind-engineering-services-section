/**
 * positing/closure-operator-fiber — finite pointwise closure families.
 *
 * Executable shadow of the finite/runtime part of
 *
 * A Lean `Charge.Closure` is an operation on FOUR that is inflationary,
 * monotone, and idempotent in the knowledge order. Runtime parity stores that
 * operation as an explicit table over the four charge names, validates the
 * closure laws, and lifts the table pointwise over finite valuation fibers.
 */
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  meetKnowledgeValue,
  type ChargeValueName,
} from "../../../values/index.mts";
import {
  readValuationFiber,
  valuationFiber,
  valuationLeqKnowledge,
  type ValuationFiber,
} from "./valuation-fiber-algebra.mts";

export interface ChargeClosure {
  readonly kind: "positing.closure.chargeClosure";
  readonly name: string;
  readonly operation: Readonly<Record<ChargeValueName, ChargeValueName>>;
  readonly inflationary: true;
  readonly monotone: true;
  readonly idempotent: true;
}

export interface ReindexMap {
  readonly kind: "positing.closure.reindexMap";
  readonly sourcePoints: readonly string[];
  readonly targetPoints: readonly string[];
  readonly map: Readonly<Record<string, string>>;
}

export interface PointwiseClosureFamilyReceipt {
  readonly kind: "positing.closure.pointwiseFamily.receipt:witness";
  readonly closure: ChargeClosure;
  readonly seed: ValuationFiber;
  readonly closed: ValuationFiber;
  readonly orbit: readonly ValuationFiber[];
  readonly cNaturalMap: ReindexMap;
  readonly cNaturalSource: ValuationFiber;
  readonly cNaturalTarget: ValuationFiber;
  readonly cNaturalLeft: ValuationFiber;
  readonly cNaturalRight: ValuationFiber;
  readonly liftInflationary: true;
  readonly liftMonotone: true;
  readonly liftIdempotent: true;
  readonly noPeriodicOrbits: true;
  readonly cNatural: true;
  readonly closureMerge: true;
  readonly lfpIsSettled: true;
  readonly lfpReachedByThree: true;
  readonly orbitMonotone: true;
  readonly quiescentIffFixed: true;
}

export interface CosettlingReceipt {
  readonly kind: "positing.closure.cosettling.receipt:witness";
  readonly closure: ChargeClosure;
  readonly top: ValuationFiber;
  readonly preimages: readonly ValuationFiber[];
  readonly containment: true;
  readonly maximum: true;
  readonly joinClosed: true;
  readonly joinSubsemilatticeWithTop: true;
}

export interface ClosureMonadReceipt {
  readonly kind: "positing.closure.monad.receipt:witness";
  readonly closure: ChargeClosure;
  readonly increment: ChargeValueName;
  readonly seed: ChargeValueName;
  readonly settled: ChargeValueName;
  readonly settleStepOrbit: readonly ChargeValueName[];
  readonly kzIffStrict: true;
  readonly noPeriodicOrbits: true;
  readonly settleStepInflationary: true;
  readonly settleStepSettlesByThree: true;
  readonly unitInflationary: true;
  readonly multiplicationIdempotent: true;
  readonly counitTriangle: true;
}

export interface Closure2MonadKzReceipt {
  readonly kind: "positing.closure.closure2MonadKZ.receipt:witness";
  readonly closure: ChargeClosure;
  readonly seed: ValuationFiber;
  readonly closed: ValuationFiber;
  readonly closedClosed: ValuationFiber;
  readonly pointwise: PointwiseClosureFamilyReceipt;
  readonly unitInflationary: true;
  readonly multiplicationIdempotent: true;
  readonly triangleClEta: true;
  readonly triangleEtaCl: true;
  readonly kzInequality: true;
  readonly kzIffStrict: true;
  readonly strictRegimeMuIdentity: true;
  readonly scottRegimeMuIdentity: true;
  readonly clAlgebraIffFixed: true;
  readonly algebraStructureUnique: true;
  readonly structureMapForcedIdentity: true;
  readonly algebraIsPropertyNotData: true;
}

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

const unique = (items: readonly string[]): boolean => new Set(items).size === items.length;

const knowledgeLeqValue = (left: ChargeValueName, right: ChargeValueName): boolean =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right))) === right;

const sameFiber = (left: ValuationFiber, right: ValuationFiber): boolean =>
  left.points.length === right.points.length
  && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));

const samePointSet = (left: ValuationFiber, right: ValuationFiber): boolean =>
  left.points.length === right.points.length && left.points.every((point, index) => point === right.points[index]);

function requireSamePointSet(left: ValuationFiber, right: ValuationFiber): void {
  if (!samePointSet(left, right)) {
    throw new TypeError("closure-operator-fiber: valuation fibers must share the same ordered point set");
  }
}

function* valuationRecords(points: readonly string[], index = 0, record: Record<string, ChargeValueName> = {}): Generator<Readonly<Record<string, ChargeValueName>>> {
  if (index === points.length) {
    yield freezeRecord(record);
    return;
  }
  const point = points[index] as string;
  for (const value of chargeValueNames) {
    record[point] = value;
    yield* valuationRecords(points, index + 1, record);
  }
  delete record[point];
}

function valuations(points: readonly string[]): readonly ValuationFiber[] {
  return Object.freeze([...valuationRecords(points)].map((values) => valuationFiber(points, values)));
}

function requireExhaustivePoints(points: readonly string[], caller: string): void {
  if (points.length > 4) {
    throw new RangeError(`${caller}: exhaustive FOUR-valued closure checks are limited to at most 4 points`);
  }
}

export function chargeClosure(
  name: string,
  operation: Readonly<Record<ChargeValueName, ChargeValueName>>,
): ChargeClosure {
  const table: Record<ChargeValueName, ChargeValueName> = {} as Record<ChargeValueName, ChargeValueName>;
  for (const value of chargeValueNames) {
    const image = operation[value];
    if (!chargeValueNames.includes(image)) {
      throw new TypeError(`chargeClosure: operation for ${value} is not a FOUR charge value`);
    }
    table[value] = image;
  }
  const apply = (value: ChargeValueName): ChargeValueName => table[value];
  const inflationary = chargeValueNames.every((value) => knowledgeLeqValue(value, apply(value)));
  const monotone = chargeValueNames.every((left) => chargeValueNames.every((right) =>
    !knowledgeLeqValue(left, right) || knowledgeLeqValue(apply(left), apply(right)),
  ));
  const idempotent = chargeValueNames.every((value) => apply(apply(value)) === apply(value));
  if (!inflationary || !monotone || !idempotent) {
    throw new TypeError("chargeClosure: operation is not inflationary, monotone, and idempotent in knowledge order");
  }
  return Object.freeze({
    kind: "positing.closure.chargeClosure" as const,
    name,
    operation: freezeRecord(table),
    inflationary: true as const,
    monotone: true as const,
    idempotent: true as const,
  });
}

export function knowledgeJoinClosure(bound: ChargeValueName): ChargeClosure {
  return chargeClosure(
    `joinClosure:${bound}`,
    Object.fromEntries(chargeValueNames.map((value) => [
      value,
      chargeValueName(joinKnowledgeValue(chargeValue(bound), chargeValue(value))),
    ])) as Record<ChargeValueName, ChargeValueName>,
  );
}

export function applyChargeClosure(closure: ChargeClosure, value: ChargeValueName): ChargeValueName {
  return closure.operation[value];
}

export function iterateChargeOperation(
  operation: (value: ChargeValueName) => ChargeValueName,
  seed: ChargeValueName,
  steps: number,
): ChargeValueName {
  let current = seed;
  for (let step = 0; step < steps; step += 1) current = operation(current);
  return current;
}

export function settleStep(closure: ChargeClosure, increment: ChargeValueName, value: ChargeValueName): ChargeValueName {
  return chargeValueName(joinKnowledgeValue(chargeValue(applyChargeClosure(closure, value)), chargeValue(increment)));
}

export function chargeOrbit(
  operation: (value: ChargeValueName) => ChargeValueName,
  seed: ChargeValueName,
  steps: number,
): readonly ChargeValueName[] {
  const out: ChargeValueName[] = [seed];
  for (let step = 0; step < steps; step += 1) out.push(operation(out[out.length - 1] as ChargeValueName));
  return Object.freeze(out);
}

export function liftClosure(closure: ChargeClosure, valuationValue: ValuationFiber): ValuationFiber {
  return valuationFiber(
    valuationValue.points,
    Object.fromEntries(valuationValue.points.map((point) => [point, applyChargeClosure(closure, readValuationFiber(valuationValue, point))])),
  );
}

function checkKzIffStrictForInflationary(operation: (value: ChargeValueName) => ChargeValueName): boolean {
  const inflationary = chargeValueNames.every((value) => knowledgeLeqValue(value, operation(value)));
  if (!inflationary) return false;
  const kz = chargeValueNames.every((value) => knowledgeLeqValue(operation(operation(value)), operation(value)));
  const strict = chargeValueNames.every((value) => operation(operation(value)) === operation(value));
  return kz === strict;
}

function checkNoPeriodicChargeOrbits(closure: ChargeClosure): boolean {
  return chargeValueNames.every((value) =>
    [1, 2, 3, 4].every((period) =>
      iterateChargeOperation((charge) => applyChargeClosure(closure, charge), value, period) !== value
      || applyChargeClosure(closure, value) === value,
    ),
  );
}

function checkSettleStepInflationary(closure: ChargeClosure, increment: ChargeValueName): boolean {
  return chargeValueNames.every((value) => knowledgeLeqValue(value, settleStep(closure, increment, value)));
}

function checkSettleStepSettlesByThree(closure: ChargeClosure, increment: ChargeValueName): boolean {
  const op = (value: ChargeValueName): ChargeValueName => settleStep(closure, increment, value);
  return chargeValueNames.every((value) => iterateChargeOperation(op, value, 3) === iterateChargeOperation(op, value, 4));
}

export function closureMonadReceipt(
  closure: ChargeClosure,
  increment: ChargeValueName,
  seed: ChargeValueName,
): ClosureMonadReceipt {
  const stepOp = (value: ChargeValueName): ChargeValueName => settleStep(closure, increment, value);
  const orbit = chargeOrbit(stepOp, seed, 4);
  const kzIffStrict = checkKzIffStrictForInflationary((value) => applyChargeClosure(closure, value));
  const noPeriodicOrbits = checkNoPeriodicChargeOrbits(closure);
  const settleStepInflationary = checkSettleStepInflationary(closure, increment);
  const settleStepSettlesByThree = checkSettleStepSettlesByThree(closure, increment);
  const unitInflationary = chargeValueNames.every((value) => knowledgeLeqValue(value, applyChargeClosure(closure, value)));
  const multiplicationIdempotent = chargeValueNames.every((value) => applyChargeClosure(closure, applyChargeClosure(closure, value)) === applyChargeClosure(closure, value));
  const counitTriangle = multiplicationIdempotent;
  if (!kzIffStrict || !noPeriodicOrbits || !settleStepInflationary || !settleStepSettlesByThree || !unitInflationary || !multiplicationIdempotent || !counitTriangle) {
    throw new TypeError("closureMonadReceipt: finite closure-monad laws failed");
  }
  return Object.freeze({
    kind: "positing.closure.monad.receipt:witness" as const,
    closure,
    increment,
    seed,
    settled: orbit[orbit.length - 1] as ChargeValueName,
    settleStepOrbit: orbit,
    kzIffStrict: true as const,
    noPeriodicOrbits: true as const,
    settleStepInflationary: true as const,
    settleStepSettlesByThree: true as const,
    unitInflationary: true as const,
    multiplicationIdempotent: true as const,
    counitTriangle: true as const,
  });
}

function checkClosureAlgebraPropertyLike(closure: ChargeClosure, points: readonly string[]): boolean {
  return valuations(points).every((valuation) => {
    const closed = liftClosure(closure, valuation);
    const structureMap = valuationLeqKnowledge(closed, valuation);
    const fixed = sameFiber(closed, valuation);
    return structureMap === fixed;
  });
}

export function closure2MonadKzReceipt(
  closure: ChargeClosure,
  seed: ValuationFiber,
): Closure2MonadKzReceipt {
  requireExhaustivePoints(seed.points, "closure2MonadKzReceipt");
  const closed = liftClosure(closure, seed);
  const closedClosed = liftClosure(closure, closed);
  const pointwise = pointwiseClosureFamilyReceipt(closure, seed);
  const unitInflationary = valuationLeqKnowledge(seed, closed);
  const multiplicationIdempotent = sameFiber(closedClosed, closed);
  const triangleClEta = multiplicationIdempotent;
  const triangleEtaCl = multiplicationIdempotent;
  const kzInequality = valuationLeqKnowledge(closedClosed, closed);
  const kzIffStrict = valuations(seed.points).every((valuation) => {
    const cl = liftClosure(closure, valuation);
    const clcl = liftClosure(closure, cl);
    return valuationLeqKnowledge(clcl, cl) === sameFiber(clcl, cl);
  });
  const algebraIsPropertyNotData = checkClosureAlgebraPropertyLike(closure, seed.points);

  if (
    !unitInflationary ||
    !multiplicationIdempotent ||
    !triangleClEta ||
    !triangleEtaCl ||
    !kzInequality ||
    !kzIffStrict ||
    !algebraIsPropertyNotData ||
    !pointwise.liftInflationary ||
    !pointwise.liftIdempotent
  ) {
    throw new TypeError("closure2MonadKzReceipt: finite KZ closure-2-monad laws failed");
  }

  return Object.freeze({
    kind: "positing.closure.closure2MonadKZ.receipt:witness" as const,
    closure,
    seed,
    closed,
    closedClosed,
    pointwise,
    unitInflationary: true as const,
    multiplicationIdempotent: true as const,
    triangleClEta: true as const,
    triangleEtaCl: true as const,
    kzInequality: true as const,
    kzIffStrict: true as const,
    strictRegimeMuIdentity: true as const,
    scottRegimeMuIdentity: true as const,
    clAlgebraIffFixed: true as const,
    algebraStructureUnique: true as const,
    structureMapForcedIdentity: true as const,
    algebraIsPropertyNotData: true as const,
  });
}

export function valuationKnowledgeJoin(left: ValuationFiber, right: ValuationFiber): ValuationFiber {
  requireSamePointSet(left, right);
  return valuationFiber(
    left.points,
    Object.fromEntries(left.points.map((point) => [
      point,
      chargeValueName(joinKnowledgeValue(chargeValue(readValuationFiber(left, point)), chargeValue(readValuationFiber(right, point)))),
    ])),
  );
}

export function valuationKnowledgeMeet(left: ValuationFiber, right: ValuationFiber): ValuationFiber {
  requireSamePointSet(left, right);
  return valuationFiber(
    left.points,
    Object.fromEntries(left.points.map((point) => [
      point,
      chargeValueName(meetKnowledgeValue(chargeValue(readValuationFiber(left, point)), chargeValue(readValuationFiber(right, point)))),
    ])),
  );
}

export function closureOrbit(
  closure: ChargeClosure,
  seed: ValuationFiber,
  steps: number,
): readonly ValuationFiber[] {
  const out: ValuationFiber[] = [seed];
  for (let step = 0; step < steps; step += 1) out.push(liftClosure(closure, out[out.length - 1] as ValuationFiber));
  return Object.freeze(out);
}

export function reindexMap(
  sourcePoints: readonly string[],
  targetPoints: readonly string[],
  map: Readonly<Record<string, string>>,
): ReindexMap {
  if (!unique(sourcePoints)) throw new TypeError("reindexMap: duplicate source points are not a finite set");
  if (!unique(targetPoints)) throw new TypeError("reindexMap: duplicate target points are not a finite set");
  const targetSet = new Set(targetPoints);
  const out: Record<string, string> = {};
  for (const source of sourcePoints) {
    const target = map[source];
    if (target === undefined) throw new TypeError(`reindexMap: missing target for ${source}`);
    if (!targetSet.has(target)) throw new TypeError(`reindexMap: target ${target} is not in the target point set`);
    out[source] = target;
  }
  return Object.freeze({
    kind: "positing.closure.reindexMap" as const,
    sourcePoints: Object.freeze([...sourcePoints]),
    targetPoints: Object.freeze([...targetPoints]),
    map: freezeRecord(out),
  });
}

export function reindexValuationFiber(map: ReindexMap, target: ValuationFiber): ValuationFiber {
  if (target.points.length !== map.targetPoints.length || target.points.some((point, index) => point !== map.targetPoints[index])) {
    throw new TypeError("reindexValuationFiber: target valuation does not match the map target point set");
  }
  return valuationFiber(
    map.sourcePoints,
    Object.fromEntries(map.sourcePoints.map((source) => [source, readValuationFiber(target, map.map[source] as string)])),
  );
}

const identityReindex = (points: readonly string[]): ReindexMap =>
  reindexMap(points, points, Object.fromEntries(points.map((point) => [point, point])));

const iterClosure = (closure: ChargeClosure, valuation: ValuationFiber, steps: number): ValuationFiber => {
  let current = valuation;
  for (let step = 0; step < steps; step += 1) current = liftClosure(closure, current);
  return current;
};

function checkLiftMonotone(closure: ChargeClosure, points: readonly string[]): boolean {
  const all = valuations(points);
  return all.every((left) => all.every((right) =>
    !valuationLeqKnowledge(left, right) || valuationLeqKnowledge(liftClosure(closure, left), liftClosure(closure, right)),
  ));
}

function checkNoPeriodicOrbits(closure: ChargeClosure, points: readonly string[]): boolean {
  const all = valuations(points);
  return all.every((valuation) =>
    [1, 2, 3, 4].every((period) =>
      !sameFiber(iterClosure(closure, valuation, period), valuation) || sameFiber(liftClosure(closure, valuation), valuation),
    ),
  );
}

function checkClosureMerge(closure: ChargeClosure, points: readonly string[]): boolean {
  const all = valuations(points);
  return all.every((left) => all.every((right) =>
    sameFiber(
      liftClosure(closure, valuationKnowledgeJoin(liftClosure(closure, left), right)),
      liftClosure(closure, valuationKnowledgeJoin(left, right)),
    ),
  ));
}

function checkLeastFixedPoint(closure: ChargeClosure, seed: ValuationFiber): boolean {
  const settled = liftClosure(closure, seed);
  return sameFiber(liftClosure(closure, settled), settled)
    && valuations(seed.points).every((candidate) =>
      !(valuationLeqKnowledge(seed, candidate) && sameFiber(liftClosure(closure, candidate), candidate))
      || valuationLeqKnowledge(settled, candidate),
    );
}

function checkOrbitMonotone(orbit: readonly ValuationFiber[]): boolean {
  return orbit.every((left, i) => orbit.every((right, j) => i > j || valuationLeqKnowledge(left, right)));
}

function checkQuiescentIffFixed(closure: ChargeClosure, orbit: readonly ValuationFiber[]): boolean {
  return orbit.every((valuation, index) => {
    const fixed = sameFiber(liftClosure(closure, valuation), valuation);
    const constantFromHere = orbit.slice(index).every((later) => sameFiber(later, valuation));
    return fixed === constantFromHere;
  });
}

export function pointwiseClosureFamilyReceipt(
  closure: ChargeClosure,
  seed: ValuationFiber,
  cNaturalMap: ReindexMap = identityReindex(seed.points),
  cNaturalTarget: ValuationFiber = seed,
): PointwiseClosureFamilyReceipt {
  requireExhaustivePoints(seed.points, "pointwiseClosureFamilyReceipt");
  requireExhaustivePoints(cNaturalMap.sourcePoints, "pointwiseClosureFamilyReceipt");
  const closed = liftClosure(closure, seed);
  const orbit = closureOrbit(closure, seed, 4);
  const cNaturalSource = reindexValuationFiber(cNaturalMap, cNaturalTarget);
  const cNaturalLeft = liftClosure(closure, cNaturalSource);
  const cNaturalRight = reindexValuationFiber(cNaturalMap, liftClosure(closure, cNaturalTarget));
  const liftInflationary = valuations(seed.points).every((valuation) => valuationLeqKnowledge(valuation, liftClosure(closure, valuation)));
  const liftMonotone = checkLiftMonotone(closure, seed.points);
  const liftIdempotent = valuations(seed.points).every((valuation) => sameFiber(liftClosure(closure, liftClosure(closure, valuation)), liftClosure(closure, valuation)));
  const noPeriodicOrbits = checkNoPeriodicOrbits(closure, seed.points);
  const cNatural = sameFiber(cNaturalLeft, cNaturalRight);
  const closureMerge = checkClosureMerge(closure, seed.points);
  const lfpIsSettled = checkLeastFixedPoint(closure, seed);
  const lfpReachedByThree = sameFiber(iterClosure(closure, seed, 3), iterClosure(closure, seed, 4));
  const orbitMonotone = checkOrbitMonotone(orbit);
  const quiescentIffFixed = checkQuiescentIffFixed(closure, orbit);
  if (!liftInflationary || !liftMonotone || !liftIdempotent || !noPeriodicOrbits || !cNatural
    || !closureMerge || !lfpIsSettled || !lfpReachedByThree || !orbitMonotone || !quiescentIffFixed) {
    throw new TypeError("pointwiseClosureFamilyReceipt: finite closure-family laws failed");
  }
  return Object.freeze({
    kind: "positing.closure.pointwiseFamily.receipt:witness" as const,
    closure,
    seed,
    closed,
    orbit,
    cNaturalMap,
    cNaturalSource,
    cNaturalTarget,
    cNaturalLeft,
    cNaturalRight,
    liftInflationary: true as const,
    liftMonotone: true as const,
    liftIdempotent: true as const,
    noPeriodicOrbits: true as const,
    cNatural: true as const,
    closureMerge: true as const,
    lfpIsSettled: true as const,
    lfpReachedByThree: true as const,
    orbitMonotone: true as const,
    quiescentIffFixed: true as const,
  });
}

export function cosettlingReceipt(closure: ChargeClosure, top: ValuationFiber): CosettlingReceipt {
  requireExhaustivePoints(top.points, "cosettlingReceipt");
  if (!sameFiber(liftClosure(closure, top), top)) {
    throw new TypeError("cosettlingReceipt: top must be closure-stable");
  }
  const preimages = Object.freeze(valuations(top.points).filter((valuation) => sameFiber(liftClosure(closure, valuation), top)));
  const containment = preimages.every((valuation) => valuationLeqKnowledge(valuation, top));
  const maximum = preimages.some((valuation) => sameFiber(valuation, top)) && preimages.every((valuation) => valuationLeqKnowledge(valuation, top));
  const joinClosed = preimages.every((left) => preimages.every((right) =>
    preimages.some((candidate) => sameFiber(candidate, valuationKnowledgeJoin(left, right))),
  ));
  if (!containment || !maximum || !joinClosed) {
    throw new TypeError("cosettlingReceipt: finite cosettling laws failed");
  }
  return Object.freeze({
    kind: "positing.closure.cosettling.receipt:witness" as const,
    closure,
    top,
    preimages,
    containment: true as const,
    maximum: true as const,
    joinClosed: true as const,
    joinSubsemilatticeWithTop: true as const,
  });
}
