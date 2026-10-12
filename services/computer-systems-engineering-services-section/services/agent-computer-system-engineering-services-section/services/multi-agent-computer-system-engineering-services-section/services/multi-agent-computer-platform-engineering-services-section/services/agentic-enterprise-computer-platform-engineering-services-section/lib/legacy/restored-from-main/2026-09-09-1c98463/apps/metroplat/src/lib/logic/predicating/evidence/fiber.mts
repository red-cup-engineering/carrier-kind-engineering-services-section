/**
 * positing/fiber — finite predicate fibers and value entry by evidence.
 *
 * Value enters predication by evidence. A `Meme` binds one cell to a charge; a
 * `FiberAlgebra` collects the charged cells over one predicate; a `Valuation` is
 * one fiber per predicate over a base. A `PredicateFiber` reads a charge value at
 * each subject/object pair, and the generators (converse, subject/object
 * projection, specialization) move fibers along the base with pullback / ∃ / ∀.
 * `posit` values a predication site as fibers and exposes the initial presheaf
 * trace settlement closes over. This is the executable Node surface for
 * finite predicate fibers; Lean owns the larger Chu-space and proof obligations.
 *
 * Coincidence is structural (the package's boundary-first stance); the linear
 * connectives come from positing/logic directly, not a heavy barrel.
 *
 * @packageDocumentation
 */
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
import * as canonicalCharge from "@lenticule-science/articulating/predicating/positing/bilattice-charge";
import type * as canonicalFiber from "@lenticule-science/articulating/predicating/positing/fiber";
import { toArticulatingValue, fromArticulatingValue } from "../../../values/index.mts";
import {
  cellCoincides,
  cellSchema,
  entitySet,
  isCell,
  predicateCoincides,
  predicationGeneratorsShape,
  freePredicationSite,
  termCoincides,
  type Cell,
  type EntitySet,
  type PredicationPredicate,
  type PredicationSite,
  type PredicationSiteGenerators,
  type PredicationTerm,
} from "../predication.mts";
import {
  bottom,
  charge,
  chargeValue,
  isCharge,
  joinKnowledge,
  joinKnowledgeValue,
  joinTruthValue,
  leqKnowledge,
  meetKnowledgeValue,
  meetTruthValue,
  sameChargeValue,
  valueOf,
  type Charge,
  type ChargeValue,
} from "../../../values/index.mts";
import { linearFusionValue, linearResiduumValue } from "./logic/bilattice-linear-logic.mts";
import { presheaf, type PositPresheaf } from "../../../fixpoint/sheaf.mts";


// The Meme type is derived from the schema literal below; this module
// supplies the runtime constructor and the morphisms over it. A charged
// assignment within a fiber: one cell bound to a charge, the minimal
// transmissible unit of meaning-with-evidence. `cellSchema` (the cell/predicate/
// token/claim/mark shape) is imported above from `../predication.mjs`, the one
// place `Cell`/`Predicate` are defined — not re-declared here.
const ChargeSideSchema = {
  type: "object",
  required: ["kind", "name"],
  properties: {
    kind: { const: "charge.side" },
    name: { enum: ["absent", "present"] },
  },
  additionalProperties: false,
} as const;

const ChargeSchemaContractSchema = {
  type: "object",
  required: ["kind", "value"],
  properties: {
    kind: { const: "charge" },
    value: {
      type: "array",
      items: [ChargeSideSchema, ChargeSideSchema],
      minItems: 2,
      maxItems: 2,
      additionalItems: false,
    },
  },
  description: "A pure charge bearing the [for, against] evidence-bit coordinates.",
  additionalProperties: false,
} as const;

/** The Meme schema shape: one predication cell bound to one bilattice charge. */
const memeShape = {
  kind: { const: "predication.fiber.meme" },
  cell: cellSchema,
  charge: ChargeSchemaContractSchema,
};

/** The Meme schema contract: one plain JSON-Schema literal with a bare `$id`. */
export const memeSchema = {
  $id: "metroplat/calculus/predicating/positing/meme",
  type: "object",
  required: ["kind", "cell", "charge"],
  properties: memeShape,
  additionalProperties: false,
  title: "Meme",
  description: "The minimal transmissible unit of meaning-with-evidence: a predication cell bound to a bilattice charge.",
} as const;

