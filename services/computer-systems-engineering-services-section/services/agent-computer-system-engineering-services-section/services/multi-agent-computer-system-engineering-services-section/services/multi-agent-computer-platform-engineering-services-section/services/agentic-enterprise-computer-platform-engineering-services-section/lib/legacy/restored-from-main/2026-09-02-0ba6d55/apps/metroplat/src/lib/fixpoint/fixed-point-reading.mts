/**
 * @packageDocumentation
 *
 * settling/fixed-point-reading — reading the four fixed-point extrema.
 *
 * Each extremum is read into its sheaf cohomology and the information of its
 * section (the section as a relation: points × states → charge, with valuation
 * consistency). The four readouts — knowledge/truth × least/greatest — are the
 * complete settled picture of a posit presheaf.
 */
import { chargeValue, joinKnowledgeValue, valueOf, type ChargeValue } from "../values/index.mts";
import { relationFromMatrix, relationMatrix, type BilatticeRelation, type RelationMatrix } from "../logic/predicating/bilattice-relation.mts";
import { termCoincides, predicateCoincides } from "../logic/predicating/predication.mts";
import { cohomology, type Cohomology } from "./cohomology.mts";
import { count, type Natural } from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";
import { chargeAt } from "../logic/predicating/evidence/fiber.mts";
import { entitySet, predicateSet, type Cell, type EntitySet, type PredicationPredicate, type PredicationTerm, type PredicateSet } from "../logic/predicating/predication.mts";
import { valuationConsistency, type PredicationValuationConsistencyReport } from "./valuation-consistency.mts";
import { type FixedPointBoundObject, type FixedPointStructure, type FixedPointExtremum, type FixedPointOrderObject } from "./fixed-point.mts";
import { type ValuationSheaf } from "./sheaf.mts";

/** A reading of one fixed-point extremum: its cohomology and section information. */
export interface FixedPointExtremumProfile {
  readonly kind: "meme-topology.fixedPointExtremumProfile";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly extremum: FixedPointExtremum;
  readonly cohomology: Cohomology;
  readonly information: MemeTopologyInformation;
}

/** The four fixed-point extremum profiles of a fixed-point structure. */
export interface FixedPointExtremaProfile {
  readonly kind: "meme-topology.fixedPointExtremaProfile";
  readonly knowledgeLeast: FixedPointExtremumProfile;
  readonly knowledgeGreatest: FixedPointExtremumProfile;
  readonly truthLeast: FixedPointExtremumProfile;
  readonly truthGreatest: FixedPointExtremumProfile;
}

/** The information content of a sheaf section, viewed as a relation. */
export interface MemeTopologyInformation {
  readonly kind: "meme-topology.information";
  readonly points: EntitySet;
  readonly states: PredicateSet;
  readonly entries: MemeTopologyInformationEntries;
  readonly relationMatrix: RelationMatrix<PredicationTerm, PredicationPredicate>;
  readonly relation: BilatticeRelation<PredicationTerm, PredicationPredicate>;
  readonly valuationConsistency: PredicationValuationConsistencyReport;
}

/** A single information entry (point, state, charge value). */
export interface MemeTopologyInformationEntry {
  readonly kind: "meme-topology.informationEntry";
  readonly point: PredicationTerm;
  readonly state: PredicationPredicate;
  readonly value: ChargeValue;
}

/** A collection of information entries, with rank. */
export interface MemeTopologyInformationEntries {
  readonly kind: "meme-topology.informationEntries";
  readonly entries: readonly MemeTopologyInformationEntry[];
  readonly rank: Natural;
}

/** Profile a single fixed-point extremum. */
export function fixedPointExtremumProfile(extremum: FixedPointExtremum): FixedPointExtremumProfile {
  return Object.freeze({
    kind: "meme-topology.fixedPointExtremumProfile" as const,
    order: extremum.order,
    bound: extremum.bound,
    extremum,
    cohomology: cohomology(extremum.sheaf),
    information: informationOfSheaf(extremum.sheaf),
  });
}

