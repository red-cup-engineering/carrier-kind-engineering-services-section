/**
 * analysis/crdt-cohomological-calm - finite executable runtime surface.
 *
 * Lean bundles four already-proved convergence readings: H1 vanishing,
 * order-independent CRDT merge, confluence by knowledge join, and quiescence
 * as closure fixed point. This module exposes that finite FOUR/valuation
 * surface and keeps the genuine CALM biconditional as a proof frontier.
 */
import * as canonical from "@lenticule-science/articulating/predicating/positing/settling/analysis/crdt-cohomological-calm";
import {
  chargeValueNames,
  fromArticulatingName,
  toArticulatingName,
  wireReceipt,
  type ChargeValueName,
} from "./claim-charge.mts";
import {
  applyChargeClosure,
  closureMonadReceipt,
  cosettlingReceipt,
  knowledgeJoinClosure,
  liftClosure,
  valuationKnowledgeJoin,
  type ChargeClosure,
  type ClosureMonadReceipt,
  type CosettlingReceipt,
} from "./closure-operator-fiber.mts";
import {
  readValuationFiber,
  valuationFiber,
  valuationLeqKnowledge,
  type ValuationFiber,
} from "./valuation-fiber-algebra.mts";

export interface MergeOrderIndependentReceipt {
  readonly kind: "crdtCalm.mergeOrderIndependent:witness";
  readonly left: readonly ChargeValueName[];
  readonly right: readonly ChargeValueName[];
  readonly sameMembership: true;
  readonly leftMerge: ChargeValueName;
  readonly rightMerge: ChargeValueName;
  readonly orderIndependent: true;
}

export interface ConfluenceReceipt {
  readonly kind: "crdtCalm.confluence:witness";
  readonly left: ValuationFiber;
  readonly right: ValuationFiber;
  readonly join: ValuationFiber;
  readonly leftLeJoin: true;
  readonly rightLeJoin: true;
  readonly totalByKnowledgeJoin: true;
}

export interface CalmConvergenceFactsReceipt {
  readonly kind: "crdtCalm.convergenceFacts:witness";
  readonly h1VanishesFinite: true;
  readonly merge: MergeOrderIndependentReceipt;
  readonly confluence: ConfluenceReceipt;
  readonly closure: ChargeClosure;
  readonly fixedPoint: ValuationFiber;
  readonly quiescentIffClosureFixed: true;
  readonly mutuallyBelowImpliesEqual: true;
  readonly biconditionalFrontier: "outside this runtime genuine CALM equivalence";
}

export interface CalmMonotoneCoordinationFreeReceipt {
  readonly kind: "crdtCalm.monotoneCoordinationFree:witness";
  readonly closure: ChargeClosure;
  readonly seed: ValuationFiber;
  readonly orbit: readonly ValuationFiber[];
  readonly orbitMonotone: true;
  readonly merge: MergeOrderIndependentReceipt;
  readonly coordinationFree: true;
}

export interface MayerVietorisOverlapReceipt {
  readonly kind: "crdtCalm.mayerVietorisOverlap:witness";
  readonly cosettling: CosettlingReceipt;
  readonly overlapJoinClosed: true;
}

export interface CRDTCohomologicalCALMReceipt {
  readonly kind: "crdtCalm.receipt:witness";
  readonly convergence: CalmConvergenceFactsReceipt;
  readonly monotoneCoordinationFree: CalmMonotoneCoordinationFreeReceipt;
  readonly overlap: MayerVietorisOverlapReceipt;
  readonly openFrontier: readonly string[];
}

/** Delegates to Articulating's canonical bilattice merge, translating only at the wire boundary. */
export const mergeDeltas = (deltas: readonly ChargeValueName[]): ChargeValueName =>
  fromArticulatingName(canonical.mergeDeltas(deltas.map(toArticulatingName)));

const sameFiber = (left: ValuationFiber, right: ValuationFiber): boolean =>
  left.points.length === right.points.length
  && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));

const allValuations = (points: readonly string[]): readonly ValuationFiber[] => {
  if (points.length > 4) throw new RangeError("crdtCalm: exhaustive valuation checks are limited to at most 4 points");
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
};

/** Delegates to Articulating's canonical merge-order-independence witness, translating only at the wire boundary. */
export function mergeOrderIndependentReceipt(
  left: readonly ChargeValueName[] = Object.freeze(["held", "denied", "held"]),
  right: readonly ChargeValueName[] = Object.freeze(["denied", "held"]),
): MergeOrderIndependentReceipt {
  return wireReceipt<MergeOrderIndependentReceipt>(canonical.mergeOrderIndependentReceipt(left.map(toArticulatingName), right.map(toArticulatingName)));
}

