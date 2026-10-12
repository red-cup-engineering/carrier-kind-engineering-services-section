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
import { type ArticulationCell, type Claim, type Mark, type Token, type UtteranceCarrier } from "@red-cup-engineering/computer-data-engine/utterance";
export declare const PredicateSchema: {
    readonly type: "object";
    readonly required: readonly ["kind", "claim", "mark"];
    readonly properties: {
        readonly kind: {
            readonly const: "predication.predicate";
        };
        readonly claim: any;
        readonly mark: any;
    };
    readonly additionalProperties: false;
};
export declare const CellSchema: {
    readonly type: "object";
    readonly required: readonly ["subject", "predicate", "object"];
    readonly properties: {
        readonly subject: any;
        readonly predicate: {
            readonly type: "object";
            readonly required: readonly ["kind", "claim", "mark"];
            readonly properties: {
                readonly kind: {
                    readonly const: "predication.predicate";
                };
                readonly claim: any;
                readonly mark: any;
            };
            readonly additionalProperties: false;
        };
        readonly object: any;
    };
    readonly additionalProperties: false;
};
/** A term in a predication: a token occupying a subject or object position. */
export type PredicationTerm = Token;
/** A predicate: an object of the predicate category, carrying a Claim's mark. */
export declare class Predicate {
    readonly kind: "predication.predicate";
    readonly claim: Claim;
    readonly mark: Mark;
    constructor(claimCarrier: Claim);
}
export type PredicationPredicate = Predicate;
/** A predication node: the immutable subject-predicate-object triple of a cell. */
export type PredicationNode = readonly [PredicationTerm, PredicationPredicate, PredicationTerm];
/** An object of the base category: a term, a predicate, or a node. */
export type PredicationBaseObject = PredicationTerm | PredicationPredicate | PredicationNode;
/** A datum admitted when building a site: a cell or a specialization morphism. */
export type PredicationDatum = Cell | SpecializationMorphism;
/** A relational cell: a subject term, a predicate, and an object term.
 *
 * `CellSchema` remains the wire admission schema.  The executable carrier is
 * more precise: both endpoints are predication terms, which is required by
 * every categorical operation over a section. */
