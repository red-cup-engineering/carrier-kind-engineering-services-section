import {
  entitySet,
  isCell,
  type Cell,
  type EntitySet,
  type PredicationCarrier,
  type PredicationPredicate,
  type PredicationTerm,
} from "@emsenn/meme-algebra";
import {
  predicationCellCoincidenceHolds,
  predicationPredicateCoincidenceHolds,
  predicationTermCoincidenceHolds,
} from "@emsenn/meme-algebra";
import type { ChargeCarrier, ChargeValue } from "@emsenn/meme-algebra";
import {
  bottom,
  charge,
  chargeValue,
  isCharge,
  joinKnowledge,
  joinKnowledgeValue,
  joinTruthValue,
  meetKnowledgeValue,
  meetTruthValue,
  sameChargeValue,
  valueOf,
  witnessedPotential,
} from "@emsenn/meme-algebra";
import { linearFusionValue, linearResiduumValue } from "@emsenn/meme-logic";

export interface Meme {
  readonly kind: "predication.fiber.meme";
  readonly cell: Cell;
  readonly charge: ChargeCarrier;
}

export interface FiberAlgebra {
  readonly kind: "predication.fiber.algebra";
  readonly predicate: PredicationPredicate;
  readonly entities: EntitySet<PredicationTerm>;
  readonly assignments: readonly Meme[];
}

export interface Valuation {
  readonly kind: "predication.fiber.valuation";
  readonly base: PredicationCarrier["base"];
  readonly fibers: readonly FiberAlgebra[];
}

export interface FiberCarrier {
  readonly kind: "predication.fiber.carrier";
  readonly predication: PredicationCarrier;
  readonly valuation: Valuation;
}

export type OrderName = "knowledge" | "truth";

export interface Order {
  readonly kind: "predication.fiber.order";
  readonly name: OrderName;
  readonly join: (left: ChargeValue, right: ChargeValue) => ChargeValue;
  readonly meet: (left: ChargeValue, right: ChargeValue) => ChargeValue;
  readonly bottom: ChargeValue;
  readonly top: ChargeValue;
}

export function knowledgeOrder(): Order {
  return Object.freeze({
    kind: "predication.fiber.order" as const,
    name: "knowledge" as const,
    join: joinKnowledgeValue,
    meet: meetKnowledgeValue,
    bottom: chargeValue("absurd"),
    top: chargeValue("stable"),
  });
}

export function truthOrder(): Order {
  return Object.freeze({
    kind: "predication.fiber.order" as const,
    name: "truth" as const,
    join: joinTruthValue,
    meet: meetTruthValue,
    bottom: chargeValue("active"),
    top: chargeValue("potential"),
  });
}

export type PredicateFiberCell = readonly [subject: PredicationTerm, object: PredicationTerm];

export interface PredicateFiberCellIdentityWitness {
  readonly kind: "predication.fiber.cellIdentity:witness";
  readonly left: PredicateFiberCell;
  readonly right: PredicateFiberCell;
}

export interface PredicateFiberCellIdentityObstruction {
  readonly kind: "predication.fiber.cellIdentity-obstruction";
  readonly left: PredicateFiberCell;
  readonly right: PredicateFiberCell;
}

export type PredicateFiberCellIdentityJudgment = PredicateFiberCellIdentityWitness | PredicateFiberCellIdentityObstruction;

const predicateFiberCellsCoincide = (left: PredicateFiberCell, right: PredicateFiberCell): boolean =>
  predicationTermCoincidenceHolds(left[0], right[0]) && predicationTermCoincidenceHolds(left[1], right[1]);

export function predicateFiberCellIdentity(left: PredicateFiberCell, right: PredicateFiberCell): PredicateFiberCellIdentityJudgment {
  return predicateFiberCellsCoincide(left, right)
    ? Object.freeze({ kind: "predication.fiber.cellIdentity:witness" as const, left, right })
    : Object.freeze({ kind: "predication.fiber.cellIdentity-obstruction" as const, left, right });
}

export interface PredicateFiber {
  readonly kind: "predication.fiber.predicate";
  readonly label: PredicationPredicate;
  readonly entities: EntitySet<PredicationTerm>;
  readonly cells: readonly PredicateFiberCell[];
  readonly at: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue;
  // Carrier-level reader, present only on fibers projected straight from an
  // algebra. Value-level transforms (pullback/exists/forall, linear ops)
  // cannot claim the source's evidence for a transformed value, so they
  // produce fibers without it.
  readonly chargeAt?: (subject: PredicationTerm, object: PredicationTerm) => ChargeCarrier;
}

