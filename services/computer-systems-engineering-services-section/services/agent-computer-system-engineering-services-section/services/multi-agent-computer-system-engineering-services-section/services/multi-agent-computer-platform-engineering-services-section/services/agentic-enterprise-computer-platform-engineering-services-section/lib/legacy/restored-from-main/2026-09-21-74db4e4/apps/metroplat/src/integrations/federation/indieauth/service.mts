
/**
 * integrations/federation/indieauth/service — the live IndieAuth `/authorize`, `/token`, and
 * server-metadata endpoints.
 *
 * A thin mount: request/grant/token grammar comes from
 * `codecs/text/indieauth`, bearer-token gating and `rel=me` classification
 * come from `admission/indieauth` (the live `rel=me` fetch itself from
 * `services/web/indieauth-client`). This module owns only the HTTP binding and
 * the default in-memory grant store; no IndieAuth wire law lives here.
 */
import type { IncomingMessage } from "node:http";
import { readFormBody } from "../../http/host-body-read.mts";
import {
  createAuthorizationGrant,
  indieAuthMetadata,
  mintIndieAuthToken,
  validateAuthorizationRequest,
  validateTokenExchange,
  type AuthorizationGrant,
  type AuthorizationRequest,
} from "./codec.mts";
import { authorizeBearerToken } from "./validation.mts";
import { verifyRelMe } from "./client.mts";
import type { Context, Resource } from "../../http/index.mts";

export interface IndieAuthGrantStore {
  readonly createCode: (request: AuthorizationRequest) => AuthorizationGrant | Promise<AuthorizationGrant>;
  readonly consumeCode: (code: string) => AuthorizationGrant | undefined | Promise<AuthorizationGrant | undefined>;
}

/** An in-process grant store: authorization codes are single-use and expire after `ttlSeconds`. */
export function inMemoryGrantStore(ttlSeconds = 600): IndieAuthGrantStore {
  const grants = new Map<string, AuthorizationGrant>();
  return {
    createCode: (request) => {
      const grant = createAuthorizationGrant(request, { ttlSeconds });
      grants.set(grant.code, grant);
      return grant;
    },
    consumeCode: (code) => {
      const grant = grants.get(code);
      grants.delete(code);
      return grant;
    },
  };
}

export interface IndieAuthServerOptions {
  readonly issuer: string;
  readonly secret: string;
  readonly store?: IndieAuthGrantStore;
  readonly fetch?: typeof fetch;
  readonly verifyRelMe?: boolean;
  readonly scopes?: readonly string[];
  readonly tokenTtlSeconds?: number;
  readonly paths?: {
    readonly authorization?: string;
    readonly token?: string;
    readonly metadata?: string;
  };
}

function jsonRepr(status: number, body: unknown) {
  return { status, type: "application/json; charset=utf-8", headers: { "cache-control": "no-store" }, body: `${JSON.stringify(body, null, 2)}\n` };
}

function req(ctx: Context): IncomingMessage {
  return ctx.req as IncomingMessage;
}

/** Build the `/authorize`, `/token`, and server-metadata Resources for a live IndieAuth server. */
export function indieAuthResources(opts: IndieAuthServerOptions): readonly Resource[] {
  const paths = {
    authorization: opts.paths?.authorization ?? "/indieauth/authorize",
    token: opts.paths?.token ?? "/indieauth/token",
    metadata: opts.paths?.metadata ?? "/.well-known/oauth-authorization-server",
  };
  const issuer = opts.issuer;
  const store = opts.store ?? inMemoryGrantStore();
  const metadata = indieAuthMetadata({
    issuer,
    authorizationEndpoint: new URL(paths.authorization, issuer).href,
    tokenEndpoint: new URL(paths.token, issuer).href,
    ...(opts.scopes === undefined ? {} : { scopes: opts.scopes }),
  });

  const metadataResource: Resource = Object.freeze({
    match: paths.metadata,
    route: paths.metadata,
    id: "metroplat.indieauth.metadata",
    name: "IndieAuth Server Metadata",
    methods: Object.freeze(["GET", "HEAD"]),
    produces: Object.freeze(["application/json"]),
    handler: () => jsonRepr(200, metadata),
  });

  const authorizationResource: Resource = Object.freeze({
    match: paths.authorization,
    route: paths.authorization,
    id: "metroplat.indieauth.authorization",
    name: "IndieAuth Authorization",
    methods: Object.freeze(["GET", "POST"]),
    produces: Object.freeze(["application/json"]),
    handler: async (ctx) => {
      try {
        const request = validateAuthorizationRequest(ctx.url.searchParams);
        if (req(ctx).method === "GET") return jsonRepr(200, { request });
        const auth = authorizeBearerToken(req(ctx).headers["authorization"], opts.secret);
        if (!auth.ok) return jsonRepr(auth.status, { error: auth.reason });
        if (opts.verifyRelMe) {
          const relMe = await verifyRelMe(request.me, request.clientId, opts.fetch === undefined ? {} : { fetch: opts.fetch });
          if (!relMe.verified) return jsonRepr(400, { error: relMe.reason ?? "rel=me verification failed", relMe });
        }
        const grant = await store.createCode(request);
        const redirect = new URL(grant.redirectUri);
        redirect.searchParams.set("code", grant.code);
        redirect.searchParams.set("me", grant.me);
        if (grant.state !== undefined) redirect.searchParams.set("state", grant.state);
        return jsonRepr(201, { code: grant.code, redirect: redirect.href });
      } catch (error) {
        return jsonRepr(400, { error: error instanceof Error ? error.message : String(error) });
      }
    },
  });

  const tokenResource: Resource = Object.freeze({
    match: paths.token,
    route: paths.token,
    id: "metroplat.indieauth.token",
    name: "IndieAuth Token",
    methods: Object.freeze(["POST"]),
    produces: Object.freeze(["application/json"]),
    handler: async (ctx) => {
      try {
        const form = (await readFormBody(req(ctx), { maxBytes: 64_000 })).value;
        const code = form.get("code") ?? "";
        const grant = await store.consumeCode(code);
        if (grant === undefined) return jsonRepr(400, { error: "invalid authorization code" });
        validateTokenExchange(form, grant);
        const token = mintIndieAuthToken(
          { me: grant.me, clientId: grant.clientId, scope: grant.scope, ...(opts.tokenTtlSeconds === undefined ? {} : { expiresIn: opts.tokenTtlSeconds }) },
          opts.secret,
        );
        return jsonRepr(200, {
          access_token: token,
          token_type: "Bearer",
          me: grant.me,
          ...(grant.scope.length > 0 ? { scope: grant.scope.join(" ") } : {}),
          ...(opts.tokenTtlSeconds === undefined ? {} : { expires_in: opts.tokenTtlSeconds }),
        });
      } catch (error) {
        return jsonRepr(400, { error: error instanceof Error ? error.message : String(error) });
      }
    },
  });

  return Object.freeze([metadataResource, authorizationResource, tokenResource]);
}
