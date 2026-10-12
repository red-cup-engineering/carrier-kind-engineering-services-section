/**
 * @packageDocumentation
 *
 * settling/fixed-point — the least and greatest fixed points in both orders.
 *
 * For each order (knowledge, truth) the closure is run from two seeds — the
 * posit valuation for the least fixed point, and a top-saturated seed for the
 * greatest — yielding the extremal valuations and the gap between them. The four
 * extrema (knowledge/truth × least/greatest) are the complete fixed-point
 * structure a posit presheaf determines.
 */
import { chargeSide, type ChargeSide } from "../values/index.mts";
import { type ClosureResult } from "./closure.mts";
import type { Valuation } from "../logic/predicating/evidence/fiber.mts";
import { fixedPointGap, fixedPointGapInput, type FixedPointGapReport } from "./fixed-point-gap.mts";
import {
  closePredicationValuationClosure,
  knowledgeValuationClosureOrder,
  predicationValuationClosureStageOrdinal,
  predicationValuationClosureProcess,
  truthValuationClosureOrder,
  type PredicationValuationClosureOrder,
  type PredicationValuationClosureStageOrdinal,
} from "../settling.mts";
import { type PositPresheaf, type ValuationSheaf } from "./sheaf.mts";

export type { OrderName } from "../logic/predicating/evidence/fiber.mts";
import type { OrderName } from "../logic/predicating/evidence/fiber.mts";

/** The two extremal bounds of a fixed-point computation. */
export type BoundName = "least" | "greatest";

/** The order a fixed point is taken in (wraps a valuation closure order). */
export interface FixedPointOrderObject {
  readonly kind: "predication.valuation.fixedPoint.orderObject";
  readonly valuationClosureOrder: PredicationValuationClosureOrder;
}

/** The bound object selecting which extremal fixed point to compute. */
export interface FixedPointBoundObject {
  readonly kind: "predication.valuation.fixedPoint.boundObject";
  readonly name: BoundName;
}

/** The seed for a fixed-point closure. */
export interface FixedPointSeed {
  readonly kind: "predication.valuation.fixedPoint.seed";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly valuation: Valuation;
}

/** A computed extremal fixed point. */
export interface FixedPointExtremum {
  readonly kind: "predication.valuation.fixedPoint.extremum";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly seed: FixedPointSeed;
  readonly closure: ClosureResult<Valuation>;
  readonly fixedPoint: FixedPointJudgment;
  readonly sheaf: ValuationSheaf;
}

/** Witness that closure stabilized to a fixed point. */
export interface FixedPointWitness {
  readonly kind: "predication.valuation.fixedPoint:witness";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly stabilizationStage: PredicationValuationClosureStageOrdinal;
  readonly value: Valuation;
}

/** Obstruction recording that closure did not stabilize. */
export interface FixedPointObstruction {
  readonly kind: "predication.valuation.fixedPoint-obstruction";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly value: Valuation;
}

/** The outcome of closing toward a fixed point. */
export type FixedPointJudgment = FixedPointWitness | FixedPointObstruction;

/** The least/greatest extrema for one order, plus their gap. */
export interface FixedPointOrder {
  readonly kind: "predication.valuation.fixedPoint.order";
  readonly order: FixedPointOrderObject;
  readonly least: FixedPointExtremum;
  readonly greatest: FixedPointExtremum;
  readonly gap: FixedPointGapReport;
}

/** The full fixed-point structure: knowledge and truth orders. */
export interface FixedPointStructure {
  readonly kind: "predication.valuation.fixedPoint.structure";
  readonly knowledge: FixedPointOrder;
  readonly truth: FixedPointOrder;
}

