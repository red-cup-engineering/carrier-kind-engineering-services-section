/**
 * settling/valuation-closure — the knowledge closure and `settle`.
 *
 * A valuation closes under a modal step (knowledge- or truth-raise) followed by
 * transport along the predication generators (specialization closure + recompose,
 * folding coincident cells by the order's join). The ordinal closure engine runs
 * that endomorphism from the posit seed to its fixed point; `settle` maps the
 * closure orbit to settling-stage inputs (each stage's designated cells) and
 * assembles the `SettlementFiltration` — the settled object the read bins query.
 */
import { joinKnowledge, leqKnowledge, meetKnowledge, joinTruth, meetTruth, sameCharge } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { natZero, successor } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/exact-number";
import { closeOrdinalProcess, closureProcess, finiteOrdinalJudgment, } from "./closure.mjs";
import { cohomology } from "./cohomology.mjs";
import { composeFibers, posit, valuationOfCharge } from "../fiber.mjs";
import { freePredicationSite } from "@lenticule-science/metrologic/articulation/predicating/positing/predication";
import { readDesignatedCellsOfValuation } from "./designation.mjs";
import { settlementFiltration } from "./filtration.mjs";
import { settlingStageOrdinal } from "./ordinal.mjs";
import { settlingStageInput, readShapeOfSettlingStageOrdinal, settlingStageDesignatedCellSet } from "./stage.mjs";
import { baseObjectCoincides, cellCoincides, predicateCoincides, termCoincides, closeSpecialization, entitySet, predicate, } from "@lenticule-science/metrologic/articulation/predicating/positing/predication";
import { sheafFromValuation } from "./sheaf.mjs";
import { articulate, utterance } from "@lenticule-science/metrologic/articulation/predicating/positing/utterance";
import { witnessedPotential } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
/** The most recent valuation in a posit presheaf's trace. */
export function lastValuation(p) {
    return p.traces[p.traces.length - 1];
}
/** Whether two memes coincide (cells coincide and charges are the same). */
export function sameMeme(left, right) {
    return cellCoincides(left.cell, right.cell) && sameCharge(left.charge, right.charge);
}
function sameAssignmentSet(left, right) {
    return left.length === right.length && left.every((assignment) => right.some((other) => sameMeme(assignment, other)));
}
function sameFiberAlgebra(left, right) {
    return predicateCoincides(left.predicate, right.predicate) && sameAssignmentSet(left.assignments, right.assignments);
}
function sameBaseEdge(left, right) {
    return baseObjectCoincides(left.domain, right.domain) && baseObjectCoincides(left.codomain, right.codomain);
}
function sameBaseEdges(left, right) {
    return left.length === right.length && left.every((edge) => right.some((other) => sameBaseEdge(edge, other)));
}
function sameBaseCategory(left, right) {
    return sameBaseEdges(left.specialization, right.specialization)
        && sameBaseEdges(left.converse, right.converse)
        && sameBaseEdges(left.subjectProjection, right.subjectProjection)
        && sameBaseEdges(left.objectProjection, right.objectProjection);
}
/** Whether two valuations coincide (same base, same fibers as a set). */
export function sameValuation(left, right) {
    return sameBaseCategory(left.base, right.base)
        && left.fibers.length === right.fibers.length
        && left.fibers.every((fiber) => right.fibers.some((other) => sameFiberAlgebra(fiber, other)));
}
/** A stage-ordinal carrier wrapping an ordinal. */
export const predicationValuationClosureStageOrdinal = (ordinal) => Object.freeze({ kind: "predication.valuation.closure.stageOrdinal", ordinal });
/** A closure stage carrier from a closure orbit point. */
export function predicationValuationClosureStage(point) {
    return Object.freeze({
        kind: "predication.valuation.closure.stage",
        stageOrdinal: predicationValuationClosureStageOrdinal(point.stage),
        valuation: point.value,
    });
}
/** Judge whether a closure stage's ordinal is finite. */
export function predicationValuationClosureFiniteStageJudgment(stage) {
    const reading = finiteOrdinalJudgment(stage.stageOrdinal.ordinal);
    return reading.kind === "ordinal.closure.finiteOrdinal:witness"
        ? Object.freeze({ kind: "predication.valuation.closure.finiteStage:witness", stage, value: reading.value })
        : Object.freeze({ kind: "predication.valuation.closure.finiteStage-obstruction", stage, reading });
}
/** Map a closure stage to a settling stage ordinal. */
export const settlingStageOrdinalOfPredicationValuationClosureStage = (stage) => settlingStageOrdinal(stage.stageOrdinal.ordinal);
const modalStep = (fold) => (valuation) => Object.freeze({
    ...valuation,
    fibers: Object.freeze(valuation.fibers.map((fiber) => {
        const assignments = [];
        for (const assignment of fiber.assignments) {
            const index = assignments.findIndex((item) => cellCoincides(item.cell, assignment.cell));
            if (index < 0)
                assignments.push(assignment);
            else
                assignments[index] = Object.freeze({ ...assignment, charge: fold(assignments[index].charge, assignment.charge) });
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
const valuationMemes = (valuation) => Object.freeze(valuation.fibers.flatMap((fiber) => fiber.assignments));
function composeValuation(memes, base, fold) {
    const byPredicate = [];
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
        const prior = bucket.assignments[index];
        bucket.assignments[index] = Object.freeze({ ...assignment, charge: fold(prior.charge, assignment.charge) });
    }
    const fibers = byPredicate.map(({ predicate, assignments }) => Object.freeze({
        kind: "predication.fiber.algebra",
        predicate,
        entities: entitySet(assignments.flatMap((assignment) => [assignment.cell.subject, assignment.cell.object]), termCoincides),
        assignments: Object.freeze(assignments),
    }));
    return Object.freeze({ kind: "predication.fiber.valuation", base, fibers: Object.freeze(fibers) });
}
/** Transport a valuation along the predication generators (specialization closure + recompose). */
export function transportValuationAlongPredicationGenerators(valuation, fold = joinKnowledge) {
    const base = closeSpecialization(valuation.base);
    return composeValuation(valuationMemes(valuation), base, fold);
}
/** The knowledge closure endomorphism. */
export const knowledgeClosureEndomorphism = (valuation) => transportValuationAlongPredicationGenerators(raiseKnowledge(valuation), joinKnowledge);
/** The truth closure endomorphism. */
export const truthClosureEndomorphism = (valuation) => transportValuationAlongPredicationGenerators(raiseTruth(valuation), joinTruth);
/** The knowledge closure order carrier. */
export const knowledgeValuationClosureOrder = Object.freeze({
    kind: "predication.valuation.closure.order",
    name: "knowledge",
    endomorphism: knowledgeClosureEndomorphism,
    lattice: knowledgeValuationClosureLattice,
});
/** The truth closure order carrier. */
export const truthValuationClosureOrder = Object.freeze({
    kind: "predication.valuation.closure.order",
    name: "truth",
    endomorphism: truthClosureEndomorphism,
    lattice: truthValuationClosureLattice,
});
/** Build a valuation closure process from an order and seed. */
export function predicationValuationClosureProcess(order, seed) {
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
        kind: "predication.valuation.closure.carrier",
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
/** Build a trace from a closure carrier (orbit + fixed-point stage). */
export function predicationValuationClosureTrace(closure) {
    const fixedPointStage = closure.closure.stabilization.kind === "ordinal.closure.stabilization:witness"
        ? predicationValuationClosureStage(Object.freeze({ kind: "ordinal.closure.orbitPoint", stage: closure.closure.stabilization.ordinal, value: closure.closure.stabilization.value }))
        : predicationValuationClosureStage(Object.freeze({ kind: "ordinal.closure.orbitPoint", stage: closure.closure.stabilization.searchedThrough, value: closure.closure.stabilization.value }));
    return Object.freeze({
        kind: "predication.valuation.closure.trace",
        closure,
        sheaf: closure.sheaf,
        orbit: Object.freeze(closure.closure.orbit.map(predicationValuationClosureStage)),
        fixedPointStage,
    });
}
/** The trace of a posit presheaf's knowledge closure. */
export function knowledgeClosureTrace(p) {
    return predicationValuationClosureTrace(knowledgeValuationClosure(p));
}
/** The cells of a posit presheaf's knowledge closure sheaf. */
export function knowledgeClosureCells(p) {
    return Object.freeze(knowledgeClosureSheaf(p).section.fibers.flatMap((fiber) => fiber.assignments.map((assignment) => assignment.cell)));
}
/** The cohomology of the knowledge closure of an utterance's transported potential witness. */
export function utteranceKnowledgeClosureCohomology(left, right) {
    const articulation = articulate(utterance(left, right));
    const predication = predicate(articulation);
    return cohomology(knowledgeClosureSheaf(posit(predication, valuationOfCharge(predication, witnessedPotential(left)))));
}
/** Resolve and settle a posit presheaf under an explicit executable closure order. */
export function settleWith(positCarrier, closureOrder) {
    const traced = predicationValuationClosureTrace(closePredicationValuationClosure(predicationValuationClosureProcess(closureOrder, positCarrier.traces[0])));
    const stages = traced.orbit.map((stage) => {
        const ordinal = settlingStageOrdinalOfPredicationValuationClosureStage(stage);
        return settlingStageInput(ordinal, settlingStageDesignatedCellSet(readDesignatedCellsOfValuation(stage.valuation)), readShapeOfSettlingStageOrdinal(ordinal));
    });
    return settlementFiltration(stages);
}
/** The explicitly named canonical knowledge settlement. */
export function settleKnowledge(positCarrier) {
    return settleWith(positCarrier, knowledgeValuationClosureOrder);
}
export function settlementClosureProfile(order) {
    return Object.freeze({ kind: "predication.settlement.closureProfile", order });
}
export function closureOrderOfSettlementProfile(profile) {
    if (profile.kind !== "predication.settlement.closureProfile" || (profile.order !== "knowledge" && profile.order !== "truth")) {
        throw new TypeError("closureOrderOfSettlementProfile: invalid settlement closure profile");
    }
    return profile.order === "knowledge" ? knowledgeValuationClosureOrder : truthValuationClosureOrder;
}
/** Present a posit and its explicit closure profile without dropping evidence. */
export function presentSettlementFiltration(positCarrier, closureProfile) {
    const predication = positCarrier.fiber.predication;
    return Object.freeze({
        kind: "predication.settlement.filtration.presentation",
        cells: predication.cells.cells,
        specializations: predication.specializations,
        assignments: positCarrier.fiber.valuation.fibers.flatMap((fiber) => fiber.assignments),
        closureProfile,
    });
}
/** Re-derive the full settlement filtration from its generators (the read projection). */
export function freeSettlementFiltration(generators) {
    const predication = freePredicationSite({
        kind: "predication.site",
        cells: generators.cells,
        specializations: generators.specializations,
    });
    const admitted = composeFibers(generators.assignments, predication.base);
    return settleWith(posit(predication, admitted), closureOrderOfSettlementProfile(generators.closureProfile));
}
function foldedValuationClosureLattice(bottom, fold) {
    const join = (left, right) => mergeValuations(left, right, fold);
    return Object.freeze({
        bottom,
        leq: (left, right) => sameValuation(left, right) || sameValuation(join(left, right), right),
        join,
        eq: sameValuation,
        sup: (sequence) => {
            let current = sequence(natZero);
            for (let index = successor(natZero);; index = successor(index)) {
                const next = sequence(index);
                const joined = join(current, next);
                if (sameValuation(joined, current))
                    return current;
                current = joined;
            }
        },
    });
}
/** The knowledge-join valuation closure lattice. */
export function valuationClosureLattice(bottom) {
    return foldedValuationClosureLattice(bottom, joinKnowledge);
}
/** The truth-join valuation closure lattice. */
export function truthValuationClosureLattice(bottom) {
    return foldedValuationClosureLattice(bottom, joinTruth);
}
/** The knowledge valuation closure lattice, with leq strengthened to per-charge knowledge order. */
export function knowledgeValuationClosureLattice(bottom) {
    const lattice = Object.freeze({
        ...valuationClosureLattice(bottom),
        leq: (left, right) => {
            for (const fiber of left.fibers) {
                for (const assignment of fiber.assignments) {
                    const rightCharge = right.fibers
                        .flatMap((rightFiber) => rightFiber.assignments)
                        .find((rightAssignment) => cellCoincides(rightAssignment.cell, assignment.cell))
                        ?.charge;
                    if (!rightCharge || !leqKnowledge(assignment.charge, rightCharge))
                        return false;
                }
            }
            return true;
        },
    });
    return lattice;
}
function mergeValuations(left, right, fold = joinKnowledge) {
    const fibers = [];
    for (const valuation of [left, right]) {
        for (const fiber of valuation.fibers) {
            const prior = fibers.find((item) => predicateCoincides(item.predicate, fiber.predicate));
            if (!prior)
                fibers.push(fiber);
            else {
                const assignments = [];
                for (const assignment of [...prior.assignments, ...fiber.assignments]) {
                    const existingIndex = assignments.findIndex((item) => cellCoincides(item.cell, assignment.cell));
                    if (existingIndex < 0)
                        assignments.push(assignment);
                    else
                        assignments[existingIndex] = Object.freeze({ ...assignment, charge: fold(assignments[existingIndex].charge, assignment.charge) });
                }
                fibers.splice(fibers.indexOf(prior), 1, Object.freeze({ ...fiber, assignments: Object.freeze(assignments) }));
            }
        }
    }
    return Object.freeze({ ...left, fibers: Object.freeze(fibers) });
}
