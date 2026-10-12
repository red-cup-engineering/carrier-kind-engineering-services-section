/**
 * predicating/predication — the predication cell Φ = E × Π × E.
 *
 * Predicating consumes the potential aperiodic articulation cell, opens the
 * transfinite predication category around the token-schema and claim-schema its
 * utterance carries, and materializes that category as the predication site
 * positing consumes. A `Cell` is a subject term, a predicate, and an object
 * term; the base category adds specialization, converse, and projection edges.
 *
 * Coincidence is STRUCTURAL (value equality of the carried marks), not reference
 * identity: this package is boundary-first, so terms reconstructed from JSON must
 * still coincide. A term is a Token; a predicate carries a Claim; both compare by
 * their mark value, the one place the opaque payload is read (only to dedupe).
 */
import { coincides, ClaimSchema, MarkSchema, TokenSchema, mark, utterance, type ArticulationCell, type Claim, type Mark, type Token, type UtteranceObject } from "../../records/utterance/utterance.mts";
import { canonicalStatementValue, type StatementValue } from "../../records/persistence.mts";
import type { FromSchema } from "../../schema/contract.mts";

/** A term in a predication: a token occupying a subject or object position. */
export type PredicationTerm = Token;

/** A predicate: an object of the predicate category, carrying a Claim's mark. */
export class Predicate {
  readonly kind = "predication.predicate" as const;
  readonly claim: Claim;
  readonly mark: Mark;

  constructor(claim: Claim) {
    this.claim = claim;
    this.mark = claim.mark;
    Object.freeze(this);
  }
}

export type PredicationPredicate = Predicate;

/** The predicate wire shape, mirroring the `Predicate` class. */
export const predicateSchema = {
  type: "object",
  required: ["kind", "claim", "mark"],
  properties: { kind: { const: "predication.predicate" }, claim: ClaimSchema, mark: MarkSchema },
  additionalProperties: false,
} as const;
/** A predication node: the immutable subject-predicate-object triple of a cell. */
export type PredicationNode = readonly [PredicationTerm, PredicationPredicate, PredicationTerm];
/** An object of the base category: a term, a predicate, or a node. */
export type PredicationBaseObject = PredicationTerm | PredicationPredicate | PredicationNode;
/** A datum admitted when building a site: a cell or a specialization morphism. */
export type PredicationDatum = Cell | SpecializationMorphism;

/** The cell wire shape, mirroring `Cell`. */
export const cellSchema = {
  type: "object",
  required: ["subject", "predicate", "object"],
  properties: { subject: TokenSchema, predicate: predicateSchema, object: TokenSchema },
  additionalProperties: false,
} as const;

/** A relational cell: a subject term, a predicate, and an object term. */
export type Cell = FromSchema<typeof cellSchema> & {
  readonly subject: PredicationTerm;
  readonly predicate: PredicationPredicate;
  readonly object: PredicationTerm;
};

/** A directed edge in the base category. */
export interface Edge<Domain = PredicationBaseObject, Codomain = PredicationBaseObject> {
  readonly domain: Domain;
  readonly codomain: Codomain;
}

/** A specialization edge: domain general, codomain specialized. */
export interface SpecializationMorphism extends Edge<PredicationTerm, PredicationTerm> {
  readonly kind: "predication.specialization";
}

/** The specialization-edge wire shape, mirroring `SpecializationMorphism`. */
export const specializationSchema = {
  type: "object",
  required: ["kind", "domain", "codomain"],
  properties: { kind: { const: "predication.specialization" }, domain: TokenSchema, codomain: TokenSchema },
  additionalProperties: false,
} as const;

/** A deduplicated collection of entity terms. */
export interface EntitySet<T = PredicationTerm> {
  readonly kind: "predication.entitySet";
  readonly entities: readonly T[];
}

/** A deduplicated collection of predicates. */
export interface PredicateSet<T = PredicationPredicate> {
  readonly kind: "predication.predicateSet";
  readonly predicates: readonly T[];
}

/** A deduplicated cell set with its derived entity and predicate sets. */
export interface CellSet {
  readonly kind: "predication.cellSet";
  readonly cells: readonly Cell[];
  readonly entities: EntitySet<PredicationTerm>;
  readonly predicates: PredicateSet<PredicationPredicate>;
}

/** Φ = E × Π × E presented by its generators. */
export interface GeneratedPredicationCellSet {
  readonly kind: "predication.generatedCellSet";
  readonly entities: EntitySet<PredicationTerm>;
  readonly predicates: PredicateSet<PredicationPredicate>;
}

