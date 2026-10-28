import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  htmlRepr,
  installGracefulShutdown,
  jsonRepr,
  mergeApps,
  readJsonBody,
  start,
  type App,
  type Context,
  type Handler,
} from "@red-cup-engineering/http-server";
import { OAuthServer, oauthApp, oauthConfigFromEnv, authorizationServerMetadata, protectedResourceMetadata } from "@red-cup-engineering/serve-google-oauth-service";
import { judgeRequestMutability } from "@red-cup-engineering/judge-request-mutability-service";
import { civicReportPage, civicDashboardFragment } from "./civic-report-page.mjs";
import { activityPubProxyApp } from "./activitypub-proxy.mjs";
import { x402ProxyApp } from "./x402-proxy.mjs";
import { readReportProvider } from "./report-provider.mjs";
import { submitSwarmMessage } from "./swarm-message-provider.mts";
import { readMachineGraph, readMachineProjection } from "./machine-fars.mts";

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 19748);
const host = process.env.HOST ?? "127.0.0.1";
const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? process.env.BASE_URL ?? `http://${host}:${port}`).replace(/\/$/, "");
const allowedEmail = process.env.BARE_CEDAR_FOG_ALLOWED_EMAIL ?? "morgan.sennhauser@gmail.com";
const runtimeNodeName = process.env.RUNTIME_NODE_NAME ?? "unknown-runtime-node";
const stateDir = process.env.BARE_CEDAR_FOG_STATE_DIR ?? join(siteRoot, "data", "state", "oauth");
mkdirSync(stateDir, { recursive: true });
const oauth = new OAuthServer(oauthConfigFromEnv({ publicBaseUrl, allowedEmail, stateDir, env: process.env }));
const challenge = `Bearer realm="bare-cedar-fog-state", resource_metadata="${publicBaseUrl}/.well-known/oauth-protected-resource"`;
const codexAgentCardPath = process.env.BARE_CEDAR_FOG_CODEX_AGENT_CARD_PATH ?? join(
  siteRoot,
  "..",
  "..",
  "services",
  "bare-cedar-fog-inference-services-section",
  "services",
  "bare-cedar-fog-codex-services-section",
  "agents",
  "agent-cards",
  "codex-enterprise.json",
);

export function codexActivityPubCarrierCard(path = codexAgentCardPath) {
  const card = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(card.supportedInterfaces) || card.supportedInterfaces.length !== 0
      || card["x-carrier"]?.protocol !== "ActivityPub"
      || card["x-carrier"]?.actor !== `${publicBaseUrl}/actors/codex`) {
    throw new TypeError("Codex Agent Card must declare ActivityPub as its sole public carrier");
  }
  return card;
}

function guard(inner: Handler): Handler { return async (ctx: Context) => {
  const authorization = ctx.req.headers.authorization;
  const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const claims = token ? oauth.validateToken(token) : null;
  const status = !token ? 401 : claims?.email === allowedEmail ? 200 : 403;
  if (status !== 200) { const reply = jsonRepr({ error: status === 401 ? "unauthorized" : "forbidden", reason: "Leader OAuth token required" }, status); return { ...reply, headers: { ...(reply.headers ?? {}), "www-authenticate": challenge } }; }
  return (await inner(ctx)) ?? jsonRepr({ error: "no response" }, 500);
}; }

