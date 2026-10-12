import { predicationGeneratorsShape } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
/**
 * positing/fiber — finite predicate fibers and value entry by evidence.
 *
 * Value enters predication by evidence. A `Meme` binds one cell to a charge; a
 * `FiberAlgebra` collects the charged cells over one predicate; a `Valuation` is
 * one fiber per predicate over a base. A `PredicateFiber` reads a charge value at
 * each subject/object pair, and the generators (converse, subject/object
 * projection, specialization) move fibers along the base with pullback / ∃ / ∀.
 * `posit` values a predication site as fibers and exposes the initial presheaf
 * trace settlement closes over. This is the executable Node carrier surface for
 * finite predicate fibers; Lean owns the larger Chu-space and proof obligations.
 *
 * Coincidence is structural (the package's boundary-first stance); the linear
 * connectives come from positing/logic directly, not a heavy barrel.
 *
 * @packageDocumentation
 */
import { CellSchema, cellCoincides, entitySet, isCell, predicateCoincides, freePredicationSite, termCoincides, } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/predication";
import { ChargeCarrierSchema, bottom, charge, chargeValue, isCharge, joinKnowledge, joinKnowledgeValue, joinTruthValue, leqKnowledge, meetKnowledgeValue, meetTruthValue, sameChargeValue, valueOf, } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { linearFusionValue, linearResiduumValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-linear-logic";
import { presheaf } from "./sheaf.mjs";
// The Meme carrier type is derived from the schema literal below; this module
// supplies the runtime constructor and the morphisms over it. A charged
// assignment within a fiber: one cell bound to a charge, the minimal
// transmissible unit of meaning-with-evidence.
/** The meme carrier shape: one predication cell bound to one bilattice charge. */
const memeShape = {
    kind: { const: "predication.fiber.meme" },
    cell: CellSchema,
    charge: ChargeCarrierSchema,
};
/** The meme carrier schema: one plain JSON-Schema literal with a bare `$id`. */
export const memeSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "relating/articulating/predicating/positing/meme",
    type: "object",
    required: ["kind", "cell", "charge"],
    properties: memeShape,
    additionalProperties: false,
    title: "Meme",
    description: "The minimal transmissible unit of meaning-with-evidence: a predication cell bound to a bilattice charge.",
};
/** The knowledge order: absurd bottom, stable top. */
export function knowledgeOrder() {
    return Object.freeze({
        kind: "predication.fiber.order",
        name: "knowledge",
        join: joinKnowledgeValue,
        meet: meetKnowledgeValue,
        bottom: chargeValue("absurd"),
        top: chargeValue("stable"),
    });
}
/** The truth order: active bottom, potential top. */
export function truthOrder() {
    return Object.freeze({
        kind: "predication.fiber.order",
        name: "truth",
        join: joinTruthValue,
        meet: meetTruthValue,
        bottom: chargeValue("active"),
        top: chargeValue("potential"),
    });
}
const predicateFiberCellsCoincide = (left, right) => termCoincides(left[0], right[0]) && termCoincides(left[1], right[1]);
/** Compare two predicate fiber cells by term coincidence. */
export function predicateFiberCellIdentity(left, right) {
    return predicateFiberCellsCoincide(left, right)
        ? Object.freeze({ kind: "predication.fiber.cellIdentity:witness", left, right })
        : Object.freeze({ kind: "predication.fiber.cellIdentity-obstruction", left, right });
}
/** Construct a meme binding a cell to a charge. */
export function meme(cell, charge) {
    return Object.freeze({ kind: "predication.fiber.meme", cell, charge });
}
/** Type guard for a meme. */
export function isMeme(value) {
    const kind = "kind" in value ? value.kind : undefined;
    const cell = "cell" in value ? value.cell : undefined;
    const charge = "charge" in value ? value.charge : undefined;
    return kind === "predication.fiber.meme"
        && typeof cell === "object" && cell !== null
        && typeof charge === "object" && charge !== null
        && isCell(cell) && isCharge(charge);
}
/** Every ordered subject/object pair over an entity set. */
export function allCells(entities) {
    return Object.freeze(entities.entities.flatMap((subject) => entities.entities.map((object) => Object.freeze([subject, object]))));
}
/** Build a predicate fiber from a label, entities, and a charge-value reader. */
export function predicateFiber(label, entities, read, cells = allCells(entities), readCharge) {
    const values = cells.map((fiberCell) => Object.freeze({ cell: fiberCell, value: read(fiberCell[0], fiberCell[1]) }));
    const at = (subject, object) => values.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.value ?? chargeValue("absurd");
    return Object.freeze(readCharge === undefined
        ? { kind: "predication.fiber.predicate", label, entities, cells: Object.freeze([...cells]), at }
        : { kind: "predication.fiber.predicate", label, entities, cells: Object.freeze([...cells]), at, chargeAt: readCharge });
}
/** Project a fiber algebra into a predicate fiber. */
export function fiberFromAlgebra(algebra) {
    const entities = algebra.entities;
    const entries = algebra.assignments.map((assignment) => Object.freeze({
        cell: Object.freeze([assignment.cell.subject, assignment.cell.object]),
        charge: assignment.charge,
    }));
    const chargeOf = (subject, object) => entries.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.charge ?? charge(chargeValue("absurd"));
    return predicateFiber(algebra.predicate, entities, (subject, object) => valueOf(chargeOf(subject, object)), allCells(entities), chargeOf);
}
function cellwiseLinear(operation, left, right, cells = left.cells) {
    return predicateFiber(left.label, left.entities, (subject, object) => operation(left.at(subject, object), right.at(subject, object)), cells);
}
function samePredicateFiber(left, right, cells = left.cells) {
    return cells.every(([subject, object]) => sameChargeValue(left.at(subject, object), right.at(subject, object)));
}
/** The cellwise linear fusion of two predicate fibers. */
export function predicationFiberLinearFusion(left, right, cells = left.cells) {
    return cellwiseLinear(linearFusionValue, left, right, cells);
}
/** The cellwise linear residuum of two predicate fibers. */
export function predicationFiberLinearResiduum(left, right, cells = left.cells) {
    return cellwiseLinear(linearResiduumValue, left, right, cells);
}
/** Whether the left fiber is below the right under the truth order. */
export function leqTruthPredicateFiber(left, right, cells = left.cells) {
    const order = truthOrder();
    return cells.every(([subject, object]) => sameChargeValue(order.join(left.at(subject, object), right.at(subject, object)), right.at(subject, object)));
}
/** Whether a generator's pullback commutes with linear fusion. */
export function generatorPreservesLinearFusion(generator, left, right) {
    const pulledFusion = generator.pullback(predicationFiberLinearFusion(left, right, generator.domain));
    const fusionOfPullbacks = predicationFiberLinearFusion(generator.pullback(left), generator.pullback(right), generator.codomain);
    return samePredicateFiber(pulledFusion, fusionOfPullbacks, generator.codomain);
}
/** Whether a generator's pullback commutes with linear residuum. */
export function generatorPreservesLinearResiduum(generator, left, right) {
    const pulledResiduum = generator.pullback(predicationFiberLinearResiduum(left, right, generator.domain));
    const residuumOfPullbacks = predicationFiberLinearResiduum(generator.pullback(left), generator.pullback(right), generator.codomain);
    return samePredicateFiber(pulledResiduum, residuumOfPullbacks, generator.codomain);
}
/** The Frobenius reciprocity law for a generator over an order. */
export function generatorSatisfiesLinearFusionFrobenius(generator, order, alpha, phi) {
    const left = generator.exists(order, predicationFiberLinearFusion(generator.pullback(alpha), phi, generator.codomain));
    const right = predicationFiberLinearFusion(alpha, generator.exists(order, phi), generator.domain);
    return samePredicateFiber(left, right, generator.domain);
}
const foldJoin = (order, values) => values.reduce((acc, item) => order.join(acc, item), order.bottom);
const foldMeet = (order, values) => values.reduce((acc, item) => order.meet(acc, item), order.top);
/** The converse generator: swaps subject and object. */
export function converse(entities) {
    const cells = allCells(entities);
    return Object.freeze({
        kind: "predication.fiber.generator",
        generator: "converse",
        domain: cells,
        codomain: cells,
        pullback: (source) => predicateFiber(source.label, source.entities, (subject, object) => source.at(object, subject), cells),
        exists: (_order, source) => predicateFiber(source.label, source.entities, (subject, object) => source.at(object, subject), cells),
        forall: (_order, source) => predicateFiber(source.label, source.entities, (subject, object) => source.at(object, subject), cells),
    });
}
/** The subject-projection generator. */
export function subjectProjection(entities) {
    const cells = allCells(entities);
    return Object.freeze({
        kind: "predication.fiber.generator",
        generator: "subject-projection",
        domain: cells,
        codomain: cells,
        pullback: (source) => predicateFiber(source.label, source.entities, (subject) => source.at(subject, subject), cells),
        exists: (order, source) => predicateFiber(source.label, source.entities, (subject, object) => termCoincides(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(subject, item))) : order.bottom, cells),
        forall: (order, source) => predicateFiber(source.label, source.entities, (subject, object) => termCoincides(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(subject, item))) : order.top, cells),
    });
}
/** The object-projection generator. */
export function objectProjection(entities) {
    const cells = allCells(entities);
    return Object.freeze({
        kind: "predication.fiber.generator",
        generator: "object-projection",
        domain: cells,
        codomain: cells,
        pullback: (source) => predicateFiber(source.label, source.entities, (_subject, object) => source.at(object, object), cells),
        exists: (order, source) => predicateFiber(source.label, source.entities, (subject, object) => termCoincides(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(item, object))) : order.bottom, cells),
        forall: (order, source) => predicateFiber(source.label, source.entities, (subject, object) => termCoincides(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(item, object))) : order.top, cells),
    });
}
/** The specialization generator restricting an ambient cell set to a support subset. */
export function specialization(entities, support, ambient = allCells(entities)) {
    return Object.freeze({
        kind: "predication.fiber.generator",
        generator: "specialization",
        domain: ambient,
        codomain: Object.freeze([...support]),
        pullback: (source) => predicateFiber(source.label, source.entities, (subject, object) => source.at(subject, object), support),
        exists: (order, source) => predicateFiber(source.label, source.entities, (subject, object) => support.some((cell) => predicateFiberCellsCoincide(cell, [subject, object])) ? source.at(subject, object) : order.bottom, ambient),
        forall: (order, source) => predicateFiber(source.label, source.entities, (subject, object) => support.some((cell) => predicateFiberCellsCoincide(cell, [subject, object])) ? source.at(subject, object) : order.top, ambient),
    });
}
/** Bind an explicitly admitted valuation to its predication site. */
export function fiberCarrier(predication, admitted) {
    const assignments = admitted.fibers.flatMap((fiber) => fiber.assignments);
    if (assignments.some((assignment) => !predication.cells.cells.some((carrier) => cellCoincides(carrier, assignment.cell)))) {
        throw new TypeError("fiberCarrier: admitted valuation contains a locus outside the predication");
    }
    if (admitted.fibers.some((fiber) => !predication.cells.predicates.predicates.some((carrier) => predicateCoincides(carrier, fiber.predicate)))) {
        throw new TypeError("fiberCarrier: admitted valuation contains a predicate outside the predication");
    }
    return Object.freeze({
        kind: "predication.fiber.carrier",
        predication,
        valuation: Object.freeze({ ...admitted, base: predication.base }),
    });
}
/** Admit one explicit charge at every listed locus of a predication. */
export function valuationOfCharge(predication, admitted) {
    return composeFibers(predication.cells.cells.map((carrier) => meme(carrier, admitted)), predication.base);
}
/** Posit an explicitly valued predication site into the presheaf settlement reads. */
export function posit(predication, admitted) {
    return presheaf(fiberCarrier(predication, admitted));
}
/** Project a materialized presheaf to its generators (the stored/wire presentation). */
export function presentPositPresheaf(presheafCarrier) {
    const predication = presheafCarrier.fiber.predication;
    return Object.freeze({
        kind: "predication.posit.presheaf",
        cells: predication.cells.cells,
        specializations: predication.specializations,
        assignments: presheafCarrier.fiber.valuation.fibers.flatMap((fiber) => fiber.assignments),
    });
}
/** Re-derive the full presheaf from its generators (the read projection). */
export function freePositPresheaf(generators) {
    const predication = freePredicationSite({
        kind: "predication.site",
        cells: generators.cells,
        specializations: generators.specializations,
    });
    return posit(predication, composeFibers(generators.assignments, predication.base));
}
/** Fold a list of memes into a valuation over a base, combining coincident cells by knowledge join. */
export function composeFibers(memes, base) {
    const byPredicate = [];
    for (const m of memes) {
        const bucket = byPredicate.find((item) => predicateCoincides(item.predicate, m.cell.predicate));
        if (bucket) {
            const index = bucket.assignments.findIndex((a) => cellCoincides(a.cell, m.cell));
            if (index >= 0) {
                const prior = bucket.assignments[index];
                bucket.assignments[index] = meme(m.cell, joinKnowledge(prior.charge, m.charge));
            }
            else
                bucket.assignments.push(m);
        }
        else
            byPredicate.push({ predicate: m.cell.predicate, assignments: [m] });
    }
    const fibers = byPredicate.map(({ predicate, assignments }) => Object.freeze({
        kind: "predication.fiber.algebra",
        predicate,
        entities: entitySet(assignments.flatMap((m) => [m.cell.subject, m.cell.object]), termCoincides),
        assignments: Object.freeze(assignments),
    }));
    return Object.freeze({ kind: "predication.fiber.valuation", base, fibers: Object.freeze(fibers) });
}
/** The charge a valuation assigns to a cell, or bottom when none coincides. */
export function chargeAt(valuation, cell) {
    for (const fiber of valuation.fibers) {
        for (const assignment of fiber.assignments)
            if (cellCoincides(assignment.cell, cell))
                return assignment.charge;
    }
    return bottom;
}
/** The knowledge-least valuation over a finite predication site: bottom at every cell. */
export function knowledgeLeastValuation(predication) {
    const fibers = predication.cells.predicates.predicates.map((predicate) => Object.freeze({
        kind: "predication.fiber.algebra",
        predicate,
        entities: predication.cells.entities,
        assignments: Object.freeze([]),
    }));
    return Object.freeze({
        kind: "predication.fiber.valuation",
        base: predication.base,
        fibers: Object.freeze(fibers),
    });
}
/** Pointwise knowledge order for finite valuations over a listed cell carrier. */
export function fiberValuationLeqKnowledge(left, right, cells) {
    return cells.every((carrier) => leqKnowledge(chargeAt(left, carrier), chargeAt(right, carrier)));
}
/** Pointwise knowledge join of two finite valuations over a listed cell carrier. */
export function fiberValuationKnowledgeJoin(left, right, cells) {
    return composeFibers(cells.map((carrier) => meme(carrier, joinKnowledge(chargeAt(left, carrier), chargeAt(right, carrier)))), left.base);
}
/** Finite receipt for `RelMath.Positing.Valuation.knowledgeLeast_le`. */
export function knowledgeLeastValuationReceipt(predication, valuation) {
    const least = knowledgeLeastValuation(predication);
    const joined = fiberValuationKnowledgeJoin(least, valuation, predication.cells.cells);
    return Object.freeze({
        kind: "predication.fiber.knowledgeLeastValuation:witness",
        bottomAtEveryCell: predication.cells.cells.every((carrier) => sameChargeValue(valueOf(chargeAt(least, carrier)), chargeValue("absurd"))),
        belowValuation: fiberValuationLeqKnowledge(least, valuation, predication.cells.cells),
        joinIdentity: predication.cells.cells.every((carrier) => sameChargeValue(valueOf(chargeAt(joined, carrier)), valueOf(chargeAt(valuation, carrier)))),
    });
}
/** Convert a predicate fiber back into a valuation over a base. */
export function valuationFromPredicateFiber(fiber, base) {
    const assignments = fiber.cells.map(([subject, object]) => meme({ subject, predicate: fiber.label, object }, fiber.chargeAt?.(subject, object) ?? charge(fiber.at(subject, object))));
    return Object.freeze({
        kind: "predication.fiber.valuation",
        base,
        fibers: Object.freeze([Object.freeze({
                kind: "predication.fiber.algebra",
                predicate: fiber.label,
                entities: fiber.entities,
                assignments: Object.freeze(assignments),
            })]),
    });
}

export const positPresheafGeneratorsSchema = {
    $id: "metroplat/calculus/predicating/positing/posit-presheaf-generators",
    type: "object",
    required: ["kind", "cells", "specializations"],
    properties: { kind: { const: "predication.posit.presheaf" }, ...predicationGeneratorsShape },
    additionalProperties: false,
    title: "PositPresheafGenerators",
    description: "The predication generators a posit presheaf freely values.",
};
export const knowledgeLeastValuationReceiptSchema = {
    $id: "metroplat/calculus/predicating/positing/knowledge-least-valuation-receipt",
    type: "object",
    required: ["kind", "bottomAtEveryCell", "belowValuation", "joinIdentity"],
    properties: {
        kind: { const: "predication.fiber.knowledgeLeastValuation:witness" },
        bottomAtEveryCell: { type: "boolean" },
        belowValuation: { type: "boolean" },
        joinIdentity: { type: "boolean" },
    },
    additionalProperties: false,
    title: "KnowledgeLeastValuationReceipt",
    description: "The knowledge-least valuation sits at bottom at every cell, below any valuation, with join as identity.",
};