/** The base category derived from a cell set. */
export interface BaseCategory {
  readonly kind: "predication.base";
  readonly objects: readonly PredicationBaseObject[];
  readonly specialization: readonly Edge<PredicationTerm, PredicationTerm>[];
  readonly converse: readonly Edge<PredicationNode, PredicationNode>[];
  readonly subjectProjection: readonly Edge<PredicationNode, PredicationTerm>[];
  readonly objectProjection: readonly Edge<PredicationNode, PredicationTerm>[];
}

/** A predication site: the cell set, specializations, and base category. */
export interface PredicationSite {
  readonly kind: "predication.site";
  readonly cells: CellSet;
  readonly specializations: readonly SpecializationMorphism[];
  readonly base: BaseCategory;
}

/** The fiber-functor precursor over the entity set. */
export interface PredicationFiberFunctor {
  readonly kind: "predication.fiberFunctor";
  readonly cellSet: GeneratedPredicationCellSet;
  readonly base: BaseCategory;
  readonly entities: EntitySet<PredicationTerm>;
}

/** The codomain generated by predicating from a potential articulation cell. */
export interface TransfinitePredicationCategory {
  readonly kind: "predication.transfiniteCategory";
  readonly predicationCellSet: GeneratedPredicationCellSet;
  readonly predicationFiberFunctor: PredicationFiberFunctor;
}

/** The result of cohering a predication: saturated cells + closed residue. */
export interface CoherenceResult {
  readonly kind: "predication.coherence";
  readonly saturated: CellSet;
  readonly residue: PredicationSite;
}

// — coincidence (structural, on carried mark values) —

/** Whether two terms coincide (by their token's mark value). */
export const termCoincides = (left: PredicationTerm, right: PredicationTerm): boolean =>
  coincides(left.mark.value, right.mark.value);

/** Whether two predicates coincide (by their claim's mark value). */
export const predicateCoincides = (left: PredicationPredicate, right: PredicationPredicate): boolean =>
  coincides(left.claim.mark.value, right.claim.mark.value);

/** Whether two cells coincide componentwise. */
export const cellCoincides = (left: Cell, right: Cell): boolean =>
  termCoincides(left.subject, right.subject)
  && predicateCoincides(left.predicate, right.predicate)
  && termCoincides(left.object, right.object);

/** Whether two nodes coincide positionally. */
export const nodeCoincides = (left: PredicationNode, right: PredicationNode): boolean =>
  termCoincides(left[0], right[0]) && predicateCoincides(left[1], right[1]) && termCoincides(left[2], right[2]);

const isNode = (value: PredicationBaseObject): value is PredicationNode => Array.isArray(value);
const isPredicateObject = (value: PredicationBaseObject): value is PredicationPredicate =>
  !Array.isArray(value) && "kind" in value && value.kind === "predication.predicate";

/** Whether two base objects coincide; cross-shape comparisons never coincide. */
export function baseObjectCoincides(left: PredicationBaseObject, right: PredicationBaseObject): boolean {
  if (isNode(left) || isNode(right)) return isNode(left) && isNode(right) && nodeCoincides(left, right);
  if (isPredicateObject(left) || isPredicateObject(right)) {
    return isPredicateObject(left) && isPredicateObject(right) && predicateCoincides(left, right);
  }
  return termCoincides(left, right);
}

// — judgments (witness/obstruction) —

/** A coincidence judgment over some schema shape. */
export type Judgment<SchemaContract> =
  | { readonly kind: "predication.identity:witness"; readonly left: SchemaContract; readonly right: SchemaContract }
  | { readonly kind: "predication.identity-obstruction"; readonly left: SchemaContract; readonly right: SchemaContract };

function judge<SchemaContract>(holds: boolean, left: SchemaContract, right: SchemaContract): Judgment<SchemaContract> {
  return holds
    ? Object.freeze({ kind: "predication.identity:witness" as const, left, right })
    : Object.freeze({ kind: "predication.identity-obstruction" as const, left, right });
}

export const predicationTermIdentity = (l: PredicationTerm, r: PredicationTerm): Judgment<PredicationTerm> => judge(termCoincides(l, r), l, r);
export const predicationPredicateIdentity = (l: PredicationPredicate, r: PredicationPredicate): Judgment<PredicationPredicate> => judge(predicateCoincides(l, r), l, r);
export const cellIdentity = (l: Cell, r: Cell): Judgment<Cell> => judge(cellCoincides(l, r), l, r);
export const predicationNodeIdentity = (l: PredicationNode, r: PredicationNode): Judgment<PredicationNode> => judge(nodeCoincides(l, r), l, r);