const greatestSeedValuation = (freeFalsity: ChargeSide) => (valuation: Valuation): Valuation => Object.freeze({
  ...valuation,
  fibers: Object.freeze(valuation.fibers.map((fiber) => Object.freeze({
    ...fiber,
    assignments: Object.freeze(fiber.assignments.map((assignment) => Object.freeze({
      ...assignment,
      charge: Object.freeze({
        kind: "charge" as const,
        value: Object.freeze([
          assignment.charge.value[0].name === "present" ? assignment.charge.value[0] : chargeSide("present"),
          assignment.charge.value[1].name === "present" ? assignment.charge.value[1] : freeFalsity,
        ] as const),
      }),
    }))),
  }))),
});

const fixedPointSeed = (order: FixedPointOrderObject, bound: FixedPointBoundObject, valuation: Valuation): FixedPointSeed =>
  Object.freeze({ kind: "predication.valuation.fixedPoint.seed" as const, order, bound, valuation });

const sheafOfClosure = (closure: ClosureResult<Valuation>): ValuationSheaf =>
  Object.freeze({ kind: "predication.valuation.sheaf" as const, section: closure.value });

const valuationClosureOrderOf = (name: OrderName): PredicationValuationClosureOrder =>
  name === "knowledge" ? knowledgeValuationClosureOrder : truthValuationClosureOrder;

const greatestFreeFalsity = (name: OrderName): ChargeSide =>
  name === "knowledge" ? chargeSide("present") : chargeSide("absent");

const fixedPointOrderObject = (valuationClosureOrder: PredicationValuationClosureOrder): FixedPointOrderObject =>
  Object.freeze({ kind: "predication.valuation.fixedPoint.orderObject" as const, valuationClosureOrder });

const fixedPointBoundObject = (name: BoundName): FixedPointBoundObject =>
  Object.freeze({ kind: "predication.valuation.fixedPoint.boundObject" as const, name });

class FixedPointComputation {
  readonly positPresheaf: PositPresheaf;

  constructor(positPresheaf: PositPresheaf) {
    this.positPresheaf = positPresheaf;
  }

  order(name: OrderName): FixedPointOrderObject {
    return fixedPointOrderObject(valuationClosureOrderOf(name));
  }

  seed(order: FixedPointOrderObject, bound: FixedPointBoundObject): FixedPointSeed {
    const source = this.positPresheaf.traces[0]!;
    const valuation = bound.name === "least"
      ? source
      : greatestSeedValuation(greatestFreeFalsity(order.valuationClosureOrder.name))(source);
    return fixedPointSeed(order, bound, valuation);
  }

  extremum(order: FixedPointOrderObject, boundName: BoundName): FixedPointExtremum {
    const bound = fixedPointBoundObject(boundName);
    const seed = this.seed(order, bound);
    const closure = closePredicationValuationClosure(predicationValuationClosureProcess(order.valuationClosureOrder, seed.valuation)).closure;
    const fixedPoint = closure.stabilization.kind === "ordinal.closure.stabilization:witness"
      ? Object.freeze({
        kind: "predication.valuation.fixedPoint:witness" as const,
        order,
        bound,
        stabilizationStage: predicationValuationClosureStageOrdinal(closure.stabilization.ordinal),
        value: closure.stabilization.value,
      })
      : Object.freeze({ kind: "predication.valuation.fixedPoint-obstruction" as const, order, bound, value: closure.stabilization.value });
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

  orderStructure(name: OrderName): FixedPointOrder {
    const order = this.order(name);
    const least = this.extremum(order, "least");
    const greatest = this.extremum(order, "greatest");
    return Object.freeze({
      kind: "predication.valuation.fixedPoint.order" as const,
      order,
      least,
      greatest,
      gap: fixedPointGap(fixedPointGapInput(order, least, greatest)),
    });
  }

  structure(): FixedPointStructure {
    return Object.freeze({
      kind: "predication.valuation.fixedPoint.structure" as const,
      knowledge: this.orderStructure("knowledge"),
      truth: this.orderStructure("truth"),
    });
  }
}

/** The complete fixed-point structure of a posit presheaf. */
export function fixedPoints(p: PositPresheaf): FixedPointStructure {
  return new FixedPointComputation(p).structure();
}
