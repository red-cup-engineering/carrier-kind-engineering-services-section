
/**
 * codecs/text/indieauth — the IndieAuth wire grammars.
 *
 * Source input: an `/authorize` request's query parameters, a token-
 * exchange form body, or an already-fetched profile/client HTML document
 * (`rel=me`/`rel=authorization_endpoint`/`rel=token_endpoint` discovery,
 * reusing the generic scanner at `formats/html/scan`). Target
 * representation: an admitted {@link AuthorizationRequest} or a signed
 * bearer token.
 *
 * The signed token reuses the package's one HMAC signed-value codec
 * (`codecs/text/http/cookie/signed-value`) rather than inventing a second
 * signing scheme: the "value" is the base64url-encoded claims JSON, the
 * "signature" is the same HMAC construction cookies already use, scoped by
 * its own salt so an IndieAuth token and a signed cookie never collide.
 *
 * @packageDocumentation
 */
import { randomBase64Url, sha256Base64Url, timingSafeStringEqual } from "../../../lib/codecs/javascript/crypto/index.mts";
import { signCookieValue, unsignCookieValue } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/signed-cookie.mjs";
import { parseLinkHeader } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/http-data-services-section/src/link.mjs";
import { decodeHtmlEntities, htmlDocumentBase, relTokens, scanHtmlStartTags } from "@red-cup-engineering/html-structural-projection-service/scan";
import { assertHttpUrl } from "../webmention/codec.mts";

export type CodeChallengeMethod = "plain" | "S256";

export interface UrlValidation {
  readonly valid: boolean;
  readonly url: string | null;
  readonly reason: string | null;
}

export interface AuthorizationRequest {
  readonly me: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly state?: string;
  readonly scope: readonly string[];
  readonly responseType: "code";
  readonly codeChallenge: string;
  readonly codeChallengeMethod: CodeChallengeMethod;
}

export interface AuthorizationGrant extends AuthorizationRequest {
  readonly code: string;
  readonly issuedAt: string;
  readonly expiresAt?: string;
  readonly approvedBy?: string;
}

export interface IndieAuthTokenClaims {
  readonly me: string;
  readonly client_id: string;
  readonly scope: string;
  readonly iat: number;
  readonly exp?: number;
}

export interface TokenVerification {
  readonly valid: boolean;
  readonly claims: IndieAuthTokenClaims | null;
  readonly reason: string | null;
}

export interface RelLink {
  readonly rels: readonly string[];
  readonly href: string;
}

export interface IndieAuthEndpoints {
  readonly authorizationEndpoint: string | null;
  readonly tokenEndpoint: string | null;
  readonly metadataEndpoint: string | null;
}

export interface IndieAuthMetadata {
  readonly issuer: string;
  readonly authorization_endpoint: string;
  readonly token_endpoint: string;
  readonly introspection_endpoint?: string;
  readonly scopes_supported?: readonly string[];
  readonly response_types_supported: readonly ["code"];
  readonly grant_types_supported: readonly ["authorization_code"];
  readonly code_challenge_methods_supported: readonly CodeChallengeMethod[];
}

const PKCE = /^[A-Za-z0-9._~-]{43,128}$/;
const TOKEN_SALT = "indieauth-token";

/** Canonicalize a bare/partial URL into an `https://` profile URL with a non-empty path, or null. */
export function canonicalizeProfileUrl(input: string): string | null {
  if (typeof input !== "string") return null;
  let value = input.trim();
  if (!value) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.pathname === "") url.pathname = "/";
    return url.href;
  } catch {
    return null;
  }
}

/** Whether a hostname is a bracketed IPv6 literal or a dotted IPv4 literal. */
export function isIpHost(hostname: string): boolean {
  return (hostname.startsWith("[") && hostname.endsWith("]")) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function rawPathSegments(rawInput: string): string[] {
  let value = rawInput.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) value = `https://${value}`;
  const match = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/?#]*([^?#]*)/.exec(value);
  return (match?.[1] ?? "").split("/");
}