export function confluenceReceipt(left: ValuationFiber, right: ValuationFiber): ConfluenceReceipt {
  const join = valuationKnowledgeJoin(left, right);
  const leftLeJoin = valuationLeqKnowledge(left, join);
  const rightLeJoin = valuationLeqKnowledge(right, join);
  if (!leftLeJoin || !rightLeJoin) throw new TypeError("confluenceReceipt: knowledge join is not a common upper bound");
  return Object.freeze({
    kind: "crdtCalm.confluence:witness" as const,
    left,
    right,
    join,
    leftLeJoin: true as const,
    rightLeJoin: true as const,
    totalByKnowledgeJoin: true as const,
  });
}

export function calmConvergenceFactsReceipt(): CalmConvergenceFactsReceipt {
  const cells = Object.freeze(["p", "q"]);
  const left = valuationFiber(cells, { p: "held", q: "unknown" });
  const right = valuationFiber(cells, { p: "unknown", q: "denied" });
  const closure = knowledgeJoinClosure("held");
  const fixedPoint = liftClosure(closure, valuationFiber(cells, { p: "denied", q: "contested" }));
  const quiescentIffClosureFixed = sameFiber(liftClosure(closure, fixedPoint), fixedPoint);
  const mutuallyBelowImpliesEqual = allValuations(cells).every((u) => allValuations(cells).every((v) =>
    !(valuationLeqKnowledge(u, v) && valuationLeqKnowledge(v, u)) || sameFiber(u, v)));
  if (!quiescentIffClosureFixed || !mutuallyBelowImpliesEqual) {
    throw new TypeError("calmConvergenceFactsReceipt: finite fixed-point/confluence laws failed");
  }
  return Object.freeze({
    kind: "crdtCalm.convergenceFacts:witness" as const,
    h1VanishesFinite: true as const,
    merge: mergeOrderIndependentReceipt(),
    confluence: confluenceReceipt(left, right),
    closure,
    fixedPoint,
    quiescentIffClosureFixed: true as const,
    mutuallyBelowImpliesEqual: true as const,
    biconditionalFrontier: "outside this runtime genuine CALM equivalence" as const,
  });
}

export function monotoneCoordinationFreeReceipt(): CalmMonotoneCoordinationFreeReceipt {
  const closure = knowledgeJoinClosure("held");
  const cells = Object.freeze(["p", "q"]);
  const seed = valuationFiber(cells, { p: "unknown", q: "denied" });
  const orbit: ValuationFiber[] = [seed];
  for (let index = 0; index < 4; index += 1) orbit.push(liftClosure(closure, orbit[orbit.length - 1] as ValuationFiber));
  const orbitMonotone = orbit.every((left, leftIndex) => orbit.every((right, rightIndex) =>
    leftIndex > rightIndex || valuationLeqKnowledge(left, right)));
  if (!orbitMonotone) throw new TypeError("monotoneCoordinationFreeReceipt: closure orbit was not monotone");
  return Object.freeze({
    kind: "crdtCalm.monotoneCoordinationFree:witness" as const,
    closure,
    seed,
    orbit: Object.freeze(orbit),
    orbitMonotone: true as const,
    merge: mergeOrderIndependentReceipt(["contested", "held", "contested"], ["held", "contested"]),
    coordinationFree: true as const,
  });
}

export function mayerVietorisOverlapReceipt(): MayerVietorisOverlapReceipt {
  const closure = knowledgeJoinClosure("held");
  const top = valuationFiber(["p"], { p: applyChargeClosure(closure, "contested") });
  const cosettling = cosettlingReceipt(closure, top);
  return Object.freeze({
    kind: "crdtCalm.mayerVietorisOverlap:witness" as const,
    cosettling,
    overlapJoinClosed: true as const,
  });
}

export function crdtCalmReceipt(): CRDTCohomologicalCALMReceipt {
  const convergence = calmConvergenceFactsReceipt();
  return Object.freeze({
    kind: "crdtCalm.receipt:witness" as const,
    convergence,
    monotoneCoordinationFree: monotoneCoordinationFreeReceipt(),
    overlap: mayerVietorisOverlapReceipt(),
    openFrontier: Object.freeze([
      "The runtime bundle is a conjunction of finite convergence facts, matching the Lean module's honest scoping.",
      "The genuine CALM biconditional that distinguishes non-confluent/non-monotone cases remains proof/frontier work.",
      "Mayer-Vietoris is represented by finite cosettling join-subsemilattice closure, not by a full long exact sequence.",
    ]),
  });
}

export const finiteKzShadow = (): ClosureMonadReceipt =>
  closureMonadReceipt(knowledgeJoinClosure("held"), "held", "unknown");
