// resource-read.hive-engine — the credential-free public read of one MARSH resource on the
// Hive-Engine sidechain, the Hive-Engine analogue of resource-read.mjs's Base EVM read. Composes
// the house Hive-Engine client rather than a second JSON-RPC implementation.
import { EngineClient } from "@red-cup-engineering/hive-blockchain-client-service/engine.mjs";

function resourceFromRow(row) {
  if (row === null) return null;
  return Object.freeze({
    controller: row.controller,
    kind: row.kind,
    content: row.content,
    evidence: row.evidence,
    sequence: row.sequence,
  });
}

/**
 * Read one MARSH resource from a Hive-Engine node, cross-checked across every configured node.
 * @param {object} request
 * @param {string} request.resource A resourceId, as built by marshHiveEngineResourceId.
 * @param {string} [request.contractName] The deployed contract's name (default "marsh").
 * @param {EngineClient} [request.client] An injected EngineClient, for tests or a non-default node set.
 * @returns {Promise<object>} { contractName, resource, resource: {...}|null, provenance }
 */
export async function readMarshHiveEngineResource(request) {
  if (typeof request.resource !== "string" || request.resource.length === 0) {
    throw new TypeError("resource-read.hive-engine: request.resource must be a non-empty string");
  }
  const contractName = request.contractName ?? "marsh";
  const client = request.client ?? new EngineClient();
  const row = await client.findOne(contractName, "resources", { resource: request.resource });
  const latestBlock = await client.getLatestBlockInfo().catch(() => null);
  return Object.freeze({
    contractName,
    resourceId: request.resource,
    resource: resourceFromRow(row ?? null),
    provenance: Object.freeze({
      nodes: client.nodes,
      blockNumber: latestBlock?.blockNumber ?? null,
    }),
  });
}
