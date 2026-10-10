#!/usr/bin/env node
/**
 * system-federate - this node's outpost: push to every configured peer the admitted witnesses
 * it lacks from the feeds granted to that peer, date by date, in bounded signed transfers.
 * Each node runs its own, so granted source sets converge by union
 * (the system journal exchange).
 *
 * With --pull it replays from each peer instead (Lenticule swarm theory, replay-from-peer): it
 * tells the peer what it holds and merges the granted witnesses it lacks. A node that cannot be
 * dialed (a known-intermittent colony behind an egress-only boundary) catches up this way.
 *
 *   system-federate [--pull] [--data-root <settlement>] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--batch N]
 *
 * The node is SYSTEM_NODE_ID, SYSTEM_NODE_ORIGIN, SYSTEM_NODE_PEERS and SYSTEM_NODE_KEY.
 * SYSTEM_NODE_SETTLEMENT_FEEDS is a JSON map from peer origin to exact, date-independent
 * journal feed labels. A peer without a grant receives no journal material.
 * SYSTEM_NODE_PEER_KEYS is a JSON map from peer origin to the Ed25519 public key (SPKI PEM) it
 * declared; such a peer is verified without being dialed (a known-intermittent colony).
 */
import { mergeSettlementTransfer, settlementHoldings, settlementTransfer } from "@red-cup-engineering/computer-system-engine/journal/exchange";
import { systemNodeDeclaredPeerKeys, systemNodeFromProcessEnvironment, systemNodeKeyFromProcessEnvironment, systemSettlementFeedGrants, systemSettlementPeering } from "@red-cup-engineering/computer-system-engine/rpc/node";
import { processDataRootConfig } from "@red-cup-engineering/node-process-services-section/config";
import { isDirectEntrypoint, processArguments, processEntrypointArgument, processPackageRoot } from "@red-cup-engineering/node-process-services-section/entrypoint";
import { processEnvironment } from "@red-cup-engineering/node-process-services-section/environment";
import { runProcessMain } from "@red-cup-engineering/node-process-services-section/main-runner";
import { writeProcessStdout } from "@red-cup-engineering/node-process-services-section/stdio";

const DAY_MS = 86_400_000;
const flag = (args, name) => { const at = args.indexOf(name); return at === -1 ? undefined : args[at + 1]; };

function datesBetween(since, until) {
  const dates = [];
  for (let t = Date.parse(`${since}T00:00:00Z`); t <= Date.parse(`${until}T00:00:00Z`); t += DAY_MS) dates.push(new Date(t).toISOString().slice(0, 10));
  return dates;
}

/** Push one date's missing witnesses to one peer until it lacks none. */
export async function federateDate(peering, root, peer, date, batch, feedLabels) {
  if (!Array.isArray(feedLabels) || feedLabels.length === 0) throw new TypeError("settlement feed grant required");
  const receipts = [];
  for (;;) {
    const holdings = await peering.holdingsOf(peer, date);
    const transfer = settlementTransfer(root, date, holdings, { limit: batch, feedLabels });
    if (Object.keys(transfer.feeds).length === 0) break;
    const merge = await peering.transferTo(peer, transfer);
    const sent = Object.values(transfer.feeds).reduce((n, feed) => n + feed.statements.length, 0);
    const admitted = Object.values(merge.feeds ?? {}).reduce((n, feed) => n + feed.admitted, 0);
    receipts.push({ sent, admitted });
    // A batch the peer could not admit (every witness still waiting on causes) is not resent.
    if (transfer.remaining === 0 || admitted === 0) break;
  }
  return receipts;
}

/** Pull one date's missing witnesses from one peer until it has none this node lacks. Every witness is
 *  admitted through the journal's one admission path, so a pull is idempotent and order-free, and a
 *  witness whose causes have not arrived waits in quarantine. */
export async function pullDate(peering, root, peer, date, batch, feedLabels) {
  if (!Array.isArray(feedLabels) || feedLabels.length === 0) throw new TypeError("settlement feed grant required");
  const receipts = [];
  for (;;) {
    const holdings = settlementHoldings(root, date, { feedLabels });
    const transfer = await peering.pullFrom(peer, { date, holdings, limit: batch });
    if (transfer?.date !== date) throw new TypeError(`system peer ${peer} answered a pull for ${date} with another date`);
    if (Object.keys(transfer.feeds ?? {}).length === 0) break;
    const merge = mergeSettlementTransfer(root, transfer, { feedLabels });
    const received = Object.values(transfer.feeds).reduce((n, feed) => n + feed.statements.length, 0);
    const admitted = Object.values(merge.feeds).reduce((n, feed) => n + feed.admitted, 0);
    receipts.push({ received, admitted });
    if (transfer.remaining === 0 || admitted === 0) break;
  }
  return receipts;
}

async function main() {
  const args = processArguments();
  const env = processEnvironment();
  const node = systemNodeFromProcessEnvironment(env);
  const key = systemNodeKeyFromProcessEnvironment(env);
  if (node === undefined || key === undefined) throw new TypeError("system-federate: SYSTEM_NODE_ID, SYSTEM_NODE_ORIGIN and SYSTEM_NODE_KEY are required");
  const root = processDataRootConfig({ defaultRoot: processPackageRoot(import.meta.url), args, envName: "SYSTEM_DATA_ROOT", configFileName: "system.config.json", configEnvName: "SYSTEM_CONFIG" }).dataRoot;
  const until = flag(args, "--until") ?? new Date().toISOString().slice(0, 10);
  const since = flag(args, "--since") ?? new Date(Date.parse(`${until}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
  const batch = Number(flag(args, "--batch") ?? 500);
  const pull = args.includes("--pull");
  const exchange = pull ? pullDate : federateDate;
  const peering = systemSettlementPeering(node, key, fetch, { declaredKeys: systemNodeDeclaredPeerKeys(env, node) });
  const grants = systemSettlementFeedGrants(env, node);
  const report = [];
  for (const peer of node.peers) {
    const feedLabels = grants.labelsFor(peer);
    if (feedLabels.length === 0) {
      report.push({ peer, error: "settlement feed grant required" });
      continue;
    }
    for (const date of datesBetween(since, until)) {
      try {
        report.push({ peer, date, receipts: await exchange(peering, root, peer, date, batch, feedLabels) });
      } catch (error) {
        report.push({ peer, date, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  writeProcessStdout(`${JSON.stringify({ kind: pull ? "system.federation.pull" : "system.federation.push", node: node.origin, since, until, report })}\n`);
  return report.some((entry) => entry.error !== undefined) ? 1 : 0;
}

if (isDirectEntrypoint(import.meta.url, processEntrypointArgument())) {
  void runProcessMain(main, { name: "system-federate" });
}
