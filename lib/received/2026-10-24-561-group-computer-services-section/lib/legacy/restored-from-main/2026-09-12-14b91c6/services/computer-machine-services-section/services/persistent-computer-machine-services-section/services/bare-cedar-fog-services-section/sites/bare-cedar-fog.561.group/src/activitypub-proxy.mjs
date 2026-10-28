import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const ACTIVITYPUB_PATH = /^(?:\/actors\/[^/]+(?:\/(?:inbox|outbox))?|\/activities\/[^/]+\/[^/]+\/[^/]+|\/inbox|\/nodeinfo\/2\.1|\/\.well-known\/(?:webfinger|nodeinfo))$/u;
const HOP_BY_HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);
const ACTOR_PATH = /^\/actors\/([^/]+)(?:\/(?:inbox|outbox))?$/u;
const MAXIMUM_SHARED_INBOX_BYTES = 1024 * 1024;
const DEFAULT_COLONY_HOST = "bare-cedar-fog.561.group";

export function isActivityPubPath(path) {
  return ACTIVITYPUB_PATH.test(path);
}

function port(value, label) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1 || result > 65535) throw new TypeError(`${label} must name a TCP port`);
  return result;
}

export function parseActivityPubRoutes(value = process.env.ACTIVITYPUB_PROVIDER_ROUTES) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError("ACTIVITYPUB_PROVIDER_ROUTES must bind every public actor to one provider target");
  const routes = new Map();
  for (const item of value.split(",")) {
    const local = /^([a-z0-9][a-z0-9._-]*):([0-9]+)$/u.exec(item);
    const remote = /^([a-z0-9][a-z0-9._-]*)=(https:\/\/[^,]+)$/u.exec(item);
    const actor = local?.[1] ?? remote?.[1];
    if (!actor || routes.has(actor)) throw new TypeError("ACTIVITYPUB_PROVIDER_ROUTES contains a malformed or duplicate actor binding");
    if (local) routes.set(actor, port(local[2], `ActivityPub provider for ${actor}`));
    else {
      const target = new URL(remote[2]);
      if (target.protocol !== "https:" || target.username !== "" || target.password !== "" || target.pathname !== "/" || target.search !== "" || target.hash !== "") {
        throw new TypeError(`ActivityPub provider for ${actor} must be an HTTPS origin without credentials, path, query, or fragment`);
      }
      routes.set(actor, target);
    }
  }
  return routes;
}

function actorIdentifier(value, colonyHost = DEFAULT_COLONY_HOST) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.hostname !== colonyHost) return null;
  return ACTOR_PATH.exec(url.pathname)?.[1] ?? null;
}

export function providerPortForUrl(url, {
  routes = parseActivityPubRoutes(),
  nodePort = port(process.env.ACTIVITYPUB_NODE_PROVIDER_PORT ?? "8794", "ACTIVITYPUB_NODE_PROVIDER_PORT"),
  objectPort = process.env.ACTIVITYPUB_OBJECT_PROVIDER_PORT === undefined
    ? undefined
    : port(process.env.ACTIVITYPUB_OBJECT_PROVIDER_PORT, "ACTIVITYPUB_OBJECT_PROVIDER_PORT"),
  colonyHost = process.env.BARE_CEDAR_FOG_ACTIVITYPUB_HOST ?? DEFAULT_COLONY_HOST,
} = {}) {
  if (url.hostname !== colonyHost) {
    throw new Error(`ActivityPub route is outside the ${colonyHost} colony territory`);
  }
  const actor = ACTOR_PATH.exec(url.pathname)?.[1];
  if (actor) {
    const selected = routes.get(actor);
    if (!selected) throw new Error(`no ActivityPub provider is contracted for actor ${actor}`);
    return selected;
  }
  if (url.pathname === "/.well-known/webfinger") {
    const resource = url.searchParams.get("resource") ?? "";
    const match = /^acct:([^@]+)@([^@]+)$/u.exec(resource);
    const selected = match?.[2] === colonyHost ? routes.get(match[1]) : null;
    if (!selected) throw new Error("WebFinger resource names no contracted ActivityPub actor");
    return selected;
  }
  if (["/.well-known/nodeinfo", "/nodeinfo/2.1"].includes(url.pathname)) return nodePort;
  if (url.pathname.startsWith("/activities/")) {
    if (objectPort === undefined) throw new Error("no ActivityPub object provider is contracted");
    return objectPort;
  }
  throw new Error(`ActivityPub route requires an exact actor: ${url.pathname}`);
}

