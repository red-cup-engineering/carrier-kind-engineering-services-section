/**
 * The mathematical Settling morphism: knowledge closure producing a Settlement.
 *
 * A valuation closes under a modal step (knowledge- or truth-raise) followed by
 * transport along the predication generators (specialization closure + recompose,
 * folding coincident cells by the order's join). The ordinal closure engine runs
 * that endomorphism from the posit seed to its fixed point; `settle` maps the
 * closure orbit to settling-stage inputs (each stage's designated cells) and
 * assembles the `Settlement` — the settled object the read bins query.
 */
import { joinKnowledge, leqKnowledge, meetKnowledge, joinTruth, meetTruth, sameCharge, type Charge } from "./values/index.mts";
import type { FromSchema } from "./schema/contract.mts";
import { natZero, successor, type Natural } from "./math/rational/exact-number.mts";
import {
  closeOrdinalProcess,
  closureProcess,
  finiteOrdinalJudgment,
  type ClosureResult,
  type ClosureOrbitPoint,
  type ClosureProcess,
  type FiniteOrdinalJudgment,
  type Lattice,
  type Ordinal,
} from "./fixpoint/closure.mts";
import type { FiberAlgebra, Meme, Valuation } from "./logic/predicating/evidence/fiber.mts";
import { posit } from "./logic/predicating/evidence/fiber.mts";
import { freePredicationSite, predicationGeneratorsShape, type PredicationSiteGenerators } from "./logic/predicating/predication.mts";
import { readDesignatedCellsOfValuation } from "./fixpoint/designation.mts";
import { settlementFiltration, type Settlement, type SettlingStageOrdinal } from "./settlement.mts";
import { settlingStageOrdinal } from "./fixpoint/ordinal.mts";
import { settlingStageInput, readShapeOfSettlingStageOrdinal, settlingStageDesignatedCellSet } from "./fixpoint/stage.mts";
import {
  baseObjectCoincides,
  cellCoincides,
  predicateCoincides,
  termCoincides,
  closeSpecialization,
  entitySet,
  type BaseCategory,
  type Cell,
  type Edge,
  type PredicationBaseObject,
  type PredicationPredicate,
} from "./logic/predicating/predication.mts";
import { sheafFromValuation, type PositPresheaf, type ValuationSheaf } from "./fixpoint/sheaf.mts";

export type { OrderName } from "./logic/predicating/evidence/fiber.mts";
import type { OrderName } from "./logic/predicating/evidence/fiber.mts";

/** A stage ordinal in valuation closure. */
export interface PredicationValuationClosureStageOrdinal {
  readonly kind: "predication.valuation.closure.stageOrdinal";
  readonly ordinal: Ordinal;
}

/** A single stage of valuation closure: a stage ordinal and the valuation reached. */
export interface PredicationValuationClosureStage {
  readonly kind: "predication.valuation.closure.stage";
  readonly stageOrdinal: PredicationValuationClosureStageOrdinal;
  readonly valuation: Valuation;
}

/** A closure order over valuations: its name, endomorphism, and lattice builder. */
export interface PredicationValuationClosureOrder {
  readonly kind: "predication.valuation.closure.order";
  readonly name: OrderName;
  readonly endomorphism: (valuation: Valuation) => Valuation;
  readonly lattice: (seed: Valuation) => Lattice<Valuation>;
}

/** A valuation closure process: an order, a seed, and the ordinal process. */
export interface PredicationValuationClosureProcess {
  readonly kind: "predication.valuation.closure.process";
  readonly order: PredicationValuationClosureOrder;
  readonly seed: Valuation;
  readonly ordinalProcess: ClosureProcess<Valuation>;
}

/** The result of closing a valuation closure process. */
export interface PredicationValuationClosureResult {
  readonly kind: "predication.valuation.closure.result";
  readonly process: PredicationValuationClosureProcess;
  readonly closure: ClosureResult<Valuation>;
  readonly sheaf: ValuationSheaf;
}

