import { joinKnowledge, leqKnowledge, meetKnowledge, joinTruth, meetTruth, sameCharge, type ChargeCarrier } from "@emsenn/meme-algebra";
import {
  predicationBaseObjectCoincidenceHolds,
  predicationCellCoincidenceHolds,
  predicationPredicateCoincidenceHolds,
  predicationTermCoincidenceHolds,
} from "@emsenn/meme-algebra";
import { natZero, successor, type Natural } from "@emsenn/meme-algebra";
import {
  closeOrdinalProcess,
  closureProcess,
  finiteOrdinalJudgment,
  type ClosureCarrier,
  type ClosureOrbitPoint,
  type ClosureProcessCarrier,
  type FiniteOrdinalJudgment,
  type Lattice,
  type Ordinal,
} from "./ordinal-closure.mjs";
import { cohomology, type CohomologyCarrier } from "./predication-cohomology.mjs";
import type { FiberAlgebra, Meme, Valuation } from "./predication-fiber.mjs";
import { posit } from "./predication-fiber.mjs";
import {
  designatedCells,
  settling,
  settlingStageOrdinal,
  settlingStageInput,
  settlingStageShape,
  settlingStageDesignatedCells,
  type SettlingStageOrdinalCarrier,
  type SettlingCarrier,
} from "./predication-settling.mjs";
import { cell, closeSpecialization, entitySet, predicate, type BaseCategory, type Cell, type Edge, type PredicationBaseObject, type PredicationPredicate, type PredicationTerm } from "@emsenn/meme-algebra";
import {
  presheaf,
  sheafFromValuation,
  type PresheafCarrier,
  type SheafCarrier,
} from "./predication-valuation-sheaf.mjs";
import { articulate, utterance, type Mark } from "@emsenn/meme-algebra";

export interface PredicationValuationClosureStageOrdinalCarrier {
  readonly kind: "predication.valuation.closure.stageOrdinal";
  readonly ordinal: Ordinal;
}

export interface PredicationValuationClosureStageCarrier {
  readonly kind: "predication.valuation.closure.stage";
  readonly stageOrdinal: PredicationValuationClosureStageOrdinalCarrier;
  readonly valuation: Valuation;
}

export type { OrderName } from "./predication-fiber.mjs";
import type { OrderName } from "./predication-fiber.mjs";

export interface PredicationValuationClosureOrderCarrier {
  readonly kind: "predication.valuation.closure.order";
  readonly name: OrderName;
  readonly endomorphism: (valuation: Valuation) => Valuation;
  readonly lattice: (seed: Valuation) => Lattice<Valuation>;
}

export interface PredicationValuationClosureProcessCarrier {
  readonly kind: "predication.valuation.closure.process";
  readonly order: PredicationValuationClosureOrderCarrier;
  readonly seed: Valuation;
  readonly ordinalProcess: ClosureProcessCarrier<Valuation>;
}

export interface PredicationValuationClosureCarrier {
  readonly kind: "predication.valuation.closure.carrier";
  readonly process: PredicationValuationClosureProcessCarrier;
  readonly closure: ClosureCarrier<Valuation>;
  readonly sheaf: SheafCarrier;
}

export interface PredicationValuationClosureFiniteStageWitness {
  readonly kind: "predication.valuation.closure.finiteStage:witness";
  readonly stage: PredicationValuationClosureStageCarrier;
  readonly value: Natural;
}

export interface PredicationValuationClosureFiniteStageObstruction {
  readonly kind: "predication.valuation.closure.finiteStage-obstruction";
  readonly stage: PredicationValuationClosureStageCarrier;
  readonly reading: FiniteOrdinalJudgment;
}

export type PredicationValuationClosureFiniteStageJudgment =
  | PredicationValuationClosureFiniteStageWitness
  | PredicationValuationClosureFiniteStageObstruction;

export interface PredicationValuationClosureTraceCarrier {
  readonly kind: "predication.valuation.closure.trace";
  readonly closure: PredicationValuationClosureCarrier;
  readonly sheaf: SheafCarrier;
  readonly orbit: readonly PredicationValuationClosureStageCarrier[];
  readonly fixedPointStage: PredicationValuationClosureStageCarrier;
}

export function lastValuation(p: PresheafCarrier): Valuation {
  return p.traces[p.traces.length - 1]!;
}

export function sameMeme(left: Meme, right: Meme): boolean {
  return predicationCellCoincidenceHolds(left.cell, right.cell) && sameCharge(left.charge, right.charge);
}

function sameAssignmentSet(left: readonly Meme[], right: readonly Meme[]): boolean {
  return left.length === right.length && left.every((assignment) => right.some((other) => sameMeme(assignment, other)));
}

