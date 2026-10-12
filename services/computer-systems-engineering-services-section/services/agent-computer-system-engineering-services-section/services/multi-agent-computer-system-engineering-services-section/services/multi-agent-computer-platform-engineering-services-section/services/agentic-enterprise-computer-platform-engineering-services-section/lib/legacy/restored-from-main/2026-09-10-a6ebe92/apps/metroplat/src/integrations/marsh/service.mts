import { schemaFrom } from "@red-cup-engineering/feltos/schema/contract";
import { operation, type Operation } from "../../rpc/index.mts";
import { readMarshResource } from "./index.mts";

const marshResourceReadRequestContract = schemaFrom({
  $id: "metroplat/marsh/resource-read-request",
  type: "object",
  required: ["marshAddress", "resourceId"],
  additionalProperties: false,
  properties: {
    marshAddress: {
      type: "string",
      pattern: "^0x[0-9a-fA-F]{40}$",
      description: "The deployed Base MARSH contract address.",
    },
    resourceId: {
      type: "string",
      pattern: "^0x[0-9a-fA-F]{64}$",
      description: "The MARSH bytes32 resource identifier to read.",
    },
  },
} as const);

/** The one credential-free, read-only MARSH resource operation. */
export const marshResourceOperations: readonly Operation[] = Object.freeze([
  operation({
    verb: "read-marsh-resource",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Read one MARSH resource at a verified Base block boundary.",
    description: "Domain: { marshAddress, resourceId }. Uses MetroPlat's canonical credential-free public EVM read provider; the caller supplies the deployed MARSH address and resource identity explicitly.",
    domain: marshResourceReadRequestContract,
    relation: "boundary",
    effects: {
      class: "external",
      replay: "safe",
      coordination: "coordination-free",
      deterministic: "unmeasured",
      totality: "partial",
    },
    run: async (input: unknown): Promise<unknown> => {
      const request = input as Readonly<{ marshAddress: string; resourceId: string }>;
      return readMarshResource({
        marshAddress: request.marshAddress,
        resourceId: request.resourceId,
      });
    },
  }),
]);
