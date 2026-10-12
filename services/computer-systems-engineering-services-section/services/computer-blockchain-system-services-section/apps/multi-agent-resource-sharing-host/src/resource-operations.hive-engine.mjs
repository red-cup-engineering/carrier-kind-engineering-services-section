import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { readMarshHiveEngineResource } from "./resource-read.hive-engine.mjs";
import { marshHiveEngineResourceId } from "./resource-intents.hive-engine.mjs";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

const marshHiveEngineResourceReadRequestContract = schemaFrom({
  $id: "metroplat/marsh/hive-engine-resource-read-request",
  type: "object",
  required: ["network", "controller", "kind", "subject"],
  additionalProperties: false,
  properties: {
    contractName: { type: "string", description: "The deployed Hive-Engine contract name (default 'marsh')." },
    network: { type: "string", description: "A Hive-Engine network label (e.g. 'mainnet', or a private dev sidechain's own name)." },
    controller: { type: "string", description: "The resource's controller (a Hive account name)." },
    kind: { type: "string", description: "A resource kind label." },
    subject: { type: "string", description: "The resource's subject." },
  },
});

/** The Infograph action for the Hive-owned, credential-free MARSH-on-Hive-Engine reader. */
export const marshHiveEngineResourceOperations = Object.freeze([
  operation({
    verb: "read-marsh-hive-engine-resource",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Read one MARSH resource from the Hive-Engine sidechain at its current head.",
    description: "Domain: { network, controller, kind, subject, contractName? }. The Hive-Engine client owns the credential-free public sidechain read boundary; Infograph only presents the request and result.",
    domain: marshHiveEngineResourceReadRequestContract,
    relation: "boundary",
    effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial" },
    run: async (input) => {
      const resource = marshHiveEngineResourceId(input);
      return readMarshHiveEngineResource({ resource, contractName: input.contractName });
    },
  }),
]);
