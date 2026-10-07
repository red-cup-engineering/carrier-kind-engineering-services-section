import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

export const jsonTermSchema = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "integer" },
    { type: "boolean" },
    { type: "null" },
    { type: "array" },
    { type: "object" },
  ],
};

export const eavtTupleSchema = {
  type: "array",
  minItems: 4,
  maxItems: 4,
  items: [jsonTermSchema, jsonTermSchema, jsonTermSchema, jsonTermSchema],
  additionalItems: false,
};

export const stringValueSchema = {
  type: "object",
  required: ["stringValue"],
  properties: {
    stringValue: { type: "string" },
  },
  additionalProperties: false,
};

export const keyValueSchema = {
  type: "object",
  required: ["key", "value"],
  properties: {
    key: { type: "string", minLength: 1 },
    value: stringValueSchema,
  },
  additionalProperties: false,
};

export const otlpSpanSchema = {
  $id: "metroplat/codecs/text/json/otlp/span",
  title: "EAVT OTLP span",
  description: "A recorded EAVT row encoded as an OTLP span.",
  type: "object",
  required: ["traceId", "spanId", "name", "kind", "startTimeUnixNano", "endTimeUnixNano", "attributes"],
  properties: {
    traceId: { type: "string", pattern: "^[0-9a-f]{32}$" },
    spanId: { type: "string", pattern: "^[0-9a-f]{16}$" },
    name: { type: "string", minLength: 1 },
    kind: { type: "integer" },
    startTimeUnixNano: { type: "string" },
    endTimeUnixNano: { type: "string" },
    attributes: { type: "array", items: keyValueSchema },
    status: {
      type: "object",
      required: ["code"],
      properties: {
        code: { type: "integer" },
        message: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const otlpSpanContract = schemaFrom(otlpSpanSchema);

export const otlpTracesSchema = {
  $id: "metroplat/codecs/text/json/otlp/traces",
  title: "EAVT OTLP traces",
  description: "An OTLP ExportTraceServiceRequest carrying EAVT statements.",
  type: "object",
  required: ["resourceSpans"],
  properties: {
    resourceSpans: {
      type: "array",
      items: {
        type: "object",
        required: ["resource", "scopeSpans"],
        properties: {
          resource: {
            type: "object",
            required: ["attributes"],
            properties: {
              attributes: { type: "array", items: keyValueSchema },
            },
            additionalProperties: false,
          },
          scopeSpans: {
            type: "array",
            items: {
              type: "object",
              required: ["scope", "spans"],
              properties: {
                scope: {
                  type: "object",
                  required: ["name", "attributes"],
                  properties: {
                    name: { type: "string" },
                    version: { type: "string" },
                    attributes: { type: "array", items: keyValueSchema },
                  },
                  additionalProperties: false,
                },
                spans: { type: "array", items: otlpSpanSchema },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};

export const otlpTracesContract = schemaFrom(otlpTracesSchema);

export const agentEventChronicleSchema = {
  $id: "metroplat/codecs/text/json/otlp/agent-event-chronicle",
  title: "AgentEventChronicle",
  description:
    "A hub agent-event chronicle read as EAVT statements, ready for the OTLP channel-code.",
  type: "object",
  required: ["kind", "feed", "statements"],
  properties: {
    kind: { const: "metroplat.codecs.text.json.otlp.agent-event-chronicle" },
    feed: { type: "string", minLength: 1 },
    statements: { type: "array", items: eavtTupleSchema },
  },
  additionalProperties: false,
};

export const agentEventChronicleContract = schemaFrom(agentEventChronicleSchema);