function urlCommonProblem(url: URL, rawInput: string): string | null {
  if (url.protocol !== "http:" && url.protocol !== "https:") return "scheme must be http or https";
  if (!url.hostname) return "missing host";
  if (url.hash) return "must not contain a fragment";
  if (url.username || url.password) return "must not contain user:password";
  if (rawPathSegments(rawInput).some((segment) => segment === "." || segment === "..")) return "must not contain . or .. path segments";
  return null;
}

/** IndieAuth's `me` profile-URL validity law: a plain https domain, no port, no IP host. */
export function isValidProfileUrl(input: string): UrlValidation {
  const canonical = canonicalizeProfileUrl(input);
  if (canonical === null) return { valid: false, url: null, reason: "unparseable URL" };
  const url = new URL(canonical);
  const problem = urlCommonProblem(url, input);
  if (problem) return { valid: false, url: canonical, reason: problem };
  if (url.port) return { valid: false, url: canonical, reason: "profile URL must not contain a port" };
  if (isIpHost(url.hostname)) return { valid: false, url: canonical, reason: "profile URL must be a domain, not an IP" };
  return { valid: true, url: canonical, reason: null };
}

/** IndieAuth's `client_id` validity law: any well-formed http(s) URL (ports/IPs allowed, unlike `me`). */
export function isValidClientId(input: string): UrlValidation {
  const canonical = canonicalizeProfileUrl(input);
  if (canonical === null) return { valid: false, url: null, reason: "unparseable URL" };
  const url = new URL(canonical);
  const problem = urlCommonProblem(url, input);
  return problem ? { valid: false, url: canonical, reason: problem } : { valid: true, url: canonical, reason: null };
}

/** Whether two profile URL spellings canonicalize to the same profile. */
export function sameProfile(left: string, right: string): boolean {
  const a = canonicalizeProfileUrl(left);
  const b = canonicalizeProfileUrl(right);
  return a !== null && a === b;
}

function scopes(value: string | null): readonly string[] {
  return Object.freeze((value ?? "").split(/\s+/).filter(Boolean).sort());
}

function challengeMethod(value: string | null): CodeChallengeMethod {
  if (value === null || value === "") return "plain";
  if (value === "plain" || value === "S256") return value;
  throw new TypeError("indieauth: code_challenge_method must be plain or S256");
}

/** Admit an `/authorize` request's query parameters as an {@link AuthorizationRequest}, or throw. */
export function validateAuthorizationRequest(params: URLSearchParams, opts: { expectedMe?: string } = {}): AuthorizationRequest {
  if (params.get("response_type") !== "code") throw new TypeError("indieauth: response_type must be code");
  const me = assertHttpUrl(params.get("me") ?? "", "me");
  if (opts.expectedMe !== undefined && me !== assertHttpUrl(opts.expectedMe, "expectedMe")) {
    throw new TypeError("indieauth: me does not match the expected profile URL");
  }
  const clientId = assertHttpUrl(params.get("client_id") ?? "", "client_id");
  const redirectUri = assertHttpUrl(params.get("redirect_uri") ?? "", "redirect_uri");
  const codeChallenge = params.get("code_challenge") ?? "";
  if (!PKCE.test(codeChallenge)) throw new TypeError("indieauth: code_challenge must be a 43-128 character PKCE verifier value");
  const state = params.get("state");
  return Object.freeze({
    me,
    clientId,
    redirectUri,
    ...(state ? { state } : {}),
    scope: scopes(params.get("scope")),
    responseType: "code" as const,
    codeChallenge,
    codeChallengeMethod: challengeMethod(params.get("code_challenge_method")),
  });
}

/** Derive the S256/plain PKCE challenge for a verifier, rejecting a non-conforming verifier. */
export function pkceChallenge(verifier: string, method: CodeChallengeMethod): string {
  if (!PKCE.test(verifier)) throw new TypeError("indieauth: code_verifier must be 43-128 PKCE characters");
  return method === "plain" ? verifier : sha256Base64Url(verifier);
}

/** Verify a PKCE verifier against the authorization request's stored challenge, timing-safe. */
export function verifyPkce(verifier: string, challenge: string, method: CodeChallengeMethod): boolean {
  return timingSafeStringEqual(pkceChallenge(verifier, method), challenge);
}

