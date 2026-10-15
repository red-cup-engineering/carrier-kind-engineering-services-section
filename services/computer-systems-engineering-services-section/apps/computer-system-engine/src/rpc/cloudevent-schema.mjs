import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { readingFamilies } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const cloudEventsSpecVersion = "1.0";
const cloudEventsTypeSchema = {
  type: "string",
  minLength: 1,
};

const truthReadingSchema = {
  enum: readingFamilies.knowledge,
};

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
    datacontenttype: { type: "string", minLength: 1 },
    data: {},
    emsenntruthreading: truthReadingSchema,
  },
  additionalProperties: true,
};

export const cloudEventContract = schemaFrom(cloudEventSchema);
