
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

import { readFormBody } from "@red-cup-engineering/computer-web-server/platform-http/host-body-read";
import {
  createAuthorizationGrant,
  indieAuthMetadata,
  mintIndieAuthToken,
  validateAuthorizationRequest,
  validateTokenExchange,

} from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/indieauth/codec";
import { authorizeBearerToken } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/indieauth/validation";
import { verifyRelMe } from "@red-cup-engineering/computer-networking-engineering-services-section/indieweb/indieauth/client";

/** An in-process grant store: authorization codes are single-use and expire after `ttlSeconds`.
 *  `createCode`'s second and third arguments are the issuing instant (ISO date-time) and a fresh
 *  random authorization code the caller has already read/generated at the kernel edge (e.g.
 *  `randomBase64Url(32)` from the sibling `../../../lib/codecs/javascript/crypto/generate-random.mjs`). */
export function inMemoryGrantStore(ttlSeconds = 600) {
  const grants = new Map();
  return {
    createCode: (request, issuedAt, code) => {
      const grant = createAuthorizationGrant(request, { ttlSeconds, issuedAt, code });
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

function jsonRepr(status, body) {
  return { status, type: "application/json; charset=utf-8", headers: { "cache-control": "no-store" }, body: `${JSON.stringify(body, null, 2)}\n` };
}

function req(ctx) {
  return ctx.req;
}

/** Build the `/authorize`, `/token`, and server-metadata Resources for a live IndieAuth server.
 *  `opts.now` (a clock, `() => epoch ms`) and `opts.randomCode` (`() => a fresh random string`)
 *  are the effects this otherwise-pure wiring needs from its caller at the kernel edge. */
export function indieAuthResources(opts) {
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

  const metadataResource = Object.freeze({
    match: paths.metadata,
    route: paths.metadata,
    id: "metroplat.indieauth.metadata",
    name: "IndieAuth Server Metadata",
    methods: Object.freeze(["GET", "HEAD"]),
    produces: Object.freeze(["application/json"]),
    handler: () => jsonRepr(200, metadata),
  });

  const authorizationResource = Object.freeze({
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
        const auth = authorizeBearerToken(req(ctx).headers["authorization"], opts.secret, { now: opts.now() });
        if (!auth.ok) return jsonRepr(auth.status, { error: auth.reason });
        if (opts.verifyRelMe) {
          const relMe = await verifyRelMe(request.me, request.clientId, opts.fetch === undefined ? {} : { fetch: opts.fetch });
          if (!relMe.verified) return jsonRepr(400, { error: relMe.reason ?? "rel=me verification failed", relMe });
        }
        const grant = await store.createCode(request, new Date(opts.now()).toISOString(), opts.randomCode());
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

  const tokenResource = Object.freeze({
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
        validateTokenExchange(form, grant, opts.now());
        const token = mintIndieAuthToken(
          { me: grant.me, clientId: grant.clientId, scope: grant.scope, now: opts.now(), ...(opts.tokenTtlSeconds === undefined ? {} : { expiresIn: opts.tokenTtlSeconds }) },
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