// — constructors and builders —

function uniqueBy<T>(values: Iterable<T>, same: (left: T, right: T) => boolean): readonly T[] {
  const out: T[] = [];
  for (const value of values) if (!out.some((item) => same(item, value))) out.push(value);
  return Object.freeze(out);
}

/** Promote a Claim into a predicate object (preserving the mark, not identity). */
export function predicateOfClaim(claim: Claim): PredicationPredicate {
  return new Predicate(claim);
}

/** Build an entity set, deduplicating by the given sameness. */
export function entitySet<T = PredicationTerm>(entities: Iterable<T>, same: (l: T, r: T) => boolean): EntitySet<T> {
  return Object.freeze({ kind: "predication.entitySet" as const, entities: uniqueBy([...entities], same) });
}

/** Build a predicate set, deduplicating by the given sameness. */
export function predicateSet<T = PredicationPredicate>(predicates: Iterable<T>, same: (l: T, r: T) => boolean): PredicateSet<T> {
  return Object.freeze({ kind: "predication.predicateSet" as const, predicates: uniqueBy([...predicates], same) });
}

/** Build a cell set, deduplicating by cell coincidence and deriving entity/predicate sets. */
export function cellSet(cells: readonly Cell[]): CellSet {
  const witnessed = uniqueBy(cells, cellCoincides);
  return Object.freeze({
    kind: "predication.cellSet" as const,
    cells: Object.freeze(witnessed),
    entities: entitySet(witnessed.flatMap((c) => [c.subject, c.object]), termCoincides),
    predicates: predicateSet(witnessed.map((c) => c.predicate), predicateCoincides),
  });
}

/** Present Φ = E × Π × E by its generators. */
export function generatedPredicationCellSet(
  entities: EntitySet<PredicationTerm>,
  predicates: PredicateSet<PredicationPredicate>,
): GeneratedPredicationCellSet {
  return Object.freeze({ kind: "predication.generatedCellSet" as const, entities, predicates });
}

/** Construct a frozen cell, throwing if any component is absent or the object is null. */
export function cell(subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm): Cell {
  if (subject === undefined || predicate === undefined || object === undefined || object === null) {
    throw new TypeError("cell: subject, predicate, and non-null object must be present");
  }
  return Object.freeze({ subject, predicate, object });
}

export function predicationSeed(utteranceObject: UtteranceObject): Cell {
  return cell(utteranceObject.token, predicateOfClaim(utteranceObject.claim), utteranceObject.token);
}

/** A claim's seed cell and deterministic statement address, derived from the
 * token/claim pair rather than accepted as caller-authored identity. */
export interface UtteredClaimIdentity {
  readonly cell: Cell;
  readonly address: string;
}

export function utteredClaimIdentity(tokenValue: StatementValue, claimMark: StatementValue): UtteredClaimIdentity {
  const seeded = predicationSeed(utterance(mark(tokenValue), mark(claimMark)));
  const plainCell = JSON.parse(JSON.stringify(seeded)) as StatementValue;
  return Object.freeze({ cell: seeded, address: canonicalStatementValue(plainCell) });
}

/** Predicating proper out of the potential articulation cell. */
export function predicatingCell(articulation: ArticulationCell): Cell {
  const [utteranceObject] = articulation.potentialAperiodicArticulationCell;
  return predicationSeed(utteranceObject);
}

export function converseCell(cellValue: Cell): Cell {
  return cell(cellValue.object, cellValue.predicate, cellValue.subject);
}

export function subjectProjectionCell(cellValue: Cell): Cell {
  return cell(cellValue.subject, cellValue.predicate, cellValue.subject);
}

export function objectProjectionCell(cellValue: Cell): Cell {
  return cell(cellValue.object, cellValue.predicate, cellValue.object);
}

export function specializePredicateCell(f: (predicate: PredicationPredicate) => PredicationPredicate, cellValue: Cell): Cell {
  return cell(cellValue.subject, f(cellValue.predicate), cellValue.object);
}

/** Converse is an involution. */
export const converseCellInvolution = (cellValue: Cell): boolean =>
  cellCoincides(converseCell(converseCell(cellValue)), cellValue);

/** The seed is reflexive, so converse fixes it. */
export const converseSeed = (utteranceObject: UtteranceObject): boolean =>
  cellCoincides(converseCell(predicationSeed(utteranceObject)), predicationSeed(utteranceObject));

