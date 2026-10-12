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
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
import * as canonical from "@lenticule-science/metrologic/articulation/predicating/positing/settling/valuation-closure";
import type * as canonicalFiber from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";
import { joinKnowledge, type Charge } from "@red-cup-engineering/computer-data-engine/bilattice-charge";

import { type Natural } from "@red-cup-engineering/computer-data-engine/exact-number";
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
} from "@lenticule-science/metrologic/articulation/predicating/positing/settling";
import type { Meme, Valuation } from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";
import { posit } from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";
import { freePredicationSite, predicationGeneratorsShape, type PredicationSiteGenerators } from "@red-cup-engineering/computer-data-engine/predication";
import { readDesignatedCellsOfValuation } from "./fixpoint/designation.mts";
import { settlementFiltration, type Settlement, type SettlingStageOrdinal } from "@lenticule-science/metrologic/settling/settlement";
import { settlingStageOrdinal, settlingStageInput, readShapeOfSettlingStageOrdinal, settlingStageDesignatedCellSet } from "@lenticule-science/metrologic/articulation/predicating/positing/settling";
import type { Cell } from "@red-cup-engineering/computer-data-engine/predication";
import { sheafFromValuation, type PositPresheaf, type SheafCarrier as ValuationSheaf } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/sheaf";

export type { OrderName } from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";
import type { OrderName } from "@lenticule-science/metrologic/articulation/predicating/positing/fiber";

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
  readonly ordinalProcess: ClosureProcessCarrier<Valuation>;
}

/** The result of closing a valuation closure process. */
export interface PredicationValuationClosureResult {
  readonly kind: "predication.valuation.closure.result";
  readonly process: PredicationValuationClosureProcess;
  readonly closure: ClosureCarrier<Valuation>;
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
export const sameMeme = (left: Meme, right: Meme): boolean => canonical.sameMeme({ ...left, charge: (left.charge) }, { ...right, charge: (right.charge) });

/** Whether two valuations coincide (same base, same fibers as a set). */
export const sameValuation = (left: Valuation, right: Valuation): boolean => canonical.sameValuation((left), (right));

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

/** Knowledge-raise: fold duplicate cells by knowledge join. */
export const raiseKnowledge = (valuation: Valuation): Valuation => (canonical.raiseKnowledge((valuation)));
/** Knowledge-lower: fold by knowledge meet. */
export const lowerKnowledge = (valuation: Valuation): Valuation => (canonical.lowerKnowledge((valuation)));
/** Truth-raise: fold by truth join. */
export const raiseTruth = (valuation: Valuation): Valuation => (canonical.raiseTruth((valuation)));
/** Truth-lower: fold by truth meet. */
export const lowerTruth = (valuation: Valuation): Valuation => (canonical.lowerTruth((valuation)));

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

/** Transport a valuation along the predication generators (specialization closure + recompose). */
export const transportValuationAlongPredicationGenerators = (valuation: Valuation, fold: (left: Charge, right: Charge) => Charge = joinKnowledge): Valuation =>
  (canonical.transportValuationAlongPredicationGenerators((valuation), (left, right) => (fold((left), (right)))));

/** The knowledge closure endomorphism. */
export const knowledgeClosureEndomorphism = (valuation: Valuation): Valuation => (canonical.knowledgeClosureEndomorphism((valuation)));

/** The truth closure endomorphism. */
export const truthClosureEndomorphism = (valuation: Valuation): Valuation => (canonical.truthClosureEndomorphism((valuation)));

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

export type SettlementFiltrationGenerators = FromJsonSchema<typeof settlementFiltrationGeneratorsSchema> & {
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

/** The knowledge-join valuation closure lattice. */
export function valuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return fromLattice(canonical.valuationClosureLattice((bottom)));
}

/** The truth-join valuation closure lattice. */
export function truthValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return fromLattice(canonical.truthValuationClosureLattice((bottom)));
}

/** The knowledge valuation closure lattice, with leq strengthened to per-charge knowledge order. */
export function knowledgeValuationClosureLattice(bottom: Valuation): Lattice<Valuation> {
  return fromLattice(canonical.knowledgeValuationClosureLattice((bottom)));
}

const fromLattice = (lattice: Lattice<canonicalFiber.Valuation>): Lattice<Valuation> => Object.freeze<Lattice<Valuation>>({
  bottom: (lattice.bottom),
  eq: (left, right) => lattice.eq((left), (right)),
  leq: (left, right) => lattice.leq((left), (right)),
  join: (left, right) => (lattice.join((left), (right))),
  sup: sequence => (lattice.sup(index => (sequence(index)))),
});