export type GeneratorKind = "specialization" | "converse" | "subject-projection" | "object-projection";

export interface FiberGenerator {
  readonly kind: "predication.fiber.generator";
  readonly generator: GeneratorKind;
  readonly domain: readonly PredicateFiberCell[];
  readonly codomain: readonly PredicateFiberCell[];
  readonly pullback: (fiber: PredicateFiber) => PredicateFiber;
  readonly exists: (order: Order, fiber: PredicateFiber) => PredicateFiber;
  readonly forall: (order: Order, fiber: PredicateFiber) => PredicateFiber;
}

export function meme(cell: Cell, charge: ChargeCarrier): Meme {
  return Object.freeze({ kind: "predication.fiber.meme" as const, cell, charge });
}

export function isMeme(value: unknown): value is Meme {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Meme>;
  return candidate.kind === "predication.fiber.meme" && isCell(candidate.cell) && isCharge(candidate.charge);
}

export function allCells(entities: EntitySet<PredicationTerm>): readonly PredicateFiberCell[] {
  return Object.freeze(entities.entities.flatMap((subject) => entities.entities.map((object) => Object.freeze([subject, object] as const))));
}

export function predicateFiber(
  label: PredicationPredicate,
  entities: EntitySet<PredicationTerm>,
  read: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue,
  cells: readonly PredicateFiberCell[] = allCells(entities),
  readCharge?: (subject: PredicationTerm, object: PredicationTerm) => ChargeCarrier,
): PredicateFiber {
  const values = cells.map((fiberCell) => Object.freeze({
    cell: fiberCell,
    value: read(fiberCell[0], fiberCell[1]),
  }));
  const at = (subject: PredicationTerm, object: PredicationTerm): ChargeValue =>
    values.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.value ?? chargeValue("absurd");
  return Object.freeze(readCharge === undefined
    ? {
      kind: "predication.fiber.predicate" as const,
      label,
      entities,
      cells: Object.freeze([...cells]),
      at,
    }
    : {
      kind: "predication.fiber.predicate" as const,
      label,
      entities,
      cells: Object.freeze([...cells]),
      at,
      chargeAt: readCharge,
    });
}

export function fiberFromAlgebra(algebra: FiberAlgebra): PredicateFiber {
  const entities = algebra.entities;
  const entries = algebra.assignments.map((assignment) => Object.freeze({
    cell: Object.freeze([assignment.cell.subject, assignment.cell.object] as const),
    charge: assignment.charge,
  }));
  const chargeOf = (subject: PredicationTerm, object: PredicationTerm): ChargeCarrier =>
    entries.find((entry) => predicateFiberCellsCoincide(entry.cell, [subject, object]))?.charge ?? charge(chargeValue("absurd"));
  return predicateFiber(
    algebra.predicate,
    entities,
    (subject, object) => valueOf(chargeOf(subject, object)),
    allCells(entities),
    chargeOf,
  );
}

function cellwiseLinear(
  operation: (left: ChargeValue, right: ChargeValue) => ChargeValue,
  left: PredicateFiber,
  right: PredicateFiber,
  cells: readonly PredicateFiberCell[] = left.cells,
): PredicateFiber {
  return predicateFiber(
    left.label,
    left.entities,
    (subject, object) => operation(left.at(subject, object), right.at(subject, object)),
    cells,
  );
}

function samePredicateFiber(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): boolean {
  return cells.every(([subject, object]) => sameChargeValue(left.at(subject, object), right.at(subject, object)));
}

export function predicationFiberLinearFusion(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): PredicateFiber {
  return cellwiseLinear(linearFusionValue, left, right, cells);
}

export function predicationFiberLinearResiduum(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): PredicateFiber {
  return cellwiseLinear(linearResiduumValue, left, right, cells);
}

export function leqTruthPredicateFiber(left: PredicateFiber, right: PredicateFiber, cells: readonly PredicateFiberCell[] = left.cells): boolean {
  const order = truthOrder();
  return cells.every(([subject, object]) => sameChargeValue(order.join(left.at(subject, object), right.at(subject, object)), right.at(subject, object)));
}

