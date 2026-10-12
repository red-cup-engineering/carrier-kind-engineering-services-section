#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { exchangeBoundedActivityPubA2a, ACTIVITYPUB_ACCEPT } from "@red-cup-engineering/activitypub-services-section/bounded-exchange";
import { createMcpServer } from "@red-cup-engineering/mcp-engineering-services-section/server";

const DEFAULT_ACTIVITYPUB_ORIGIN = "https://bare-cedar-fog.561.group";
function option(name) { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1] ?? null; }
const actorIdentifier = option("--actor") ?? process.env.UNION_ACTIVITYPUB_ACTOR;
const actor = option("--actor-urn") ?? process.env.UNION_ACTIVITYPUB_ACTOR_URN;
if (!actorIdentifier || !actor) throw new TypeError("--actor and --actor-urn are required");
function origin() { return (process.env.UNION_ACTIVITYPUB_ORIGIN ?? DEFAULT_ACTIVITYPUB_ORIGIN).replace(/\/$/u, ""); }
function url(path) { return `${origin()}${path}`; }
async function credentialResource(kind) {
  if (kind === "public") return null;
  if (kind !== "activitypub-bearer") throw new TypeError(`unknown network authentication ${kind}`);
  const path = process.env.ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE;
  if (!path) throw new Error("ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE is required for ActivityPub bearer exchange");
  return Object.freeze({ reference: "env:ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE", token: (await readFile(path, "utf8")).trim() });
}
async function get(endpoint, authenticated = false) {
  const headers = { accept: ACTIVITYPUB_ACCEPT };
  if (authenticated) headers.authorization = `Bearer ${(await credentialResource("activitypub-bearer")).token}`;
  const response = await fetch(endpoint, { headers }); const text = await response.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 2000) }; }
  if (!response.ok) throw new Error(`ActivityPub ${response.status} for ${endpoint}: ${JSON.stringify(body).slice(0, 1000)}`);
  return body;
}
async function getAbsolute(endpoint) {
  const response = await fetch(endpoint, { headers: { accept: ACTIVITYPUB_ACCEPT } }); const text = await response.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 2000) }; }
  return response.ok ? { state: "reachable", endpoint, body } : { state: response.status === 401 || response.status === 403 ? "authorization-required" : "obstructed", status: response.status, endpoint, body };
}
function workOrders(collection) { return (collection?.orderedItems ?? collection?.items ?? []).filter((item) => { const value = item?.object ?? item; return /work|order|duty|obligation|task|mission|requirement|offer|dispatch/iu.test(`${item?.type ?? ""} ${value?.type ?? ""} ${value?.name ?? ""} ${value?.summary ?? ""} ${value?.content ?? ""}`); }); }
const tools = [
  { name: `observe_activitypub_${actorIdentifier}_actor`, description: `Read the sovereign ${actorIdentifier} Actor projection from the live ActivityPub network.`, inputSchema: { type: "object", additionalProperties: false } },
  { name: `observe_activitypub_${actorIdentifier}_inbox`, description: `Read current work Activities addressed to the ${actorIdentifier} Actor from its authenticated ActivityPub inbox.`, inputSchema: { type: "object", additionalProperties: false } },
  { name: `observe_activitypub_${actorIdentifier}_outbox`, description: `Read the ${actorIdentifier} Actor's network outbox as provider and receiver evidence.`, inputSchema: { type: "object", additionalProperties: false } },
  { name: "observe_uftn_activitypub_actor", description: "Read one exact public ActivityPub actor by HTTPS URL.", inputSchema: { type: "object", required: ["actorUrl"], properties: { actorUrl: { type: "string", pattern: "^https://" } }, additionalProperties: false } },
  { name: "exchange_with_union_actor", description: "Make one proof-path-bounded HTTPS ActivityPub or A2A JSON-RPC exchange. Credentials remain a referenced resource; no x402 payment or chain write occurs.", inputSchema: { type: "object", required: ["protocol", "endpoint", "body"], properties: { protocol: { enum: ["activitypub", "a2a-jsonrpc"] }, endpoint: { type: "string", pattern: "^https://" }, body: { type: "object" }, authentication: { enum: ["public", "activitypub-bearer"], default: "public" }, a2aVersion: { type: "string", default: "1.0" }, extensions: { type: "array", items: { type: "string" } }, maximumResponseBytes: { type: "integer", minimum: 1024, maximum: 65536, default: 16384 } }, additionalProperties: false } },
].map((tool) => ({ ...tool, outputSchema: { type: "object" } }));
async function dispatch(name, args) {
  if (name === `observe_activitypub_${actorIdentifier}_actor`) return { actor, endpoint: url(`/actors/${actorIdentifier}`), projection: await get(url(`/actors/${actorIdentifier}`)) };
  if (name === `observe_activitypub_${actorIdentifier}_inbox`) { const collection = await get(url(`/actors/${actorIdentifier}/inbox?page=true`), true); return { actor, source: url(`/actors/${actorIdentifier}/inbox`), activities: workOrders(collection), totalItems: collection?.totalItems ?? null, networkOnly: true }; }
  if (name === `observe_activitypub_${actorIdentifier}_outbox`) { const collection = await get(url(`/actors/${actorIdentifier}/outbox?page=true`)); return { actor, source: url(`/actors/${actorIdentifier}/outbox`), activities: collection?.orderedItems ?? collection?.items ?? [], totalItems: collection?.totalItems ?? null, networkOnly: true }; }
  if (name === "observe_uftn_activitypub_actor") return { actor: args.actorUrl, ...await getAbsolute(args.actorUrl) };
  if (name === "exchange_with_union_actor") return exchangeBoundedActivityPubA2a(args, { credentialResource });
  throw new TypeError(`unknown ActivityPub network operation ${name}`);
}
const server = createMcpServer({
  name: `bare-cedar-fog-${actorIdentifier}-activitypub-network`,
  version: "2.0.0",
  tools: tools.map((tool) => ({ ...tool, handler: (args) => dispatch(tool.name, args) })),
});
await server.serveStdio();
