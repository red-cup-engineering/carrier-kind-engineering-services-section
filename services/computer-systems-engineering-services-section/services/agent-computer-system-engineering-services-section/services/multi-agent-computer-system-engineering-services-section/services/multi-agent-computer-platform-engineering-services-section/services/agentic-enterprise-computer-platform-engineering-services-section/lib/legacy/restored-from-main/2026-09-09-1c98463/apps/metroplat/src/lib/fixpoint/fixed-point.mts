import type { FromJsonSchema } from "@red-cup-engineering/computer-data-type-engine/types";
import * as canonicalSection from "@lenticule-science/articulating/predicating/positing/settling/section";
import type { Document } from "@lenticule-science/articulating/predicating/positing/settling/document";

import type { SettlingClassification } from "../settlement.mts";
import * as canonicalReading from "@lenticule-science/articulating/predicating/positing/settling/fixed-point-reading";
import * as canonicalConsistency from "@lenticule-science/articulating/predicating/positing/settling/valuation-consistency";
import { toArticulatingValue, type ChargeValue, type Charge } from "../values/index.mts";
import type { Cell, PredicationTerm, PredicationPredicate } from "../logic/predicating/predication.mts";
import type { ValuationSheaf } from "./sheaf.mts";
/** Articulating owns fixed-point settlement; Metro adapts incoming charge carriers once. */
import { fixedPoints as canonicalFixedPoints } from "@lenticule-science/articulating/predicating/positing/settling/fixed-point";
import { toArticulatingValuation, fromArticulatingCharge, toArticulatingCharge, type Valuation } from "../logic/predicating/evidence/fiber.mts";
import type { PositPresheaf } from "./sheaf.mts";
export type {
  OrderName, BoundName, FixedPointOrderObject, FixedPointBoundObject,
  FixedPointExtremum, FixedPointWitness, FixedPointObstruction, FixedPointJudgment,
  FixedPointSeedCarrier as FixedPointSeed,
  FixedPointOrderCarrier as FixedPointOrder,
  FixedPointCarrier as FixedPointStructure,
} from "@lenticule-science/articulating/predicating/positing/settling/fixed-point";

export function fixedPoints(p: PositPresheaf): ReturnType<typeof canonicalFixedPoints> {
  return canonicalFixedPoints(Object.freeze({
    ...p,
    fiber: Object.freeze({ ...p.fiber, kind: "predication.fiber.carrier" as const, valuation: toArticulatingValuation(p.fiber.valuation) }),
    traces: Object.freeze(p.traces.map(toArticulatingValuation)),
  }));
}

/** Canonical readings; Metro charges are translated only at input/output boundaries. */
export {
  fixedPointReading as fixedPointExtremumProfile,
  fixedPointReadings as fixedPointExtremaProfile,
  memeTopologyInformationEntries, memeTopologyInformationPoints,
  memeTopologyInformationStates, memeTopologyInformationRelationMatrix,
  type MemeTopologyFixedPointReading as FixedPointExtremumProfile,
  type MemeTopologyFixedPointReadings as FixedPointExtremaProfile,
  type MemeTopologyInformation,
  type MemeTopologyInformationEntry,
  type MemeTopologyInformationEntriesCarrier as MemeTopologyInformationEntries,
} from "@lenticule-science/articulating/predicating/positing/settling/fixed-point-reading";

export const readCharge = (reading: canonicalReading.MemeTopologyFixedPointReading, target: Cell): ReturnType<typeof fromArticulatingCharge> =>
  fromArticulatingCharge(canonicalReading.readCharge(reading, target));
export const memeTopologyInformationEntry = (point: PredicationTerm, state: PredicationPredicate, value: ChargeValue): canonicalReading.MemeTopologyInformationEntry =>
  canonicalReading.memeTopologyInformationEntry(point, state, toArticulatingValue(value));
export const informationOfSheaf = (sheaf: ValuationSheaf): canonicalReading.MemeTopologyInformation =>
  canonicalReading.informationOfSheaf({ kind: "predication.valuation.sheaf.carrier", section: toArticulatingValuation(sheaf.section) });

/** Canonical consistency analysis with a Metro valuation entry boundary. */
export * from "@lenticule-science/articulating/predicating/positing/settling/valuation-consistency";
export {
  valuationConsistencyReadings as valuationConsistencyJudgments,
  type ValuationConsistencyReadingsCarrier as ValuationConsistencyJudgments,
  type ValuationConsistentAssignmentsCarrier as ValuationConsistentAssignments,
  type ValuationContradictoryAssignmentsCarrier as ValuationContradictoryAssignments,
  type ConsistentValuationSubcarrier as ConsistentValuationSubvaluation,
  type ContradictoryValuationSubcarrier as ContradictoryValuationSubvaluation,
  type PredicationValuationConsistencyCarrier as PredicationValuationConsistencyReport,
} from "@lenticule-science/articulating/predicating/positing/settling/valuation-consistency";
export const valuationConsistency = (valuation: Valuation): canonicalConsistency.PredicationValuationConsistencyCarrier =>
  canonicalConsistency.valuationConsistency(toArticulatingValuation(valuation));
