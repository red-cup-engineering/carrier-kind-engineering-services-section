/**
 * @packageDocumentation
 *
 * settling/section — a section of a meme topology under one extremum.
 *
 * Flattens a fixed-point extremum profile's sheaf section into charged entries, queried
 * by subject (predications-for) or predicate (subjects-for), partitioned by the
 * four charge values under their dynamical names (potential / active / stable /
 * absurd), and summarized as vitals (cells, contradictions, residue, regime).
 */
import { bottom, joinKnowledge, valueOf, type Charge } from "../values/index.mts";
import { termCoincides, predicateCoincides, type Cell, type PredicationTerm, type PredicationPredicate } from "../logic/predicating/predication.mts";
import { count, type Natural } from "../math/rational/exact-number.mts";
import type { SettlingClassification } from "../settlement.mts";
import type { FixedPointExtremumProfile } from "./fixed-point-reading.mts";

/** One assignment in a section: a cell and its settled charge. */
export interface SectionEntry {
  readonly kind: "meme-topology.section.entry";
  readonly cell: Cell;
  readonly charge: Charge;
}

/** A section of a meme topology under one order/bound extremum. */
export interface Section {
  readonly kind: "meme-topology.section";
  readonly order: FixedPointExtremumProfile["order"];
  readonly bound: FixedPointExtremumProfile["bound"];
  readonly entries: readonly SectionEntry[];
}

/** The section partitioned by the four charge values. */
export interface SectionPartition {
  readonly kind: "meme-topology.section.partition";
  readonly potential: readonly SectionEntry[];
  readonly active: readonly SectionEntry[];
  readonly stable: readonly SectionEntry[];
  readonly absurd: readonly SectionEntry[];
}

/** A summary of a meme topology's state. */
export interface TopologyVitals {
  readonly kind: "meme-topology.vitals";
  readonly cells: Natural;
  readonly contradictions: Natural;
  readonly residue: Natural;
  readonly regime: SettlingClassification["regime"];
}

/** The section of a fixed-point extremum profile (its sheaf section flattened). */
export function sectionOf(reading: FixedPointExtremumProfile): Section {
  if (typeof reading !== "object" || reading === null || reading.kind !== "meme-topology.fixedPointExtremumProfile") {
    throw new TypeError("sectionOf: expected a fixed-point extremum profile");
  }
  const entries = reading.extremum.sheaf.section.fibers.flatMap((fiber) =>
    fiber.assignments.map((assignment) => Object.freeze({
      kind: "meme-topology.section.entry" as const,
      cell: assignment.cell,
      charge: assignment.charge,
    })));
  return Object.freeze({
    kind: "meme-topology.section" as const,
    order: reading.order,
    bound: reading.bound,
    entries: Object.freeze(entries),
  });
}

/** The entries whose subject coincides with a term. */
export function predicationsFor(section: Section, subject: PredicationTerm): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry) => termCoincides(entry.cell.subject, subject)));
}

/** The entries whose predicate coincides with a predicate. */
export function subjectsFor(section: Section, predicate: PredicationPredicate): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry) => predicateCoincides(entry.cell.predicate, predicate)));
}

/** The charge at a cell; an unmatched cell reads `absurd` (absence is data). */
export function chargeAtValues(section: Section, subject: PredicationTerm, predicate: PredicationPredicate, object?: PredicationTerm): Charge {
  const objectInput = object ?? subject;
  return section.entries
    .filter((entry) =>
      termCoincides(entry.cell.subject, subject)
      && predicateCoincides(entry.cell.predicate, predicate)
      && termCoincides(entry.cell.object, objectInput))
    .reduce((acc, entry) => joinKnowledge(acc, entry.charge), bottom);
}

/** Partition a section into the four charge buckets. */
export function partitionSection(section: Section): SectionPartition {
  const potential: SectionEntry[] = [];
  const active: SectionEntry[] = [];
  const stable: SectionEntry[] = [];
  const absurd: SectionEntry[] = [];
  for (const entry of section.entries) {
    const name = valueOf(entry.charge).name;
    if (name === "unknown") potential.push(entry);
    else if (name === "held") active.push(entry);
    else if (name === "denied") stable.push(entry);
    else absurd.push(entry);
  }
  return Object.freeze({
    kind: "meme-topology.section.partition" as const,
    potential: Object.freeze(potential),
    active: Object.freeze(active),
    stable: Object.freeze(stable),
    absurd: Object.freeze(absurd),
  });
}

/** The vitals of a section under a classification. */
export function topologyVitals(section: Section, classification: SettlingClassification): TopologyVitals {
  const partition = partitionSection(section);
  return Object.freeze({
    kind: "meme-topology.vitals" as const,
    cells: count(section.entries),
    contradictions: count(partition.stable),
    residue: count(partition.absurd),
    regime: classification.regime,
  });
}
