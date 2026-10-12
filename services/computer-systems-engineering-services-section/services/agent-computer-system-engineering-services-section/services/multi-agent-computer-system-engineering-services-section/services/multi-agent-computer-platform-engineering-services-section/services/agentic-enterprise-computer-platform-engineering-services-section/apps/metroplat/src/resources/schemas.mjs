import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

export const stateViewContract = schemaFrom({
  $id: "metroplat/witness/state-view",
  title: "StatementStateView",
  description: "A sufficient-statistic state projection folded from an EAVT statement log.",
  type: "object",
  additionalProperties: true,
});

export const eventStreamContract = schemaFrom({
  $id: "text/event-stream",
  title: "ServerSentEventStream",
  description: "The Server-Sent Events boundary projection of an append-only statement log.",
  type: "string",
});
