import { schemaFrom } from "../../schema/contract.mts";
import { chargeValueNames } from "../../values/index.mts";

const cloudEventsSpecVersion = "1.0";
const cloudEventsDataContentType = "application/json";

const illocutionaryForceSchema = {
  enum: ["assertive", "directive", "commissive", "expressive", "declaration"],
} as const;

const cloudEventsTypeSchema = {
  type: "string",
  minLength: 1,
} as const;

const truthChargeSchema = {
  enum: chargeValueNames,
} as const;

export const cloudEventSchema = {
  $id: "metroplat/codecs/text/json/cloudevents/event",
  title: "CloudEvent",
  description: "A CloudEvents structured JSON envelope. Arrival admission reads source+id as the token and data as the claim.",
  type: "object",
  required: ["specversion", "id", "source", "type", "time", "datacontenttype", "data"],
  properties: {
    specversion: { const: cloudEventsSpecVersion },
    id: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    type: cloudEventsTypeSchema,
    time: { type: "string", minLength: 1 },
    datacontenttype: { const: cloudEventsDataContentType },
    data: {},
    emsenntruthcharge: truthChargeSchema,
  },
  additionalProperties: true,
} as const;

export const cloudEventUtteranceBridgeSchema = {
  $id: "metroplat/codecs/text/json/cloudevents/utterance-bridge",
  title: "CloudEventUtteranceBridge",
  description: "Witness or obstruction for reading a CloudEvent as an MetroPlat utterance object.",
  type: "object",
  required: ["kind", "event", "utterance", "ok", "reasons"],
  properties: {
    kind: { enum: ["cloudevents.utterance-bridge:witness", "cloudevents.utterance-bridge-obstruction"] },
    event: cloudEventSchema,
    utterance: { type: "object", additionalProperties: true },
    ok: { type: "boolean" },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
} as const;

export const cloudEventContract = schemaFrom(cloudEventSchema);
export const cloudEventUtteranceBridgeContract = schemaFrom(cloudEventUtteranceBridgeSchema);
