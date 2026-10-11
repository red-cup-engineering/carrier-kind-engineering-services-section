import { join } from "node:path";
import { SETTLEMENT_EXCHANGE_PATHS } from "@red-cup-engineering/computer-system-engine/rpc/node";
import { mergeApps } from "@red-cup-engineering/computer-web-server/compose";
import { SIGN_IN_PATH, createWebAdmissionApplication, defaultPublicRoute } from "@red-cup-engineering/computer-web-server/admission/application";
import { createPrincipalRegistry } from "@red-cup-engineering/computer-web-server/admission/principals";
import { activityPubApplication } from "@red-cup-engineering/activitypub-services-section/app";
import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { toWebRequest } from "@red-cup-engineering/http-services-section/web-bridge";
import { mcpToolValue } from "@red-cup-engineering/mcp-engineering-services-section/client";
import { mcpResource } from "@red-cup-engineering/mcp-engineering-services-section/http";
import { createAuthorizationServer, createJsonFileGrantStore } from "@red-cup-engineering/oauth-services-section/authorization-server";

const GOOGLE_CALLBACK_PATH = "/oauth/google/callback";
const SELF_ADMITTING = new Set(["/mcp", "/oauth/authorize", "/oauth/token", "/oauth/register", "/oauth/revoke", "/healthz"]);
const METROPLAT_READ_TIMEOUT_MS = 30_000;
const EXACT_MATCH = /^\/[^:*{}()?]*$/u;
const HOSTNAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/u;

// The Host a request named. Behind a configured base the context URL carries the instance's own
// origin, so a hosted application is chosen from the header, never from that URL.
const firstHeader = (value) => (Array.isArray(value) ? value[0] : value);
const requestHost = (ctx) => String(ctx.request?.headers.get("host") ?? firstHeader(ctx.req?.headers?.host) ?? ctx.url.host)
  .toLowerCase().replace(/:\d+$/u, "");
const forwardedProto = (ctx) => String(ctx.request?.headers.get("x-forwarded-proto") ?? firstHeader(ctx.req?.headers?.["x-forwarded-proto"]) ?? "")
  .split(",")[0].trim().toLowerCase();

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Admit one hosted application at install. Hosting bypasses the instance's admission, so it is
 * granted only as the deployment declares it: the hosts come from the application entry's
 * configuration (never from the application, never at runtime), the application must be able to
 * answer each, and it must declare how it authenticates. `authentication: "none"` makes it
 * read-only and the entrance refuses every state-changing method; otherwise it names the scheme
 * that guards its own state changes. An application that declares neither is refused. */
function admitHosted(entry, supplied, ownHost, hosted) {
  const declared = entry?.configuration?.hosts;
  if (!Array.isArray(declared) || declared.length === 0) throw new TypeError("a hosted application's hosts are declared in its deployment configuration (configuration.hosts)");
  if (typeof supplied.fetch !== "function" || !Array.isArray(supplied.hosts)) throw new TypeError("a hosted MetroPlat application names the hosts it answers and supplies fetch");
  const { authentication } = supplied;
  const readOnly = authentication === "none";
  if (!readOnly && !(authentication !== null && typeof authentication === "object" && typeof authentication.scheme === "string" && authentication.scheme.length > 0)) {
    throw new TypeError("a hosted application declares its authentication: a scheme guarding its state changes, or \"none\" to be read-only");
  }
  for (const host of declared) {
    if (typeof host !== "string" || !HOSTNAME.test(host)) throw new TypeError(`a hosted application names a lowercase hostname, not ${String(host)}`);
    if (host === ownHost) throw new TypeError(`${host} is this instance's own host`);
    if (hosted.has(host)) throw new TypeError(`${host} is named by two hosted applications`);
    if (!supplied.hosts.includes(host)) throw new TypeError(`the hosted application does not answer for ${host}`);
    hosted.set(host, Object.freeze({ fetch: supplied.fetch, readOnly }));
  }
}

/** Hosted applications answer every request whose Host the deployment declared for them, ahead of
 * the instance's own admission and routes: an application with its own principals and paths (an
 * app at its own hostname) shares the listener without sharing MetroPlat's sign-in or path space.
 * They skip the router, not the journal: the request is traced, and the instance's response hooks
 * see it, as for any other request. */
function hostedApplications(hosted, base) {
  if (hosted.size === 0) return {};
  const origin = new URL(base);
  return {
    onRequest: (ctx) => {
      const host = requestHost(ctx);
      const target = hosted.get(host);
      if (target === undefined) return undefined;
      const method = (ctx.request?.method ?? ctx.req?.method ?? "GET").toUpperCase();
      if (target.readOnly && !SAFE_METHODS.has(method)) {
        return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD, OPTIONS", "cache-control": "no-store" } });
      }
      const proto = ["http", "https"].includes(forwardedProto(ctx)) ? forwardedProto(ctx) : origin.protocol.slice(0, -1);
      const url = new URL(`${ctx.url.pathname}${ctx.url.search}`, `${proto}://${host}`);
      const request = ctx.request !== undefined ? new Request(url, ctx.request) : toWebRequest(ctx.req, { url, signal: ctx.signal });
      return target.fetch(request, { remoteAddress: ctx.remoteAddress ?? ctx.req?.socket?.remoteAddress });
    },
  };
}