/** Orientation is real when subject and object are distinct. */
export const converseCellDistinctWhenOriented = (cellValue: Cell): boolean =>
  termCoincides(cellValue.subject, cellValue.object) || !cellCoincides(converseCell(cellValue), cellValue);

/** Subject projection is idempotent. */
export const subjectProjectionCellIdempotent = (cellValue: Cell): boolean =>
  cellCoincides(subjectProjectionCell(subjectProjectionCell(cellValue)), subjectProjectionCell(cellValue));

/** Object projection is idempotent. */
export const objectProjectionCellIdempotent = (cellValue: Cell): boolean =>
  cellCoincides(objectProjectionCell(objectProjectionCell(cellValue)), objectProjectionCell(cellValue));

/** Identity predicate specialization is the identity morphism. */
export const specializePredicateCellIdentity = (cellValue: Cell): boolean =>
  cellCoincides(specializePredicateCell((predicate) => predicate, cellValue), cellValue);

/** Type guard for a cell. */
export const isCell = (value: object): value is Cell =>
  "subject" in value && "predicate" in value && "object" in value;

/** Construct a frozen specialization morphism (domain general, codomain specialized). */
export function specializationMorphism(specialized: PredicationTerm, general: PredicationTerm): SpecializationMorphism {
  return Object.freeze({ kind: "predication.specialization" as const, domain: general, codomain: specialized });
}

/** Type guard for a specialization morphism. */
export function isSpecializationMorphism(value: object): value is SpecializationMorphism {
  return "kind" in value && value.kind === "predication.specialization";
}

function baseCategory(
  cellStructure: CellSet | GeneratedPredicationCellSet,
  specializations: readonly SpecializationMorphism[] = [],
): BaseCategory {
  const materialized = "cells" in cellStructure ? cellStructure.cells : [];
  const nodeOf = (c: Cell): PredicationNode => Object.freeze([c.subject, c.predicate, c.object] as const);
  return Object.freeze({
    kind: "predication.base" as const,
    objects: uniqueBy([...cellStructure.entities.entities, ...cellStructure.predicates.predicates], baseObjectCoincides),
    specialization: Object.freeze(specializations),
    converse: Object.freeze(materialized.map((c) => Object.freeze({ domain: nodeOf(c), codomain: Object.freeze([c.object, c.predicate, c.subject] as const) }))),
    subjectProjection: Object.freeze(materialized.map((c) => Object.freeze({ domain: nodeOf(c), codomain: c.subject }))),
    objectProjection: Object.freeze(materialized.map((c) => Object.freeze({ domain: nodeOf(c), codomain: c.object }))),
  });
}

/** Build a predication site from cells and specialization morphisms. */
export function predicationSite(witnesses: readonly PredicationDatum[]): PredicationSite {
  const cells = witnesses.filter(isCell);
  const specializations = witnesses.filter(isSpecializationMorphism);
  const cellSetValue = cellSet(cells);
  return Object.freeze({
    kind: "predication.site" as const,
    cells: cellSetValue,
    specializations: Object.freeze(specializations),
    base: baseCategory(cellSetValue, specializations),
  });
}

/** Build the transfinite predication category from generators. */
export function transfinitePredicationCategory(predicationCellSet: GeneratedPredicationCellSet): TransfinitePredicationCategory {
  const base = baseCategory(predicationCellSet);
  return Object.freeze({
    kind: "predication.transfiniteCategory" as const,
    predicationCellSet,
    predicationFiberFunctor: Object.freeze({
      kind: "predication.fiberFunctor" as const,
      cellSet: predicationCellSet,
      base,
      entities: predicationCellSet.entities,
    }),
  });
}

/** Open the generated transfinite predication category around an articulation object. */
export function generatePredicationCategory(articulation: ArticulationCell): TransfinitePredicationCategory {
  const [utteranceObject] = articulation.potentialAperiodicArticulationCell;
  return transfinitePredicationCategory(generatedPredicationCellSet(
    entitySet([utteranceObject.token], termCoincides),
    predicateSet([predicateOfClaim(utteranceObject.claim)], predicateCoincides),
  ));
}

/** Materialize a generated category as the finite predication site positing consumes. */
export function materializePredicationCategory(category: TransfinitePredicationCategory): PredicationSite {
  const cells = category.predicationCellSet.entities.entities.flatMap((subject) =>
    category.predicationCellSet.predicates.predicates.flatMap((predicate) =>
      category.predicationCellSet.entities.entities.map((object) => cell(subject, predicate, object))));
  return predicationSite(cells);
}