/** A witness that a closure stage's ordinal is finite. */
export interface PredicationValuationClosureFiniteStageWitness {
  readonly kind: "predication.valuation.closure.finiteStage:witness";
  readonly stage: PredicationValuationClosureStage;
  readonly value: Natural;
}

/** An obstruction that a closure stage's ordinal is not finite. */
export interface PredicationValuationClosureFiniteStageObstruction {
  readonly kind: "predication.valuation.closure.finiteStage-obstruction";
  readonly stage: PredicationValuationClosureStage;
  readonly reading: FiniteOrdinalJudgment;
}

/** The judgment on whether a closure stage's ordinal is finite. */
export type PredicationValuationClosureFiniteStageJudgment =
  | PredicationValuationClosureFiniteStageWitness
  | PredicationValuationClosureFiniteStageObstruction;

/** A trace of a valuation closure: the result, sheaf, orbit, and fixed-point stage. */
export interface PredicationValuationClosureTrace {
  readonly kind: "predication.valuation.closure.trace";
  readonly closure: PredicationValuationClosureResult;
  readonly sheaf: ValuationSheaf;
  readonly orbit: readonly PredicationValuationClosureStage[];
  readonly fixedPointStage: PredicationValuationClosureStage;
}

/** The most recent valuation in a posit presheaf's trace. */
export function lastValuation(p: PositPresheaf): Valuation {
  return p.traces[p.traces.length - 1]!;
}

/** Whether two memes coincide (cells coincide and charges are the same). */
export function sameMeme(left: Meme, right: Meme): boolean {
  return cellCoincides(left.cell, right.cell) && sameCharge(left.charge, right.charge);
}

function sameAssignmentSet(left: readonly Meme[], right: readonly Meme[]): boolean {
  return left.length === right.length && left.every((assignment) => right.some((other) => sameMeme(assignment, other)));
}

function sameFiberAlgebra(left: FiberAlgebra, right: FiberAlgebra): boolean {
  return predicateCoincides(left.predicate, right.predicate) && sameAssignmentSet(left.assignments, right.assignments);
}