/** A charged assignment within a fiber, derived from `memeSchema`. */
export type Meme = FromJsonSchema<typeof memeSchema> & { readonly cell: Cell; readonly charge: Charge };

/** The fiber over one predicate: its label, entity set, and charged assignments. */
export interface FiberAlgebra {
  readonly kind: "predication.fiber.algebra";
  readonly predicate: PredicationPredicate;
  readonly entities: EntitySet<PredicationTerm>;
  readonly assignments: readonly Meme[];
}

/** A valuation: the base plus one fiber algebra per predicate. */
export interface Valuation {
  readonly kind: "predication.fiber.valuation";
  readonly base: PredicationSite["base"];
  readonly fibers: readonly FiberAlgebra[];
}

/** A predication site paired with its fibered valuation. */
export interface PredicationFiber {
  readonly kind: "predication.fiber";
  readonly predication: PredicationSite;
  readonly valuation: Valuation;
}

/** The name of one of the two lattice orders on charge values. */
export type OrderName = "knowledge" | "truth";

/** A bounded lattice order on charge values. */
export interface Order {
  readonly kind: "predication.fiber.order";
  readonly name: OrderName;
  readonly join: (left: ChargeValue, right: ChargeValue) => ChargeValue;
  readonly meet: (left: ChargeValue, right: ChargeValue) => ChargeValue;
  readonly bottom: ChargeValue;
  readonly top: ChargeValue;
}

/** The knowledge order: unknown bottom, contested top. */
export function knowledgeOrder(): Order {
  return Object.freeze({
    kind: "predication.fiber.order" as const,
    name: "knowledge" as const,
    join: joinKnowledgeValue,
    meet: meetKnowledgeValue,
    bottom: chargeValue("unknown"),
    top: chargeValue("contested"),
  });
}

/** The truth order: stable bottom, active top. */
export function truthOrder(): Order {
  return Object.freeze({
    kind: "predication.fiber.order" as const,
    name: "truth" as const,
    join: joinTruthValue,
    meet: meetTruthValue,
    bottom: chargeValue("denied"),
    top: chargeValue("held"),
  });
}

/** A cell within a predicate fiber: an ordered subject/object pair. */
export type PredicateFiberCell = readonly [subject: PredicationTerm, object: PredicationTerm];

/** Evidence that two predicate fiber cells coincide. */
export interface PredicateFiberCellIdentityWitness {
  readonly kind: "predication.fiber.cellIdentity:witness";
  readonly left: PredicateFiberCell;
  readonly right: PredicateFiberCell;
}

/** Evidence that two predicate fiber cells fail to coincide. */
export interface PredicateFiberCellIdentityObstruction {
  readonly kind: "predication.fiber.cellIdentity-obstruction";
  readonly left: PredicateFiberCell;
  readonly right: PredicateFiberCell;
}

/** The result of comparing two predicate fiber cells. */
export type PredicateFiberCellIdentityJudgment = PredicateFiberCellIdentityWitness | PredicateFiberCellIdentityObstruction;

const predicateFiberCellsCoincide = (left: PredicateFiberCell, right: PredicateFiberCell): boolean =>
  termCoincides(left[0], right[0]) && termCoincides(left[1], right[1]);