export async function sharedInboxRoute(req, routes, colonyHost = process.env.BARE_CEDAR_FOG_ACTIVITYPUB_HOST ?? DEFAULT_COLONY_HOST) {
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAXIMUM_SHARED_INBOX_BYTES) throw new Error("shared ActivityPub inbox request exceeds the colony ingress bound");
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  let activity;
  try { activity = JSON.parse(body.toString("utf8")); } catch { throw new Error("shared ActivityPub inbox requires one JSON activity"); }
  const addressed = ["to", "cc"].flatMap((field) => Array.isArray(activity[field]) ? activity[field] : [activity[field]]);
  const recipients = [...new Set(addressed.map((value) => actorIdentifier(value, colonyHost)).filter(Boolean))];
  const targets = [...new Set(recipients.map((identifier) => routes.get(identifier)).filter(Boolean))];
  if (targets.length !== 1 || recipients.some((identifier) => !routes.has(identifier))) throw new Error("shared ActivityPub inbox requires recipients owned by exactly one contracted provider");
  return { body, target: targets[0], ...(typeof targets[0] === "number" ? { port: targets[0] } : {}) };
}

export async function proxyActivityPubRequest(ctx, options = {}) {
  const routes = options.routes ?? parseActivityPubRoutes();
  const routed = ctx.url.pathname === "/inbox"
    ? await sharedInboxRoute(ctx.req, routes)
    : { body: null, target: providerPortForUrl(ctx.url, {
        routes,
        nodePort: options.nodePort,
        objectPort: options.objectPort,
      }) };
  const headers = Object.fromEntries(Object.entries(ctx.req.headers).flatMap(([name, value]) => {
    if (HOP_BY_HOP.has(name) || value === undefined) return [];
    return [[name, value]];
  }));
  const publicOrigin = options.publicOrigin
    ?? process.env.ACTIVITYPUB_PUBLIC_ORIGIN
    ?? process.env.PUBLIC_BASE_URL
    ?? ctx.url.origin;
  const upstreamTarget = new URL(`${ctx.url.pathname}${ctx.url.search}`, publicOrigin);
  // Absolute-form preserves the public HTTPS target URI across this bounded
  // local reverse-proxy hop. That exact URI is covered by HTTP signatures.
  return new Promise((resolve, reject) => {
    const target = routed.target ?? routed.port;
    const remote = target instanceof URL;
    const upstream = (remote ? httpsRequest : httpRequest)({
      hostname: remote ? target.hostname : "127.0.0.1",
      port: remote ? (target.port || 443) : target,
      method: ctx.req.method,
      path: remote ? `${ctx.url.pathname}${ctx.url.search}` : upstreamTarget.href,
      headers: remote ? { ...headers, host: target.host } : headers,
      signal: ctx.signal,
    }, (response) => {
      const responseHeaders = Object.fromEntries(Object.entries(response.headers).flatMap(([name, value]) => {
        if (HOP_BY_HOP.has(name) || value === undefined) return [];
        return [[name, value]];
      }));
      const type = typeof response.headers["content-type"] === "string" ? response.headers["content-type"] : "application/octet-stream";
      resolve({ status: response.statusCode ?? 502, headers: responseHeaders, type, body: response });
    });
    upstream.once("error", reject);
    if (routed.body === null) ctx.req.pipe(upstream);
    else upstream.end(routed.body);
  });
}

export const activityPubProxyApp = { resources: [
  {
    match: "/inbox",
    route: "activitypub-provider-shared-inbox-boundary",
    methods: ["POST"],
    handler: (ctx) => proxyActivityPubRequest(ctx),
  },
  {
    match: (path) => path !== "/inbox" && isActivityPubPath(path),
    route: "activitypub-provider-boundary",
    methods: ["GET", "HEAD", "POST"],
    handler: (ctx) => proxyActivityPubRequest(ctx),
  },
] };