export const enterprisePublicRoute = (path, method) =>
  SELF_ADMITTING.has(path) || (path === GOOGLE_CALLBACK_PATH && method === "GET")
  || path.startsWith("/.well-known/")
  || path.startsWith("/actors/") || path === "/inbox" || path === "/nodeinfo/2.1"
  || (method === "POST" && SETTLEMENT_EXCHANGE_PATHS.includes(path))
  || defaultPublicRoute(path, method);

const withinTimeout = (promise, what) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(
    () => reject(new Error(`${what} did not answer within ${METROPLAT_READ_TIMEOUT_MS / 1000} s`)),
    METROPLAT_READ_TIMEOUT_MS,
  ).unref()),
]);

/** Assemble a MetroPlat instance's common web entrance from its identity,
 * admission settings, installed application surfaces, and federated peers.
 * Applications supply domain resources; they do not reimplement admission,
 * token issuance, MCP transport, or ActivityPub mounting. A resource an
 * application declares public ({public: true}, at one exact path) is read
 * without a principal: the application that serves it decides what a visitor
 * may see, and the entrance admits it on that word, for reads only. */
export function createEnterpriseEntrance(config, {
  federation, tools = [], activityPubProvider, applications = [], rootRoutes = [],
  publicRoute = enterprisePublicRoute, sessionCookiePrefix = "metroplat", calls, resolveGitHubReceivingBinding, grantStoreProfile,
} = {}) {
  const base = config.publicBaseUrl;
  const resource = `${base}/mcp`;
  const grantStore = createJsonFileGrantStore(join(config.stateDir, "oauth"), { profile: grantStoreProfile });
  if (grantStoreProfile !== undefined && grantStore.profile !== grantStoreProfile) throw new TypeError("requested OAuth grant custody profile is unavailable");
  const registry = createPrincipalRegistry({ stateDir: config.stateDir, allowedEmail: config.allowedEmail });
  const readerAccess = [];
  const emailOf = principal => principal?.email ?? principal?.principal?.email;
  const enterprisePrincipal = principal => !emailOf(principal) || registry.isEmailAdmitted(emailOf(principal));
  const readerRules = principal => readerAccess.filter(rule=>rule.admitEmail(emailOf(principal)));
  let authorization;
  const declaredPublic = new Set();
  const admitted = (path, method) => publicRoute(path, method)
    || ((method === "GET" || method === "HEAD") && declaredPublic.has(path));
  const admission = createWebAdmissionApplication({
    realm: config.instance.name,
    title: config.instance.title ?? config.instance.name,
    providers: {
      ...(config.google === undefined ? {} : { google: {
        clientId: config.google.clientId, clientSecret: config.google.clientSecret,
        sessionSecret: config.sessionSecret, admitEmail: email=>registry.isEmailAdmitted(email) || readerAccess.some(rule=>rule.admitEmail(email)),
        publicBaseUrl: base, sessionCookie: `${sessionCookiePrefix}_session`, transactionCookie: `${sessionCookiePrefix}_google`,
        callbackPath: GOOGLE_CALLBACK_PATH,
      } }),
      password: {
        sessionSecret: config.sessionSecret, registry, publicBaseUrl: base,
        sessionCookie: `${sessionCookiePrefix}_password_session`,
      },
      hive: {
        sessionSecret: config.sessionSecret, stateDir: config.stateDir,
        appName: config.instance.name, registry, sessionCookie: `${sessionCookiePrefix}_hive_session`,
      },
    },
    publicRoute: admitted,
    authorize: (principal,path,method) => enterprisePrincipal(principal) || admitted(path,method)
      || path === '/mcp' || readerRules(principal).some(rule=>rule.allowsRequest(path,method)),
    verifyBearer: async (token) => {
      const claims = await authorization.verifyToken(token);
      return claims === undefined ? null : {
        subjectHash: claims.subject, label: claims.principal?.name ?? claims.subject,
        ...(claims.principal?.email === undefined ? {} : {email:claims.principal.email}),
      };
    },
    ...(calls === undefined ? {} : { calls }),
  });
  authorization = createAuthorizationServer({
    issuer: base,
    name: config.instance.name,
    resources: [resource],
    store: grantStore,
    authenticate: async (context) => {
      const principal = await admission.identifyContext(context);
      if (principal === null || principal.provider === "bearer") return undefined;
      return {
        subject: `${principal.provider}:${principal.subjectHash}`,
        name: principal.label,
        ...(principal.email === undefined ? {} : { email: principal.email }),
      };
    },
    loginUrl: (returnTo) => `${SIGN_IN_PATH}?return_to=${encodeURIComponent(returnTo)}`,
    // A connector must show which account it will use, including after a prior consent.
    confirmExternalAccount: true,
    switchAccount: (context, returnTo) => admission.switchAccount(context, returnTo),
  });
  const metroplat = federation.clients.get("metroplat");
  let metroplatTools;
  // One call of an installed MetroPlat tool, as `subject` or as the host itself (no subject).
  const callMetroplat = async (subject, name, input) => {
    if (metroplat === undefined) throw new Error("MetroPlat is not federated");
    // Follow the installed MCP face. Schema-less operation inputs travel in
    // {input}; passing their fields as arguments silently discarded every
    // board filter and made summary listings look like complete threads.
    metroplatTools ??= (async () => {
      const tools = new Map();
      let cursor;
      do {
        const page = await metroplat.listTools(cursor === undefined ? {} : { cursor });
        for (const tool of page.tools) tools.set(tool.name, tool);
        cursor = page.nextCursor;
      } while (cursor !== undefined);
      return tools;
    })().catch(error => { metroplatTools = undefined; throw error; });
    const descriptor = (await metroplatTools).get(name);
    if (descriptor === undefined) throw new TypeError(`MetroPlat has no installed tool ${name}`);
    const schema = descriptor.inputSchema;
    const wrapped = schema?.required?.includes("input") && Object.keys(schema.properties ?? {}).length === 1 && schema.properties.input !== undefined;
    return mcpToolValue(name, await metroplat.callTool({
      name, arguments: wrapped ? { input } : input, ...(subject === undefined ? {} : { _meta: { "metroplat/subject": subject } }),
    }));
  };
  const run = (name, input) => withinTimeout(callMetroplat(undefined, name, input), `MetroPlat ${name}`);
  const runAs = (subject, name, input) => callMetroplat(subject, name, input);
  const health = { resources: [{
    id: "metroplat.health", match: "/healthz", methods: ["GET"],
    produces: ["application/json"],
    handler: () => jsonRepr({
      ok: true, service: config.instance.name, resource,
      tools: federation.tools.length, unavailable: federation.unavailable,
    }, { cacheControl: { noStore: true } }),
  }] };
  const context = Object.freeze({ config, run, runAs, registry, admission, authorization,
    ...(resolveGitHubReceivingBinding === undefined ? {} : { resolveGitHubReceivingBinding }) });
  const selected = typeof applications === "function" ? applications(context) : applications;
  if (!Array.isArray(selected)) throw new TypeError("MetroPlat applications must provide an array");
  const installedApps = [];
  const hosted = new Map();
  const ownHost = new URL(base).hostname;
  const installedTools = [...tools];
  const installedRoutes = [...rootRoutes];
  for (const entry of selected) {
    const supplied = typeof entry?.factory === "function"
      ? entry.factory({ ...context, configuration: entry.configuration }) : entry;
    if (supplied === null || typeof supplied !== "object" || supplied.then) {
      throw new TypeError("MetroPlat application factory must synchronously provide its surfaces");
    }
    if (supplied.readerAccess) readerAccess.push(supplied.readerAccess);
    if (supplied.hosts !== undefined) {
      admitHosted(entry, supplied, ownHost, hosted);
      continue;
    }
    if (Array.isArray(supplied.applications)) {
      installedApps.push(...supplied.applications);
      installedTools.push(...(supplied.tools ?? []));
      installedRoutes.push(...(supplied.rootRoutes ?? []));
    } else {
      installedApps.push(supplied);
    }
  }
  for (const route of [...installedRoutes, ...installedApps.flatMap((installed) => installed.resources ?? [])]) {
    if (route?.public !== true) continue;
    if (typeof route.match !== "string" || !EXACT_MATCH.test(route.match)) {
      throw new TypeError(`a public resource is one exact path, not ${String(route.match)}`);
    }
    declaredPublic.add(route.match);
  }
  const scopedTool = tool => ({...tool,
    visible: meta => (enterprisePrincipal(meta.principal) || readerRules(meta.principal).some(rule=>rule.allowsTool(tool.name)))
      && (!tool.visible || tool.visible(meta) === true),
    handler: (input,meta) => {
      if (!enterprisePrincipal(meta.principal) && !readerRules(meta.principal).some(rule=>rule.allowsTool(tool.name))) throw new Error('Tool access not authorized');
      return tool.handler(input,meta);
    },
  });
  const mcp = mcpResource({
    name: config.instance.name, title: config.instance.title, version: "1.0.0",
    instructions: config.instance.instructions,
    tools: installedTools.map(scopedTool),
    toolSources: [{
      *[Symbol.iterator]() {for (const tool of federation.tools) yield scopedTool(tool);},
      ...(typeof federation.tools.subscribe === 'function' ? {subscribe:callback=>federation.tools.subscribe(callback)} : {}),
    }],
    realm: config.instance.name,
    resourceMetadataUrl: `${base}/.well-known/oauth-protected-resource/mcp`,
    verifyToken: (token) => authorization.verifyToken(token, { resource }),
  });
  const app = mergeApps(
    hostedApplications(hosted, base),
    admission, authorization.app, health, { resources: [mcp] },
    ...(activityPubProvider === undefined ? [] : [activityPubApplication(activityPubProvider)]),
    { resources: installedRoutes },
    ...installedApps,
  );
  return Object.freeze({ app, admission, authorization, registry });
}
