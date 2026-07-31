import { chargeSide, type ChargeSide } from "@emsenn/meme-algebra";
import { type ClosureCarrier } from "./ordinal-closure.mjs";
import type { Valuation } from "./predication-fiber.mjs";
import { fixedPointGap, fixedPointGapInput, type FixedPointGapCarrier } from "./predication-valuation-fixed-point-gap.mjs";
import {
  closePredicationValuationClosure,
  knowledgeValuationClosureOrder,
  predicationValuationClosureStageOrdinal,
  predicationValuationClosureProcess,
  truthValuationClosureOrder,
  type PredicationValuationClosureOrderCarrier,
  type PredicationValuationClosureStageOrdinalCarrier,
} from "./predication-valuation-closure.mjs";
import {
  type PresheafCarrier,
  type SheafCarrier,
} from "./predication-valuation-sheaf.mjs";

export type { OrderName } from "./predication-fiber.mjs";
import type { OrderName } from "./predication-fiber.mjs";
export type BoundName = "least" | "greatest";

export interface FixedPointOrderObject {
  readonly kind: "predication.valuation.fixedPoint.orderObject";
  readonly valuationClosureOrder: PredicationValuationClosureOrderCarrier;
}

export interface FixedPointBoundObject {
  readonly kind: "predication.valuation.fixedPoint.boundObject";
  readonly name: BoundName;
}

export interface FixedPointSeedCarrier {
  readonly kind: "predication.valuation.fixedPoint.seed";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly valuation: Valuation;
}

export interface FixedPointExtremum {
  readonly kind: "predication.valuation.fixedPoint.extremum";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly seed: FixedPointSeedCarrier;
  readonly closure: ClosureCarrier<Valuation>;
  readonly fixedPoint: FixedPointJudgment;
  readonly sheaf: SheafCarrier;
}

export interface FixedPointWitness {
  readonly kind: "predication.valuation.fixedPoint:witness";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly stabilizationStage: PredicationValuationClosureStageOrdinalCarrier;
  readonly value: Valuation;
}

export interface FixedPointObstruction {
  readonly kind: "predication.valuation.fixedPoint-obstruction";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly value: Valuation;
}

export type FixedPointJudgment = FixedPointWitness | FixedPointObstruction;

export interface FixedPointOrderCarrier {
  readonly kind: "predication.valuation.fixedPoint.order";
  readonly order: FixedPointOrderObject;
  readonly least: FixedPointExtremum;
  readonly greatest: FixedPointExtremum;
}

export interface FixedPointCarrier {
  readonly kind: "predication.valuation.fixedPoint.carrier";
  readonly knowledge: FixedPointOrderCarrier;
  readonly truth: FixedPointOrderCarrier;
  readonly knowledgeGap: FixedPointGapCarrier;
  readonly truthGap: FixedPointGapCarrier;
}

const greatestSeedValuation = (freeFalsity: ChargeSide) => (valuation: Valuation): Valuation => Object.freeze({
  ...valuation,
  fibers: Object.freeze(valuation.fibers.map((fiber) => Object.freeze({
    ...fiber,
    assignments: Object.freeze(fiber.assignments.map((assignment) => Object.freeze({
      ...assignment,
      charge: Object.freeze({
        kind: "bilattice-charge.carrier" as const,
        value: Object.freeze([
          assignment.charge.evidence[0].length ? assignment.charge.value[0] : chargeSide("present"),
          assignment.charge.evidence[1].length ? assignment.charge.value[1] : freeFalsity,
        ] as const),
        evidence: assignment.charge.evidence,
      }),
    }))),
  }))),
});

const fixedPointSeed = (
  order: FixedPointOrderObject,
  bound: FixedPointBoundObject,
  valuation: Valuation,
): FixedPointSeedCarrier => Object.freeze({
  kind: "predication.valuation.fixedPoint.seed" as const,
  order,
  bound,
  valuation,
});

const sheafOfClosure = (closure: ClosureCarrier<Valuation>): SheafCarrier => Object.freeze({
  kind: "predication.valuation.sheaf.carrier" as const,
  section: closure.value,
});

export const fixedPointOrderObject = (
  valuationClosureOrder: PredicationValuationClosureOrderCarrier,
): FixedPointOrderObject => Object.freeze({
  kind: "predication.valuation.fixedPoint.orderObject" as const,
  valuationClosureOrder,
});

export const fixedPointOrderName = (order: FixedPointOrderObject): OrderName => order.valuationClosureOrder.name;

export const fixedPointBoundObject = (name: BoundName): FixedPointBoundObject => Object.freeze({
  kind: "predication.valuation.fixedPoint.boundObject" as const,
  name,
});

export const fixedPointBoundName = (bound: FixedPointBoundObject): BoundName => bound.name;