function sameBaseEdge(left: Edge<PredicationBaseObject, PredicationBaseObject>, right: Edge<PredicationBaseObject, PredicationBaseObject>): boolean {
  return baseObjectCoincides(left.domain, right.domain) && baseObjectCoincides(left.codomain, right.codomain);
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

/** Whether two valuations coincide (same base, same fibers as a set). */
export function sameValuation(left: Valuation, right: Valuation): boolean {
  return sameBaseCategory(left.base, right.base)
    && left.fibers.length === right.fibers.length
    && left.fibers.every((fiber) => right.fibers.some((other) => sameFiberAlgebra(fiber, other)));
}

/** A stage-ordinal filtration wrapping an ordinal. */
export const predicationValuationClosureStageOrdinal = (ordinal: Ordinal): PredicationValuationClosureStageOrdinal =>
  Object.freeze({ kind: "predication.valuation.closure.stageOrdinal" as const, ordinal });

/** A closure stage filtration from a closure orbit point. */
export function predicationValuationClosureStage(point: ClosureOrbitPoint<Valuation>): PredicationValuationClosureStage {
  return Object.freeze({
    kind: "predication.valuation.closure.stage" as const,
    stageOrdinal: predicationValuationClosureStageOrdinal(point.stage),
    valuation: point.value,
  });
}

/** Judge whether a closure stage's ordinal is finite. */
export function predicationValuationClosureFiniteStageJudgment(
  stage: PredicationValuationClosureStage,
): PredicationValuationClosureFiniteStageJudgment {
  const reading = finiteOrdinalJudgment(stage.stageOrdinal.ordinal);
  return reading.kind === "ordinal.closure.finiteOrdinal:witness"
    ? Object.freeze({ kind: "predication.valuation.closure.finiteStage:witness" as const, stage, value: reading.value })
    : Object.freeze({ kind: "predication.valuation.closure.finiteStage-obstruction" as const, stage, reading });
}

/** Map a closure stage to a settling stage ordinal. */
export const settlingStageOrdinalOfPredicationValuationClosureStage = (
  stage: PredicationValuationClosureStage,
): SettlingStageOrdinal => settlingStageOrdinal(stage.stageOrdinal.ordinal);

const modalStep = (fold: (left: Charge, right: Charge) => Charge) => (valuation: Valuation): Valuation => Object.freeze({
  ...valuation,
  fibers: Object.freeze(valuation.fibers.map((fiber): FiberAlgebra => {
    const assignments: Meme[] = [];
    for (const assignment of fiber.assignments) {
      const index = assignments.findIndex((item) => cellCoincides(item.cell, assignment.cell));
      if (index < 0) assignments.push(assignment);
      else assignments[index] = Object.freeze({ ...assignment, charge: fold(assignments[index]!.charge, assignment.charge) });
    }
    return Object.freeze({ ...fiber, assignments: Object.freeze(assignments) });
  })),
});

/** Knowledge-raise: fold duplicate cells by knowledge join. */
export const raiseKnowledge = modalStep(joinKnowledge);
/** Knowledge-lower: fold by knowledge meet. */
export const lowerKnowledge = modalStep(meetKnowledge);
/** Truth-raise: fold by truth join. */
export const raiseTruth = modalStep(joinTruth);
/** Truth-lower: fold by truth meet. */
export const lowerTruth = modalStep(meetTruth);

const appendValuation = (step: (valuation: Valuation) => Valuation) => (p: PositPresheaf): PositPresheaf => Object.freeze({
  ...p,
  traces: Object.freeze([...p.traces, step(lastValuation(p))]),
});

/** Append the knowledge-raised valuation to a presheaf trace. */
export const possibilizeKnowledge = appendValuation(raiseKnowledge);
/** Append the knowledge-lowered valuation to a presheaf trace. */
export const necessitateKnowledge = appendValuation(lowerKnowledge);
/** Append the truth-raised valuation to a presheaf trace. */
export const possibilizeTruth = appendValuation(raiseTruth);
/** Append the truth-lowered valuation to a presheaf trace. */
export const necessitateTruth = appendValuation(lowerTruth);

const valuationMemes = (valuation: Valuation): readonly Meme[] =>
  Object.freeze(valuation.fibers.flatMap((fiber) => fiber.assignments));

function composeValuation(memes: readonly Meme[], base: BaseCategory, fold: (left: Charge, right: Charge) => Charge): Valuation {
  const byPredicate: { readonly predicate: PredicationPredicate; readonly assignments: Meme[] }[] = [];
  for (const assignment of memes) {
    const bucket = byPredicate.find((item) => predicateCoincides(item.predicate, assignment.cell.predicate));
    if (!bucket) {
      byPredicate.push({ predicate: assignment.cell.predicate, assignments: [assignment] });
      continue;
    }
    const index = bucket.assignments.findIndex((item) => cellCoincides(item.cell, assignment.cell));
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
    entities: entitySet(assignments.flatMap((assignment) => [assignment.cell.subject, assignment.cell.object]), termCoincides),
    assignments: Object.freeze(assignments),
  }));
  return Object.freeze({ kind: "predication.fiber.valuation" as const, base, fibers: Object.freeze(fibers) });
}

/** Transport a valuation along the predication generators (specialization closure + recompose). */
export function transportValuationAlongPredicationGenerators(
  valuation: Valuation,
  fold: (left: Charge, right: Charge) => Charge = joinKnowledge,
): Valuation {
  const base = closeSpecialization(valuation.base);
  return composeValuation(valuationMemes(valuation), base, fold);
}

/** The knowledge closure endomorphism. */
export const knowledgeClosureEndomorphism = (valuation: Valuation): Valuation =>
  transportValuationAlongPredicationGenerators(raiseKnowledge(valuation), joinKnowledge);

/** The truth closure endomorphism. */
export const truthClosureEndomorphism = (valuation: Valuation): Valuation =>
  transportValuationAlongPredicationGenerators(raiseTruth(valuation), joinTruth);

/** The knowledge closure order filtration. */
export const knowledgeValuationClosureOrder: PredicationValuationClosureOrder = Object.freeze({
  kind: "predication.valuation.closure.order" as const,
  name: "knowledge" as const,
  endomorphism: knowledgeClosureEndomorphism,
  lattice: knowledgeValuationClosureLattice,
});

