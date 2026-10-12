import { schemaFrom } from "@red-cup-engineering/computer-data-engine/contracts";
import { readMarshResource } from "@red-cup-engineering/ethereum-engineering-services-section/marsh-resource-read";
import { operation, type Operation } from "../../../rpc/index.mts";

const marshResourceReadRequestContract = schemaFrom({
  $id: "metroplat/marsh/resource-read-request",
  type: "object",
  required: ["marshAddress", "resourceId"],
  additionalProperties: false,
  properties: {
    marshAddress: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$", description: "The deployed Base MARSH contract address." },
    resourceId: { type: "string", pattern: "^0x[0-9a-fA-F]{64}$", description: "The MARSH bytes32 resource identifier to read." },
  },
} as const);

/** The Infograph action for the Ethereum-owned, credential-free MARSH reader. */
export const marshResourceOperations: readonly Operation[] = Object.freeze([
  operation({
    verb: "read-marsh-resource",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Read one MARSH resource at a verified Base block boundary.",
    description: "Domain: { marshAddress, resourceId }. The Ethereum service owns the credential-free public EVM read boundary; Infograph only presents the request and result.",
    domain: marshResourceReadRequestContract,
    relation: "boundary",
    effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial" },
    run: async (input: unknown): Promise<unknown> => {
      const request = input as Readonly<{ marshAddress: string; resourceId: string }>;
      return readMarshResource({ marshAddress: request.marshAddress, resourceId: request.resourceId });
    },
  }),
]);
