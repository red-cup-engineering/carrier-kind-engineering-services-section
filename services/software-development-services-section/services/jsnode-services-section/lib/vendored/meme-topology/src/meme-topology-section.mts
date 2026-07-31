import { mark, Mark } from "@emsenn/meme-algebra";
import { markCoincidenceHolds } from "@emsenn/meme-algebra";
import type { Cell, PredicationTerm, PredicationPredicate } from "@emsenn/meme-algebra";
import { bottom, joinKnowledge, valueOf, type ChargeCarrier } from "@emsenn/meme-algebra";
import type { OrderName } from "./predication-fiber.mjs";
import type { BoundName } from "./predication-valuation-fixed-point.mjs";
import { classifySettling, type SettlingClassification } from "./predication-settling.mjs";
import { fromCount, type Natural } from "@emsenn/meme-algebra";
import type { MemeTopologyFixedPointReading } from "./meme-topology-fixed-point-reading.mjs";
import type { MemeTopologyCarrier, TermInput } from "./meme-topology.mjs";

export interface SectionEntry {
  readonly kind: "meme-topology.section.entry";
  readonly cell: Cell;
  readonly charge: ChargeCarrier;
}

export interface SectionCarrier {
  readonly kind: "meme-topology.section.carrier";
  readonly order: OrderName;
  readonly bound: BoundName;
  readonly entries: readonly SectionEntry[];
}

/** The section partitioned by the four charge values, under their dynamical
 *  names: has-potential, engaged, held contradiction, no evidence either way. */
export interface SectionPartitionCarrier {
  readonly kind: "meme-topology.section.partition";
  /** Truth-order top: token given, claim not yet made good. */
  readonly potential: readonly SectionEntry[];
  /** Truth-order bottom: potential spent — derived, never admitted. */
  readonly active: readonly SectionEntry[];
  /** Knowledge-order top: the held contradiction, rendered, never thrown. */
  readonly stable: readonly SectionEntry[];
  /** Knowledge-order bottom: no evidence either way. */
  readonly absurd: readonly SectionEntry[];
}

export interface TopologyVitalsCarrier {
  readonly kind: "meme-topology.vitals";
  readonly cells: Natural;
  readonly contradictions: Natural;
  readonly residue: Natural;
  readonly regime: SettlingClassification["regime"];
}

const markOf = (input: TermInput): Mark => {
  if (typeof input === "string") return mark(input);
  if (input instanceof Mark) return input;
  throw new TypeError("term input must be a string or a mark");
};

const termMatches = (term: PredicationTerm | PredicationPredicate, input: TermInput): boolean =>
  markCoincidenceHolds(term.mark, markOf(input));

const readingFor = (carrier: MemeTopologyCarrier, order: OrderName, bound: BoundName): MemeTopologyFixedPointReading => {
  if (order !== "knowledge" && order !== "truth") {
    throw new TypeError(`sectionOf: order must be "knowledge" or "truth", got ${JSON.stringify(order)}`);
  }
  if (bound !== "least" && bound !== "greatest") {
    throw new TypeError(`sectionOf: bound must be "least" or "greatest", got ${JSON.stringify(bound)}`);
  }
  if (order === "knowledge") {
    return bound === "least" ? carrier.fixedPointReadings.knowledgeLeast : carrier.fixedPointReadings.knowledgeGreatest;
  }
  return bound === "least" ? carrier.fixedPointReadings.truthLeast : carrier.fixedPointReadings.truthGreatest;
};

export function sectionOf(carrier: MemeTopologyCarrier, order: OrderName, bound: BoundName): SectionCarrier {
  if (typeof carrier !== "object" || carrier === null || carrier.kind !== "meme-topology.carrier") {
    throw new TypeError("sectionOf: expected a meme-topology carrier");
  }
  const reading = readingFor(carrier, order, bound);
  const entries = reading.extremum.sheaf.section.fibers.flatMap((fiber) =>
    fiber.assignments.map((assignment) => Object.freeze({
      kind: "meme-topology.section.entry" as const,
      cell: assignment.cell,
      charge: assignment.charge,
    })));
  return Object.freeze({
    kind: "meme-topology.section.carrier" as const,
    order,
    bound,
    entries: Object.freeze(entries),
  });
}

export function predicationsFor(section: SectionCarrier, subject: TermInput): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry) => termMatches(entry.cell.subject, subject)));
}

export function subjectsFor(section: SectionCarrier, predicate: TermInput): readonly SectionEntry[] {
  return Object.freeze(section.entries.filter((entry) => termMatches(entry.cell.predicate, predicate)));
}

/** Absence is data, never a throw: an unmatched cell reads the `absurd` charge. */
export function chargeAtValues(section: SectionCarrier, subject: TermInput, predicate: TermInput, object?: TermInput): ChargeCarrier {
  const objectInput = object ?? subject;
  return section.entries
    .filter((entry) =>
      termMatches(entry.cell.subject, subject)
      && termMatches(entry.cell.predicate, predicate)
      && termMatches(entry.cell.object, objectInput))
    .reduce((acc, entry) => joinKnowledge(acc, entry.charge), bottom());
}

export function partitionSection(section: SectionCarrier): SectionPartitionCarrier {
  const potential: SectionEntry[] = [];
  const active: SectionEntry[] = [];
  const stable: SectionEntry[] = [];
  const absurd: SectionEntry[] = [];
  for (const entry of section.entries) {
    const name = valueOf(entry.charge).name;
    if (name === "potential") potential.push(entry);
    else if (name === "active") active.push(entry);
    else if (name === "stable") stable.push(entry);
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

export function topologyVitals(carrier: MemeTopologyCarrier): TopologyVitalsCarrier {
  const section = sectionOf(carrier, "knowledge", "least");
  const partition = partitionSection(section);
  return Object.freeze({
    kind: "meme-topology.vitals" as const,
    cells: fromCount(section.entries.length),
    contradictions: fromCount(partition.stable.length),
    residue: fromCount(partition.absurd.length),
    regime: classifySettling(carrier.settling).regime,
  });
}
