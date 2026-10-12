#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { extractSenActivity, SEN_MEDIA_TYPE } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { installGracefulShutdown } from "@red-cup-engineering/http-services-section/node-server";
import { startNativeApplication as start } from "@red-cup-engineering/computer-web-server/native-application";
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { createOpsMcpGatewayApp } from "../src/app.mjs";
import { operations as holofoamOperations } from "@red-cup-engineering/holofoam/operations";
import { loadGatewayConfig } from "../src/config.mjs";

export async function admitActivityPubArrival(arrival, { upstreamMcpUrl, origin, identifier, fetchImpl = fetch } = {}) {
  if (arrival.jsonLd?.object?.mediaType !== SEN_MEDIA_TYPE) return undefined;
  const recipient = new URL(`/actors/${encodeURIComponent(identifier)}`, origin).href;
  const projection = extractSenActivity(arrival.jsonLd, {
    expectedActor: arrival.jsonLd.actor,
    expectedRecipient: recipient,
  });
  const response = await fetchImpl(new URL("/arrivals", upstreamMcpUrl), {
    method: "POST",
    headers: { "content-type": "application/cloudevents+json" },
    body: JSON.stringify(projection.cloudEvent),
  });
  if (!response.ok) throw new Error(`MetroPlat arrival admission returned ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function serveOpsMcpGateway({
  environment = process.env,
  loadConfig = loadGatewayConfig,
  createActivityPubProvider = createLocalActivityPubProvider,
  startServer = start,
  installShutdown = installGracefulShutdown,
} = {}) {
  const config = loadConfig(environment);
  await mkdir(config.stateDir, { recursive: true, mode: 0o700 });
  let activityPub;
  try {
    activityPub = config.activityPub === undefined
      ? undefined
      : await createActivityPubProvider({
        environment,
        ...config.activityPub,
        onActivity: (arrival) => admitActivityPubArrival(arrival, {
          upstreamMcpUrl: config.upstreamMcpUrl,
          origin: config.activityPub.origin,
          identifier: config.activityPub.identifier,
        }),
      });
    const { app } = createOpsMcpGatewayApp(config, { activityPubProvider: activityPub?.provider, pureOperations: Object.values(holofoamOperations) });
    const running = await startServer(app, { host: config.host, port: config.port });
    if (activityPub !== undefined) {
      void activityPub.provider.federation.startQueue(undefined).catch((error) => {
        process.stderr.write(`ActivityPub queue worker stopped: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      });
    }
    const lifecycle = {
      ...running,
      app,
      activityPub,
      close: async () => {
        try {
          await running.close();
        } finally {
          await activityPub?.close();
        }
      },
    };
    lifecycle.shutdown = installShutdown(lifecycle);
    process.stderr.write(`[ops-gateway] ${config.publicBaseUrl}/mcp on ${config.host}:${running.port} -> ${config.upstreamMcpUrl}; OAuth admission configured${activityPub === undefined ? "" : "; ActivityPub mounted"}\n`);
    return Object.freeze(lifecycle);
  } catch (error) {
    await activityPub?.close();
    throw error;
  }
}

await runMain(() => serveOpsMcpGateway(), { moduleUrl: import.meta.url, formatError: (error) => `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`, exitCode: 1 });
