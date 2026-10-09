import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

export const CommonGroundBasisSchema = {
  enum: [
    "perceptual-co-presence",
    "prior-discourse",
    "community-membership",
    "cultural-knowledge",
    "accommodation",
  ],
};

export const commonGroundPropositionSchema = {
  $id: "communicating/speaking/listening/grounding/proposition",
  title: "CommonGroundProposition",
  description: "A proposition treated as shared in common ground, with its warrant.",
  type: "object",
  required: ["kind", "proposition", "basis"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.listening.grounding.proposition" },
    proposition: {},
    basis: CommonGroundBasisSchema,
  },
};
export const commonGroundPropositionCarrier = schemaFrom(commonGroundPropositionSchema);

export const commonGroundSchema = {
  $id: "communicating/speaking/listening/grounding/common-ground",
  title: "CommonGroundCarrier",
  description: "A finite common-ground state: propositions participants treat as shared.",
  type: "object",
  required: ["kind", "propositions"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.listening.grounding.commonGround" },
    propositions: { type: "array", items: {} },
  },
};
export const commonGroundCarrier = schemaFrom(commonGroundSchema);

export const commonGroundUpdateSchema = {
  $id: "communicating/speaking/listening/grounding/update",
  title: "CommonGroundUpdate",
  description: "A before/after common-ground morphism.",
  type: "object",
  required: ["kind", "before", "after", "proposition", "mode"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.listening.grounding.update" },
    before: {},
    after: {},
    proposition: {},
    mode: { enum: ["assertion", "accommodation", "challenge"] },
  },
};
export const commonGroundUpdateCarrier = schemaFrom(commonGroundUpdateSchema);

