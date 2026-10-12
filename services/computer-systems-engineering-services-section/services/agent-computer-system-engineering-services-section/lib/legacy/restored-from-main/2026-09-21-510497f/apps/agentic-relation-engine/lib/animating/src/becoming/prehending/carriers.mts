/**
 * carriers — the prehension boundary (request) and the constitutive prehension carrier.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import { TokenSchema, utteranceSchema, articulationCellSchema } from "@red-cup-engineering/computer-data-engine/utterance";
import { CellSchema, PredicateSchema } from "@lenticule-science/metrologic/articulation/predicating";

export const prehensionRequestSchema = {
  $id: "animating/becoming/prehending/prehension-request",
  title: "PrehensionRequest",
  description:
    "The admission boundary for an animating prehension: an agentive subject grasps a datum under a subjective form. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "subject", "datum", "subjectiveForm"],
  properties: {
    kind: { const: "animating.agent.prehension-request" },
    subject: true,
    datum: true,
    subjectiveForm: true,
  },
} as const;

export type PrehensionRequest = FromSchema<typeof prehensionRequestSchema>;
export const prehensionRequestCarrier = carrierFrom(prehensionRequestSchema);

export const prehensionSchema = {
  $id: "animating/becoming/prehending/prehension",
  title: "Prehension",
  description:
    "A constitutive animating prehension: a subject term grasps a datum term under a subjective-form predicate. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "subject", "datum", "subjectiveForm", "cell", "utterance", "articulation", "cells", "utterances"],
  properties: {
    kind: { const: "animating.agent.prehension" },
    subject: TokenSchema,
    datum: TokenSchema,
    subjectiveForm: PredicateSchema,
    cell: CellSchema,
    utterance: utteranceSchema,
    articulation: articulationCellSchema,
    cells: { type: "array", items: CellSchema },
    utterances: { type: "array", items: utteranceSchema },
  },
} as const;

export type Prehension = FromSchema<typeof prehensionSchema>;

export const prehensionCarrier = carrierFrom(prehensionSchema);