function sameFiberAlgebra(left: FiberAlgebra, right: FiberAlgebra): boolean {
  return predicationPredicateCoincidenceHolds(left.predicate, right.predicate)
    && sameAssignmentSet(left.assignments, right.assignments);
}

function sameBaseEdge(left: Edge<PredicationBaseObject, PredicationBaseObject>, right: Edge<PredicationBaseObject, PredicationBaseObject>): boolean {
  return predicationBaseObjectCoincidenceHolds(left.domain, right.domain) && predicationBaseObjectCoincidenceHolds(left.codomain, right.codomain);
}

function sameBaseEdges(
  left: readonly Edge<PredicationBaseObject, PredicationBaseObject>[],
  right: readonly Edge<PredicationBaseObject, PredicationBaseObject>[],
): boolean {
  return left.length === right.length && left.every((edge) => right.some((other) => sameBaseEdge(edge, other)));
}

function sameBaseCategory(left: BaseCategory, right: BaseCategory): boolean {
  return sameBaseEdges(left.specialization, right.specialization)
    && sameBaseEdges(left.converse, right.converse)
    && sameBaseEdges(left.subjectProjection, right.subjectProjection)
    && sameBaseEdges(left.objectProjection, right.objectProjection);
}

export function sameValuation(left: Valuation, right: Valuation): boolean {
  return sameBaseCategory(left.base, right.base)
    && left.fibers.length === right.fibers.length
    && left.fibers.every((fiber) => right.fibers.some((other) => sameFiberAlgebra(fiber, other)));
}

export const predicationValuationClosureStageOrdinal = (
  ordinal: Ordinal,
): PredicationValuationClosureStageOrdinalCarrier => Object.freeze({
  kind: "predication.valuation.closure.stageOrdinal" as const,
  ordinal,
});

export function predicationValuationClosureStage(point: ClosureOrbitPoint<Valuation>): PredicationValuationClosureStageCarrier {
  return Object.freeze({
    kind: "predication.valuation.closure.stage" as const,
    stageOrdinal: predicationValuationClosureStageOrdinal(point.stage),
    valuation: point.value,
  });
}

export function predicationValuationClosureFiniteStageJudgment(
  stage: PredicationValuationClosureStageCarrier,
): PredicationValuationClosureFiniteStageJudgment {
  const reading = finiteOrdinalJudgment(stage.stageOrdinal.ordinal);
  return reading.kind === "ordinal.closure.finiteOrdinal:witness"
    ? Object.freeze({
      kind: "predication.valuation.closure.finiteStage:witness" as const,
      stage,
      value: reading.value,
    })
    : Object.freeze({
      kind: "predication.valuation.closure.finiteStage-obstruction" as const,
      stage,
      reading,
    });
}

export const settlingStageOrdinalOfPredicationValuationClosureStage = (
  stage: PredicationValuationClosureStageCarrier,
): SettlingStageOrdinalCarrier => settlingStageOrdinal(stage.stageOrdinal.ordinal);

const modalStep = (fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier) => (valuation: Valuation): Valuation => Object.freeze({
  ...valuation,
  fibers: Object.freeze(valuation.fibers.map((fiber): FiberAlgebra => {
    const assignments: Meme[] = [];
    for (const assignment of fiber.assignments) {
      const index = assignments.findIndex((item) => predicationCellCoincidenceHolds(item.cell, assignment.cell));
      if (index < 0) assignments.push(assignment);
      else assignments[index] = Object.freeze({ ...assignment, charge: fold(assignments[index]!.charge, assignment.charge) });
    }
    return Object.freeze({ ...fiber, assignments: Object.freeze(assignments) });
  })),
});

export const raiseKnowledge = modalStep(joinKnowledge);
export const lowerKnowledge = modalStep(meetKnowledge);
export const raiseTruth = modalStep(joinTruth);
export const lowerTruth = modalStep(meetTruth);

const appendValuation = (step: (valuation: Valuation) => Valuation) => (p: PresheafCarrier): PresheafCarrier => Object.freeze({
  ...p,
  traces: Object.freeze([...p.traces, step(lastValuation(p))]),
});

export const possibilizeKnowledge = appendValuation(raiseKnowledge);
export const necessitateKnowledge = appendValuation(lowerKnowledge);
export const possibilizeTruth = appendValuation(raiseTruth);
export const necessitateTruth = appendValuation(lowerTruth);

const valuationMemes = (valuation: Valuation): readonly Meme[] =>
  Object.freeze(valuation.fibers.flatMap((fiber) => fiber.assignments));

