/** Boundary contracts for claim-session readings: claims, observations, bundles, glued settlements and continuations. */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { closureRegimeName, closureRegimeNamed, closureRegimeNames, omegaOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { ofNat, regimeOfOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/ordinal-closure";

/** The regime a claim session reads at its closure ordinal. Its judgement is the ∨ₖ fold of
 *  its claims, a monotone closure on FOUR (Obsmetrologia `Language/Settling`), so it is
 *  Scott-continuous; claims arrive one at a time, so its cofinality is countable. */
export const claimSessionRegimeAt = (ordinal) => closureRegimeName(regimeOfOrdinal(ordinal, true, true));

/** The regimes a claim session can read: a closed log settles at a finite stage, an open one
 *  only as the directed join of the claims still to come. */
export const claimSessionRegimeSchema = { enum: [ofNat(0), omegaOrdinal()].map(claimSessionRegimeAt) };

/** A claim session read in the extremal reading names its readings held, denied, contested and unknown. */
export const claimReadingSchema = { enum: readingFamilies.extremal };
const reading = claimReadingSchema;
const unknownValueSchema = {};

const closureRegimeSchema = {
  type: "object",
  required: ["kind"],
  properties: {
    kind: {
      enum: closureRegimeNames.map((name) => closureRegimeNamed(name).kind),
    },
  },
  additionalProperties: false,
};

export const claimSchema = {
  type: "object",
  required: ["cell", "reading"],
    properties: { cell: { type: "string", minLength: 1 }, reading },
  additionalProperties: false,
};

export const claimSessionObservationSchema = {
  $id: "metroplat/executing/claim-session-observation",
  title: "ClaimSessionObservation",
  description: "One accepted claim-session boundary event, carrying the monotone session state and settled judgement at that step.",
  type: "object",
  required: ["sessionId", "transport", "claim", "session", "judgement", "at"],
  properties: {
    sessionId: { type: "string", minLength: 1 },
    transport: { enum: ["claim-session", "websocket-session"] },
    claim: claimSchema,
    session: {
      type: "object",
      required: ["claims", "closed"],
      properties: { claims: { type: "array", items: claimSchema }, closed: { type: "boolean" }, family: { enum: Object.keys(readingFamilies) } },
      additionalProperties: false,
    },
    judgement: unknownValueSchema,
    at: unknownValueSchema,
    boundary: unknownValueSchema,
    caller: unknownValueSchema,
  },
  additionalProperties: false,
};

export const claimSessionObservationContract = schemaFrom(claimSessionObservationSchema);

export const claimSessionObservationBundleSchema = {
  $id: "metroplat/executing/claim-session-observation-bundle",
  title: "ClaimSessionObservationBundle",
  description: "A finite projection of admitted work material into ordinary claim-session observations.",
  type: "object",
  required: ["kind", "source", "observations", "evidence"],
  properties: {
    kind: { const: "metroplat.claim-session.observation-bundle" },
    sessionId: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    observations: { type: "array", items: claimSessionObservationSchema },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const claimSessionObservationBundleContract = schemaFrom(claimSessionObservationBundleSchema);

/** The shared settlement produced by gluing claim-session bundles. */
export const gluedClaimSessionsSchema = {
  $id: "metroplat/executing/glued-claim-sessions",
  title: "GluedClaimSessions",
  description: "The shared settlement of multiple claim-session bundles: the knowledge-order fold over shared cells, plus the federated cover-nerve H¹ certificate — sessions are the cover's sources, and a nonzero class marks a genuine cross-session coordination obstruction.",
  type: "object",
  required: ["kind", "sources", "claims", "judgement", "conflicts", "regime", "growth", "coordination", "adjudication"],
  properties: {
    kind: { const: "metroplat.running.glued-claim-sessions" },
    sources: { type: "array", items: { type: "string", minLength: 1 } },
    claims: { type: "integer", minimum: 0 },
    judgement: unknownValueSchema,
    conflicts: { type: "array", items: { type: "string", minLength: 1 } },
    regime: claimSessionRegimeSchema,
    growth: {
      type: "object",
      required: ["regime", "coordinationFree"],
      properties: {
        regime: closureRegimeSchema,
        coordinationFree: { type: "boolean" },
      },
      additionalProperties: false,
    },
    coordination: {
      type: "object",
      required: ["kind", "top", "mass", "rank", "vanishing", "obstructions"],
      properties: {
        kind: { const: "predication.cohomology.coordinationReadout" },
        top: { type: "integer", minimum: 0 },
        mass: { type: "integer", minimum: 0 },
        rank: { type: "integer", minimum: 0 },
        vanishing: { enum: ["witness", "obstruction"] },
        obstructions: {
          type: "array",
          items: {
            type: "object",
            required: ["cell", "top", "mass"],
            properties: {
              cell: { type: "string", minLength: 1 },
              top: { type: "integer", minimum: 1 },
              mass: { type: "integer", minimum: 1 },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    adjudication: {
      type: "object",
      required: ["kind", "cells", "omitted", "classification"],
      properties: {
        kind: { const: "relational.contextuality.adjudicationReadout" },
        cells: { type: "array", items: { type: "string", minLength: 1 } },
        omitted: { type: "array", items: { type: "string", minLength: 1 } },
        classification: { enum: ["flat", "noncontextual", "logically-contextual", "strongly-contextual"] },
        resolution: { type: "object" },
        obstruction: {
          type: "object",
          required: ["sources", "context"],
          properties: {
            sources: { type: "array", items: { type: "string", minLength: 1 } },
            context: { type: "array", items: { type: "string", minLength: 1 } },
            localSection: { type: "object" },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const gluedClaimSessionsContract = schemaFrom(gluedClaimSessionsSchema);

export const claimSessionContinuationItemSchema = {
  type: "object",
  required: ["cell", "reading", "role", "text"],
  properties: {
    cell: { type: "string", minLength: 1 },
    reading,
    role: { enum: ["goal", "obligation", "claim"] },
    text: { type: "string" },
    source: { type: "string" },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

/** A prompt/resource-grade sufficient statistic over a claim session. */
export const claimSessionContinuationSchema = {
  $id: "metroplat/executing/claim-session-continuation",
  title: "ClaimSessionContinuation",
  description: "A prompt/resource-grade sufficient statistic over a finite claim-session observation bundle for continuation and handoff.",
  type: "object",
  required: ["kind", "source", "observations", "goals", "obligations", "claims", "regime", "conflicts", "items", "evidence", "text"],
  properties: {
    kind: { const: "metroplat.claim-session.continuation" },
    sessionId: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    observations: { type: "integer", minimum: 0 },
    goals: { type: "integer", minimum: 0 },
    obligations: { type: "integer", minimum: 0 },
    claims: { type: "integer", minimum: 0 },
    regime: claimSessionRegimeSchema,
    conflicts: { type: "array", items: { type: "string", minLength: 1 } },
    items: { type: "array", items: claimSessionContinuationItemSchema },
    evidence: { type: "array", items: { type: "string", minLength: 1 } },
    text: { type: "string" },
  },
  additionalProperties: false,
};

export const claimSessionContinuationContract = schemaFrom(claimSessionContinuationSchema);