/** Mint an authorization code/grant for an admitted request. */
export function createAuthorizationGrant(request: AuthorizationRequest, opts: {
  readonly code?: string;
  readonly issuedAt?: string;
  readonly ttlSeconds?: number;
  readonly approvedBy?: string;
} = {}): AuthorizationGrant {
  const issuedAt = opts.issuedAt ?? new Date().toISOString();
  return Object.freeze({
    ...request,
    code: opts.code ?? randomBase64Url(32),
    issuedAt,
    ...(opts.ttlSeconds === undefined ? {} : { expiresAt: new Date(Date.parse(issuedAt) + opts.ttlSeconds * 1000).toISOString() }),
    ...(opts.approvedBy === undefined ? {} : { approvedBy: opts.approvedBy }),
  });
}

/** Admit a token-exchange form body against its authorization grant, or throw. */
export function validateTokenExchange(form: URLSearchParams, grant: AuthorizationGrant): void {
  if (form.get("grant_type") !== "authorization_code") throw new TypeError("indieauth: grant_type must be authorization_code");
  if (form.get("code") !== grant.code) throw new TypeError("indieauth: authorization code mismatch");
  if (assertHttpUrl(form.get("redirect_uri") ?? "", "redirect_uri") !== grant.redirectUri) throw new TypeError("indieauth: redirect_uri mismatch");
  const clientId = form.get("client_id");
  if (clientId !== null && assertHttpUrl(clientId, "client_id") !== grant.clientId) throw new TypeError("indieauth: client_id mismatch");
  if (!verifyPkce(form.get("code_verifier") ?? "", grant.codeChallenge, grant.codeChallengeMethod)) {
    throw new TypeError("indieauth: PKCE verification failed");
  }
  if (grant.expiresAt !== undefined && Date.parse(grant.expiresAt) <= Date.now()) throw new TypeError("indieauth: authorization code expired");
}

/** Join a `scope` value (space-joined string or token array) into its canonical wire form. */
export function normalizeScope(scope: string | readonly string[] | null | undefined): string {
  const tokens = Array.isArray(scope) ? scope : String(scope ?? "").split(/\s+/);
  return tokens.filter(Boolean).join(" ");
}

export interface MintIndieAuthTokenInput {
  readonly me: string;
  readonly clientId: string;
  readonly scope?: string | readonly string[];
  readonly expiresIn?: number;
  readonly now?: number;
}

/** Mint a signed bearer token carrying `me`/`client_id`/`scope`/expiry, reusing the signed-value HMAC codec. */
export function mintIndieAuthToken(input: MintIndieAuthTokenInput, secret: string): string {
  if (!input.me) throw new TypeError("indieauth: me is required to mint a token");
  if (!input.clientId) throw new TypeError("indieauth: clientId is required to mint a token");
  const iat = Math.floor((input.now ?? Date.now()) / 1000);
  const claims: IndieAuthTokenClaims = Object.freeze({
    me: input.me,
    client_id: input.clientId,
    scope: normalizeScope(input.scope),
    iat,
    ...(input.expiresIn !== undefined && input.expiresIn > 0 ? { exp: iat + Math.floor(input.expiresIn) } : {}),
  });
  const encoded = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return signCookieValue(encoded, secret, TOKEN_SALT);
}

/** Verify a minted token's signature, decode its claims, and check expiry. */
export function verifyIndieAuthToken(token: string, secret: string, opts: { now?: number } = {}): TokenVerification {
  const encoded = unsignCookieValue(token, secret, TOKEN_SALT);
  if (encoded === null) return { valid: false, claims: null, reason: "signature mismatch" };
  let claims: IndieAuthTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as IndieAuthTokenClaims;
  } catch {
    return { valid: false, claims: null, reason: "undecodable token body" };
  }
  if (typeof claims.me !== "string" || typeof claims.client_id !== "string") {
    return { valid: false, claims: null, reason: "missing token claims" };
  }
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (typeof claims.exp === "number" && now >= claims.exp) return { valid: false, claims: null, reason: "token expired" };
  return { valid: true, claims: Object.freeze(claims), reason: null };
}