function composeValuation(memes: readonly Meme[], base: BaseCategory, fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier): Valuation {
  const byPredicate: { readonly predicate: PredicationPredicate; readonly assignments: Meme[] }[] = [];
  for (const assignment of memes) {
    const bucket = byPredicate.find((item) => predicationPredicateCoincidenceHolds(item.predicate, assignment.cell.predicate));
    if (!bucket) {
      byPredicate.push({ predicate: assignment.cell.predicate, assignments: [assignment] });
      continue;
    }

    const index = bucket.assignments.findIndex((item) => predicationCellCoincidenceHolds(item.cell, assignment.cell));
    if (index < 0) {
      bucket.assignments.push(assignment);
      continue;
    }

    const prior = bucket.assignments[index]!;
    bucket.assignments[index] = Object.freeze({ ...assignment, charge: fold(prior.charge, assignment.charge) });
  }

  const fibers = byPredicate.map(({ predicate, assignments }) => Object.freeze({
    kind: "predication.fiber.algebra" as const,
    predicate,
    entities: entitySet(assignments.flatMap((assignment) => [assignment.cell.subject, assignment.cell.object]), predicationTermCoincidenceHolds),
    assignments: Object.freeze(assignments),
  }));
  return Object.freeze({ kind: "predication.fiber.valuation" as const, base, fibers: Object.freeze(fibers) });
}

// Generator semantics are C-natural derived views, not materialized cells.
// The converse and projection generators act by pullback on fibers (the
// fiber layer's pullback/exists/forall) — f* ∘ cl_P = cl_{P^c} ∘ f* couples
// closure across DISTINCT fibers. The previous shape injected the swap and
// diagonal images into the source predicate's own fiber, conflating P with
// P^c and asserting unattested propositions with borrowed evidence (see
// research: predication-bucket-3-converse-coupling-transfinite-settling).
// Transport therefore normalizes the fiber (duplicate cells folded in the
// closing order) over the specialization-closed base, and nothing more.
export function transportValuationAlongPredicationGenerators(
  valuation: Valuation,
  fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier = joinKnowledge,
): Valuation {
  const base = closeSpecialization(valuation.base);
  return composeValuation(valuationMemes(valuation), base, fold);
}

// The endomorphisms dedupe with the order's JOIN, not raise∘lower: lower
// meet-folds duplicates first, which makes raise a no-op (raise∘lower = lower)
// and deflates contested duplicates toward absurd inside what is supposed to
// be a fixed-point accumulation in that order.
export const knowledgeClosureEndomorphism = (valuation: Valuation): Valuation =>
  transportValuationAlongPredicationGenerators(raiseKnowledge(valuation), joinKnowledge);

export const truthClosureEndomorphism = (valuation: Valuation): Valuation =>
  transportValuationAlongPredicationGenerators(raiseTruth(valuation), joinTruth);

export const knowledgeValuationClosureOrder = (): PredicationValuationClosureOrderCarrier => Object.freeze({
  kind: "predication.valuation.closure.order" as const,
  name: "knowledge" as const,
  endomorphism: knowledgeClosureEndomorphism,
  lattice: knowledgeValuationClosureLattice,
});

export const truthValuationClosureOrder = (): PredicationValuationClosureOrderCarrier => Object.freeze({
  kind: "predication.valuation.closure.order" as const,
  name: "truth" as const,
  endomorphism: truthClosureEndomorphism,
  lattice: truthValuationClosureLattice,
});

export function predicationValuationClosureProcess(
  order: PredicationValuationClosureOrderCarrier,
  seed: Valuation,
): PredicationValuationClosureProcessCarrier {
  return Object.freeze({
    kind: "predication.valuation.closure.process" as const,
    order,
    seed,
    ordinalProcess: closureProcess(order.lattice(seed), order.endomorphism),
  });
}

export function closePredicationValuationClosure(process: PredicationValuationClosureProcessCarrier): PredicationValuationClosureCarrier {
  const closure = closeOrdinalProcess(process.ordinalProcess);
  return Object.freeze({
    kind: "predication.valuation.closure.carrier" as const,
    process,
    closure,
    sheaf: sheafFromValuation(closure.value),
  });
}

export function knowledgeValuationClosure(p: PresheafCarrier): PredicationValuationClosureCarrier {
  return closePredicationValuationClosure(predicationValuationClosureProcess(knowledgeValuationClosureOrder(), p.traces[0]!));
}

export function truthValuationClosure(p: PresheafCarrier): PredicationValuationClosureCarrier {
  return closePredicationValuationClosure(predicationValuationClosureProcess(truthValuationClosureOrder(), p.traces[0]!));
}

export function knowledgeClosureSheaf(p: PresheafCarrier): SheafCarrier {
  return knowledgeValuationClosure(p).sheaf;
}

