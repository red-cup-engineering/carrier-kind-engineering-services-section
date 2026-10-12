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
import { type Cell, type EntitySet, type PredicationPredicate, type PredicationSite, type PredicationSiteGenerators, type PredicationTerm } from "../predication.mjs";
import { type ChargeCarrier, type ChargeValue } from "../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type PositPresheaf } from "./settling/sheaf.mjs";
import type { FromJsonSchema } from "@red-cup-engineering/computer-data-engine/types";
/** The meme carrier schema: one plain JSON-Schema literal with a bare `$id`. */
export declare const memeSchema: {
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "relating/articulating/predicating/positing/meme";
    readonly type: "object";
    readonly required: readonly ["kind", "cell", "charge"];
    readonly properties: {
        kind: {
            const: string;
        };
        cell: any;
        charge: any;
    };
    readonly additionalProperties: false;
    readonly title: "Meme";
    readonly description: "The minimal transmissible unit of meaning-with-evidence: a predication cell bound to a bilattice charge.";
};
/** A charged assignment within a fiber, derived from `memeSchema`. */
export type Meme = FromJsonSchema<typeof memeSchema> & {
    readonly cell: Cell;
    readonly charge: ChargeCarrier;
};
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
export interface FiberCarrier {
    readonly kind: "predication.fiber.carrier";
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
/** The knowledge order: absurd bottom, stable top. */
export declare function knowledgeOrder(): Order;
/** The truth order: active bottom, potential top. */
export declare function truthOrder(): Order;
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
/** Compare two predicate fiber cells by term coincidence. */
export declare function predicateFiberCellIdentity(left: PredicateFiberCell, right: PredicateFiberCell): PredicateFiberCellIdentityJudgment;
/** A predicate fiber: a labelled predicate over entities, with a charge-value reader. */
export interface PredicateFiber {
    readonly kind: "predication.fiber.predicate";
    readonly label: PredicationPredicate;
    readonly entities: EntitySet<PredicationTerm>;
    readonly cells: readonly PredicateFiberCell[];
    readonly at: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue;
    readonly chargeAt?: (subject: PredicationTerm, object: PredicationTerm) => ChargeCarrier;
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
export declare function meme(cell: Cell, charge: ChargeCarrier): Meme;
/** Type guard for a meme. */
export declare function isMeme(value: object): value is Meme;
/** Every ordered subject/object pair over an entity set. */
export declare function allCells(entities: EntitySet<PredicationTerm>): readonly PredicateFiberCell[];
/** Build a predicate fiber from a label, entities, and a charge-value reader. */
export declare function predicateFiber(label: PredicationPredicate, entities: EntitySet<PredicationTerm>, read: (subject: PredicationTerm, object: PredicationTerm) => ChargeValue, cells?: readonly PredicateFiberCell[], readCharge?: (subject: PredicationTerm, object: PredicationTerm) => ChargeCarrier): PredicateFiber;
/** Project a fiber algebra into a predicate fiber. */
export declare function fiberFromAlgebra(algebra: FiberAlgebra): PredicateFiber;
/** The cellwise linear fusion of two predicate fibers. */
export declare function predicationFiberLinearFusion(left: PredicateFiber, right: PredicateFiber, cells?: readonly PredicateFiberCell[]): PredicateFiber;
/** The cellwise linear residuum of two predicate fibers. */
export declare function predicationFiberLinearResiduum(left: PredicateFiber, right: PredicateFiber, cells?: readonly PredicateFiberCell[]): PredicateFiber;
/** Whether the left fiber is below the right under the truth order. */
export declare function leqTruthPredicateFiber(left: PredicateFiber, right: PredicateFiber, cells?: readonly PredicateFiberCell[]): boolean;
/** Whether a generator's pullback commutes with linear fusion. */
export declare function generatorPreservesLinearFusion(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean;
/** Whether a generator's pullback commutes with linear residuum. */
export declare function generatorPreservesLinearResiduum(generator: FiberGenerator, left: PredicateFiber, right: PredicateFiber): boolean;
/** The Frobenius reciprocity law for a generator over an order. */
export declare function generatorSatisfiesLinearFusionFrobenius(generator: FiberGenerator, order: Order, alpha: PredicateFiber, phi: PredicateFiber): boolean;
/** The converse generator: swaps subject and object. */
export declare function converse(entities: EntitySet): FiberGenerator;
/** The subject-projection generator. */
export declare function subjectProjection(entities: EntitySet): FiberGenerator;
/** The object-projection generator. */
export declare function objectProjection(entities: EntitySet): FiberGenerator;
/** The specialization generator restricting an ambient cell set to a support subset. */
export declare function specialization(entities: EntitySet, support: readonly PredicateFiberCell[], ambient?: readonly PredicateFiberCell[]): FiberGenerator;
/** Bind an explicitly admitted valuation to its predication site. */
export declare function fiberCarrier(predication: PredicationSite, admitted: Valuation): FiberCarrier;
/** Admit one explicit charge at every listed locus of a predication. */
export declare function valuationOfCharge(predication: PredicationSite, admitted: ChargeCarrier): Valuation;
/** Posit an explicitly valued predication site into the presheaf settlement reads. */
export declare function posit(predication: PredicationSite, admitted: Valuation): PositPresheaf;
/**
 * The posit presheaf's GENERATORS — the predication generators it freely values.
 *
 * Exact charged assignments are retained: positing never reconstructs evidence
 * from the mere presence of a cell.
 */
export interface PositPresheafGenerators {
    readonly kind: "predication.posit.presheaf";
    readonly cells: PredicationSiteGenerators["cells"];
    readonly specializations: PredicationSiteGenerators["specializations"];
    readonly assignments: readonly Meme[];
}
/** Project a materialized presheaf to its generators (the stored/wire presentation). */
export declare function presentPositPresheaf(presheafCarrier: PositPresheaf): PositPresheafGenerators;
/** Re-derive the full presheaf from its generators (the read projection). */
export declare function freePositPresheaf(generators: PositPresheafGenerators): PositPresheaf;
/** Fold a list of memes into a valuation over a base, combining coincident cells by knowledge join. */
export declare function composeFibers(memes: readonly Meme[], base: PredicationSite["base"]): Valuation;
/** The charge a valuation assigns to a cell, or bottom when none coincides. */
export declare function chargeAt(valuation: Valuation, cell: Cell): ChargeCarrier;
/** The knowledge-least valuation over a finite predication site: bottom at every cell. */
export declare function knowledgeLeastValuation(predication: PredicationSite): Valuation;
/** Pointwise knowledge order for finite valuations over a listed cell carrier. */
export declare function fiberValuationLeqKnowledge(left: Valuation, right: Valuation, cells: readonly Cell[]): boolean;
/** Pointwise knowledge join of two finite valuations over a listed cell carrier. */
export declare function fiberValuationKnowledgeJoin(left: Valuation, right: Valuation, cells: readonly Cell[]): Valuation;
export interface KnowledgeLeastValuationReceipt {
    readonly kind: "predication.fiber.knowledgeLeastValuation:witness";
    readonly bottomAtEveryCell: boolean;
    readonly belowValuation: boolean;
    readonly joinIdentity: boolean;
}
/** Finite receipt for `RelMath.Positing.Valuation.knowledgeLeast_le`. */
export declare function knowledgeLeastValuationReceipt(predication: PredicationSite, valuation: Valuation): KnowledgeLeastValuationReceipt;
/** Convert a predicate fiber back into a valuation over a base. */
export declare function valuationFromPredicateFiber(fiber: PredicateFiber, base: PredicationSite["base"]): Valuation;

export declare const positPresheafGeneratorsSchema: {
    readonly $id: "metroplat/calculus/predicating/positing/posit-presheaf-generators";
    readonly type: "object";
    readonly required: readonly ["kind", "cells", "specializations"];
    readonly properties: any;
    readonly additionalProperties: false;
    readonly title: "PositPresheafGenerators";
    readonly description: "The predication generators a posit presheaf freely values.";
};
export declare const knowledgeLeastValuationReceiptSchema: {
    readonly $id: "metroplat/calculus/predicating/positing/knowledge-least-valuation-receipt";
    readonly type: "object";
    readonly required: readonly ["kind", "bottomAtEveryCell", "belowValuation", "joinIdentity"];
    readonly properties: {
        readonly kind: {
            readonly const: "predication.fiber.knowledgeLeastValuation:witness";
        };
        readonly bottomAtEveryCell: {
            readonly type: "boolean";
        };
        readonly belowValuation: {
            readonly type: "boolean";
        };
        readonly joinIdentity: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
    readonly title: "KnowledgeLeastValuationReceipt";
    readonly description: "The knowledge-least valuation sits at bottom at every cell, below any valuation, with join as identity.";
};
