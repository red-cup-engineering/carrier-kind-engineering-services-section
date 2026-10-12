/**
 * @packageDocumentation
 *
 * settling/section — a section of a meme topology under one extremum.
 *
 * Flattens a fixed-point reading's sheaf section into charged entries, queried
 * by subject (predications-for) or predicate (subjects-for), partitioned by the
 * four charge values under their dynamical names (potential / active / stable /
 * absurd), and summarized as vitals (cells, contradictions, residue, regime).
 */
import { type ChargeCarrier } from "../../../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type Cell, type PredicationTerm, type PredicationPredicate } from "../../predication.mjs";
import { type Natural } from "./analysis/exact-number.mjs";
import type { SettlingClassification } from "./object.mjs";
import type { MemeTopologyFixedPointReading } from "./fixed-point-reading.mjs";
/** One assignment in a section: a cell and its settled charge. */
export interface SectionEntry {
    readonly kind: "meme-topology.section.entry";
    readonly cell: Cell;
    readonly charge: ChargeCarrier;
}
/** A section of a meme topology under one order/bound extremum. */
export interface SectionCarrier {
    readonly kind: "meme-topology.section.carrier";
    readonly order: MemeTopologyFixedPointReading["order"];
    readonly bound: MemeTopologyFixedPointReading["bound"];
    readonly entries: readonly SectionEntry[];
}
/** The section partitioned by the four charge values. */
export interface SectionPartitionCarrier {
    readonly kind: "meme-topology.section.partition";
    readonly potential: readonly SectionEntry[];
    readonly active: readonly SectionEntry[];
    readonly stable: readonly SectionEntry[];
    readonly absurd: readonly SectionEntry[];
}
/** A summary of a meme topology's state. */
export interface TopologyVitalsCarrier {
    readonly kind: "meme-topology.vitals";
    readonly cells: Natural;
    readonly contradictions: Natural;
    readonly residue: Natural;
    readonly regime: SettlingClassification["regime"];
}
/** The section of a fixed-point reading (its sheaf section flattened). */
export declare function sectionOf(reading: MemeTopologyFixedPointReading): SectionCarrier;
/** The entries whose subject coincides with a term. */
export declare function predicationsFor(section: SectionCarrier, subject: PredicationTerm): readonly SectionEntry[];
/** The entries whose predicate coincides with a predicate. */
export declare function subjectsFor(section: SectionCarrier, predicate: PredicationPredicate): readonly SectionEntry[];
/** The charge at a cell; an unmatched cell reads `absurd` (absence is data). */
export declare function chargeAtValues(section: SectionCarrier, subject: PredicationTerm, predicate: PredicationPredicate, object?: PredicationTerm): ChargeCarrier;
/** Partition a section into the four charge buckets. */
export declare function partitionSection(section: SectionCarrier): SectionPartitionCarrier;
/** The vitals of a section under a classification. */
export declare function topologyVitals(section: SectionCarrier, classification: SettlingClassification): TopologyVitalsCarrier;
