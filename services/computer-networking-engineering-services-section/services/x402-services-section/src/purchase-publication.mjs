/** Publish recorded EAVT observations. Publication is neither payment nor acceptance. */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { linkHeader } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/link";
import { EAVT_JSONL, eavtKey, toEavt } from "@red-cup-engineering/eavt-services-section/row";
const eavtTupleSchema = { type: "array", minItems: 4, maxItems: 4, items: {} };
const nonempty = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label}: expected non-empty string`);
  return value;
};
export const webSubPublicationSchema = {
  $id: "x402-value-settlement/websub-publication",
  title: "WebSubPublication",
  description: "A WebSub-style publication face over the same append-only EAVT settlement rows.",
  type: "object",
  required: ["kind", "topic", "hub", "self", "contentType", "updates", "eventIds"],
  properties: {
    kind: { const: "websub.publication" },
    topic: { type: "string", minLength: 1 },
    hub: { type: "string", minLength: 1 },
    self: { type: "string", minLength: 1 },
    contentType: { const: "application/eavt+jsonl; charset=utf-8" },
    updates: { type: "array", items: eavtTupleSchema },
    eventIds: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const webSubPublicationContract = schemaFrom(webSubPublicationSchema);

export function webSubPublication(input) {
  const updates = Object.freeze(input.updates.map(toEavt));
  return webSubPublicationContract.assert(Object.freeze({
    kind: "websub.publication",
    topic: nonempty(input.topic, "WebSub topic"),
    hub: nonempty(input.hub, "WebSub hub"),
    self: nonempty(input.self, "WebSub self"),
    contentType: EAVT_JSONL,
    updates,
    eventIds: Object.freeze(updates.map(eavtKey)),
  }), "WebSub publication");
}

/**
 * The WebSub discovery `Link` header for a publication's hub/self, derived
 * from the same {@link webSubPublication} record — a feed response
 * advertises this header rather than a caller re-deriving hub/self facts of
 * its own.
 */
export function webSubLinkHeader(publication) {
  return linkHeader([
    { href: publication.hub, rel: "hub" },
    { href: publication.self, rel: "self" },
  ]);
}
