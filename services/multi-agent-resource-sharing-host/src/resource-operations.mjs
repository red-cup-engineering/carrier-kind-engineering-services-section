import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { readMarshResource } from "./resource-read.mjs";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const marshResourceReadRequestContract = schemaFrom({
  $id: "metroplat/marsh/resource-read-request",
  type: "object",
  required: ["marshAddress", "resourceId"],
  additionalProperties: false,
  properties: {
    marshAddress: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$", description: "The deployed Base MARSH contract address." },
    resourceId: { type: "string", pattern: "^0x[0-9a-fA-F]{64}$", description: "The MARSH bytes32 resource identifier to read." },
  },
});

/** The Infograph action for the Ethereum-owned, credential-free MARSH reader. */
export const marshResourceOperations = Object.freeze([
  operation({
    verb: "read-marsh-resource",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Read one MARSH resource at a verified Base block boundary.",
    description: "Domain: { marshAddress, resourceId }. The Ethereum service owns the credential-free public EVM read boundary; Infograph only presents the request and result.",
    domain: marshResourceReadRequestContract,
    relation: "boundary",
    effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial" },
    run: async (input) => {
      const request = input;
      return readMarshResource({ marshAddress: request.marshAddress, resourceId: request.resourceId });
    },
  }),
]);