/** Compare two predicate fiber cells by term coincidence. */
export function predicateFiberCellIdentity(left: PredicateFiberCell, right: PredicateFiberCell): PredicateFiberCellIdentityJudgment {
  return predicateFiberCellsCoincide(left, right)
    ? Object.freeze({ kind: "predication.fiber.cellIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "predication.fiber.cellIdentity-obstruction" as const, left, right });
}

/** A predicate fiber: a labelled predicate over entities, with a charge-value reader. */
export interface PredicateFiber {
  readonly kind: "predication.fiber.predicate";
  readonly label: PredicationPredicate;
  readonly entities: EntitySet<PredicationTerm>;
  readonly cells: readonly PredicateFiberCell[];
  readonly at: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue;
  readonly chargeAt?: (subject: PredicationTerm, object: PredicationTerm) => Charge;
}

/** The kind of fiber generator. */
export type GeneratorKind = "specialization" | "converse" | "subject-projection" | "object-projection";

/** A morphism between predicate fibers: pullback, ∃, ∀ along a generator. */
export interface FiberGenerator {
  readonly kind: "predication.fiber.generator";
  readonly generator: GeneratorKind;
  readonly domain: readonly PredicateFiberCell[];
  readonly codomain: readonly PredicateFiberCell[];
  readonly pullback: (fiber: PredicateFiber) => PredicateFiber;
  readonly exists: (order: Order, fiber: PredicateFiber) => PredicateFiber;
  readonly forall: (order: Order, fiber: PredicateFiber) => PredicateFiber;
}

/** Construct a meme binding a cell to a charge. */
export function meme(cell: Cell, charge: Charge): Meme {
  return Object.freeze({ kind: "predication.fiber.meme" as const, cell, charge });
}

/** Type guard for a meme. */
export function isMeme(value: object): value is Meme {
  const kind = "kind" in value ? value.kind : undefined;
  const cell = "cell" in value ? value.cell : undefined;
  const charge = "charge" in value ? value.charge : undefined;
  return kind === "predication.fiber.meme"
    && typeof cell === "object" && cell !== null
    && typeof charge === "object" && charge !== null
    && isCell(cell) && isCharge(charge);
}

/** Every ordered subject/object pair over an entity set. */
export function allCells(entities: EntitySet<PredicationTerm>): readonly PredicateFiberCell[] {
  return Object.freeze(entities.entities.flatMap((subject) => entities.entities.map((object) => Object.freeze([subject, object] as const))));
}

/** Build a predicate fiber from a label, entities, and a charge-value reader. */
export function predicateFiber(
  label: PredicationPredicate,
  entities: EntitySet<PredicationTerm>,
  read: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue,
  cells: readonly PredicateFiberCell[] = allCells(entities),
  readCharge?: (subject: PredicationTerm, object: PredicationTerm) => Charge,
): PredicateFiber {
  const values = cells.map((fiberCell) => Object.freeze({ cell: fiberCell, value: read(fiberCell[0], fiberCell[1]) }));
  const at = (subject: PredicationTerm, object: PredicationTerm): ChargeValue =>
    values.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.value ?? chargeValue("unknown");
  return Object.freeze(readCharge === undefined
    ? { kind: "predication.fiber.predicate" as const, label, entities, cells: Object.freeze([...cells]), at }
    : { kind: "predication.fiber.predicate" as const, label, entities, cells: Object.freeze([...cells]), at, chargeAt: readCharge });
}

/** Project a fiber algebra into a predicate fiber. */
export function fiberFromAlgebra(algebra: FiberAlgebra): PredicateFiber {
  const entities = algebra.entities;
  const entries = algebra.assignments.map((assignment) => Object.freeze({
    cell: Object.freeze([assignment.cell.subject, assignment.cell.object] as const),
    charge: assignment.charge,
  }));
  const chargeOf = (subject: PredicationTerm, object: PredicationTerm): Charge =>
    entries.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.charge ?? charge(chargeValue("unknown"));
  return predicateFiber(algebra.predicate, entities, (subject, object) => valueOf(chargeOf(subject, object)), allCells(entities), chargeOf);
}

function cellwiseLinear(
  operation: (left: ChargeValue, right: ChargeValue) => ChargeValue,
  left: PredicateFiber,
  right: PredicateFiber,
  cells: readonly PredicateFiberCell[] = left.cells,
): PredicateFiber {
  return predicateFiber(left.label, left.entities, (subject, object) => operation(left.at(subject, object), right.at(subject, object)), cells);
}

function samePredicateFiber(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): boolean {
  return cells.every(([subject, object]) => sameChargeValue(left.at(subject, object), right.at(subject, object)));
}

/** The cellwise linear fusion of two predicate fibers. */
export function predicationFiberLinearFusion(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): PredicateFiber {
  return cellwiseLinear(linearFusionValue, left, right, cells);
}

/** The cellwise linear residuum of two predicate fibers. */
export function predicationFiberLinearResiduum(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): PredicateFiber {
  return cellwiseLinear(linearResiduumValue, left, right, cells);
}

/** Whether the left fiber is below the right under the truth order. */
export function leqTruthPredicateFiber(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): boolean {
  const order = truthOrder();
  return cells.every(([subject, object]) => sameChargeValue(order.join(left.at(subject, object), right.at(subject, object)), right.at(subject, object)));
}

/** Whether a generator's pullback commutes with linear fusion. */
export function generatorPreservesLinearFusion(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean {
  const pulledFusion = generator.pullback(predicationFiberLinearFusion(left, right, generator.domain));
  const fusionOfPullbacks = predicationFiberLinearFusion(generator.pullback(left), generator.pullback(right), generator.codomain);
  return samePredicateFiber(pulledFusion, fusionOfPullbacks, generator.codomain);
}

/** Whether a generator's pullback commutes with linear residuum. */
export function generatorPreservesLinearResiduum(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean {
  const pulledResiduum = generator.pullback(predicationFiberLinearResiduum(left, right, generator.domain));
  const residuumOfPullbacks = predicationFiberLinearResiduum(generator.pullback(left), generator.pullback(right), generator.codomain);
  return samePredicateFiber(pulledResiduum, residuumOfPullbacks, generator.codomain);
}

/** The Frobenius reciprocity law for a generator over an order. */
export function generatorSatisfiesLinearFusionFrobenius(generator: FiberGenerator, order: Order, alpha: PredicateFiber, phi: PredicateFiber): boolean {
  const left = generator.exists(order, predicationFiberLinearFusion(generator.pullback(alpha), phi, generator.codomain));
  const right = predicationFiberLinearFusion(alpha, generator.exists(order, phi), generator.domain);
  return samePredicateFiber(left, right, generator.domain);
}

const foldJoin = (order: Order, values: readonly ChargeValue[]): ChargeValue => values.reduce((acc, item) => order.join(acc, item), order.bottom);
const foldMeet = (order: Order, values: readonly ChargeValue[]): ChargeValue => values.reduce((acc, item) => order.meet(acc, item), order.top);

/** The converse generator: swaps subject and object. */
export function converse(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "converse" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) => source.at(object, subject), cells),
    exists: (_order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) => source.at(object, subject), cells),
    forall: (_order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) => source.at(object, subject), cells),
  });
}

