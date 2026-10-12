# IndieAuth profile service

`@red-cup-engineering/indieauth-profile-service` supplies the web-facing
identity and discovery boundary that IndieAuth adds around OAuth 2.0. It does
not mint, encrypt, sign, persist, or validate bearer tokens.

The package revives the useful URL, HTML-link, endpoint, client-document, and
`rel=me` work from the legacy `computing-with-the-web/src/indieauth` module,
updated for the IndieAuth Living Standard and the July 2026 OAuth Client ID
Metadata Document draft. HTTP Link parsing and OAuth server metadata formation
are delegated to existing Red Cup services.

## Boundaries

- `validateProfileUrl` and `validateClientId` implement IndieAuth identifier
  constraints. `canonicalizeProfileInput` is the separate user-input
  convenience that may add a scheme.
- `discoverIndieAuthProfile` fetches a profile, gives HTTP `Link` fields
  precedence over HTML links, follows `rel=indieauth-metadata`, validates the
  metadata issuer, and supports legacy endpoint relations as fallback.
- `resolveIndieAuthClient` accepts a custody lookup before network discovery,
  validates JSON Client ID Metadata Documents, supports legacy HTML
  `rel=redirect_uri`, does not follow client-document redirects, limits body
  size, and returns an `oauthClient` record accepted by
  `@red-cup-engineering/mint-authorization-request-service`.
- `validateIndieAuthRedirectUri` requires an exact registered redirect URI.
- `validateReturnedProfile` re-discovers a changed `me` URL and requires it to
  name the same authorization endpoint.
- `verifyReciprocalRelMe` tests a bilateral social/profile claim. This is
  deliberately separate: reciprocal `rel=me` is useful evidence, but it is
  not OAuth client registration and never authorizes a redirect URI.
- `indieAuthAuthorizationServerMetadata` profiles the existing OAuth metadata
  service rather than maintaining another metadata implementation.

## Explicit network and custody seams

Every operation that performs I/O requires an injected `fetchImpl`; there is
no ambient global-fetch fallback. `admitFetch(url, context)` is called before
each request. The default rejects credentials, non-HTTP schemes, IP literals,
and localhost names. Production server deployments must inject a fetch
implementation that also rejects special-use addresses *after DNS resolution*
and on every redirect hop.

Client resolution can first consult an injected custody interface:

```js
const result = await resolveIndieAuthClient(clientId, {
  custody: { get: async (id) => preregisteredClients.get(id) },
  fetchImpl,
  admitFetch,
});
```

This is required for loopback development clients, which an authorization
server must not fetch remotely. Returned and fetched metadata is validated by
the same boundary.

## OAuth composition

```js
const resolved = await resolveIndieAuthClient(clientId, io);
validateIndieAuthRedirectUri(resolved, redirectUri);

const pending = mintAuthorizationRequest({
  client: resolved.oauthClient,
  redirectUri,
  codeChallenge,
  codeChallengeMethod: "S256",
  state,
});
```

Persist `pending.record` together with the `me` URL and approved
scopes in the application's custody service. Redeem its one-use code with the
active OAuth authorization-code/token service and let that service own random
token generation and PKCE verification. This package intentionally contains
no alternate token cryptography.

VICTOR needs no special implementation: a site profile/projector publishes a
`rel=indieauth-metadata` link and the composed HTTP application mounts this
service alongside the existing OAuth authorization, token, and metadata
resources.

## Current HTTP App

`indieAuthApp(options)` returns a current
`@red-cup-engineering/http-server-application-contract-service` App with three
mountable resources:

- `GET /indieauth/authorize` resolves and validates the client, delegates the
  actual login/consent decision to `authorization.authorize`, asks code custody
  to issue an opaque one-use code, and returns `code`, unchanged `state`, and
  `iss` to the exact registered redirect URI;
- `POST /indieauth/authorize` redeems an authentication-only code for `{ me }`;
- `POST /indieauth/token` redeems a scoped code through the active OAuth
  redemption/PKCE/token primitive, atomically consumes code custody, translates
  its legacy principal slot into an IndieAuth `{ me, scope }` token record, and
  hands the bearer token to injected token custody; and
- `GET/HEAD /.well-known/oauth-authorization-server` serves the profiled
  metadata document.

The adapter does not supply a login UI, decide consent, or persist anything.
Those are deliberately required ports:

```js
const app = indieAuthApp({
  profileUrl: "https://person.example/",
  issuer: "https://auth.example/",
  fetchImpl,
  authorization: { authorize },
  clientCustody,
  codes: { issue, get, consume }, // consume must be atomic
  tokens: { put },
});
```

The code lifetime comes from the active OAuth authorization primitive (ten
minutes); active redemption enforces client ID, exact redirect URI, expiry, and
S256 PKCE. Refresh-token publication is intentionally not enabled by this thin
profile because the injected token custody contract currently covers access
tokens only.

## References

- IndieAuth Living Standard, 11 July 2024: <https://indieauth.spec.indieweb.org/>
- OAuth Client ID Metadata Document, draft 02, 6 July 2026:
  <https://www.ietf.org/archive/id/draft-ietf-oauth-client-id-metadata-document-02.html>
- RFC 8414 OAuth Authorization Server Metadata
- RFC 8288 Web Linking
