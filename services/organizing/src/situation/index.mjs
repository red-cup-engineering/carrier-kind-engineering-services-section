
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { jsonResource } from "@red-cup-engineering/json-services-section";

export const SituationSceneSchema = {
  enum: ["frontier-node", "contested-locus", "task-to-be-done"],
};

export const SituationSchema = {
  $id: "organizing/situation",
  title: "OrganizingSituation",
  description:
    "A constructed scene over governed substrate: a frontier node, contested locus, or task-to-be-done that calls a camp into performance.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "id", "scene", "substrate", "matchSize", "requiresCapabilities", "requiresAuthorities"],
  properties: {
    kind: { const: "organizing.situation" },
    id: { type: "string", minLength: 1 },
    scene: SituationSceneSchema,
    subject: {
      description: "Caller-owned substrate subject carried as JSON.",
    },
    substrate: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
    },
    matchSize: { type: "integer", minimum: 2 },
    requiresCapabilities: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    requiresAuthorities: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
    description: { type: "string" },
  },
};

export const situationCarrier = schemaFrom(SituationSchema);

export function situation(input) {
  if (input.id.trim() === "") throw new TypeError("situation: id is required");
  if (input.substrate.length === 0) throw new TypeError("situation: substrate is required");
  const matchSize = input.matchSize ?? 2;
  if (!Number.isInteger(matchSize) || matchSize < 2) throw new TypeError("situation: matchSize must be an integer >= 2");
  const reading = Object.freeze({
    kind: "organizing.situation",
    id: input.id,
    scene: input.scene,
    ...(input.subject === undefined ? {} : { subject: input.subject }),
    substrate: Object.freeze([...input.substrate]),
    matchSize,
    requiresCapabilities: Object.freeze([...(input.requiresCapabilities ?? [])]),
    requiresAuthorities: Object.freeze([...(input.requiresAuthorities ?? [])]),
    ...(input.description === undefined ? {} : { description: input.description }),
  });
  return situationCarrier.assert(jsonResource(reading), "situation");
}
