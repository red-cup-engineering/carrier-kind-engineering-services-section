/**
 * MetroPlat's utterance boundary is the shared Articulating model.
 *
 * This module retains the established local import path but owns no second
 * Mark, Token, Claim, utterance, or articulation runtime.
 */
import {
  articulationCellSchema,
  articulate,
  articulatingDepth,
  articulatingFloor,
  articulatingHead,
  articulatingPair,
  articulatingUtter,
  articulatingUtterNePair,
  claim,
  claimIdentity,
  coincides,
  isArticulationCell,
  isMark,
  isMarkKind,
  mark,
  markKinds,
  token,
  tokenIdentity,
  utterance,
  utteranceSchema,
} from "@lenticule-science/articulating/utterance";

export {
  articulationCellSchema,
  articulate,
  articulatingDepth,
  articulatingFloor,
  articulatingHead,
  articulatingPair,
  articulatingUtter,
  articulatingUtterNePair,
  claim,
  claimIdentity,
  coincides,
  isArticulationCell,
  isMark,
  isMarkKind,
  mark,
  markKinds,
  token,
  tokenIdentity,
  utterance,
  utteranceSchema,
};

export { Claim, Mark, Token } from "@lenticule-science/articulating/utterance";
export type {
  AperiodicArticulationCell,
  AperiodicArticulationPairing,
  Articulating,
  ArticulatingPair,
  ArticulatingUtter,
  ArticulationCell,
  ClaimIdentityJudgment,
  ClaimArticulationSlot,
  MarkCoincidenceObstruction,
  MarkCoincidenceWitness,
  MarkKind,
  PotentialAperiodicArticulationCell,
  TokenArticulationSlot,
  TokenIdentityJudgment,
  UtteranceCarrier as UtteranceObject,
} from "@lenticule-science/articulating/utterance";

/** Schema fragments used by MetroPlat's predication binding. */
export const MarkSchema = utteranceSchema.properties.token.properties.mark;
export const TokenSchema = utteranceSchema.properties.token;
export const ClaimSchema = utteranceSchema.properties.claim;

/** The standalone ingress shape is observational; carrier semantics stay shared. */
export const markBoundarySchema = {
  $id: "metroplat/articulation/mark-boundary",
  ...MarkSchema,
  title: "MarkBoundary",
  description: "The opaque raw mark boundary admitted before token/claim pairing.",
} as const;

export type MarkObservationAuthority =
  | "boundary-admission"
  | "coincidence-witness"
  | "projection-lens"
  | "opacity-violation";

export interface MarkObservationReport {
  readonly kind: "utterance.mark-observation";
  readonly authority: MarkObservationAuthority;
  readonly permitted: boolean;
  readonly lens?: string;
  readonly witness?: string;
  readonly reason: string;
}

export function markObservationReport(
  authority: MarkObservationAuthority,
  permitted: boolean,
  reason: string,
  details: Pick<MarkObservationReport, "lens" | "witness"> = {},
): MarkObservationReport {
  return Object.freeze({ kind: "utterance.mark-observation", authority, permitted, reason, ...details });
}
