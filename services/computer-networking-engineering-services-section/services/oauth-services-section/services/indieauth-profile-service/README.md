# IndieAuth profile service

`@red-cup-engineering/indieauth-profile-service` is what IndieAuth adds to the house's one OAuth authorization server:

- profile URLs as identities;
- clients identified by the URL of their metadata document;
- discovery of a person's authorization server;
- `rel=me`.

It follows the IndieAuth Living Standard and the OAuth Client ID Metadata Document draft.

## Discovery and validation

- `validateProfileUrl` and `validateClientId` implement IndieAuth's identifier constraints. `canonicalizeProfileInput` is the separate convenience for user input, which may add a scheme.
- `discoverIndieAuthProfile` fetches a profile and follows `rel=indieauth-metadata`. HTTP `Link` fields take precedence over HTML links. It validates the metadata issuer and falls back to the legacy endpoint relations.
- `resolveIndieAuthClient` accepts a custody lookup before network discovery, which loopback development clients need. It validates JSON Client ID Metadata Documents and accepts legacy HTML `rel=redirect_uri`. It never follows client-document redirects, and it limits body size.
- `validateIndieAuthRedirectUri` requires an exact registered redirect URI.
- `validateReturnedProfile` re-discovers a changed `me` URL and requires it to name the same authorization endpoint.
- `verifyReciprocalRelMe` checks that two profiles link to each other with `rel=me`. The result is evidence and is never authorization. `relMeObservation` records it as a SignGraph observation, and `indieAuthProfileLinkHeader` forms a profile's `Link` header.

Every operation that performs I/O takes an injected `fetchImpl`, and `admitFetch(url, context)` is consulted before each request. The default refuses credentials, non-HTTP schemes, IP literals and localhost. A deployment must inject a fetch that also refuses special-use addresses after DNS resolution and on every redirect.

## The IndieAuth server

`indieAuthApp(options)` is the OAuth section's `createAuthorizationServer` with the IndieAuth profile:

- the person is `profileUrl`: tokens carry `me`, and a request naming another `me` is refused;
- clients are resolved from their metadata documents;
- a code granted no scope identifies the person, and is redeemed by `POST /indieauth/authorize` for `{ me }`;
- the authorization and token endpoints are `/indieauth/authorize` and `/indieauth/token`, and the metadata is at `/.well-known/oauth-authorization-server`.

Signing in is the host's: `authenticate(ctx)` reads its session and `loginUrl(returnTo)` sends a visitor to sign in. Every authorization is confirmed on the server's consent page.

```js
const indieAuth = indieAuthApp({
  profileUrl: "https://person.example/",
  scopes: ["create", "update", "media"],
  authenticate, loginUrl, fetchImpl,
  store, // the authorization server's grant custody
});
indieAuth.app;                  // the resources to mount
indieAuth.verifyIndieAuthToken; // Micropub's and Microsub's verifyToken: { me, client_id, scope } or null
```

## The client flow, PKCE and self-contained tokens

- `./pkce` -- PKCE S256 (RFC 7636; the Appendix B vector is a test): `generateCodeVerifier`, `deriveS256Challenge`, `verifyS256Challenge`.
- `./client` -- IndieAuth 5 for a client: `createAuthorizationRequest(discovery, { clientId, redirectUri, scope })` builds the URL with a fresh `state` and PKCE pair; `verifyAuthorizationResponse` refuses an error, a foreign `state`, and a missing or foreign `iss` (RFC 9207); `redeemAuthorizationCode` redeems at the authorization endpoint (no scope: `{ me }`) or the token endpoint (scope: a token with `me`) and validates the returned profile.
- `./signed-token` -- an IndieAuth token with no store: HMAC-SHA-256 over self-contained claims (`mintSignedToken`, `verifySignedToken`, `signedTokenVerifier` for Micropub's `verifyToken`). Valid until expiry; there is no revocation without a store.

The server answers token introspection at `/indieauth/introspect` (IndieAuth 6): `{ active, me, client_id, scope, exp, iat }`, or only `{ active: false }`. Its caller must present a live Bearer token or authenticate as a confidential client.
