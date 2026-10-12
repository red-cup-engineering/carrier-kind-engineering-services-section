#!/usr/bin/env node

import { serve } from "@hono/node-server";
import { SqliteKvStore, SqliteMessageQueue } from "@fedify/sqlite";
import { DatabaseSync } from "node:sqlite";
import { lstatSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createActivityPubProvider, importActorKeyPairs } from "./provider.mjs";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

export function invokeAcceptedArrivalHandler(handlerPath, arrival) {
  const executable = path.resolve(handlerPath);
  const stat = lstatSync(executable);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new TypeError("ActivityPub accepted-arrival handler must be one regular non-symlink file");
  const result = spawnSync(process.execPath, [executable, "--operation", "accept-verified-activity"], {
    input: `${JSON.stringify({
      type: "VerifiedActivityPubArrival",
      protocolProvider: "@emsenn/activitypub-services-section",
      recipient: arrival.recipient,
      activity: arrival.jsonLd,
    })}\n`,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
    env: { PATH: process.env.PATH, NODE_PATH: process.env.NODE_PATH, NO_COLOR: "1", ...(process.env.RWIL_RDF_AGENT === undefined ? {} : { RWIL_RDF_AGENT: process.env.RWIL_RDF_AGENT }) },
  });
  let response;
  try { response = JSON.parse(result.stdout); }
  catch { throw new Error(`accepted-arrival handler returned no typed response (status=${result.status}): ${result.stderr || result.stdout}`); }
  if (response?.type !== "Accept") throw new Error(`customer refused verified ActivityPub arrival: ${JSON.stringify(response)}`);
  return response;
}

export async function serveActivityPubProvider(options = {}) {
  const origin = new URL(options.origin ?? requiredEnvironment("ACTIVITYPUB_ORIGIN"));
  if (origin.protocol !== "https:" && origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost") {
    throw new TypeError("ACTIVITYPUB_ORIGIN must use HTTPS outside loopback development");
  }
  const identifier = options.identifier ?? requiredEnvironment("ACTIVITYPUB_IDENTIFIER");
  const actorName = options.actorName ?? requiredEnvironment("ACTIVITYPUB_ACTOR_NAME");
  const summary = options.summary ?? requiredEnvironment("ACTIVITYPUB_ACTOR_SUMMARY");
  const keyPath = path.resolve(options.keyPath ?? requiredEnvironment("ACTIVITYPUB_KEYS_PATH"));
  const statePath = path.resolve(options.statePath ?? requiredEnvironment("ACTIVITYPUB_STATE_PATH"));
  await mkdir(path.dirname(statePath), { recursive: true });
  const keyPairs = await importActorKeyPairs(JSON.parse(await readFile(keyPath, "utf8")));
  const database = new DatabaseSync(statePath);
  const queue = options.queue === null ? undefined : options.queue ?? new SqliteMessageQueue(database);
  const provider = createActivityPubProvider({
    origin: origin.href,
    identifier,
    actorName,
    summary,
    keyPairs,
    kv: new SqliteKvStore(database),
    ...(queue === undefined ? {} : { queue }),
    ...(options.allowPrivateAddress === undefined ? {} : { allowPrivateAddress: options.allowPrivateAddress }),
    onActivity: options.onActivity ?? (async (arrival) => {
      const handler = options.arrivalHandler ?? process.env.ACTIVITYPUB_ARRIVAL_HANDLER;
      if (handler === undefined) process.stdout.write(`${JSON.stringify({ kind: "activitypub.verified-arrival", jsonLd: arrival.jsonLd })}\n`);
      else invokeAcceptedArrivalHandler(handler, arrival);
    }),
    listOutbox: options.listOutbox ?? (async () => ({ items: [] })),
  });
  const port = Number(options.port ?? process.env.PORT ?? origin.port ?? "8000");
  const hostname = options.hostname ?? process.env.HOST ?? "127.0.0.1";
  const server = serve({
    hostname,
    port,
    fetch: (request) => provider.fetch(request),
    overrideGlobalObjects: false,
  });
  return Object.freeze({ provider, server, close: () => new Promise((resolve) => server.close(resolve)) });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  serveActivityPubProvider().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