/** Whether a token's claimed scope includes `required`. */
export function tokenHasScope(claims: Pick<IndieAuthTokenClaims, "scope"> | null | undefined, required: string): boolean {
  return typeof claims?.scope === "string" && claims.scope.split(/\s+/).includes(required);
}

function relLinksInHtml(html: string, baseUrl: string): readonly RelLink[] {
  const base = htmlDocumentBase(html, baseUrl);
  const found: RelLink[] = [];
  for (const tag of scanHtmlStartTags(html)) {
    if (tag.name !== "a" && tag.name !== "link") continue;
    const rels = relTokens(tag.attrs);
    if (rels.length === 0) continue;
    const href = tag.attrs["href"];
    if (href === undefined) continue;
    try {
      found.push(Object.freeze({ rels, href: new URL(decodeHtmlEntities(href), base).href }));
    } catch {
      // Skip unparseable endpoints.
    }
  }
  return Object.freeze(found);
}

/** Every rel-carrying link in an already-fetched document, from both its Link header and its HTML. */
export function allRelLinks(linkHeaderValue: string | null | undefined, html: string, baseUrl: string): readonly RelLink[] {
  const found: RelLink[] = [];
  for (const link of parseLinkHeader(linkHeaderValue)) {
    const rel = link.params["rel"];
    if (!rel) continue;
    try {
      found.push(Object.freeze({ rels: Object.freeze(rel.trim().toLowerCase().split(/\s+/).filter(Boolean)), href: new URL(link.href, baseUrl).href }));
    } catch {
      // Skip unparseable Link header targets.
    }
  }
  found.push(...relLinksInHtml(html, baseUrl));
  return Object.freeze(found);
}

/** Every distinct link target carrying the given `rel` token, Link header first, then HTML, in document order. */
export function discoverRel(linkHeaderValue: string | null | undefined, html: string, baseUrl: string, rel: string): readonly string[] {
  const wanted = rel.toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const link of allRelLinks(linkHeaderValue, html, baseUrl)) {
    if (!link.rels.includes(wanted) || seen.has(link.href)) continue;
    seen.add(link.href);
    out.push(link.href);
  }
  return Object.freeze(out);
}

/** The `rel=me` links an already-fetched document declares. */
export function relMeLinks(html: string, baseUrl: string, linkHeaderValue?: string | null): readonly string[] {
  return discoverRel(linkHeaderValue, html, baseUrl, "me");
}

/** The authorization/token/metadata endpoints an already-fetched profile document advertises. */
export function discoverIndieAuthEndpoints(linkHeaderValue: string | null | undefined, html: string, baseUrl: string): IndieAuthEndpoints {
  const first = (rel: string): string | null => discoverRel(linkHeaderValue, html, baseUrl, rel)[0] ?? null;
  return Object.freeze({
    authorizationEndpoint: first("authorization_endpoint"),
    tokenEndpoint: first("token_endpoint"),
    metadataEndpoint: first("indieauth-metadata"),
  });
}

/** Derive the IndieAuth OAuth-server metadata document for this issuer. */
export function indieAuthMetadata(opts: {
  readonly issuer: string;
  readonly authorizationEndpoint?: string;
  readonly tokenEndpoint?: string;
  readonly introspectionEndpoint?: string;
  readonly scopes?: readonly string[];
}): IndieAuthMetadata {
  const issuer = assertHttpUrl(opts.issuer, "issuer");
  return Object.freeze({
    issuer,
    authorization_endpoint: assertHttpUrl(opts.authorizationEndpoint ?? new URL("/indieauth/authorize", issuer).href, "authorizationEndpoint"),
    token_endpoint: assertHttpUrl(opts.tokenEndpoint ?? new URL("/indieauth/token", issuer).href, "tokenEndpoint"),
    ...(opts.introspectionEndpoint === undefined ? {} : { introspection_endpoint: assertHttpUrl(opts.introspectionEndpoint, "introspectionEndpoint") }),
    ...(opts.scopes === undefined ? {} : { scopes_supported: Object.freeze([...opts.scopes]) }),
    response_types_supported: ["code"] as const,
    grant_types_supported: ["authorization_code"] as const,
    code_challenge_methods_supported: ["plain", "S256"] as const,
  });
}
