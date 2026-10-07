import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

export const signRelationSchema = {
  $id: "communicating/speaking/signifying/sign-relation",
  title: "SignRelationCarrier",
  description: "A triadic sign relation: vehicle, object, interpretant.",
  type: "object",
  required: ["kind", "vehicle", "object", "interpretant"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.signifying.signRelation" },
    vehicle: {},
    object: {},
    interpretant: {},
  },
};
export const signRelationCarrier = schemaFrom(signRelationSchema);

export const semiosisStepSchema = {
  $id: "communicating/speaking/signifying/semiosis-step",
  title: "SemiosisStepCarrier",
  description: "One semiosis step: the prior interpretant becomes the next sign vehicle.",
  type: "object",
  required: ["kind", "prior", "next"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.signifying.semiosisStep" },
    prior: {},
    next: {},
  },
};
export const semiosisStepCarrier = schemaFrom(semiosisStepSchema);

export const semiosphereSchema = {
  $id: "communicating/speaking/signifying/semiosphere",
  title: "SemiosphereCarrier",
  description: "A named semiotic domain within which sign relations are interpreted.",
  type: "object",
  required: ["kind", "name"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.signifying.semiosphere" },
    name: { type: "string" },
  },
};
export const semiosphereCarrier = schemaFrom(semiosphereSchema);

export const semiosphereBoundaryTranslationSchema = {
  $id: "communicating/speaking/signifying/semiosphere-boundary-translation",
  title: "SemiosphereBoundaryTranslation",
  description: "A semantic boundary translation into a semiosphere.",
  type: "object",
  required: ["kind", "semiosphere", "external", "internal"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.signifying.semiosphereBoundaryTranslation" },
    semiosphere: {},
    external: {},
    internal: {},
  },
};
export const semiosphereBoundaryTranslationCarrier = schemaFrom(semiosphereBoundaryTranslationSchema);

