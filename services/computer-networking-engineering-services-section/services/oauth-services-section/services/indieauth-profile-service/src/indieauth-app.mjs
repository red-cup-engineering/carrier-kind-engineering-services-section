// IndieAuth as a profile of the house's one authorization server: the person is a profile URL
// (`me`), clients are identified by the URL of their metadata document (discovered here, with
// legacy HTML redirect links), a code granted no scope is redeemed at the authorization endpoint
// for `{ me }`, and tokens carry `me` beside their scope.

import { createAuthorizationServer } from "@red-cup-engineering/oauth-services-section/authorization-server";
import { resolveIndieAuthClient, validateProfileUrl } from "./indieauth-profile.mjs";

/**
 * The IndieAuth server of one profile.
 *
 * @param {{
 *   profileUrl: string,
 *   issuer?: string,
 *   scopes?: string[],
 *   authenticate: (ctx: object) => object | undefined | Promise<object | undefined>,
 *   loginUrl: (returnTo: string) => string,
 *   store?: object,
 *   paths?: object,
 *   fetchImpl?: typeof fetch, admitFetch?: Function, clientCustody?: object, maxClientBytes?: number,
 * }} options
 * @returns The authorization server (its `app`, `verifyToken`, metadata) and `verifyToken`'s IndieAuth claims.
 */
export function indieAuthApp(options) {
  const profile = validateProfileUrl(options?.profileUrl);
  if (!profile.valid) throw new TypeError(`profileUrl is invalid: ${profile.reason}`);
  const clientIo = {
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    ...(options.admitFetch === undefined ? {} : { admitFetch: options.admitFetch }),
    ...(options.clientCustody === undefined ? {} : { custody: options.clientCustody }),
    ...(options.maxClientBytes === undefined ? {} : { maxClientBytes: options.maxClientBytes }),
  };
  const server = createAuthorizationServer({
    issuer: options.issuer ?? new URL("/", profile.url).href,
    name: new URL(profile.url).host,
    scopes: options.scopes ?? [],
    authenticate: options.authenticate,
    loginUrl: options.loginUrl,
    ...(options.store === undefined ? {} : { store: options.store }),
    paths: { authorize: "/indieauth/authorize", token: "/indieauth/token", ...(options.paths ?? {}) },
    me: () => profile.url,
    resolveUrlClient: async (clientId) => {
      const client = await resolveIndieAuthClient(clientId, clientIo);
      return { client_id: client.clientId, redirect_uris: [...client.redirectUris], ...(client.clientName ? { client_name: client.clientName } : {}) };
    },
  });
  return Object.freeze({
    ...server,
    resources: server.app.resources,
    /** A resource server's check of this profile's tokens: `{ me, client_id, scope }` or null (Micropub's and Microsub's `verifyToken`). */
    verifyIndieAuthToken: async (token) => {
      const claims = await server.verifyToken(token);
      return claims === undefined ? null : Object.freeze({ me: claims.me, client_id: claims.client_id, scope: claims.scope });
    },
  });
}
