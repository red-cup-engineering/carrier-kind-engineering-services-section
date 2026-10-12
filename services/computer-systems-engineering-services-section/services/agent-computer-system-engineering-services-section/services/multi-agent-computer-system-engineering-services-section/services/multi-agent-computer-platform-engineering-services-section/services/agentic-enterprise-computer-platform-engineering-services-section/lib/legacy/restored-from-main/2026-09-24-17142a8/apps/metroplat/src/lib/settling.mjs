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

import * as canonical from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/valuation-closure";

import { joinKnowledge, witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { mark } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";

import { } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { closeOrdinalProcess, closureProcess, finiteOrdinalJudgment } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/closure";

import { posit, valuationOfCharge } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/fiber";
import { freePredicationSite, predicationGeneratorsShape } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { readDesignatedCellsOfValuation } from "./fixpoint/designation.mjs";
import { settlementFiltration } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/filtration";
import { settlingStageOrdinal } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/ordinal";
import { settlingStageInput, readShapeOfSettlingStageOrdinal, settlingStageDesignatedCellSet } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/stage";

import { sheafFromValuation } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/sheaf";
import { predicationValuationClosureTrace } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/valuation-closure";

/** A stage ordinal in valuation closure. */

/** A single stage of valuation closure: a stage ordinal and the valuation reached. */

/** A closure order over valuations: its name, endomorphism, and lattice builder. */

/** A valuation closure process: an order, a seed, and the ordinal process. */

/** The result of closing a valuation closure process. */

/** A witness that a closure stage's ordinal is finite. */

/** An obstruction that a closure stage's ordinal is not finite. */

/** The judgment on whether a closure stage's ordinal is finite. */

/** A trace of a valuation closure: the result, sheaf, orbit, and fixed-point stage. */

/** The most recent valuation in a posit presheaf's trace. */
export function lastValuation(p) {
  return p.traces[p.traces.length - 1];
}

/** Whether two memes coincide (cells coincide and charges are the same). */
export const sameMeme = (left, right) => canonical.sameMeme({ ...left, charge: (left.charge) }, { ...right, charge: (right.charge) });

/** Whether two valuations coincide (same base, same fibers as a set). */
export const sameValuation = (left, right) => canonical.sameValuation((left), (right));

/** A stage-ordinal filtration wrapping an ordinal. */
export const predicationValuationClosureStageOrdinal = (ordinal) =>
  Object.freeze({ kind: "predication.valuation.closure.stageOrdinal", ordinal });

/** A closure stage filtration from a closure orbit point. */
export function predicationValuationClosureStage(point) {
  return Object.freeze({
    kind: "predication.valuation.closure.stage",
    stageOrdinal: predicationValuationClosureStageOrdinal(point.stage),
    valuation: point.value,
  });
}

/** Judge whether a closure stage's ordinal is finite. */
export function predicationValuationClosureFiniteStageJudgment(
  stage,
) {
  const reading = finiteOrdinalJudgment(stage.stageOrdinal.ordinal);
  return reading.kind === "ordinal.closure.finiteOrdinal:witness"
    ? Object.freeze({ kind: "predication.valuation.closure.finiteStage:witness", stage, value: reading.value })
    : Object.freeze({ kind: "predication.valuation.closure.finiteStage-obstruction", stage, reading });
}

/** Map a closure stage to a settling stage ordinal. */
export const settlingStageOrdinalOfPredicationValuationClosureStage = (
  stage,
) => settlingStageOrdinal(stage.stageOrdinal.ordinal);

/** Knowledge-raise: fold duplicate cells by knowledge join. */
export const raiseKnowledge = (valuation) => (canonical.raiseKnowledge((valuation)));
/** Knowledge-lower: fold by knowledge meet. */
export const lowerKnowledge = (valuation) => (canonical.lowerKnowledge((valuation)));
/** Truth-raise: fold by truth join. */
export const raiseTruth = (valuation) => (canonical.raiseTruth((valuation)));
/** Truth-lower: fold by truth meet. */
export const lowerTruth = (valuation) => (canonical.lowerTruth((valuation)));

const appendValuation = (step) => (p) => Object.freeze({
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
export const transportValuationAlongPredicationGenerators = (valuation, fold = joinKnowledge) =>
  (canonical.transportValuationAlongPredicationGenerators((valuation), (left, right) => (fold((left), (right)))));

/** The knowledge closure endomorphism. */
export const knowledgeClosureEndomorphism = (valuation) => (canonical.knowledgeClosureEndomorphism((valuation)));

/** The truth closure endomorphism. */
export const truthClosureEndomorphism = (valuation) => (canonical.truthClosureEndomorphism((valuation)));

/** The knowledge closure order filtration. */
export const knowledgeValuationClosureOrder = Object.freeze({
  kind: "predication.valuation.closure.order",
  name: "knowledge",
  endomorphism: knowledgeClosureEndomorphism,
  lattice: knowledgeValuationClosureLattice,
});

/** The truth closure order filtration. */
export const truthValuationClosureOrder = Object.freeze({
  kind: "predication.valuation.closure.order",
  name: "truth",
  endomorphism: truthClosureEndomorphism,
  lattice: truthValuationClosureLattice,
});

/** Build a valuation closure process from an order and seed. */
export function predicationValuationClosureProcess(
  order,
  seed,
) {
  return Object.freeze({
    kind: "predication.valuation.closure.process",
    order,
    seed,
    ordinalProcess: closureProcess(order.lattice(seed), order.endomorphism),
  });
}

/** Close a valuation closure process to its fixed point. */
export function closePredicationValuationClosure(process) {
  const closure = closeOrdinalProcess(process.ordinalProcess);
  return Object.freeze({
    kind: "predication.valuation.closure.result",
    process,
    closure,
    sheaf: sheafFromValuation(closure.value),
  });
}

/** The knowledge closure of a posit presheaf. */
export function knowledgeValuationClosure(p) {
  return closePredicationValuationClosure(predicationValuationClosureProcess(knowledgeValuationClosureOrder, p.traces[0]));
}

/** The truth closure of a posit presheaf. */
export function truthValuationClosure(p) {
  return closePredicationValuationClosure(predicationValuationClosureProcess(truthValuationClosureOrder, p.traces[0]));
}

/** The sheaf of a posit presheaf's knowledge closure. */
export function knowledgeClosureSheaf(p) {
  return knowledgeValuationClosure(p).sheaf;
}

/** The trace of a posit presheaf's knowledge closure. */
export function knowledgeClosureTrace(p) {
  return predicationValuationClosureTrace(knowledgeValuationClosure(p));
}

/** The cells of a posit presheaf's knowledge closure sheaf. */
export function knowledgeClosureCells(p) {
  return Object.freeze(knowledgeClosureSheaf(p).section.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell)));
}

/** Settle a posit presheaf: knowledge-close, map the orbit to stages, assemble the filtration. */
export function settling(positPresheaf) {
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
};

/** Re-derive the full settlement filtration from its generators (the read projection). */
export function freeSettlementFiltration(generators) {
  const site = freePredicationSite({
    kind: "predication.site",
    cells: generators.cells,
    specializations: generators.specializations,
  });
  return settling(posit(site, valuationOfCharge(site, witnessedPotential(mark(generators)))));
}

/** The knowledge-join valuation closure lattice. */
export function valuationClosureLattice(bottom) {
  return fromLattice(canonical.valuationClosureLattice((bottom)));
}

/** The truth-join valuation closure lattice. */
export function truthValuationClosureLattice(bottom) {
  return fromLattice(canonical.truthValuationClosureLattice((bottom)));
}

/** The knowledge valuation closure lattice, with leq strengthened to per-charge knowledge order. */
export function knowledgeValuationClosureLattice(bottom) {
  return fromLattice(canonical.knowledgeValuationClosureLattice((bottom)));
}

const fromLattice = (lattice) => Object.freeze({
  bottom: (lattice.bottom),
  eq: (left, right) => lattice.eq((left), (right)),
  leq: (left, right) => lattice.leq((left), (right)),
  join: (left, right) => (lattice.join((left), (right))),
  sup: sequence => (lattice.sup(index => (sequence(index)))),
});