/** The subject-projection generator. */
export function subjectProjection(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "subject-projection" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject) => source.at(subject, subject), cells),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      termCoincides(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(subject, item))) : order.bottom, cells),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      termCoincides(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(subject, item))) : order.top, cells),
  });
}

/** The object-projection generator. */
export function objectProjection(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "object-projection" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (_subject, object) => source.at(object, object), cells),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      termCoincides(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(item, object))) : order.bottom, cells),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      termCoincides(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(item, object))) : order.top, cells),
  });
}

/** The specialization generator restricting an ambient cell set to a support subset. */
export function specialization(
  entities: EntitySet,
  support: readonly PredicateFiberCell[],
  ambient: readonly PredicateFiberCell[] = allCells(entities),
): FiberGenerator {
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "specialization" as const,
    domain: ambient,
    codomain: Object.freeze([...support]),
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) => source.at(subject, object), support),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      support.some((cell) => predicateFiberCellsCoincide(cell, [subject, object])) ? source.at(subject, object) : order.bottom, ambient),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      support.some((cell) => predicateFiberCellsCoincide(cell, [subject, object])) ? source.at(subject, object) : order.top, ambient),
  });
}

/** Build the predication fiber from a site: each cell witnessed-potential by its subject. */
export function predicationFiber(predication: PredicationSite): PredicationFiber {
  const fibers = predication.cells.predicates.predicates.map((predicate) => {
    const cells = predication.cells.cells
      .filter((c) => predicateCoincides(c.predicate, predicate))
      .map((c) => meme(c, charge(chargeValue("held"))));
    return Object.freeze({
      kind: "predication.fiber.algebra" as const,
      predicate,
      entities: predication.cells.entities,
      assignments: Object.freeze(cells),
    });
  });
  return Object.freeze({
    kind: "predication.fiber" as const,
    predication,
    valuation: Object.freeze({ kind: "predication.fiber.valuation" as const, base: predication.base, fibers: Object.freeze(fibers) }),
  });
}

