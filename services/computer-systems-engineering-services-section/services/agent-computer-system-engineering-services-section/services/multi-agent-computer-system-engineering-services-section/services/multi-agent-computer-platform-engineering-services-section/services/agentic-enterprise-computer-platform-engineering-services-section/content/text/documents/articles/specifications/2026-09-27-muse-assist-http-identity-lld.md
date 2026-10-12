---
title: Gateway request identity for the shared MetroPlat HTTP host
date-created: 2026-09-27
type: specification
status: derived LLD; source fabrication and independent assessment outstanding
derived-from: 2026-09-27-muse-assist-personal-interaction-lld.md
derived-from-sha256: cc8bab68371f5b7e3e69a89c7ad3c9fcc0ffe631e600222f23f9b40f8e61f048
---

## Receiving effect and scope

This refines L-I01 and L-I08, themselves derived from H-01/H-I1 and the governing customer-demand chain. A request arriving through an admitted authenticating gateway must be carried under the gateway-authenticated principal or refused before any application work. Missing authentication cannot borrow the host account. The useful effect is attributable request transport. Keep existing operation authorization and intentionally configured process-serving behavior, and remove gateway-to-process fallback across both HTTP constructors and their WebSocket upgrades.

Identity is one necessary part of the private assistant boundary. It does not grant access to a context, data root, artifact, inference provider, or operation. Context admission, request-origin protection at the authenticating gateway, credential custody, scoped resource ports and current grants remain required by L-I01/L-I08 before exposing personal operation. The existing `/data/**` root reader is not an authorized personal resource implementation. This specification does not approve it for remote personal use.

## L-A01 — Closed identity decision

Add `resolveHttpRequestIdentity(headers, config)` to the existing `src/http-options.mjs`. Its result is exactly one frozen object: `{kind:"process"}`, `{kind:"gateway",subject}`, or `{kind:"refused"}`. `config` is operator-supplied configuration, never request material. It may be absent. Gateway mode is selected whenever `config.gatewayToken !== undefined`; a malformed/non-string/empty configured token refuses, never selects process mode.

In gateway mode, accept only the existing exact gateway token comparison and existing bounded principal grammar: ASCII letter followed by ASCII letters/digits/underscore/dot/colon/plus/hyphen, at most 512 characters. Header values must be single strings; arrays, empty, malformed or missing values refuse. Do not trim or normalize request values. Catch malformed header access as refusal; never return supplied material in an error.

When gateway mode is absent, return process only if neither `x-metroplat-subject` nor `x-metroplat-gateway-token` is supplied. An attempted assertion without an admitted gateway refuses. Preserve `assertedHttpSubject` as a recognition helper with its existing return contract; absence from that helper alone is never the admission decision. No new dependency or authority registry is needed.

## L-A02 — One HTTP decision before application work

Both `serve` and `serveSchemaNamespace` resolve identity once per ordinary request, before request-body collection, resource matching/middleware/handlers, arrival retention, inference, journal-feed reads, route projection or operation dispatch. A refusal writes status 401, `content-type: application/json`, `cache-control: no-store`, and the exact JSON body `{"error":"authentication-required"}`. It invokes none of those application callbacks and discloses no expected token, principal, path, or data.

Process mode preserves the supplied process subject and its existing caller fields. Gateway mode sets the dispatch subject to the authenticated principal and sets caller transport to `http` and `asserted:true`, even when that principal happens to equal the process subject. Every ordinary branch receives these same resolved options, including `routeHttpResource`, guest inference, ordinary routes, feeds and schema namespace routes. Do not resolve identity separately in individual branches. Input configuration and caller objects must not be mutated.

Every HTTP-resolved options object sets `gatewaySubjects:false`. Thus the separately trusted MCP stdio metadata protocol cannot override an HTTP-authenticated identity, even if a host accidentally supplied that flag. This does not authorize a principal merely because it authenticated.

## L-A03 — Signed peers retain their own authority

The existing configured POST `/settlement/holdings` and POST `/settlement/transfer` exchange routes retain their signature verification before peer reads/merge, independently of personal gateway identity. Their bodies are read for the existing signature boundary. No other method/path inherits this exception, and absent exchange configuration routes normally. Do not change signature, merge, publication or uncertainty semantics in this order.

## L-A04 — Upgrade decision before a WebSocket session exists

Both HTTP constructors pass a request identity resolver to `attachClaimSession` via `claimSessionOptions`. Select the option name `resolveRequestIdentity`; its synchronous result is the same request dispatch-options snapshot used by HTTP, or `undefined` for refusal. It must run before `101`, session identity allocation, `openSession`, lifecycle events or frame persistence. A refusal ends the socket with `HTTP/1.1 401 Unauthorized`, `Connection: close`, `Content-Length: 0`, and no response body. Resolver exceptions also refuse without details. Do not accept promises as identity evidence.

A standalone `attachClaimSession` call without this option retains its existing process-mode behavior. The HTTP constructors always supply it. Accepted connections retain the resolved identity for their lifetime; a frame cannot supply or replace it. Invalid WebSocket handshake handling otherwise remains unchanged.

## L-A05 — Retained attribution without changing feed identity

Extend `admitClaimSessionFrame(dataRoot, rootName, input, identity)` with an optional fourth parameter carrying the trusted resolver result. Retain the existing session-based feed/subject and all claim/reply information. When the resolved caller has `asserted:true`, append `authenticatedSubject: identity.subject` to the existing append caller metadata. A claimed name inside the frame is not the source of this field. In process mode or legacy direct calls, do not invent gateway authentication metadata.

The session's principal proves transport attribution only. Claim sessions have no personal context/permission implementation under this order and cannot be offered as a bypass around the assistant's scoped operation boundary. Grant revocation and long-lived personal subscriptions require their own L-I01/L-I08 enforcement before personal deployment.

## L-A06 — Existing callers and retirement

Preserve `httpProcessConfig`'s environment-only token custody and catalog capability activation. No token is added to CLI arguments, page JavaScript, client payloads, response text or retained claim metadata. The gateway must strip client-supplied assertion headers, authenticate its users, enforce session/request-origin policy, and hold the token server-side; their deployed realization is not established here.

Remove the HTTP fallback comment and implementation, repeated branch identity decisions, unguarded resource branch and unguarded constructor-installed upgrade route. Keep the separate MCP stdio/in-process gateway protocol unchanged in this order: the ops host currently mixes explicitly asserted user calls and host-account calls through that protocol. Closing that channel requires explicit service-versus-user call separation, including initialization/discovery; simply requiring metadata on every existing host message would break the consumer without providing an equivalent capability.

## L-A07 — Independent receiving observations

Before generation, commit private observations of both HTTP constructors with distinct process/gateway principals and instrumented ports. Refused requests must produce the exact response while leaving body-read, resource, inference, route and arrival counters unchanged. Exercise missing, incorrect, malformed and array assertions; assertion attempts without gateway configuration; equal-named process/gateway principals; and valid assertions on every ordinary branch. Supply `gatewaySubjects:true` and a conflicting MCP payload name and establish that dispatched HTTP options cannot enable that override. Preserve process mode and the separately verified peer exchange.

Exercise upgrade refusal before session/lifecycle/frame effects and valid upgrade with principal attribution retained in append metadata. Use the actual generated module bytes; substituted external ports must be named as controlled observations, not evidence of a real deployment, context authorization or journal durability. Stage and verify stale-input protection before promotion. Broader private assistant acceptance remains outstanding.
