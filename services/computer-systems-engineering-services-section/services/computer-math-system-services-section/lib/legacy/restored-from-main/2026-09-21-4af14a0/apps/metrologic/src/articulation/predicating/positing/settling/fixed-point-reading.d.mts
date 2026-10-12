/**
 * @packageDocumentation
 *
 * settling/fixed-point-reading — reading the four fixed-point extrema.
 *
 * Each extremum is read into its sheaf cohomology and the information of its
 * section (the section as a relation: points × states → charge, with valuation
 * consistency). The four readings — knowledge/truth × least/greatest — are the
 * complete settled picture of a posit presheaf.
 */
import { type ChargeValue } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type RelationCarrier, type RelationMatrixCarrier } from "../../bilattice-relation.mjs";
import { type CohomologyCarrier } from "./cohomology.mjs";
import { type Natural } from "./analysis/exact-number.mjs";
import { chargeAt } from "../fiber.mjs";
import { type Cell, type EntitySet, type PredicationPredicate, type PredicationTerm, type PredicateSet } from "../../predication.mjs";
import { type PredicationValuationConsistencyCarrier } from "./valuation-consistency.mjs";
import { type FixedPointBoundObject, type FixedPointCarrier, type FixedPointExtremum, type FixedPointOrderObject } from "./fixed-point.mjs";
import { type SheafCarrier } from "./sheaf.mjs";
/** A reading of one fixed-point extremum: its cohomology and section information. */
export interface MemeTopologyFixedPointReading {
    readonly kind: "meme-topology.fixedPointReading";
    readonly order: FixedPointOrderObject;
    readonly bound: FixedPointBoundObject;
    readonly extremum: FixedPointExtremum;
    readonly cohomology: CohomologyCarrier;
    readonly information: MemeTopologyInformation;
}
/** The four fixed-point readings of a fixed-point carrier. */
export interface MemeTopologyFixedPointReadings {
    readonly kind: "meme-topology.fixedPointReadings";
    readonly knowledgeLeast: MemeTopologyFixedPointReading;
    readonly knowledgeGreatest: MemeTopologyFixedPointReading;
    readonly truthLeast: MemeTopologyFixedPointReading;
    readonly truthGreatest: MemeTopologyFixedPointReading;
}
/** The information content of a sheaf section, viewed as a relation. */
export interface MemeTopologyInformation {
    readonly kind: "meme-topology.information";
    readonly points: EntitySet;
    readonly states: PredicateSet;
    readonly entryCarrier: MemeTopologyInformationEntriesCarrier;
    readonly relationMatrix: RelationMatrixCarrier<PredicationTerm, PredicationPredicate>;
    readonly relation: RelationCarrier<PredicationTerm, PredicationPredicate>;
    readonly valuationConsistency: PredicationValuationConsistencyCarrier;
}
/** A single information entry (point, state, charge value). */
export interface MemeTopologyInformationEntry {
    readonly kind: "meme-topology.informationEntry";
    readonly point: PredicationTerm;
    readonly state: PredicationPredicate;
    readonly value: ChargeValue;
}
/** A collection of information entries, with rank. */
export interface MemeTopologyInformationEntriesCarrier {
    readonly kind: "meme-topology.informationEntries";
    readonly entries: readonly MemeTopologyInformationEntry[];
    readonly rank: Natural;
}
/** Read a single fixed-point extremum. */
export declare function fixedPointReading(extremum: FixedPointExtremum): MemeTopologyFixedPointReading;
/** Read all four extrema of a fixed-point carrier. */
export declare function fixedPointReadings(fixed: FixedPointCarrier): MemeTopologyFixedPointReadings;
/** The charge a reading's section assigns to a target cell. */
export declare function readCharge(reading: MemeTopologyFixedPointReading, target: Cell): ReturnType<typeof chargeAt>;
/** Construct an information entry. */
export declare const memeTopologyInformationEntry: (point: PredicationTerm, state: PredicationPredicate, value: ChargeValue) => MemeTopologyInformationEntry;
/** Construct an entries carrier with rank. */
export declare const memeTopologyInformationEntries: (entries: readonly MemeTopologyInformationEntry[]) => MemeTopologyInformationEntriesCarrier;
/** The point entity-set of an entries carrier. */
export declare const memeTopologyInformationPoints: (entries: MemeTopologyInformationEntriesCarrier) => EntitySet;
/** The state predicate-set of an entries carrier. */
export declare const memeTopologyInformationStates: (entries: MemeTopologyInformationEntriesCarrier) => PredicateSet;
/** The relation matrix over points and states from an entries carrier. */
export declare const memeTopologyInformationRelationMatrix: (points: EntitySet, states: PredicateSet, entries: MemeTopologyInformationEntriesCarrier) => RelationMatrixCarrier<PredicationTerm, PredicationPredicate>;
/** Extract the information of a sheaf (section as a relation + consistency). */
export declare function informationOfSheaf(sheaf: SheafCarrier): MemeTopologyInformation;
