import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { observeX402Resource } from "./resource-observation.mjs";
import { observePublicServiceMarketListing } from "./public-service-market-listing.mjs";

const EFFECTS = Object.freeze({
  class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial",
});

const object = (id, properties, required = []) => schemaFrom({
  $id: `x402/${id}`, type: "object", properties, required, additionalProperties: false,
});

const resourceObservationSchema = object("resource-observation-request", {
  resourceUrl: { type: "string", minLength: 1 },
  method: { enum: ["GET", "HEAD", "POST"] },
  jsonBody: {},
  timeoutMs: { type: "integer", minimum: 250, maximum: 30000 },
}, ["resourceUrl"]);

const marketListingSchema = object("public-service-market-listing-request", {
  agentCardUrl: { type: "string", minLength: 1 },
  resourceUrl: { type: "string", minLength: 1 },
  method: { enum: ["GET", "HEAD", "POST"] },
  jsonBody: {},
  expectedSkillId: { type: "string", minLength: 1 },
  expectedLaw: { type: "string", minLength: 1 },
  sellerPolicy: { type: "object", required: ["payTo", "network", "asset"], additionalProperties: false, properties: {
    payTo: { type: "string", minLength: 1 },
    network: { type: "string", minLength: 1 },
    asset: { type: "string", minLength: 1 },
  } },
  timeoutMs: { type: "integer", minimum: 250, maximum: 30000 },
}, ["agentCardUrl", "resourceUrl", "expectedSkillId", "expectedLaw", "sellerPolicy"]);

export function x402ObservationOperations() {
  return Object.freeze([
    operation({
      verb: "resource-observation",
      summary: "Observe and validate one public x402 v2 HTTP 402 challenge.",
      domain: resourceObservationSchema,
      reads: [],
      writes: [],
      effects: EFFECTS,
      run: (input) => observeX402Resource(input),
    }),
    operation({
      verb: "public-service-market-listing",
      summary: "Observe one public service across signed A2A identity, seller policy and live x402 challenge.",
      domain: marketListingSchema,
      reads: [],
      writes: [],
      effects: EFFECTS,
      run: (input) => observePublicServiceMarketListing(input),
    }),
  ]);
}
