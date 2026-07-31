import { chargeValue, joinKnowledgeValue, valueOf, type ChargeValue } from "@emsenn/meme-algebra";
import { relationFromMatrix, relationMatrix, type RelationCarrier, type RelationMatrixCarrier } from "@emsenn/meme-algebra";
import { predicationPredicateCoincidenceHolds, predicationTermCoincidenceHolds } from "@emsenn/meme-algebra";
import { cohomology, type CohomologyCarrier } from "./predication-cohomology.mjs";
import { fromCount, type Natural } from "@emsenn/meme-algebra";
import { chargeAt } from "./predication-fiber.mjs";
import { entitySet, predicateSet, type Cell, type EntitySet, type PredicationPredicate, type PredicationTerm, type PredicateSet } from "@emsenn/meme-algebra";
import { valuationConsistency, type PredicationValuationConsistencyCarrier } from "./predication-valuation-consistency.mjs";
import { type FixedPointBoundObject, type FixedPointCarrier, type FixedPointExtremum, type FixedPointOrderObject } from "./predication-valuation-fixed-point.mjs";
import { type SheafCarrier } from "./predication-valuation-sheaf.mjs";

export interface MemeTopologyFixedPointReading {
  readonly kind: "meme-topology.fixedPointReading";
  readonly order: FixedPointOrderObject;
  readonly bound: FixedPointBoundObject;
  readonly extremum: FixedPointExtremum;
  readonly cohomology: CohomologyCarrier;
  readonly information: MemeTopologyInformation;
}

export interface MemeTopologyFixedPointReadings {
  readonly kind: "meme-topology.fixedPointReadings";
  readonly knowledgeLeast: MemeTopologyFixedPointReading;
  readonly knowledgeGreatest: MemeTopologyFixedPointReading;
  readonly truthLeast: MemeTopologyFixedPointReading;
  readonly truthGreatest: MemeTopologyFixedPointReading;
}

export interface MemeTopologyInformation {
  readonly kind: "meme-topology.information";
  readonly points: EntitySet;
  readonly states: PredicateSet;
  readonly entryCarrier: MemeTopologyInformationEntriesCarrier;
  readonly relationMatrix: RelationMatrixCarrier<PredicationTerm, PredicationPredicate>;
  readonly relation: RelationCarrier<PredicationTerm, PredicationPredicate>;
  readonly valuationConsistency: PredicationValuationConsistencyCarrier;
}

export interface MemeTopologyInformationEntry {
  readonly kind: "meme-topology.informationEntry";
  readonly point: PredicationTerm;
  readonly state: PredicationPredicate;
  readonly value: ChargeValue;
}

export interface MemeTopologyInformationEntriesCarrier {
  readonly kind: "meme-topology.informationEntries";
  readonly entries: readonly MemeTopologyInformationEntry[];
  readonly rank: Natural;
}

export function fixedPointReading(extremum: FixedPointExtremum): MemeTopologyFixedPointReading {
  return Object.freeze({
    kind: "meme-topology.fixedPointReading" as const,
    order: extremum.order,
    bound: extremum.bound,
    extremum,
    cohomology: cohomology(extremum.sheaf),
    information: informationOfSheaf(extremum.sheaf),
  });
}

export function fixedPointReadings(fixed: FixedPointCarrier): MemeTopologyFixedPointReadings {
  return Object.freeze({
    kind: "meme-topology.fixedPointReadings" as const,
    knowledgeLeast: fixedPointReading(fixed.knowledge.least),
    knowledgeGreatest: fixedPointReading(fixed.knowledge.greatest),
    truthLeast: fixedPointReading(fixed.truth.least),
    truthGreatest: fixedPointReading(fixed.truth.greatest),
  });
}

export function readCharge(reading: MemeTopologyFixedPointReading, target: Cell): ReturnType<typeof chargeAt> {
  return chargeAt(reading.extremum.sheaf.section, target);
}

export const memeTopologyInformationEntry = (
  point: PredicationTerm,
  state: PredicationPredicate,
  value: ChargeValue,
): MemeTopologyInformationEntry => Object.freeze({
  kind: "meme-topology.informationEntry" as const,
  point,
  state,
  value,
});

export const memeTopologyInformationEntries = (
  entries: readonly MemeTopologyInformationEntry[],
): MemeTopologyInformationEntriesCarrier => Object.freeze({
  kind: "meme-topology.informationEntries" as const,
  entries: Object.freeze([...entries]),
  rank: fromCount(entries.length),
});

export const memeTopologyInformationPoints = (entries: MemeTopologyInformationEntriesCarrier): EntitySet =>
  entitySet(entries.entries.map((entry) => entry.point), predicationTermCoincidenceHolds);

export const memeTopologyInformationStates = (entries: MemeTopologyInformationEntriesCarrier): PredicateSet =>
  predicateSet(entries.entries.map((entry) => entry.state), predicationPredicateCoincidenceHolds);

export const memeTopologyInformationRelationMatrix = (
  points: EntitySet,
  states: PredicateSet,
  entries: MemeTopologyInformationEntriesCarrier,
): RelationMatrixCarrier<PredicationTerm, PredicationPredicate> =>
  relationMatrix(
    points,
    states,
    entries.entries.map((entry) => [entry.point, entry.state, entry.value] as const),
    { samePoint: predicationTermCoincidenceHolds, sameState: predicationPredicateCoincidenceHolds },
  );

export function informationOfSheaf(sheaf: SheafCarrier): MemeTopologyInformation {
  const entries: MemeTopologyInformationEntry[] = [];
  for (const fiber of sheaf.section.fibers) {
    for (const assignment of fiber.assignments) {
      const value = valueOf(assignment.charge);
      const index = entries.findIndex((candidate) =>
        predicationTermCoincidenceHolds(candidate.point, assignment.cell.subject)
        && predicationPredicateCoincidenceHolds(candidate.state, assignment.cell.predicate));
      if (index < 0) entries.push(memeTopologyInformationEntry(assignment.cell.subject, assignment.cell.predicate, value));
      else entries[index] = memeTopologyInformationEntry(entries[index]!.point, entries[index]!.state, joinKnowledgeValue(entries[index]!.value, value));
    }
  }
  const entryCarrier = memeTopologyInformationEntries(entries);
  const points = memeTopologyInformationPoints(entryCarrier);
  const states = memeTopologyInformationStates(entryCarrier);
  const informationMatrix = memeTopologyInformationRelationMatrix(points, states, entryCarrier);
  return Object.freeze({
    kind: "meme-topology.information" as const,
    points,
    states,
    entryCarrier,
    relationMatrix: informationMatrix,
    relation: relationFromMatrix(informationMatrix, { absent: chargeValue("absurd") }),
    valuationConsistency: valuationConsistency(sheaf.section),
  });
}