// Whether the configured peer status endpoint currently answers. Used only
// to show the dashboard operator whether that peer is reachable right now.
async function peerStatus() {
  const endpoint = process.env.COLD_RED_GATE_STATUS_URL ?? "https://ops.561.group/.well-known/oauth-authorization-server";
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5_000) });
    return { endpoint, reachable: response.ok, httpStatus: response.status };
  } catch (error) {
    return { endpoint, reachable: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function oauthStateFile(path: string) {
  if (!existsSync(path)) return { exists: false };
  return { exists: true, updatedAt: statSync(path).mtime.toISOString() };
}

async function dashboardStatus(mutableFace: boolean) {
  return {
    node: runtimeNodeName,
    face: mutableFace ? "mutable" : "read-only",
    oauthState: oauthStateFile(join(stateDir, "tokens.json")),
    peer: await peerStatus(),
    checkedAt: new Date().toISOString(),
  };
}

// A face is the interface a request arrived on. The machine's own local face
// (127.0.0.1) holds write authority; the relay face the public reaches is
// read-only — mutations are refused before authentication is considered.
function onMutableFaceOnly(mutableFace: boolean, inner: Handler): Handler { return async (ctx: Context) => {
  const judgment = judgeRequestMutability({ method: ctx.req.method, mutableFace });
  if (!judgment.allowed) return jsonRepr({ error: "read-only-face", reason: judgment.reason }, judgment.status);
  return (await inner(ctx)) ?? jsonRepr({ error: "no response" }, 500);
}; }
function guardRemoteRead(mutableFace: boolean, inner: Handler): Handler { return mutableFace ? inner : guard(inner); }

const state = (mutableFace: boolean): App => ({ resources: [
  { match: "/api/swarm/messages", methods: ["POST"], produces: ["application/json"], handler: onMutableFaceOnly(mutableFace, guard(async (ctx) => {
    const input = await readJsonBody<{ message?: unknown }>(ctx.req, { maxBytes: 20_000, empty: {} });
    const result = await submitSwarmMessage(input.message, { endpoint: process.env.SWARM_MESSAGE_PROVIDER_URL });
    return jsonRepr(result.body, result.status);
  })) },
  { match: "/api/colony-report", methods: ["GET"], produces: ["application/json"], handler: guardRemoteRead(mutableFace, async () => { const result = await readReportProvider({ providerUrl: process.env.COLONY_REPORT_PROVIDER_URL, unavailableType: "ColonyReportUnavailable" }); return jsonRepr(result.body, result.status); }) },
  { match: "/api/union-report", methods: ["GET"], produces: ["application/json"], handler: guardRemoteRead(mutableFace, async () => { const result = await readReportProvider({ providerUrl: process.env.UNION_REPORT_PROVIDER_URL, unavailableType: "UnionReportUnavailable" }); return jsonRepr(result.body, result.status); }) },
  { match: "/api/dashboard-observation", methods: ["GET"], produces: ["application/json"], handler: guardRemoteRead(mutableFace, async () => jsonRepr(await dashboardStatus(mutableFace))) },
  { match: "/api/fars/machine", methods: ["GET"], produces: ["application/json"], handler: guardRemoteRead(mutableFace, async () => jsonRepr(await readMachineProjection({ nodeName: runtimeNodeName }))) },
  { match: "/api/fars/graph", methods: ["GET"], produces: ["application/json"], handler: guardRemoteRead(mutableFace, async () => jsonRepr(await readMachineGraph({ nodeName: runtimeNodeName }))) },
  { match: "/api/dashboard-fragment", methods: ["GET"], produces: ["text/html"], handler: guardRemoteRead(mutableFace, async () => htmlRepr(civicDashboardFragment())) }
] });
const shell = (mutableFace: boolean): App => ({ resources: [
  { match: "/healthz", methods: ["GET"], produces: ["application/json"], handler: () => jsonRepr({ ok: true, colony: "bare-cedar-fog" }) },
  { match: "/", methods: ["GET"], produces: ["text/html"], handler: () => htmlRepr(civicReportPage({ localFace: mutableFace })) }
] });
const metadata: App = { resources: [
  { match: "/.well-known/agent-card.json", methods: ["GET"], produces: ["application/json"], handler: () => jsonRepr(codexActivityPubCarrierCard()) },
  { match: "/.well-known/oauth-authorization-server", methods: ["GET"], produces: ["application/json"], handler: () => jsonRepr(authorizationServerMetadata(oauth)) },
  { match: "/.well-known/oauth-protected-resource", methods: ["GET"], produces: ["application/json"], handler: () => jsonRepr(protectedResourceMetadata(`${publicBaseUrl}/api/colony-report`, publicBaseUrl)) }
] };
// One capability face, with any number of read-only transports. The machine's
// loopback capability face holds write authority. Cloudflare and the private
// Cold Red Gate transport terminate on distinct read-only listeners so no
// proxy header or caller-controlled value can manufacture local authority.
const localHost = process.env.LOCAL_HOST ?? "127.0.0.1";
const localPort = Number(process.env.LOCAL_PORT ?? 19749);
const local = await start(mergeApps(x402ProxyApp, activityPubProxyApp, shell(true), oauthApp(oauth), metadata, state(true)), { host: localHost, port: localPort });
installGracefulShutdown(local);
process.stderr.write(`[bare-cedar-fog] mutable face on ${localHost}:${local.port}; Google-OAuth sealed for ${allowedEmail}\n`);
async function startReadOnlyFace(faceHost: string, facePort: number, transport: string) {
  const relay = await start(mergeApps(x402ProxyApp, activityPubProxyApp, shell(false), oauthApp(oauth), metadata, state(false)), { host: faceHost, port: facePort });
  installGracefulShutdown(relay);
  process.stderr.write(`[bare-cedar-fog] read-only ${transport} face on ${faceHost}:${relay.port} for ${publicBaseUrl}\n`);
}
if (host !== localHost || port !== localPort) {
  await startReadOnlyFace(host, port, "Cloudflare relay");
}
const privateRelayHost = process.env.PRIVATE_RELAY_HOST;
const privateRelayPort = Number(process.env.PRIVATE_RELAY_PORT ?? 19750);
if (privateRelayHost && (privateRelayHost !== host || privateRelayPort !== port) && (privateRelayHost !== localHost || privateRelayPort !== localPort)) {
  await startReadOnlyFace(privateRelayHost, privateRelayPort, "private relay");
}