export function predicationValuationClosureTrace(closure: PredicationValuationClosureCarrier): PredicationValuationClosureTraceCarrier {
  const fixedPointStage = closure.closure.stabilization.kind === "ordinal.closure.stabilization:witness"
    ? predicationValuationClosureStage(Object.freeze({
      kind: "ordinal.closure.orbitPoint" as const,
      stage: closure.closure.stabilization.ordinal,
      value: closure.closure.stabilization.value,
    }))
    : predicationValuationClosureStage(Object.freeze({
      kind: "ordinal.closure.orbitPoint" as const,
      stage: closure.closure.stabilization.searchedThrough,
      value: closure.closure.stabilization.value,
    }));
  return Object.freeze({
    kind: "predication.valuation.closure.trace" as const,
    closure,
    sheaf: closure.sheaf,
    orbit: Object.freeze(closure.closure.orbit.map(predicationValuationClosureStage)),
    fixedPointStage,
  });
}

export function knowledgeClosureTrace(p: PresheafCarrier): PredicationValuationClosureTraceCarrier {
  return predicationValuationClosureTrace(knowledgeValuationClosure(p));
}

export function knowledgeClosureCells(p: PresheafCarrier): readonly Cell[] {
  return Object.freeze(knowledgeClosureSheaf(p).section.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell)));
}

export function utteranceKnowledgeClosureCohomology(left: Mark, right: Mark): CohomologyCarrier {
  return cohomology(knowledgeClosureSheaf(presheaf(posit(predicate([articulate(utterance(left, right))])))));
}

export function knowledgeClosureSettling(presheafCarrier: PresheafCarrier): SettlingCarrier {
  const traced = knowledgeClosureTrace(presheafCarrier);
  const stages = traced.orbit.map((stage) => {
    const ordinal = settlingStageOrdinalOfPredicationValuationClosureStage(stage);
    return settlingStageInput(
      ordinal,
      settlingStageDesignatedCells(designatedCells(stage.valuation)),
      settlingStageShape(ordinal),
    );
  });
  return settling(stages);
}

function foldedValuationClosureLattice(
  bottom: Valuation,
  fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier,
): Lattice<Valuation> {
  const join = (left: Valuation, right: Valuation): Valuation => mergeValuations(left, right, fold);
  return Object.freeze({
    bottom,
    leq: (left: Valuation, right: Valuation) => sameValuation(left, right) || sameValuation(join(left, right), right),
    join,
    eq: sameValuation,
    sup: (sequence: (n: Natural) => Valuation) => {
      let current = sequence(natZero);
      for (let index = successor(natZero); ; index = successor(index)) {
        const next = sequence(index);
        const joined = join(current, next);
        if (sameValuation(joined, current)) return current;
        current = joined;
      }
    },
  });
}

export function valuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return foldedValuationClosureLattice(bottom, joinKnowledge);
}

export function truthValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return foldedValuationClosureLattice(bottom, joinTruth);
}

export function knowledgeValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  const lattice = Object.freeze({
    ...valuationClosureLattice(bottom),
    leq: (left: Valuation, right: Valuation): boolean => {
      for (const fiber of left.fibers) {
        for (const assignment of fiber.assignments) {
          const rightCharge = right.fibers
            .flatMap((rightFiber) => rightFiber.assignments)
            .find((rightAssignment) => predicationCellCoincidenceHolds(rightAssignment.cell, assignment.cell))
            ?.charge;
          if (!rightCharge || !leqKnowledge(assignment.charge, rightCharge)) return false;
        }
      }
      return true;
    },
  }) satisfies Lattice<Valuation>;
  return lattice;
}

function mergeValuations(
  left: Valuation,
  right: Valuation,
  fold: (left: ChargeCarrier, right: ChargeCarrier) => ChargeCarrier = joinKnowledge,
): Valuation {
  const fibers: FiberAlgebra[] = [];
  for (const valuation of [left, right]) {
    for (const fiber of valuation.fibers) {
      const prior = fibers.find((item) => predicationPredicateCoincidenceHolds(item.predicate, fiber.predicate));
      if (!prior) fibers.push(fiber);
      else {
        const assignments: Meme[] = [];
        for (const assignment of [...prior.assignments, ...fiber.assignments]) {
          const existingIndex = assignments.findIndex((item) => predicationCellCoincidenceHolds(item.cell, assignment.cell));
          if (existingIndex < 0) assignments.push(assignment);
          else assignments[existingIndex] = Object.freeze({ ...assignment, charge: fold(assignments[existingIndex]!.charge, assignment.charge) });
        }
        fibers.splice(fibers.indexOf(prior), 1, Object.freeze({ ...fiber, assignments: Object.freeze(assignments) }));
      }
    }
  }
  return Object.freeze({ ...left, fibers: Object.freeze(fibers) });
}
