// mcp-gate-auth — the OAuth gate for the infography MCP surface proxied
// through ops.561.group.
//
// This is not a new auth scheme. It is the ecosystem's existing Google-IdP
// authorization server (`@emsenn/computing-with-the-web/oauth-google`),
// confined to a single allowed email (the operator), wired exactly as
// aagaard.561.group and research.561.group already wire it: the `/oauth/*`
// endpoints (dynamic client registration, the Google redirect, callback,
// token exchange/refresh, revoke) and the RFC 8414 / RFC 9728 well-known
// metadata a client (ChatGPT) probes to discover where to authorize.
//
// `guard(app)` wraps every resource handler of a protected App so it answers
// only to a bearer token this server issued to the allowed email; everything
// else gets a 401 with the RFC 9728 `resource_metadata` challenge.

import process from "node:process";

import {
  OAuthServer,
  oauthApp,
  oauthConfigFromEnv,
  authorizationServerMetadata,
  protectedResourceMetadata,
} from "@emsenn/computing-with-the-web/oauth-google";
import { authorizeBearer } from "@emsenn/computing-with-the-web/sync-guard";
import { jsonRepr, type App, type Context, type Handler, type Repr } from "@emsenn/http-server";

/** The operator this gate answers to. Overridable via env for a different
 *  deployer, but the single-allowed-email confinement is the whole point. */
const DEFAULT_ALLOWED_EMAIL = "morgan.sennhauser@gmail.com";

export interface McpGateAuth {
  readonly oauth: OAuthServer;
  readonly allowedEmail: string;
  readonly publicBaseUrl: string;
  /** The OAuth authorization-server endpoints + well-known metadata (UNGATED). */
  readonly app: App;
  /** Wrap a protected App so every handler requires a bearer token this
   *  server issued to the allowed email. */
  guard(app: App): App;
}

/** Build the auth surface for one deployment. State (clients, tokens)
 *  persists under `${stateDir}`. Credentials come from the environment
 *  (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — reused as-is from the prior
 *  ops.561.group deployment, already registered for this domain's callback);
 *  the allowed email from `OPS_MCP_ALLOWED_EMAIL` (default: the operator). */
export function loadMcpGateAuth(parts: {
  publicBaseUrl: string;
  stateDir: string;
  env?: Record<string, string | undefined>;
}): McpGateAuth {
  const env = parts.env ?? process.env;
  const allowedEmail = env["OPS_MCP_ALLOWED_EMAIL"] ?? DEFAULT_ALLOWED_EMAIL;
  const publicBaseUrl = parts.publicBaseUrl.replace(/\/$/, "");
  const oauth = new OAuthServer(
    oauthConfigFromEnv({ publicBaseUrl, allowedEmail, stateDir: parts.stateDir, env }),
  );

  const policy = (token: string): string | undefined => {
    const claims = oauth.validateToken(token);
    return claims && claims.email === allowedEmail ? claims.email : undefined;
  };

  const challenge = `Bearer realm="ops-mcp", resource_metadata="${publicBaseUrl}/.well-known/oauth-protected-resource"`;

  const guardHandler = (inner: Handler): Handler => async (ctx: Context) => {
    const decision = authorizeBearer(ctx.req.headers, policy);
    if (!decision.ok) {
      const repr = jsonRepr(
        { error: decision.status === 401 ? "unauthorized" : "forbidden", reason: decision.reason ?? "bearer token required" },
        decision.status,
      );
      return { ...repr, headers: { ...(repr.headers ?? {}), "www-authenticate": challenge } } satisfies Repr;
    }
    return inner(ctx);
  };

  const guard = (app: App): App => ({
    ...app,
    resources: (app.resources ?? []).map((r) => ({ ...r, handler: guardHandler(r.handler) })),
  });

  const endpoints = oauthApp(oauth);
  const wellKnown: App = {
    resources: [
      {
        match: "/.well-known/oauth-authorization-server",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(authorizationServerMetadata(oauth)),
      },
      {
        match: "/.well-known/oauth-protected-resource",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(protectedResourceMetadata(`${publicBaseUrl}/mcp`, publicBaseUrl)),
      },
    ],
  };

  const app: App = {
    resources: [...(endpoints.resources ?? []), ...(wellKnown.resources ?? [])],
  };

  return { oauth, allowedEmail, publicBaseUrl, app, guard };
}
