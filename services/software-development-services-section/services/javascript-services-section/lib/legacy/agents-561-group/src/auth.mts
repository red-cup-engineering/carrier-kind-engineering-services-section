/**
 * auth — the multi-user Google-OAuth gate for agents.561.group.
 *
 * This is the SAME ecosystem authorization server the single-operator surfaces
 * use (`@red-cup-engineering/organizing-with-the-web/oauth-google`), but admitting MANY users
 * instead of one: every verified Google account is admitted by default, or a
 * bounded allowlist via `OAUTH_ALLOWED_EMAILS`. The verified email is the user's
 * stable identity, and that identity is what keys each character's discrete
 * per-user memory.
 *
 * It exposes:
 *   • `app`        — the ungated `/oauth/*` transport + the well-known metadata a
 *                    client (a browser, ChatGPT, Claude) probes to learn where to
 *                    authorize. This is what makes a character's MCP endpoint
 *                    connectable from an external agent platform.
 *   • `identify`   — resolve the bearer on a request to a user email (or none).
 *   • `verify`     — the predicate createMcpApp wants for its McpAuth.
 *   • `guard`      — wrap an App so every handler requires an admitted bearer and
 *                    sees the caller's email on `ctx.locals.email`.
 */

import crypto from "node:crypto";

import {
  OAuthServer,
  oauthApp,
  oauthConfigFromEnv,
  authorizationServerMetadata,
  protectedResourceMetadata,
} from "@red-cup-engineering/organizing-with-the-web/oauth-google";
import { authorizeBearer } from "@red-cup-engineering/organizing-with-the-web/sync-guard";
import { jsonRepr, type App, type Context, type Handler, type Repr } from "@red-cup-engineering/http-server";

export interface AgentsAuth {
  readonly oauth: OAuthServer;
  readonly publicBaseUrl: string;
  /** RFC 9728 protected-resource metadata URL (the challenge pointer). */
  readonly resourceMetadataUrl: string;
  /** The ungated OAuth transport + well-known metadata. */
  readonly app: App;
  /** Resolve the request's bearer to an admitted user email, or undefined. */
  identify(ctx: Context): string | undefined;
  /** Whether a bearer string is a token this server issued (for MCP auth). */
  verify(token: string): boolean;
  /** Wrap an App so every handler requires an admitted bearer; the caller's
   *  email is placed on `ctx.locals.email`. */
  guard(app: App): App;
}

/** Build the multi-user auth surface. State (clients, tokens) persists under
 *  `stateDir`. Credentials come from the environment (`GOOGLE_CLIENT_ID`,
 *  `GOOGLE_CLIENT_SECRET`); admission from `OAUTH_ALLOWED_EMAILS` (a comma list)
 *  or — when unset — any verified Google account. */
export function loadAuth(parts: { publicBaseUrl: string; stateDir: string }): AgentsAuth {
  const publicBaseUrl = parts.publicBaseUrl.replace(/\/$/, "");
  const oauth = new OAuthServer(
    oauthConfigFromEnv({ publicBaseUrl, stateDir: parts.stateDir }),
  );
  const resourceMetadataUrl = `${publicBaseUrl}/.well-known/oauth-protected-resource`;

  const policy = (token: string): string | undefined => oauth.validateToken(token)?.email;
  const verify = (token: string): boolean => oauth.validateToken(token) !== null;

  const identify = (ctx: Context): string | undefined => {
    const header = ctx.req.headers.authorization;
    const raw = Array.isArray(header) ? header[0] : header;
    const match = raw?.match(/^Bearer\s+(.+)$/i);
    return match ? oauth.validateToken(match[1]!)?.email : undefined;
  };

  const challenge = `Bearer realm="agents.561.group", resource_metadata="${resourceMetadataUrl}"`;

  const guardHandler = (inner: Handler): Handler => async (ctx: Context) => {
    const decision = authorizeBearer(ctx.req.headers, policy);
    if (!decision.ok) {
      const repr = jsonRepr(
        { error: decision.status === 401 ? "unauthorized" : "forbidden", reason: decision.reason ?? "bearer token required", authorize: `${publicBaseUrl}/` },
        decision.status,
      );
      return { ...repr, headers: { ...(repr.headers ?? {}), "www-authenticate": challenge } } satisfies Repr;
    }
    ctx.locals["email"] = decision.token ? oauth.validateToken(decision.token)?.email : undefined;
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
        // A single protected-resource document covers the whole surface (the
        // /v1 API and every /c/<id>/mcp endpoint share one authorization server).
        match: "/.well-known/oauth-protected-resource",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(protectedResourceMetadata(publicBaseUrl, publicBaseUrl)),
      },
    ],
  };

  const app: App = { resources: [...(endpoints.resources ?? []), ...(wellKnown.resources ?? [])] };

  return { oauth, publicBaseUrl, resourceMetadataUrl, app, identify, verify, guard };
}

/** Compute an S256 PKCE pair for the first-party browser login flow. */
export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier, "ascii").digest("base64url");
  return { verifier, challenge };
}