/** The predication morphism: articulated givens → the relational cells. */
export function predicate(articulation: ArticulationCell): PredicationSite {
  return materializePredicationCategory(generatePredicationCategory(articulation));
}

/**
 * The predication site's GENERATORS — the witnessed cells and specializations.
 *
 * The materialized `entities`/`predicates`/`base` are a FREE CONSTRUCTION over
 * these (a left adjoint: determined entirely by the generators, no free data —
 * cf. "no free data past Mark and Articulating"). The stored/wire object keeps
 * only the generators; the rest is derived on read by `freePredicationSite`.
 */
export type PredicationSiteGenerators = FromSchema<typeof predicationSiteGeneratorsSchema> & {
  readonly cells: readonly Cell[];
  readonly specializations: readonly SpecializationMorphism[];
};

/** The generators' shared wire shape (cells + specializations), reused by every
 *  Inducing stage that carries these generators forward under its own `kind`
 *  (`posit`, `settle`) — see `predicationSiteGeneratorsSchema` below. */
export const predicationGeneratorsShape = {
  cells: { type: "array", items: cellSchema },
  specializations: { type: "array", items: specializationSchema },
} as const;

/** The predication site's wire schema: the GENERATORS, matching what is actually carried
 *  (see `PredicationSiteGenerators` above) — not the free-constructed `PredicationSite`,
 *  whose `entities`/`predicates`/`base` are derived on read, never wire-carried. */
export const predicationSiteGeneratorsSchema = {
  $id: "metroplat/calculus/predicating/predication-site-generators",
  type: "object",
  required: ["kind", "cells", "specializations"],
  properties: { kind: { const: "predication.site" }, ...predicationGeneratorsShape },
  additionalProperties: false,
  title: "PredicationSiteGenerators",
  description: "The witnessed cells and specializations a predication site is freely constructed from.",
} as const;

/** Project a materialized site to its generators (the stored/wire presentation). */
export function presentPredicationSite(site: PredicationSite): PredicationSiteGenerators {
  return Object.freeze({
    kind: "predication.site" as const,
    cells: site.cells.cells,
    specializations: site.specializations,
  });
}

/** Re-derive the full materialized site from its generators (the read projection). */
export function freePredicationSite(generators: PredicationSiteGenerators): PredicationSite {
  return predicationSite([...generators.cells, ...generators.specializations]);
}

/** The base category with its specialization relation transitively closed. */
export function closeSpecialization(base: BaseCategory): BaseCategory {
  const edges = base.specialization.map((edge) => [edge.domain, edge.codomain] as const);
  const has = (domain: PredicationTerm, codomain: PredicationTerm): boolean =>
    edges.some(([d, c]) => termCoincides(d, domain) && termCoincides(c, codomain));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [leftDomain, leftCodomain] of [...edges]) {
      for (const [rightDomain, rightCodomain] of [...edges]) {
        if (termCoincides(leftCodomain, rightDomain) && !has(leftDomain, rightCodomain)) {
          edges.push([leftDomain, rightCodomain] as const);
          changed = true;
        }
      }
    }
  }
  return Object.freeze({
    ...base,
    specialization: Object.freeze(edges.map(([domain, codomain]) => Object.freeze({ domain, codomain }))),
  });
}

/** Cohere a site: saturated cells + residue with closed specialization. */
export function cohere(predication: PredicationSite): CoherenceResult {
  return Object.freeze({
    kind: "predication.coherence" as const,
    saturated: predication.cells,
    residue: Object.freeze({
      kind: "predication.site" as const,
      cells: predication.cells,
      specializations: predication.specializations,
      base: closeSpecialization(predication.base),
    }),
  });
}

/** Entity pairs not connected by the transitively closed specialization relation. */
export interface UnrelatedPairsResult {
  readonly kind: "predication.unrelatedPairs";
  readonly edges: readonly Edge[];
}

/** Compute the unrelated ordered entity pairs of a site. */
export function unrelatedPairs(predication: PredicationSite): UnrelatedPairsResult {
  const closed = closeSpecialization(predication.base);
  const related = (domain: PredicationTerm, codomain: PredicationTerm): boolean =>
    closed.specialization.some((edge) => termCoincides(edge.domain, domain) && termCoincides(edge.codomain, codomain));
  const edges: Edge[] = [];
  for (const domain of predication.cells.entities.entities) {
    for (const codomain of predication.cells.entities.entities) {
      if (!related(domain, codomain)) edges.push(Object.freeze({ domain, codomain }));
    }
  }
  return Object.freeze({ kind: "predication.unrelatedPairs" as const, edges: Object.freeze(edges) });
}