/** Posit a predication site into the presheaf settlement reads. */
export function posit(predication: PredicationSite): PositPresheaf {
  return presheaf(predicationFiber(predication));
}

/**
 * The posit presheaf's GENERATORS — the predication generators it freely values.
 *
 * The embedded predication, the fiber valuation (charges = `witnessedPotential`
 * of each cell's subject, derived from the cells), and the traces are all a FREE
 * CONSTRUCTION over those generators — no new free data. The stored/wire object
 * keeps only the generators; `freePositPresheaf` re-derives the rest on read.
 */
/** The posit presheaf's wire schema: the same generator shape as `predicationSiteGeneratorsSchema`,
 *  re-tagged — `posit` carries its input's generators forward under this kind (see the module doc). */
export const positPresheafGeneratorsSchema = {
  $id: "metroplat/calculus/predicating/positing/posit-presheaf-generators",
  type: "object",
  required: ["kind", "cells", "specializations"],
  properties: { kind: { const: "predication.posit.presheaf" }, ...predicationGeneratorsShape },
  additionalProperties: false,
  title: "PositPresheafGenerators",
  description: "The predication generators a posit presheaf freely values.",
} as const;

export type PositPresheafGenerators = FromJsonSchema<typeof positPresheafGeneratorsSchema> & {
  readonly cells: PredicationSiteGenerators["cells"];
  readonly specializations: PredicationSiteGenerators["specializations"];
};

/** Project a materialized presheaf to its generators (the stored/wire presentation). */
export function presentPositPresheaf(presheafValue: PositPresheaf): PositPresheafGenerators {
  const predication = (presheafValue as unknown as { fiber: { predication: PredicationSite } }).fiber.predication;
  return Object.freeze({
    kind: "predication.posit.presheaf" as const,
    cells: predication.cells.cells,
    specializations: predication.specializations,
  });
}

/** Re-derive the full presheaf from its generators (the read projection). */
export function freePositPresheaf(generators: PositPresheafGenerators): PositPresheaf {
  return posit(freePredicationSite({
    kind: "predication.site",
    cells: generators.cells,
    specializations: generators.specializations,
  }));
}

/** Fold a list of memes into a valuation over a base, combining coincident cells by knowledge join. */
export function composeFibers(memes: readonly Meme[], base: PredicationSite["base"]): Valuation {
  const byPredicate: Array<{ readonly predicate: PredicationPredicate; readonly assignments: Meme[] }> = [];
  for (const m of memes) {
    const bucket = byPredicate.find((item) => predicateCoincides(item.predicate, m.cell.predicate));
    if (bucket) {
      const index = bucket.assignments.findIndex((a) => cellCoincides(a.cell, m.cell));
      if (index >= 0) {
        const prior = bucket.assignments[index]!;
        bucket.assignments[index] = meme(m.cell, joinKnowledge(prior.charge, m.charge));
      } else bucket.assignments.push(m);
    } else byPredicate.push({ predicate: m.cell.predicate, assignments: [m] });
  }
  const fibers = byPredicate.map(({ predicate, assignments }) => Object.freeze({
    kind: "predication.fiber.algebra" as const,
    predicate,
    entities: entitySet(assignments.flatMap((m) => [m.cell.subject, m.cell.object]), termCoincides),
    assignments: Object.freeze(assignments),
  }));
  return Object.freeze({ kind: "predication.fiber.valuation" as const, base, fibers: Object.freeze(fibers) });
}

/** The charge a valuation assigns to a cell, or bottom when none coincides. */
export function chargeAt(valuation: Valuation, cell: Cell): Charge {
  for (const fiber of valuation.fibers) {
    for (const assignment of fiber.assignments) if (cellCoincides(assignment.cell, cell)) return assignment.charge;
  }
  return bottom;
}

