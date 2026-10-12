#!/usr/bin/env node
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { resolve } from "node:path";
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { startFilesystemWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/filesystem-provider";
import { startMarket } from "../../../src/market/node.mjs";

import { MARKET_NAME, catalog, createMarket561Group } from "../src/market.mjs";

/**
 * The one runner. Starts the filesystem witness-journal provider beside the
 * market, then listens with the market on the Node transport behind one
 * trusted proxy hop, and journals the deployment's ready and stopping events.
 * Every request is read against the market's one public origin (MARKET_ORIGIN,
 * else https://market.561.group): this face is reached through the edge face's
 * proxy and Caddy, and a payment challenge names the resource a buyer bought,
 * never the hop it travelled through.
 */
export async function main(env = process.env) {
  const dataRoot = env.MARKET_DATA_ROOT;
  if (!dataRoot) throw new Error("MARKET_DATA_ROOT must name the durable market data plate");
  const witnessJournal = await startFilesystemWitnessJournalProviderProcess({
    root: env.WITNESS_JOURNAL_ROOT ?? resolve(dataRoot, "witness-journal"),
    port: Number(env.WITNESS_JOURNAL_LOCAL_PORT ?? 19763),
  });
  const bound = { ...env, WITNESS_JOURNAL_DOCUMENT_AGENT: witnessJournal.agentCardUrl };
  const market = createMarket561Group(bound);
  const port = Number(env.PORT) || 4021;
  const server = await startMarket(market, { port, host: env.HOST ?? "0.0.0.0", trustProxy: 1, base: env.MARKET_ORIGIN ?? `https://${MARKET_NAME}` });
  const journalRoot = resolve(dataRoot);
  const rails = market.rails();
  const ready = {
    event: "market-561-group-ready",
    port: server.port,
    network: rails.network,
    facilitatorUrl: rails.facilitatorUrl,
    payTo: rails.payTo,
    offers: catalog().map((offer) => ({ gateway: offer.declaration.gateway, operation: offer.declaration.operation, route: offer.declaration.route, price: offer.declaration.price })),
    witnessJournalAgent: witnessJournal.agentCardUrl,
  };
  put(journalRoot, "deployment-event", { ...ready, at: new Date().toISOString() });
  console.log(JSON.stringify(ready));

  async function stop(signal) {
    const stopping = { event: "market-561-group-stopping", signal };
    put(journalRoot, "deployment-event", { ...stopping, at: new Date().toISOString() });
    console.log(JSON.stringify(stopping));
    await server.close();
    await witnessJournal.close();
  }
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      stop(signal).then(() => process.exit(0), (error) => {
        console.error(error);
        process.exit(1);
      });
    });
  }
  return { market, server, witnessJournal, name: MARKET_NAME };
}

await runMain(() => main(), { moduleUrl: import.meta.url });