export interface Cell {
    readonly subject: PredicationTerm;
    readonly predicate: PredicationPredicate;
    readonly object: PredicationTerm;
}
/** A directed edge in the base category. */
export interface Edge<Domain = PredicationBaseObject, Codomain = PredicationBaseObject> {
    readonly domain: Domain;
    readonly codomain: Codomain;
}
/** A specialization edge: domain general, codomain specialized. */
export interface SpecializationMorphism extends Edge<PredicationTerm, PredicationTerm> {
    readonly kind: "predication.specialization";
}
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
export interface PredicationFiberFunctorCarrier {
    readonly kind: "predication.fiberFunctor";
    readonly cellSet: GeneratedPredicationCellSet;
    readonly base: BaseCategory;
    readonly entities: EntitySet<PredicationTerm>;
}
/** The codomain generated by predicating from a potential articulation cell. */
export interface TransfinitePredicationCategory {
    readonly kind: "predication.transfiniteCategory";
    readonly predicationCellSet: GeneratedPredicationCellSet;
    readonly predicationFiberFunctor: PredicationFiberFunctorCarrier;
}
/** The result of cohering a predication: saturated cells + closed residue. */
export interface CoherenceCarrier {
    readonly kind: "predication.coherence";
    readonly saturated: CellSet;
    readonly residue: PredicationSite;
}
/** Whether two terms coincide (by their token's mark value). */
export declare const termCoincides: (left: PredicationTerm, right: PredicationTerm) => boolean;
/** Whether two predicates coincide (by their claim's mark value). */
export declare const predicateCoincides: (left: PredicationPredicate, right: PredicationPredicate) => boolean;
/** Whether two cells coincide componentwise. */
export declare const cellCoincides: (left: Cell, right: Cell) => boolean;
/** Whether two nodes coincide positionally. */
export declare const nodeCoincides: (left: PredicationNode, right: PredicationNode) => boolean;
/** Whether two base objects coincide; cross-shape comparisons never coincide. */
export declare function baseObjectCoincides(left: PredicationBaseObject, right: PredicationBaseObject): boolean;
/** A coincidence judgment over some carrier shape. */
export type Judgment<Carrier> = {
    readonly kind: "predication.identity:witness";
    readonly left: Carrier;
    readonly right: Carrier;
} | {
    readonly kind: "predication.identity-obstruction";
    readonly left: Carrier;
    readonly right: Carrier;
};
export declare const predicationTermIdentity: (l: PredicationTerm, r: PredicationTerm) => Judgment<PredicationTerm>;
export declare const predicationPredicateIdentity: (l: PredicationPredicate, r: PredicationPredicate) => Judgment<PredicationPredicate>;
export declare const cellIdentity: (l: Cell, r: Cell) => Judgment<Cell>;
export declare const predicationNodeIdentity: (l: PredicationNode, r: PredicationNode) => Judgment<PredicationNode>;
/** Promote a Claim into a predicate object (preserving the mark, not identity). */
export declare function predicateOfClaim(claimCarrier: Claim): PredicationPredicate;
/** Build an entity set, deduplicating by the given sameness. */
export declare function entitySet<T = PredicationTerm>(entities: Iterable<T>, same: (l: T, r: T) => boolean): EntitySet<T>;
/** Build a predicate set, deduplicating by the given sameness. */
export declare function predicateSet<T = PredicationPredicate>(predicates: Iterable<T>, same: (l: T, r: T) => boolean): PredicateSet<T>;
/** Build a cell set, deduplicating by cell coincidence and deriving entity/predicate sets. */
export declare function cellSet(cells: readonly Cell[]): CellSet;
/** Present Φ = E × Π × E by its generators. */
export declare function generatedPredicationCellSet(entities: EntitySet<PredicationTerm>, predicates: PredicateSet<PredicationPredicate>): GeneratedPredicationCellSet;
/** Construct a frozen cell, throwing if any component is absent or the object is null. */
export declare function cell(subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm): Cell;
/** `RelMath.PredicationCell.seed`: `(token, claim) -> (token, claim, token)`. */
export declare function predicationSeed(carrier: UtteranceCarrier): Cell;
/** Predicating proper out of the potential articulation cell. */
export declare function predicatingCell(articulation: ArticulationCell): Cell;
/** `RelMath.PredicationCell.converse`: swap subject and object. */
export declare function converseCell(carrier: Cell): Cell;
/** `RelMath.PredicationCell.subjProj`: collapse object onto subject. */
export declare function subjectProjectionCell(carrier: Cell): Cell;
/** `RelMath.PredicationCell.objProj`: collapse subject onto object. */
export declare function objectProjectionCell(carrier: Cell): Cell;
/** `RelMath.PredicationCell.specialize`: refine only the predicate coordinate. */
export declare function specializePredicateCell(f: (predicate: PredicationPredicate) => PredicationPredicate, carrier: Cell): Cell;
/** Converse is an involution. */
export declare const converseCellInvolution: (carrier: Cell) => boolean;
/** The seed is reflexive, so converse fixes it. */
export declare const converseSeed: (carrier: UtteranceCarrier) => boolean;
/** Orientation is real when subject and object are distinct. */
export declare const converseCellDistinctWhenOriented: (carrier: Cell) => boolean;
/** Subject projection is idempotent. */
export declare const subjectProjectionCellIdempotent: (carrier: Cell) => boolean;
/** Object projection is idempotent. */
export declare const objectProjectionCellIdempotent: (carrier: Cell) => boolean;
/** Identity predicate specialization is the identity morphism. */
export declare const specializePredicateCellIdentity: (carrier: Cell) => boolean;
/** Type guard for a cell. */
export declare const isCell: (value: object) => value is Cell;
/** Construct a frozen specialization morphism (domain general, codomain specialized). */
export declare function specializationMorphism(specialized: PredicationTerm, general: PredicationTerm): SpecializationMorphism;
/** Type guard for a specialization morphism. */
export declare function isSpecializationMorphism(value: object): value is SpecializationMorphism;
/** Build a predication site from cells and specialization morphisms. */
export declare function predicationSite(witnesses: readonly PredicationDatum[]): PredicationSite;
/** Build the transfinite predication category from generators. */
export declare function transfinitePredicationCategory(predicationCellSet: GeneratedPredicationCellSet): TransfinitePredicationCategory;
/** Open the generated transfinite predication category around an articulation carrier. */
export declare function generatePredicationCategory(articulation: ArticulationCell): TransfinitePredicationCategory;
/** Materialize a generated category as the finite predication site positing consumes. */
export declare function materializePredicationCategory(category: TransfinitePredicationCategory): PredicationSite;
/** The predication morphism: articulated givens → the relational cells. */
export declare function predicate(articulation: ArticulationCell): PredicationSite;
/**
 * The predication site's GENERATORS — the witnessed cells and specializations.
 *
 * The materialized `entities`/`predicates`/`base` are a FREE CONSTRUCTION over
 * these (a left adjoint: determined entirely by the generators, no free data —
 * cf. "no free data past Mark and Articulating"). The stored/wire carrier keeps
 * only the generators; the rest is derived on read by `freePredicationSite`.
 */