/** The knowledge-least valuation over a finite predication site: bottom at every cell. */
export function knowledgeLeastValuation(predication: PredicationSite): Valuation {
  const fibers = predication.cells.predicates.predicates.map((predicate) => Object.freeze({
    kind: "predication.fiber.algebra" as const,
    predicate,
    entities: predication.cells.entities,
    assignments: Object.freeze([]),
  }));
  return Object.freeze({
    kind: "predication.fiber.valuation" as const,
    base: predication.base,
    fibers: Object.freeze(fibers),
  });
}

/** Pointwise knowledge order for finite valuations over a listed cell set. */
export function fiberValuationLeqKnowledge(left: Valuation, right: Valuation, cells: readonly Cell[]): boolean {
  return cells.every((cell) => leqKnowledge(chargeAt(left, cell), chargeAt(right, cell)));
}

/** Pointwise knowledge join of two finite valuations over a listed cell set. */
export function fiberValuationKnowledgeJoin(left: Valuation, right: Valuation, cells: readonly Cell[]): Valuation {
  return composeFibers(cells.map((cell) =>
    meme(cell, joinKnowledge(chargeAt(left, cell), chargeAt(right, cell))),
  ), left.base);
}

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
} as const;

export type KnowledgeLeastValuationReceipt = FromJsonSchema<typeof knowledgeLeastValuationReceiptSchema>;

export function knowledgeLeastValuationReceipt(predication: PredicationSite, valuation: Valuation): KnowledgeLeastValuationReceipt {
  const least = knowledgeLeastValuation(predication);
  const joined = fiberValuationKnowledgeJoin(least, valuation, predication.cells.cells);
  return Object.freeze({
    kind: "predication.fiber.knowledgeLeastValuation:witness" as const,
    bottomAtEveryCell: predication.cells.cells.every((cell) => sameChargeValue(valueOf(chargeAt(least, cell)), chargeValue("unknown"))),
    belowValuation: fiberValuationLeqKnowledge(least, valuation, predication.cells.cells),
    joinIdentity: predication.cells.cells.every((cell) => sameChargeValue(valueOf(chargeAt(joined, cell)), valueOf(chargeAt(valuation, cell)))),
  });
}

/** Convert a predicate fiber back into a valuation over a base. */
export function valuationFromPredicateFiber(fiber: PredicateFiber, base: PredicationSite["base"]): Valuation {
  const assignments = fiber.cells.map(([subject, object]) =>
    meme({ subject, predicate: fiber.label, object }, fiber.chargeAt?.(subject, object) ?? charge(fiber.at(subject, object))),
  );
  return Object.freeze({
    kind: "predication.fiber.valuation" as const,
    base,
    fibers: Object.freeze([Object.freeze({
      kind: "predication.fiber.algebra" as const,
      predicate: fiber.label,
      entities: fiber.entities,
      assignments: Object.freeze(assignments),
    })]),
  });
}

/** Charge-carrier adaptation touches assignments only; user marks remain opaque. */
type ChargedValuation<C> = Omit<Valuation, "fibers"> & {
  readonly fibers: readonly (Omit<FiberAlgebra, "assignments"> & {
    readonly assignments: readonly (Omit<Meme, "charge"> & { readonly charge: C })[];
  })[];
};
const mapCharges = <C, D>(valuation: ChargedValuation<C>, convert: (charge: C) => D): ChargedValuation<D> =>
  Object.freeze({ ...valuation, fibers: Object.freeze(valuation.fibers.map(fiber =>
    Object.freeze({ ...fiber, assignments: Object.freeze(fiber.assignments.map(assignment =>
      Object.freeze({ ...assignment, charge: convert(assignment.charge) }))) }))) });
export const toArticulatingCharge = (value: Charge): canonicalCharge.ChargeCarrier => canonicalCharge.charge(toArticulatingValue(valueOf(value)));
export const fromArticulatingCharge = (value: canonicalCharge.ChargeCarrier): Charge => charge(fromArticulatingValue(canonicalCharge.valueOf(value)));
export const toArticulatingValuation = (valuation: Valuation): canonicalFiber.Valuation => mapCharges(valuation, toArticulatingCharge);
export const fromArticulatingValuation = (valuation: canonicalFiber.Valuation): Valuation => mapCharges(valuation, fromArticulatingCharge);