/** The truth closure order filtration. */
export const truthValuationClosureOrder: PredicationValuationClosureOrder = Object.freeze({
  kind: "predication.valuation.closure.order" as const,
  name: "truth" as const,
  endomorphism: truthClosureEndomorphism,
  lattice: truthValuationClosureLattice,
});

/** Build a valuation closure process from an order and seed. */
export function predicationValuationClosureProcess(
  order: PredicationValuationClosureOrder,
  seed: Valuation,
): PredicationValuationClosureProcess {
  return Object.freeze({
    kind: "predication.valuation.closure.process" as const,
    order,
    seed,
    ordinalProcess: closureProcess(order.lattice(seed), order.endomorphism),
  });
}

/** Close a valuation closure process to its fixed point. */
export function closePredicationValuationClosure(process: PredicationValuationClosureProcess): PredicationValuationClosureResult {
  const closure = closeOrdinalProcess(process.ordinalProcess);
  return Object.freeze({
    kind: "predication.valuation.closure.result" as const,
    process,
    closure,
    sheaf: sheafFromValuation(closure.value),
  });
}

/** The knowledge closure of a posit presheaf. */
export function knowledgeValuationClosure(p: PositPresheaf): PredicationValuationClosureResult {
  return closePredicationValuationClosure(predicationValuationClosureProcess(knowledgeValuationClosureOrder, p.traces[0]!));
}

/** The truth closure of a posit presheaf. */
export function truthValuationClosure(p: PositPresheaf): PredicationValuationClosureResult {
  return closePredicationValuationClosure(predicationValuationClosureProcess(truthValuationClosureOrder, p.traces[0]!));
}

/** The sheaf of a posit presheaf's knowledge closure. */
export function knowledgeClosureSheaf(p: PositPresheaf): ValuationSheaf {
  return knowledgeValuationClosure(p).sheaf;
}

/** Build a trace from a closure result (orbit + fixed-point stage). */
export function predicationValuationClosureTrace(closure: PredicationValuationClosureResult): PredicationValuationClosureTrace {
  const fixedPointStage = closure.closure.stabilization.kind === "ordinal.closure.stabilization:witness"
    ? predicationValuationClosureStage(Object.freeze({ kind: "ordinal.closure.orbitPoint" as const, stage: closure.closure.stabilization.ordinal, value: closure.closure.stabilization.value }))
    : predicationValuationClosureStage(Object.freeze({ kind: "ordinal.closure.orbitPoint" as const, stage: closure.closure.stabilization.searchedThrough, value: closure.closure.stabilization.value }));
  return Object.freeze({
    kind: "predication.valuation.closure.trace" as const,
    closure,
    sheaf: closure.sheaf,
    orbit: Object.freeze(closure.closure.orbit.map(predicationValuationClosureStage)),
    fixedPointStage,
  });
}

/** The trace of a posit presheaf's knowledge closure. */
export function knowledgeClosureTrace(p: PositPresheaf): PredicationValuationClosureTrace {
  return predicationValuationClosureTrace(knowledgeValuationClosure(p));
}

/** The cells of a posit presheaf's knowledge closure sheaf. */
export function knowledgeClosureCells(p: PositPresheaf): readonly Cell[] {
  return Object.freeze(knowledgeClosureSheaf(p).section.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell)));
}

/** Settle a posit presheaf: knowledge-close, map the orbit to stages, assemble the filtration. */
export function settling(positPresheaf: PositPresheaf): Settlement {
  const traced = knowledgeClosureTrace(positPresheaf);
  const stages = traced.orbit.map((stage) => {
    const ordinal = settlingStageOrdinalOfPredicationValuationClosureStage(stage);
    return settlingStageInput(
      ordinal,
      settlingStageDesignatedCellSet(readDesignatedCellsOfValuation(stage.valuation)),
      readShapeOfSettlingStageOrdinal(ordinal),
    );
  });
  return settlementFiltration(stages);
}

