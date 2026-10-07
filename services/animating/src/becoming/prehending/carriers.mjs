/**
 * carriers — the prehension boundary (request) and the constitutive prehension carrier.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { cellSchema, tripleSchema, utteranceSchema } from "@red-cup-engineering/signcell/cell";

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
};

export const prehensionRequestCarrier = schemaFrom(prehensionRequestSchema);

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
    subject: {},
    datum: {},
    subjectiveForm: {},
    cell: tripleSchema,
    utterance: utteranceSchema,
    articulation: cellSchema,
    cells: { type: "array", items: tripleSchema },
    utterances: { type: "array", items: utteranceSchema },
  },
};

export const prehensionCarrier = schemaFrom(prehensionSchema);