/** Profile all four extrema of a fixed-point structure. */
export function fixedPointExtremaProfile(fixed: FixedPointStructure): FixedPointExtremaProfile {
  return Object.freeze({
    kind: "meme-topology.fixedPointExtremaProfile" as const,
    knowledgeLeast: fixedPointExtremumProfile(fixed.knowledge.least),
    knowledgeGreatest: fixedPointExtremumProfile(fixed.knowledge.greatest),
    truthLeast: fixedPointExtremumProfile(fixed.truth.least),
    truthGreatest: fixedPointExtremumProfile(fixed.truth.greatest),
  });
}

/** The charge a reading's section assigns to a target cell. */
export function readCharge(reading: FixedPointExtremumProfile, target: Cell): ReturnType<typeof chargeAt> {
  return chargeAt(reading.extremum.sheaf.section, target);
}

/** Construct an information entry. */
export const memeTopologyInformationEntry = (point: PredicationTerm, state: PredicationPredicate, value: ChargeValue): MemeTopologyInformationEntry =>
  Object.freeze({ kind: "meme-topology.informationEntry" as const, point, state, value });

/** Construct an entries record with rank. */
export const memeTopologyInformationEntries = (entries: readonly MemeTopologyInformationEntry[]): MemeTopologyInformationEntries =>
  Object.freeze({ kind: "meme-topology.informationEntries" as const, entries: Object.freeze([...entries]), rank: count(entries) });

/** The point entity-set of an entries record. */
export const memeTopologyInformationPoints = (entries: MemeTopologyInformationEntries): EntitySet =>
  entitySet(entries.entries.map((entry) => entry.point), termCoincides);

/** The state predicate-set of an entries record. */
export const memeTopologyInformationStates = (entries: MemeTopologyInformationEntries): PredicateSet =>
  predicateSet(entries.entries.map((entry) => entry.state), predicateCoincides);

/** The relation matrix over points and states from an entries record. */
export const memeTopologyInformationRelationMatrix = (
  points: EntitySet,
  states: PredicateSet,
  entries: MemeTopologyInformationEntries,
): RelationMatrix<PredicationTerm, PredicationPredicate> =>
  relationMatrix(
    points,
    states,
    entries.entries.map((entry) => [entry.point, entry.state, entry.value] as const),
    { samePoint: termCoincides, sameState: predicateCoincides },
  );

/** Extract the information of a sheaf (section as a relation + consistency). */
export function informationOfSheaf(sheaf: ValuationSheaf): MemeTopologyInformation {
  const entryList: MemeTopologyInformationEntry[] = [];
  for (const fiber of sheaf.section.fibers) {
    for (const assignment of fiber.assignments) {
      const value = valueOf(assignment.charge);
      const index = entryList.findIndex((candidate) =>
        termCoincides(candidate.point, assignment.cell.subject) && predicateCoincides(candidate.state, assignment.cell.predicate));
      if (index < 0) entryList.push(memeTopologyInformationEntry(assignment.cell.subject, assignment.cell.predicate, value));
      else entryList[index] = memeTopologyInformationEntry(entryList[index]!.point, entryList[index]!.state, joinKnowledgeValue(entryList[index]!.value, value));
    }
  }
  const entries = memeTopologyInformationEntries(entryList);
  const points = memeTopologyInformationPoints(entries);
  const states = memeTopologyInformationStates(entries);
  const informationMatrix = memeTopologyInformationRelationMatrix(points, states, entries);
  return Object.freeze({
    kind: "meme-topology.information" as const,
    points,
    states,
    entries,
    relationMatrix: informationMatrix,
    relation: relationFromMatrix(informationMatrix, { absent: chargeValue("unknown") }),
    valuationConsistency: valuationConsistency(sheaf.section),
  });
}
