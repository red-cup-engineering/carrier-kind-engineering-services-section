#!/usr/bin/env node
/**
 * system-federate - this node's outpost: pull from every configured peer the records of the
 * granted types it lacks, by heads (store.md section 8). Two nodes converge on a type of thread
 * by exchanging heads and the records the heads reach; nobody lists what they hold. Each node runs
 * its own, so granted threads converge by union. A node that cannot be dialed (a known-intermittent
 * colony behind an egress-only boundary) catches up the same way.
 *
 *   system-federate [--data-root <settlement>] [--batch N]
 *
 * The node is SYSTEM_NODE_ID, SYSTEM_NODE_ORIGIN, SYSTEM_NODE_PEERS and SYSTEM_NODE_KEY.
 * SYSTEM_NODE_SETTLEMENT_TYPES is a JSON map from peer origin to the exact store types granted to
 * that peer. A peer without a grant receives nothing. SYSTEM_NODE_PEER_KEYS is a JSON map from peer
 * origin to the Ed25519 public key (SPKI PEM) it declared; such a peer is verified without being
 * dialed.
 */
import { pull } from "@red-cup-engineering/semiotic-eavt-services-section/exchange";
import { systemNodeDeclaredPeerKeys, systemNodeFromProcessEnvironment, systemNodeKeyFromProcessEnvironment, systemSettlementPeering, systemSettlementTypeGrants } from "@red-cup-engineering/computer-system-engine/rpc/node";
import { processDataRootConfig } from "@red-cup-engineering/node-process-services-section/config";
import { isDirectEntrypoint, processArguments, processEntrypointArgument, processPackageRoot } from "@red-cup-engineering/node-process-services-section/entrypoint";
import { processEnvironment } from "@red-cup-engineering/node-process-services-section/environment";
import { runProcessMain } from "@red-cup-engineering/node-process-services-section/main-runner";
import { writeProcessStdout } from "@red-cup-engineering/node-process-services-section/stdio";

const flag = (args, name) => { const at = args.indexOf(name); return at === -1 ? undefined : args[at + 1]; };

/** Pull one type from one peer: at most `batch` heads per call; the summary says whether more remain. */
export async function pullType(peering, root, peer, type, batch) {
  return pull(root, peering.remote(peer), type, { limit: batch });
}

async function main() {
  const args = processArguments();
  const env = processEnvironment();
  const node = systemNodeFromProcessEnvironment(env);
  const key = systemNodeKeyFromProcessEnvironment(env);
  if (node === undefined || key === undefined) throw new TypeError("system-federate: SYSTEM_NODE_ID, SYSTEM_NODE_ORIGIN and SYSTEM_NODE_KEY are required");
  const root = processDataRootConfig({ defaultRoot: processPackageRoot(import.meta.url), args, envName: "SYSTEM_DATA_ROOT", configFileName: "system.config.json", configEnvName: "SYSTEM_CONFIG" }).dataRoot;
  const batch = Number(flag(args, "--batch") ?? 1024);
  const peering = systemSettlementPeering(node, key, fetch, { declaredKeys: systemNodeDeclaredPeerKeys(env, node) });
  const grants = systemSettlementTypeGrants(env, node);
  const report = [];
  for (const peer of node.peers) {
    const types = grants.typesFor(peer);
    if (types.length === 0) {
      report.push({ peer, error: "settlement type grant required" });
      continue;
    }
    for (const type of types) {
      try {
        report.push({ peer, type, summary: await pullType(peering, root, peer, type, batch) });
      } catch (error) {
        report.push({ peer, type, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  writeProcessStdout(`${JSON.stringify({ kind: "system.federation.pull", node: node.origin, report })}\n`);
  return report.some((entry) => entry.error !== undefined) ? 1 : 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "system-federate" });
}