export interface PredicationSiteGenerators {
    readonly kind: "predication.site";
    readonly cells: readonly Cell[];
    readonly specializations: readonly SpecializationMorphism[];
}
/** Project a materialized site to its generators (the stored/wire presentation). */
export declare function presentPredicationSite(site: PredicationSite): PredicationSiteGenerators;
/** Re-derive the full materialized site from its generators (the read projection). */
export declare function freePredicationSite(generators: PredicationSiteGenerators): PredicationSite;
/** The base category with its specialization relation transitively closed. */
export declare function closeSpecialization(base: BaseCategory): BaseCategory;
/** Cohere a site: saturated cells + residue with closed specialization. */
export declare function cohere(predication: PredicationSite): CoherenceCarrier;
/** Entity pairs not connected by the transitively closed specialization relation. */
export interface UnrelatedPairsCarrier {
    readonly kind: "predication.unrelatedPairs";
    readonly edges: readonly Edge[];
}
/** Compute the unrelated ordered entity pairs of a site. */
export declare function unrelatedPairs(predication: PredicationSite): UnrelatedPairsCarrier;

export declare const specializationSchema: {
    readonly type: "object";
    readonly required: readonly ["kind", "domain", "codomain"];
    readonly properties: {
        readonly kind: {
            readonly const: "predication.specialization";
        };
        readonly domain: any;
        readonly codomain: any;
    };
    readonly additionalProperties: false;
};
export declare const predicationGeneratorsShape: {
    readonly cells: {
        readonly type: "array";
        readonly items: any;
    };
    readonly specializations: {
        readonly type: "array";
        readonly items: {
            readonly type: "object";
            readonly required: readonly ["kind", "domain", "codomain"];
            readonly properties: {
                readonly kind: {
                    readonly const: "predication.specialization";
                };
                readonly domain: any;
                readonly codomain: any;
            };
            readonly additionalProperties: false;
        };
    };
};
export declare const predicationSiteGeneratorsSchema: {
    readonly $id: "metroplat/calculus/predicating/predication-site-generators";
    readonly type: "object";
    readonly required: readonly ["kind", "cells", "specializations"];
    readonly properties: {
        readonly cells: {
            readonly type: "array";
            readonly items: any;
        };
        readonly specializations: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["kind", "domain", "codomain"];
                readonly properties: {
                    readonly kind: {
                        readonly const: "predication.specialization";
                    };
                    readonly domain: any;
                    readonly codomain: any;
                };
                readonly additionalProperties: false;
            };
        };
        readonly kind: {
            readonly const: "predication.site";
        };
    };
    readonly additionalProperties: false;
    readonly title: "PredicationSiteGenerators";
    readonly description: "The witnessed cells and specializations a predication site is freely constructed from.";
};