export const leastFixedPointBound = (): FixedPointBoundObject => fixedPointBoundObject("least");
export const greatestFixedPointBound = (): FixedPointBoundObject => fixedPointBoundObject("greatest");

function fixedPointExtremum(
  order: FixedPointOrderObject,
  bound: FixedPointBoundObject,
  seed: FixedPointSeedCarrier,
): FixedPointExtremum {
  const closure = closePredicationValuationClosure(predicationValuationClosureProcess(order.valuationClosureOrder, seed.valuation)).closure;
  const fixedPoint = closure.stabilization.kind === "ordinal.closure.stabilization:witness"
    ? Object.freeze({
      kind: "predication.valuation.fixedPoint:witness" as const,
      order,
      bound,
      stabilizationStage: predicationValuationClosureStageOrdinal(closure.stabilization.ordinal),
      value: closure.stabilization.value,
    })
    : Object.freeze({
      kind: "predication.valuation.fixedPoint-obstruction" as const,
      order,
      bound,
      value: closure.stabilization.value,
    });
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.extremum" as const,
    order,
    bound,
    seed,
    closure,
    fixedPoint,
    sheaf: sheafOfClosure(closure),
  });
}

export function knowledgeLeastFixedPoint(p: PresheafCarrier): FixedPointExtremum {
  const order = fixedPointOrderObject(knowledgeValuationClosureOrder());
  const bound = leastFixedPointBound();
  return fixedPointExtremum(order, bound, fixedPointSeed(order, bound, p.traces[0]!));
}

export function knowledgeGreatestFixedPoint(p: PresheafCarrier): FixedPointExtremum {
  const order = fixedPointOrderObject(knowledgeValuationClosureOrder());
  const bound = greatestFixedPointBound();
  return fixedPointExtremum(order, bound, fixedPointSeed(order, bound, greatestSeedValuation(chargeSide("present"))(p.traces[0]!)));
}

export function truthLeastFixedPoint(p: PresheafCarrier): FixedPointExtremum {
  const order = fixedPointOrderObject(truthValuationClosureOrder());
  const bound = leastFixedPointBound();
  return fixedPointExtremum(order, bound, fixedPointSeed(order, bound, p.traces[0]!));
}

export function truthGreatestFixedPoint(p: PresheafCarrier): FixedPointExtremum {
  const order = fixedPointOrderObject(truthValuationClosureOrder());
  const bound = greatestFixedPointBound();
  return fixedPointExtremum(order, bound, fixedPointSeed(order, bound, greatestSeedValuation(chargeSide("absent"))(p.traces[0]!)));
}

function fixedPointOrder(order: FixedPointOrderObject, least: FixedPointExtremum, greatest: FixedPointExtremum): FixedPointOrderCarrier {
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.order" as const,
    order,
    least,
    greatest,
  });
}

export function fixedPoints(p: PresheafCarrier): FixedPointCarrier {
  const knowledgeOrder = fixedPointOrderObject(knowledgeValuationClosureOrder());
  const truthOrder = fixedPointOrderObject(truthValuationClosureOrder());
  const leastBound = leastFixedPointBound();
  const greatestBound = greatestFixedPointBound();
  const knowledgeLeast = fixedPointExtremum(knowledgeOrder, leastBound, fixedPointSeed(knowledgeOrder, leastBound, p.traces[0]!));
  const knowledgeGreatest = fixedPointExtremum(
    knowledgeOrder,
    greatestBound,
    fixedPointSeed(knowledgeOrder, greatestBound, greatestSeedValuation(chargeSide("present"))(p.traces[0]!)),
  );
  const truthLeast = fixedPointExtremum(truthOrder, leastBound, fixedPointSeed(truthOrder, leastBound, p.traces[0]!));
  const truthGreatest = fixedPointExtremum(
    truthOrder,
    greatestBound,
    fixedPointSeed(truthOrder, greatestBound, greatestSeedValuation(chargeSide("absent"))(p.traces[0]!)),
  );
  const knowledge = fixedPointOrder(knowledgeOrder, knowledgeLeast, knowledgeGreatest);
  const truth = fixedPointOrder(truthOrder, truthLeast, truthGreatest);
  return Object.freeze({
    kind: "predication.valuation.fixedPoint.carrier" as const,
    knowledge,
    truth,
    knowledgeGap: fixedPointGap(fixedPointGapInput(knowledge)),
    truthGap: fixedPointGap(fixedPointGapInput(truth)),
  });
}

export function fixedPointKnowledgeGap(p: PresheafCarrier): FixedPointGapCarrier {
  return fixedPoints(p).knowledgeGap;
}

export function fixedPointTruthGap(p: PresheafCarrier): FixedPointGapCarrier {
  return fixedPoints(p).truthGap;
}