/**
 * The settlement filtration's GENERATORS — the predication generators it freely
 * settles. The filtration is the TERMINAL settled form: it is constructed FREELY
 * from the generators (`freeSettlementFiltration`), but unlike the upstream
 * presentations it is not `present`-able back to them (you do not un-settle a
 * settlement). The settle action therefore carries its input's generators forward
 * under the filtration kind; the readers `free` them on read.
 */
/** The settlement filtration's wire schema: the same generator shape as
 *  `predicationSiteGeneratorsSchema`, re-tagged — `settle` carries its input's
 *  generators forward under this kind (see the module doc above `settle`).
 *  `settled` is optional: the pure generators carry the complete morphism data,
 *  but the `settle`/`induce`/`relate-relations` operations attach the
 *  closure engine's own readout (stages, regime, classification, extremal H¹)
 *  under this key when they cross the closure-engine boundary — a boundary
 *  observation of that exposure, not part of the generators themselves (see
 *  `settleOperation`'s doc, `src/apps/infograph/operations/inducing.mts`). */
export const settlementFiltrationGeneratorsSchema = {
  $id: "metroplat/closure/settlement-filtration-generators",
  type: "object",
  required: ["kind", "cells", "specializations"],
  properties: { kind: { const: "predication.settlement.filtration" }, ...predicationGeneratorsShape, settled: { type: "object" } },
  additionalProperties: false,
  title: "SettlementFiltrationGenerators",
  description: "The predication generators a settlement filtration freely settles, with an optional settled reading attached at the closure-engine boundary.",
} as const;

export type SettlementFiltrationGenerators = FromSchema<typeof settlementFiltrationGeneratorsSchema> & {
  readonly cells: PredicationSiteGenerators["cells"];
  readonly specializations: PredicationSiteGenerators["specializations"];
};

/** Re-derive the full settlement filtration from its generators (the read projection). */
export function freeSettlementFiltration(generators: SettlementFiltrationGenerators): Settlement {
  return settling(posit(freePredicationSite({
    kind: "predication.site",
    cells: generators.cells,
    specializations: generators.specializations,
  })));
}

function foldedValuationClosureLattice(
  bottom: Valuation,
  fold: (left: Charge, right: Charge) => Charge,
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

/** The knowledge-join valuation closure lattice. */
export function valuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return foldedValuationClosureLattice(bottom, joinKnowledge);
}

/** The truth-join valuation closure lattice. */
export function truthValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return foldedValuationClosureLattice(bottom, joinTruth);
}

/** The knowledge valuation closure lattice, with leq strengthened to per-charge knowledge order. */
export function knowledgeValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  const lattice = Object.freeze({
    ...valuationClosureLattice(bottom),
    leq: (left: Valuation, right: Valuation): boolean => {
      for (const fiber of left.fibers) {
        for (const assignment of fiber.assignments) {
          const rightCharge = right.fibers
            .flatMap((rightFiber) => rightFiber.assignments)
            .find((rightAssignment) => cellCoincides(rightAssignment.cell, assignment.cell))
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
  fold: (left: Charge, right: Charge) => Charge = joinKnowledge,
): Valuation {
  const fibers: FiberAlgebra[] = [];
  for (const valuation of [left, right]) {
    for (const fiber of valuation.fibers) {
      const prior = fibers.find((item) => predicateCoincides(item.predicate, fiber.predicate));
      if (!prior) fibers.push(fiber);
      else {
        const assignments: Meme[] = [];
        for (const assignment of [...prior.assignments, ...fiber.assignments]) {
          const existingIndex = assignments.findIndex((item) => cellCoincides(item.cell, assignment.cell));
          if (existingIndex < 0) assignments.push(assignment);
          else assignments[existingIndex] = Object.freeze({ ...assignment, charge: fold(assignments[existingIndex]!.charge, assignment.charge) });
        }
        fibers.splice(fibers.indexOf(prior), 1, Object.freeze({ ...fiber, assignments: Object.freeze(assignments) }));
      }
    }
  }
  return Object.freeze({ ...left, fibers: Object.freeze(fibers) });
}