export const consistentValuationSubvaluation = (valuation: Valuation, assignments: canonicalConsistency.ValuationConsistentAssignmentsCarrier): canonicalConsistency.ConsistentValuationSubcarrier =>
  canonicalConsistency.consistentValuationSubcarrier(toArticulatingValuation(valuation), assignments);
export const contradictoryValuationSubvaluation = (valuation: Valuation, assignments: canonicalConsistency.ValuationContradictoryAssignmentsCarrier): canonicalConsistency.ContradictoryValuationSubcarrier =>
  canonicalConsistency.contradictoryValuationSubcarrier(toArticulatingValuation(valuation), assignments);

/** Metro document schemas and presentation vocabulary over canonical settlement. */
export { documentAddressKey, documentOfFixedPoint } from "@lenticule-science/articulating/predicating/positing/settling/document";
export type { Document, DocumentAddress, DocumentReference, DocumentValuationSite, DocumentJudgment } from "@lenticule-science/articulating/predicating/positing/settling/document";

export const documentOrderSchema = {
  $id: "metroplat/closure/document/document-order",
  type: "object",
  required: ["kind", "before", "after"],
  properties: {
    kind: { const: "settledDocument.order" },
    before: { type: "string" },
    after: { type: "string" },
  },
  additionalProperties: false,
  title: "DocumentOrder",
  description: "An ordering constraint between two document addresses.",
} as const;

export type DocumentOrder = FromJsonSchema<typeof documentOrderSchema>;

export const documentFixedPointObstructionSchema = {
  $id: "metroplat/closure/document/document-fixed-point-obstruction",
  type: "object",
  required: ["kind", "reason"],
  properties: {
    kind: { const: "settledDocument.fixedPoint-obstruction" },
    reason: { enum: ["knowledge-least-not-fixed", "empty-fixed-point"] },
  },
  additionalProperties: false,
  title: "DocumentFixedPointObstruction",
  description: "The predication/valuation closure has not stabilized at a knowledge-least fixed point.",
} as const;

export type DocumentFixedPointObstruction = FromJsonSchema<typeof documentFixedPointObstructionSchema>;

export interface HtmlPresentationNotDocumentWitness {
  readonly kind: "settledDocument.html_presentation_is_not_document:witness";
  readonly documentKind: Document["kind"];
  readonly presentationKind: string;
  readonly distinct: true;
}

/** HTML may carry a settled document, but it is not identical to the document. */
export function html_presentation_is_not_document(document: Document, presentationKind: string): HtmlPresentationNotDocumentWitness {
  return Object.freeze({
    kind: "settledDocument.html_presentation_is_not_document:witness" as const,
    documentKind: document.kind,
    presentationKind,
    distinct: true as const,
  });
}

/** Section queries and FOUR partitions belong to Articulating; Metro publishes charge values. */

export type SectionEntry = Omit<canonicalSection.SectionEntry, "charge"> & { readonly charge: Charge };
export type Section = Omit<canonicalSection.SectionCarrier, "kind" | "entries"> & {
  readonly kind: "meme-topology.section";
  readonly entries: readonly SectionEntry[];
};
export interface SectionPartition {
  readonly kind: "meme-topology.section.partition";
  readonly potential: readonly SectionEntry[];
  readonly active: readonly SectionEntry[];
  readonly stable: readonly SectionEntry[];
  readonly absurd: readonly SectionEntry[];
}
export type TopologyVitals = canonicalSection.TopologyVitalsCarrier;
const fromEntries = (entries: readonly canonicalSection.SectionEntry[]): readonly SectionEntry[] =>
  Object.freeze(entries.map(entry => Object.freeze({ ...entry, charge: fromArticulatingCharge(entry.charge) })));
const toSection = (section: Section): canonicalSection.SectionCarrier => Object.freeze({
  ...section, kind: "meme-topology.section.carrier" as const,
  entries: Object.freeze(section.entries.map(entry => Object.freeze({ ...entry, charge: toArticulatingCharge(entry.charge) }))),
});
export function sectionOf(reading: canonicalReading.MemeTopologyFixedPointReading): Section {
  const section = canonicalSection.sectionOf(reading);
  return Object.freeze({ ...section, kind: "meme-topology.section" as const, entries: fromEntries(section.entries) });
}
export const predicationsFor = (section: Section, subject: PredicationTerm): readonly SectionEntry[] =>
  fromEntries(canonicalSection.predicationsFor(toSection(section), subject));
export const subjectsFor = (section: Section, predicate: PredicationPredicate): readonly SectionEntry[] =>
  fromEntries(canonicalSection.subjectsFor(toSection(section), predicate));
export const chargeAtValues = (section: Section, subject: PredicationTerm, predicate: PredicationPredicate, object?: PredicationTerm): Charge =>
  fromArticulatingCharge(canonicalSection.chargeAtValues(toSection(section), subject, predicate, object));
export function partitionSection(section: Section): SectionPartition {
  const partition = canonicalSection.partitionSection(toSection(section));
  return Object.freeze({ ...partition, potential: fromEntries(partition.potential), active: fromEntries(partition.active),
    stable: fromEntries(partition.stable), absurd: fromEntries(partition.absurd) });
}
export const topologyVitals = (section: Section, classification: SettlingClassification): TopologyVitals =>
  canonicalSection.topologyVitals(toSection(section), classification);
