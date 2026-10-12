/** Metro closure wire names over the canonical finite closure operations. */
import * as canonical from "@lenticule-science/articulating/predicating/positing/closure-operator-fiber";
import { chargeValueNames, toArticulatingName, fromArticulatingName, type ChargeValueName } from "./claim-charge.mts";
import { toCanonical, fromCanonical, type ValuationFiber } from "./valuation-fiber-algebra.mts";

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


const toClosure = (closure: ChargeClosure): canonical.ChargeClosureCarrier => Object.freeze({
  ...closure, kind: "positing.closure.chargeClosure.carrier",
  operation: Object.freeze(Object.fromEntries(chargeValueNames.map(name =>
    [toArticulatingName(name), toArticulatingName(closure.operation[name])])) as canonical.ChargeClosureCarrier["operation"]),
});
const toReindex = (map: ReindexMap): canonical.ReindexMapCarrier =>
  Object.freeze({ ...map, kind: "positing.closure.reindexMap.carrier" });

/** Map only the known algebra carriers; names and point labels are opaque. */
function fromReceipt<T>(value: unknown): T {
  if (Array.isArray(value)) return Object.freeze(value.map(item => fromReceipt(item))) as T;
  if (value === null || typeof value !== "object") return value as T;
  const record = value as Record<string, unknown>;
  if (record.kind === "positing.valuationFiber.carrier") return fromCanonical(value as Parameters<typeof fromCanonical>[0]) as T;
  if (record.kind === "positing.closure.chargeClosure.carrier") {
    const closure = value as canonical.ChargeClosureCarrier;
    return Object.freeze({ ...closure, kind: "positing.closure.chargeClosure",
      operation: Object.freeze(Object.fromEntries(chargeValueNames.map(name =>
        [name, fromArticulatingName(closure.operation[toArticulatingName(name)])]))) }) as T;
  }
  if (record.kind === "positing.closure.reindexMap.carrier")
    return Object.freeze({ ...record, kind: "positing.closure.reindexMap" }) as T;
  if (record.kind === "positing.closure.monad.receipt:witness") {
    const receipt = value as canonical.ClosureMonadReceipt;
    return Object.freeze({ ...receipt, closure: fromReceipt(receipt.closure),
      increment: fromArticulatingName(receipt.increment), seed: fromArticulatingName(receipt.seed),
      settled: fromArticulatingName(receipt.settled), settleStepOrbit: Object.freeze(receipt.settleStepOrbit.map(fromArticulatingName)) }) as T;
  }
  return Object.freeze(Object.fromEntries(Object.entries(record)
    .filter(([key]) => key !== "theoremKz" && key !== "theoremPropertyLike")
    .map(([key, item]) => [key, fromReceipt(item)]))) as T;
}
function wireCall<T>(operation: () => T): T {
  try { return operation(); } catch (error) {
    if (error instanceof TypeError) {
      const message = error.message
        .replace(/^chargeClosureCarrier:/, "chargeClosure:")
        .replace(/^reindexMapCarrier:/, "reindexMap:")
        .replace("ordered point carrier", "ordered point set")
        .replace("finite carrier", "finite set")
        .replace("target point carrier", "target point set")
        .replace("target carrier", "target point set")
        .replace(/^(chargeClosure: operation for )(absurd|potential|active|stable)( is)/, (_, prefix, name, suffix) =>
          prefix + fromArticulatingName(name) + suffix);
      if (message !== error.message) throw new TypeError(message);
    }
    throw error;
  }
}
export const chargeClosure = (name: string, operation: ChargeClosure["operation"]): ChargeClosure =>
  wireCall(() => fromReceipt(canonical.chargeClosureCarrier(name, toClosure({ name, operation } as ChargeClosure).operation)));
export const knowledgeJoinClosure = (bound: ChargeValueName): ChargeClosure =>
  Object.freeze({ ...fromReceipt<ChargeClosure>(canonical.knowledgeJoinClosure(toArticulatingName(bound))), name: `joinClosure:${bound}` });
export const applyChargeClosure = (closure: ChargeClosure, value: ChargeValueName): ChargeValueName =>
  fromArticulatingName(canonical.applyChargeClosure(toClosure(closure), toArticulatingName(value)));
export const iterateChargeOperation = (operation: (value: ChargeValueName) => ChargeValueName, seed: ChargeValueName, steps: number): ChargeValueName =>
  fromArticulatingName(canonical.iterateChargeOperation(value => toArticulatingName(operation(fromArticulatingName(value))), toArticulatingName(seed), steps));
export const settleStep = (closure: ChargeClosure, increment: ChargeValueName, value: ChargeValueName): ChargeValueName =>
  fromArticulatingName(canonical.settleStep(toClosure(closure), toArticulatingName(increment), toArticulatingName(value)));
export const chargeOrbit = (operation: (value: ChargeValueName) => ChargeValueName, seed: ChargeValueName, steps: number): readonly ChargeValueName[] =>
  Object.freeze(canonical.chargeOrbit(value => toArticulatingName(operation(fromArticulatingName(value))), toArticulatingName(seed), steps).map(fromArticulatingName));
export const liftClosure = (closure: ChargeClosure, valuation: ValuationFiber): ValuationFiber =>
  fromCanonical(canonical.liftClosure(toClosure(closure), toCanonical(valuation)));
export const closureMonadReceipt = (closure: ChargeClosure, increment: ChargeValueName, seed: ChargeValueName): ClosureMonadReceipt =>
  fromReceipt(canonical.closureMonadReceipt(toClosure(closure), toArticulatingName(increment), toArticulatingName(seed)));
export const closure2MonadKzReceipt = (closure: ChargeClosure, seed: ValuationFiber): Closure2MonadKzReceipt =>
  fromReceipt(canonical.closure2MonadKzReceipt(toClosure(closure), toCanonical(seed)));
export const valuationKnowledgeJoin = (left: ValuationFiber, right: ValuationFiber): ValuationFiber =>
  wireCall(() => fromCanonical(canonical.valuationKnowledgeJoin(toCanonical(left), toCanonical(right))));
export const valuationKnowledgeMeet = (left: ValuationFiber, right: ValuationFiber): ValuationFiber =>
  wireCall(() => fromCanonical(canonical.valuationKnowledgeMeet(toCanonical(left), toCanonical(right))));
export const closureOrbit = (closure: ChargeClosure, seed: ValuationFiber, steps: number): readonly ValuationFiber[] =>
  Object.freeze(canonical.closureOrbit(toClosure(closure), toCanonical(seed), steps).map(fromCanonical));
export const reindexMap = (source: readonly string[], target: readonly string[], map: Readonly<Record<string, string>>): ReindexMap =>
  wireCall(() => fromReceipt(canonical.reindexMapCarrier(source, target, map)));
export const reindexValuationFiber = (map: ReindexMap, target: ValuationFiber): ValuationFiber =>
  wireCall(() => fromCanonical(canonical.reindexValuationFiber(toReindex(map), toCanonical(target))));
export const pointwiseClosureFamilyReceipt = (closure: ChargeClosure, seed: ValuationFiber, map?: ReindexMap, target: ValuationFiber = seed): PointwiseClosureFamilyReceipt =>
  wireCall(() => fromReceipt(canonical.pointwiseClosureFamilyReceipt(toClosure(closure), toCanonical(seed), map === undefined ? undefined : toReindex(map), toCanonical(target))));
export const cosettlingReceipt = (closure: ChargeClosure, top: ValuationFiber): CosettlingReceipt =>
  fromReceipt(canonical.cosettlingReceipt(toClosure(closure), toCanonical(top)));