export function generatorPreservesLinearFusion(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean {
  const pulledFusion = generator.pullback(predicationFiberLinearFusion(left, right, generator.domain));
  const fusionOfPullbacks = predicationFiberLinearFusion(generator.pullback(left), generator.pullback(right), generator.codomain);
  return samePredicateFiber(pulledFusion, fusionOfPullbacks, generator.codomain);
}

export function generatorPreservesLinearResiduum(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean {
  const pulledResiduum = generator.pullback(predicationFiberLinearResiduum(left, right, generator.domain));
  const residuumOfPullbacks = predicationFiberLinearResiduum(generator.pullback(left), generator.pullback(right), generator.codomain);
  return samePredicateFiber(pulledResiduum, residuumOfPullbacks, generator.codomain);
}

export function generatorSatisfiesLinearFusionFrobenius(
  generator: FiberGenerator,
  order: Order,
  alpha: PredicateFiber,
  phi: PredicateFiber,
): boolean {
  const left = generator.exists(order, predicationFiberLinearFusion(generator.pullback(alpha), phi, generator.codomain));
  const right = predicationFiberLinearFusion(alpha, generator.exists(order, phi), generator.domain);
  return samePredicateFiber(left, right, generator.domain);
}

const foldJoin = (order: Order, values: readonly ChargeValue[]): ChargeValue =>
  values.reduce((acc, item) => order.join(acc, item), order.bottom);

const foldMeet = (order: Order, values: readonly ChargeValue[]): ChargeValue =>
  values.reduce((acc, item) => order.meet(acc, item), order.top);

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

export function subjectProjection(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "subject-projection" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject) => source.at(subject, subject), cells),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      predicationTermCoincidenceHolds(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(subject, item))) : order.bottom, cells),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      predicationTermCoincidenceHolds(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(subject, item))) : order.top, cells),
  });
}

export function objectProjection(entities: EntitySet): FiberGenerator {
  const cells = allCells(entities);
  return Object.freeze({
    kind: "predication.fiber.generator" as const,
    generator: "object-projection" as const,
    domain: cells,
    codomain: cells,
    pullback: (source: PredicateFiber) => predicateFiber(source.label, source.entities, (_subject, object) => source.at(object, object), cells),
    exists: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      predicationTermCoincidenceHolds(subject, object) ? foldJoin(order, source.entities.entities.map((item) => source.at(item, object))) : order.bottom, cells),
    forall: (order: Order, source: PredicateFiber) => predicateFiber(source.label, source.entities, (subject, object) =>
      predicationTermCoincidenceHolds(subject, object) ? foldMeet(order, source.entities.entities.map((item) => source.at(item, object))) : order.top, cells),
  });
}

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

export function posit(predication: PredicationCarrier): FiberCarrier {
  const fibers = predication.cells.predicates.predicates.map((predicate) => {
    const cells = predication.cells.cells
      .filter((c) => predicationPredicateCoincidenceHolds(c.predicate, predicate))
      .map((c) => meme(c, witnessedPotential(c.subject)));
    return Object.freeze({
      kind: "predication.fiber.algebra" as const,
      predicate,
      entities: predication.cells.entities,
      assignments: Object.freeze(cells),
    });
  });
  return Object.freeze({
    kind: "predication.fiber.carrier" as const,
    predication,
    valuation: Object.freeze({ kind: "predication.fiber.valuation" as const, base: predication.base, fibers: Object.freeze(fibers) }),
  });
}

export function composeFibers(memes: readonly Meme[], base: PredicationCarrier["base"]): Valuation {
  const byPredicate: Array<{ readonly predicate: PredicationPredicate; readonly assignments: Meme[] }> = [];
  for (const m of memes) {
    const bucket = byPredicate.find((item) => predicationPredicateCoincidenceHolds(item.predicate, m.cell.predicate));
    if (bucket) {
      const index = bucket.assignments.findIndex((a) => predicationCellCoincidenceHolds(a.cell, m.cell));
      if (index >= 0) {
        const prior = bucket.assignments[index]!;
        bucket.assignments[index] = meme(m.cell, joinKnowledge(prior.charge, m.charge));
      } else bucket.assignments.push(m);
    } else byPredicate.push({ predicate: m.cell.predicate, assignments: [m] });
  }
  const fibers = byPredicate.map(({ predicate, assignments }) => Object.freeze({
    kind: "predication.fiber.algebra" as const,
    predicate,
    entities: entitySet(assignments.flatMap((m) => [m.cell.subject, m.cell.object]), predicationTermCoincidenceHolds),
    assignments: Object.freeze(assignments),
  }));
  return Object.freeze({ kind: "predication.fiber.valuation" as const, base, fibers: Object.freeze(fibers) });
}

export function chargeAt(valuation: Valuation, cell: Cell): ChargeCarrier {
  for (const fiber of valuation.fibers) {
    for (const assignment of fiber.assignments) if (predicationCellCoincidenceHolds(assignment.cell, cell)) return assignment.charge;
  }
  return bottom();
}

export function valuationFromPredicateFiber(fiber: PredicateFiber, base: PredicationCarrier["base"]): Valuation {
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
