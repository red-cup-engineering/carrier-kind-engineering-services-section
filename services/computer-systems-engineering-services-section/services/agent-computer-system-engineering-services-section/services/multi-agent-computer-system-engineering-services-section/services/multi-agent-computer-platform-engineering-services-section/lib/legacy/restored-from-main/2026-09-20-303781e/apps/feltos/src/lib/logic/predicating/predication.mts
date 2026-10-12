/** Metro wire schemas and statement addressing over shared predication mechanics. */
export * from "@lenticule-science/articulating/predicating/predication";
import { predicationSeed, type Cell } from "@lenticule-science/articulating/predicating/predication";
import { ClaimSchema, MarkSchema, TokenSchema, mark, utterance } from "../../records/utterance/utterance.mts";
import { canonicalStatementValue, type StatementValue } from "../../records/persistence.mts";
/** The predicate wire shape, mirroring the `Predicate` class. */
export const predicateSchema = {
  type: "object",
  required: ["kind", "claim", "mark"],
  properties: { kind: { const: "predication.predicate" }, claim: ClaimSchema, mark: MarkSchema },
  additionalProperties: false,
} as const;
/** The cell wire shape, mirroring `Cell`. */
export const cellSchema = {
  type: "object",
  required: ["subject", "predicate", "object"],
  properties: { subject: TokenSchema, predicate: predicateSchema, object: TokenSchema },
  additionalProperties: false,
} as const;
/** The specialization-edge wire shape, mirroring `SpecializationMorphism`. */
export const specializationSchema = {
  type: "object",
  required: ["kind", "domain", "codomain"],
  properties: { kind: { const: "predication.specialization" }, domain: TokenSchema, codomain: TokenSchema },
  additionalProperties: false,
} as const;
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
export type { PredicationFiberFunctorCarrier as PredicationFiberFunctor, CoherenceCarrier as CoherenceResult, UnrelatedPairsCarrier as UnrelatedPairsResult } from "@lenticule-science/articulating/predicating/predication";
import * as canonicalPredication from "@lenticule-science/articulating/predicating/predication";
import { articulate as canonicalArticulate } from "@lenticule-science/articulating/utterance";
import type { ArticulationCell } from "../../records/utterance/utterance.mts";
export const predicate = (cell: ArticulationCell): ReturnType<typeof canonicalPredication.predicate> =>
  canonicalPredication.predicate(canonicalArticulate(cell.potentialAperiodicArticulationCell[0]));
export const predicatingCell = (cell: ArticulationCell): ReturnType<typeof canonicalPredication.predicatingCell> =>
  canonicalPredication.predicatingCell(canonicalArticulate(cell.potentialAperiodicArticulationCell[0]));
export const generatePredicationCategory = (cell: ArticulationCell): ReturnType<typeof canonicalPredication.generatePredicationCategory> =>
  canonicalPredication.generatePredicationCategory(canonicalArticulate(cell.potentialAperiodicArticulationCell[0]));
