// The house's one OAuth 2.1 authorization server, as the MCP authorization profile needs it:
// authorization-server metadata (RFC 8414) and protected-resource metadata (RFC 9728), dynamic
// client registration (RFC 7591) and URL-identified clients whose metadata document the host
// resolves (the Client ID Metadata Document of MCP and IndieAuth), the authorization-code grant
// with S256 PKCE only, resource indicators binding every token to its audience (RFC 8707),
// rotating refresh tokens, the client-credentials grant for machine clients, and revocation
// (RFC 7009). Who the resource owner is stays the host's: `authenticate(ctx)` reads its session
// and `loginUrl(returnTo)` sends a visitor to sign in, so Google, Discord, a password or Hive
// Keychain sign a person in and this server only grants. Every authorization is confirmed on a
// consent page when an external client asks, including reconnects, so the person
// can see and change the account that will be connected.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { readFormBody, readJsonBody } from "@red-cup-engineering/http-services-section/body";
import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { escapeHtml } from "@red-cup-engineering/html-structural-projection-service/string-rendering";
import { OAuthError } from "./oauth-error.mjs";
import { sha256Base64Url } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const BODY_LIMIT = 16_384;

/** A request as this server reads it, from a native context (`ctx.req`) or a Fetch one (`ctx.request`). */
const methodOf = (ctx) => (ctx.request?.method ?? ctx.req.method ?? "GET").toUpperCase();
const headerOf = (ctx, name) => (ctx.request !== undefined ? ctx.request.headers.get(name) ?? undefined : ctx.req.headers[name]);
async function fetchText(request) {
  const text = await request.text();
  if (Buffer.byteLength(text) > BODY_LIMIT) throw Object.assign(new RangeError("request body too large"), { status: 413 });
  return text;
}
const formOf = async (ctx) => (ctx.request !== undefined ? new URLSearchParams(await fetchText(ctx.request)) : readFormBody(ctx.req, { maxBytes: BODY_LIMIT }));
const jsonOf = async (ctx) => (ctx.request !== undefined ? JSON.parse(await fetchText(ctx.request)) : readJsonBody(ctx.req, { maxBytes: BODY_LIMIT }));
/** An unreadable body: too large is 413, anything else the OAuth error the endpoint names. */
const bodyProblem = (error, code, description) => (error?.status === 413 ? jsonRepr({ error: code, error_description: "request body too large" }, { status: 413, cacheControl: { noStore: true } }) : oauthProblem(new OAuthError(code, description)));

const random = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
const scopeList = (value) => [...new Set(String(value ?? "").split(/\s+/u).filter(Boolean))].sort();
const PKCE_VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/u;
const PKCE_CHALLENGE = /^[A-Za-z0-9_-]{43}$/u;

/** A redirect URI a public client may register: HTTPS anywhere, HTTP only to a loopback host,
 *  or a private-use scheme (a native app); never one carrying a fragment. */
export function admissibleRedirectUri(value) {
  let url;
  try { url = new URL(value); } catch { return false; }
  if (url.hash !== "") return false;
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return /^[a-z][a-z0-9+.-]*\.[a-z0-9+.-]+:$/u.test(url.protocol);
}

/**
 * Grant custody in JSON files, one per kind, written by rename so a crash never leaves half a file.
 * Keys of secrets (codes, tokens) are already hashed by the server before they reach a store.
 */
export function createJsonFileGrantStore(directory) {
  const kinds = new Map();
  const seen = new Map();
  const stamp = async (kind) => { try { const stat = await fs.stat(path.join(directory, `${kind}.json`)); return `${stat.mtimeMs}:${stat.size}`; } catch { return "absent"; } };
  // Another process (an operator script issuing a machine client) may write the same files: a
  // kind is read again whenever its file changed since this process last read or wrote it.
  const load = async (kind) => {
    const current = await stamp(kind);
    if (!kinds.has(kind) || seen.get(kind) !== current) {
      let entries = {};
      try { entries = JSON.parse(await fs.readFile(path.join(directory, `${kind}.json`), "utf8")); } catch { entries = {}; }
      kinds.set(kind, new Map(Object.entries(entries)));
      seen.set(kind, current);
    }
    return kinds.get(kind);
  };
  // Loading and mutation share custody with publication: concurrent loads must not
  // replace a map containing a grant whose token has already been returned.
  let pending = Promise.resolve();
  const transact = (operation) => {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  };
  const save = async (kind) => {
    const now = Date.now();
    const live = Object.fromEntries([...kinds.get(kind)].filter(([, value]) => !(value?.expiresAt <= now)));
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, `${kind}.json`);
    await fs.writeFile(`${file}.tmp`, JSON.stringify(live), { mode: 0o600 });
    await fs.rename(`${file}.tmp`, file);
    seen.set(kind, await stamp(kind));
  };
  return Object.freeze({
    get(kind, key) { return transact(async () => (await load(kind)).get(key)); },
    put(kind, key, value) { return transact(async () => { (await load(kind)).set(key, value); await save(kind); }); },
    delete(kind, key) { return transact(async () => { const map = await load(kind); if (map.delete(key)) await save(kind); }); },
    list(kind) { return transact(async () => [...(await load(kind)).values()]); },
  });
}

/** The same custody in memory, for tests and single-process demonstrations. */
export function createMemoryGrantStore() {
  const kinds = new Map();
  const map = (kind) => { if (!kinds.has(kind)) kinds.set(kind, new Map()); return kinds.get(kind); };
  return Object.freeze({
    async get(kind, key) { return map(kind).get(key); },
    async put(kind, key, value) { map(kind).set(key, value); },
    async delete(kind, key) { map(kind).delete(key); },
    async list(kind) { return [...map(kind).values()]; },
  });
}

const oauthProblem = (error) => {
  const e = error instanceof OAuthError ? error : new OAuthError("server_error", error instanceof Error ? error.message : String(error));
  const status = e.code === "invalid_client" ? 401 : e.code === "server_error" ? 500 : 400;
  return jsonRepr({ error: e.code, ...(e.description ? { error_description: e.description } : {}) }, { status, cacheControl: { noStore: true }, headers: { pragma: "no-cache" } });
};

const FRAME_DENIAL = Object.freeze({ "x-frame-options": "DENY", "content-security-policy": "frame-ancestors 'none'; default-src 'none'; style-src 'unsafe-inline'; form-action 'self' https: http://localhost:* http://127.0.0.1:*" });

function consentPage({ issuerName, client, principal, scope, resource, requestId, loginUrl }) {
  const redirectHost = new URL(client.redirectUri).host;
  const who = principal.name ?? principal.email ?? principal.subject;
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Allow ${escapeHtml(client.name)}?</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;color:#1b1b1b;background:#fbfaf7}h1{font-size:1.4rem}code{background:#eee;padding:0 .2rem}dl{display:grid;grid-template-columns:auto 1fr;gap:.25rem 1rem}dt{color:#555}.actions{display:flex;gap:1rem;margin-top:2rem}button{font:inherit;padding:.5rem 1.25rem;border-radius:.4rem;border:1px solid #888;background:#fff;cursor:pointer}button[value=approve]{background:#1d4ed8;color:#fff;border-color:#1d4ed8}@media(prefers-color-scheme:dark){body{background:#121212;color:#eee}code{background:#333}dt{color:#aaa}button{background:#222;color:#eee}}</style></head>
<body><h1>Allow <strong>${escapeHtml(client.name)}</strong> to use ${escapeHtml(issuerName)} as you?</h1>
<p>Signed in as <strong>${escapeHtml(who)}</strong>. <a href="${escapeHtml(loginUrl)}">Use a different account</a></p>
<dl><dt>Client</dt><dd>${escapeHtml(client.name)}</dd><dt>Returns to</dt><dd><code>${escapeHtml(redirectHost)}</code></dd>${resource ? `<dt>Resource</dt><dd><code>${escapeHtml(resource)}</code></dd>` : ""}${scope ? `<dt>Scope</dt><dd><code>${escapeHtml(scope)}</code></dd>` : ""}</dl>
<form method="post"><input type="hidden" name="request" value="${escapeHtml(requestId)}"><div class="actions"><button name="decision" value="approve" type="submit">Allow</button><button name="decision" value="deny" type="submit">Deny</button></div></form></body></html>`;
  return { status: 200, type: "text/html; charset=utf-8", cacheControl: { noStore: true }, headers: FRAME_DENIAL, body };
}

const redirectTo = (uri, values) => {
  const target = new URL(uri);
  for (const [name, value] of Object.entries(values)) if (value !== undefined && value !== null && value !== "") target.searchParams.set(name, value);
  return { status: 302, headers: { location: target.href, "cache-control": "no-store" } };
};

/**
 * @param {{
 *   issuer: string,
 *   name?: string,
 *   resources?: string[],
 *   scopes?: string[],
 *   store?: ReturnType<typeof createMemoryGrantStore>,
 *   authenticate: (ctx: object) => ({subject: string, name?: string, email?: string} | undefined | Promise<object | undefined>),
 *   loginUrl: (returnTo: string) => string,
 *   admit?: (principal: object, client: object) => boolean | Promise<boolean>,
 *   resolveUrlClient?: (clientId: string) => Promise<{client_id: string, redirect_uris: string[], client_name?: string}>,
 *   me?: (principal: object) => string,
 *   paths?: {authorize?: string, token?: string, register?: string, revoke?: string},
 *   accessTtlSeconds?: number, refreshTtlSeconds?: number,
 *   now?: () => number,
 * }} options
 */
export function createAuthorizationServer(options) {
  const issuer = new URL(options.issuer).href.replace(/\/$/u, "");
  const issuerName = options.name ?? new URL(issuer).host;
  const resources = (options.resources ?? []).map((resource) => new URL(resource).href);
  const store = options.store ?? createMemoryGrantStore();
  const now = options.now ?? (() => Date.now());
  const accessTtl = (options.accessTtlSeconds ?? 3600) * 1000;
  const refreshTtl = (options.refreshTtlSeconds ?? 30 * 24 * 3600) * 1000;
  const paths = { authorize: "/oauth/authorize", token: "/oauth/token", register: "/oauth/register", revoke: "/oauth/revoke", ...(options.paths ?? {}) };
  if (typeof options.authenticate !== "function" || typeof options.loginUrl !== "function") throw new TypeError("an authorization server needs authenticate(ctx) and loginUrl(returnTo)");

  const metadata = Object.freeze({
    issuer,
    authorization_endpoint: `${issuer}${paths.authorize}`,
    token_endpoint: `${issuer}${paths.token}`,
    registration_endpoint: `${issuer}${paths.register}`,
    revocation_endpoint: `${issuer}${paths.revoke}`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token", "client_credentials"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    revocation_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    scopes_supported: options.scopes ?? [],
    client_id_metadata_document_supported: typeof options.resolveUrlClient === "function",
    authorization_response_iss_parameter_supported: true,
  });

  /** RFC 9728 metadata of one protected resource served by this issuer. */
  const protectedResourceMetadata = (resource) => Object.freeze({
    resource,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    scopes_supported: options.scopes ?? [],
    resource_name: issuerName,
  });

  const audience = (requested) => {
    const values = requested.filter(Boolean).map((value) => { try { return new URL(value).href; } catch { throw new OAuthError("invalid_target", "resource must be an absolute URI"); } });
    if (values.length > 1) throw new OAuthError("invalid_target", "one resource per request");
    if (values.length === 0) return resources[0];
    if (resources.length > 0 && !resources.includes(values[0])) throw new OAuthError("invalid_target", "unknown resource");
    return values[0];
  };

  async function clientOf(clientId) {
    if (typeof clientId !== "string" || clientId === "") throw new OAuthError("invalid_client", "client_id is required");
    const registered = await store.get("client", clientId);
    if (registered !== undefined) return registered;
    if (/^https:\/\//u.test(clientId) && typeof options.resolveUrlClient === "function") {
      let document;
      try { document = await options.resolveUrlClient(clientId); } catch (error) { throw new OAuthError("invalid_client", `client metadata document: ${error instanceof Error ? error.message : String(error)}`); }
      if (document?.client_id !== clientId) throw new OAuthError("invalid_client", "client metadata document names another client_id");
      return { client_id: clientId, client_name: document.client_name ?? new URL(clientId).host, redirect_uris: document.redirect_uris ?? [], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"] };
    }
    throw new OAuthError("invalid_client", "unknown client_id");
  }

  async function registerClient(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new OAuthError("invalid_client_metadata", "registration requires a JSON object");
    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
    if (redirectUris.length === 0) throw new OAuthError("invalid_redirect_uri", "at least one redirect_uri is required");
    const refused = redirectUris.find((uri) => !admissibleRedirectUri(uri));
    if (refused !== undefined) throw new OAuthError("invalid_redirect_uri", `redirect_uri not admissible: ${refused}`);
    const method = body.token_endpoint_auth_method ?? "none";
    if (!["none", "client_secret_post", "client_secret_basic"].includes(method)) throw new OAuthError("invalid_client_metadata", "unsupported token_endpoint_auth_method");
    const secret = method === "none" ? undefined : random(32);
    const client = Object.freeze({
      client_id: `client_${random(16)}`,
      client_name: typeof body.client_name === "string" && body.client_name.trim() !== "" ? body.client_name.trim().slice(0, 200) : "Unnamed client",
      ...(typeof body.client_uri === "string" ? { client_uri: body.client_uri } : {}),
      redirect_uris: Object.freeze(redirectUris),
      grant_types: Object.freeze(["authorization_code", "refresh_token"]),
      response_types: Object.freeze(["code"]),
      token_endpoint_auth_method: method,
      ...(secret === undefined ? {} : { client_secret_hash: sha256Base64Url(secret) }),
      client_id_issued_at: Math.floor(now() / 1000),
    });
    await store.put("client", client.client_id, client);
    const { client_secret_hash: _hash, ...view } = client;
    return { ...view, ...(secret === undefined ? {} : { client_secret: secret, client_secret_expires_at: 0 }) };
  }

  /** An operator-issued machine client for the client-credentials grant, acting as `subject`. */
  async function registerMachineClient({ name, subject, scope = "", secret = random(32) }) {
    if (typeof subject !== "string" || subject === "") throw new TypeError("a machine client acts as a subject");
    if (typeof secret !== "string" || secret.length < 32) throw new TypeError("a machine client secret has at least 32 characters");
    const client = Object.freeze({ client_id: `machine_${random(12)}`, client_name: name ?? subject, redirect_uris: [], grant_types: ["client_credentials"], token_endpoint_auth_method: "client_secret_post", client_secret_hash: sha256Base64Url(secret), subject, scope, client_id_issued_at: Math.floor(now() / 1000) });
    await store.put("client", client.client_id, client);
    return { client_id: client.client_id, client_secret: secret };
  }

  function clientCredentials(ctx, form) {
    const basic = /^Basic\s+(.+)$/iu.exec(headerOf(ctx, "authorization") ?? "");
    if (basic) {
      const [id, secret] = Buffer.from(basic[1], "base64").toString("utf8").split(":");
      return { clientId: decodeURIComponent(id ?? ""), secret: decodeURIComponent(secret ?? "") };
    }
    return { clientId: form.get("client_id") ?? "", secret: form.get("client_secret") ?? undefined };
  }

  async function authenticateClient(ctx, form) {
    const { clientId, secret } = clientCredentials(ctx, form);
    const client = await clientOf(clientId);
    if (client.client_secret_hash !== undefined) {
      if (secret === undefined || !crypto.timingSafeEqual(Buffer.from(sha256Base64Url(secret)), Buffer.from(client.client_secret_hash))) throw new OAuthError("invalid_client", "client authentication failed");
    }
    return client;
  }

  async function mintTokens(grant) {
    const accessToken = random(32);
    const issuedAt = now();
    const access = { ...grant, expiresAt: issuedAt + accessTtl };
    await store.put("access", sha256Base64Url(accessToken), access);
    let refreshToken;
    if (grant.refreshable) {
      refreshToken = random(32);
      await store.put("refresh", sha256Base64Url(refreshToken), { ...grant, expiresAt: issuedAt + refreshTtl });
    }
    return { access_token: accessToken, token_type: "Bearer", expires_in: Math.floor(accessTtl / 1000), ...(grant.scope ? { scope: grant.scope } : {}), ...(refreshToken === undefined ? {} : { refresh_token: refreshToken }), ...profileOf(grant.principal) };
  }

  const grantOf = (client, principal, scope, resource, refreshable) => ({ client_id: client.client_id, subject: principal.subject, principal, scope, ...(resource === undefined ? {} : { resource }), refreshable });

  /** IndieAuth: the profile URL a principal is, in token and redemption responses. */
  const profileOf = (principal) => (typeof options.me === "function" && principal !== undefined ? { me: options.me(principal) } : {});

  async function redeemCode(ctx, form) {
      const client = await authenticateClient(ctx, form);
      const key = sha256Base64Url(form.get("code") ?? "");
      const code = await store.get("code", key);
      await store.delete("code", key);
      if (code === undefined || code.expiresAt <= now()) throw new OAuthError("invalid_grant", "code invalid or expired");
      if (code.client_id !== client.client_id) throw new OAuthError("invalid_grant", "code was issued to another client");
      if (code.redirect_uri !== form.get("redirect_uri")) throw new OAuthError("invalid_grant", "redirect_uri mismatch");
      const verifier = form.get("code_verifier") ?? "";
      if (!PKCE_VERIFIER.test(verifier) || sha256Base64Url(verifier) !== code.code_challenge) throw new OAuthError("invalid_grant", "PKCE verification failed");
      return { client, code };
  }

  async function token(ctx, form) {
    const grantType = form.get("grant_type");
    if (grantType === "authorization_code") {
      const { client, code } = await redeemCode(ctx, form);
      // IndieAuth: a code granted no scope identifies the person and is redeemed at the authorization endpoint.
      if (typeof options.me === "function" && !code.scope) throw new OAuthError("invalid_grant", "this code grants no scope; redeem it at the authorization endpoint");
      const resource = form.get("resource") ? audience([form.get("resource")]) : code.resource;
      if (resource !== code.resource) throw new OAuthError("invalid_target", "resource differs from the authorization");
      return mintTokens(grantOf(client, code.principal, code.scope, resource, true));
    }
    if (grantType === "refresh_token") {
      const client = await authenticateClient(ctx, form);
      const key = sha256Base64Url(form.get("refresh_token") ?? "");
      const refresh = await store.get("refresh", key);
      if (refresh === undefined || refresh.expiresAt <= now() || refresh.client_id !== client.client_id) throw new OAuthError("invalid_grant", "refresh token invalid or expired");
      await store.delete("refresh", key);
      const narrowed = form.get("scope") ? scopeList(form.get("scope")) : scopeList(refresh.scope);
      if (narrowed.some((scope) => !scopeList(refresh.scope).includes(scope))) throw new OAuthError("invalid_scope", "a refresh cannot widen scope");
      const resource = form.get("resource") ? audience([form.get("resource")]) : refresh.resource;
      if (resource !== refresh.resource) throw new OAuthError("invalid_target", "resource differs from the grant");
      return mintTokens(grantOf(client, refresh.principal, narrowed.join(" "), resource, true));
    }
    if (grantType === "client_credentials") {
      const client = await authenticateClient(ctx, form);
      if (!client.grant_types.includes("client_credentials") || client.client_secret_hash === undefined) throw new OAuthError("unauthorized_client", "client may not use client_credentials");
      const resource = audience(form.getAll("resource"));
      return mintTokens(grantOf(client, { subject: client.subject, name: client.client_name, machine: true }, client.scope, resource, false));
    }
    throw new OAuthError("unsupported_grant_type", `unsupported grant_type: ${grantType ?? "(none)"}`);
  }

  /** The claims of a live access token, or undefined; with `resource`, only a token for it. */
  async function verifyToken(accessToken, { resource } = {}) {
    if (typeof accessToken !== "string" || accessToken === "") return undefined;
    const grant = await store.get("access", sha256Base64Url(accessToken));
    if (grant === undefined || grant.expiresAt <= now()) return undefined;
    // A withdrawn client's tokens die with it; URL-identified clients are resolved, not stored.
    if (!/^https:\/\//u.test(grant.client_id) && (await store.get("client", grant.client_id)) === undefined) return undefined;
    if (resource !== undefined && grant.resource !== undefined && grant.resource !== new URL(resource).href) return undefined;
    return Object.freeze({ subject: grant.subject, client_id: grant.client_id, scope: grant.scope, ...(grant.resource === undefined ? {} : { resource: grant.resource }), principal: grant.principal, expiresAt: grant.expiresAt, ...profileOf(grant.principal) });
  }

  async function authorizationRequest(params) {
    if (params.get("response_type") !== "code") throw new OAuthError("unsupported_response_type", "response_type must be code");
    const client = await clientOf(params.get("client_id"));
    const redirectUri = params.get("redirect_uri") ?? (client.redirect_uris.length === 1 ? client.redirect_uris[0] : "");
    if (!client.redirect_uris.includes(redirectUri)) throw new OAuthError("invalid_request", "redirect_uri is not registered for this client");
    return { client, redirectUri };
  }

  async function authorize(ctx) {
    const params = ctx.url.searchParams;
    let client;
    let redirectUri;
    try { ({ client, redirectUri } = await authorizationRequest(params)); }
    catch (error) { return oauthProblem(error); }
    const state = params.get("state") ?? undefined;
    const fail = (error, description) => redirectTo(redirectUri, { error, error_description: description, state, iss: issuer });
    const challenge = params.get("code_challenge") ?? "";
    if (params.get("code_challenge_method") !== "S256" || !PKCE_CHALLENGE.test(challenge)) return fail("invalid_request", "S256 PKCE is required");
    let resource;
    try { resource = audience(params.getAll("resource")); } catch (error) { return fail(error.code, error.description); }
    const requestedScopes = scopeList(params.get("scope"));
    const offered = options.scopes ?? [];
    const scope = (offered.length === 0 ? requestedScopes : requestedScopes.filter((value) => offered.includes(value))).join(" ");

    const principal = await options.authenticate(ctx);
    if (principal === undefined || principal === null) return { status: 302, headers: { location: options.loginUrl(`${ctx.url.pathname}${ctx.url.search}`), "cache-control": "no-store" } };
    if (options.admit !== undefined && !(await options.admit(principal, client))) return fail("access_denied", "this account is not admitted");
    if (typeof options.me === "function" && params.get("me")) {
      let asked;
      try { asked = new URL(params.get("me")).href; } catch { asked = undefined; }
      if (asked !== new URL(options.me(principal)).href) return fail("invalid_request", "me is not the signed-in profile");
    }

    const pending = { client_id: client.client_id, redirect_uri: redirectUri, code_challenge: challenge, scope, resource, state, principal, subject: principal.subject, expiresAt: now() + 600_000 };
    // A client returning to this server's own origin is the site's own interface: its code can reach
    // nobody else, so it needs no consent.
    if (new URL(redirectUri).origin === new URL(issuer).origin) return issueCode(pending);
    const requestId = random(24);
    await store.put("pending", requestId, pending);
    return consentPage({ issuerName, client: { name: client.client_name, redirectUri }, principal, scope, resource, requestId, loginUrl: options.loginUrl(`${ctx.url.pathname}${ctx.url.search}`) });
  }

  async function issueCode(pending) {
    const code = random(32);
    await store.put("code", sha256Base64Url(code), { ...pending, expiresAt: now() + 300_000 });
    return redirectTo(pending.redirect_uri, { code, state: pending.state, iss: issuer });
  }

  async function decide(ctx) {
    let form;
    try { form = await formOf(ctx); } catch (error) { return bodyProblem(error, "invalid_request", "expected a form body"); }
    if (form.has("code")) {
      // IndieAuth: redeeming a code at the authorization endpoint answers who signed in.
      if (typeof options.me !== "function") return oauthProblem(new OAuthError("invalid_request", "redeem codes at the token endpoint"));
      try {
        const { code } = await redeemCode(ctx, form);
        return jsonRepr(profileOf(code.principal), { cacheControl: { noStore: true }, headers: { pragma: "no-cache" } });
      } catch (error) { return oauthProblem(error); }
    }
    const requestId = form.get("request") ?? "";
    const pending = await store.get("pending", requestId);
    await store.delete("pending", requestId);
    if (pending === undefined || pending.expiresAt <= now()) return oauthProblem(new OAuthError("invalid_request", "authorization request expired; start again from the client"));
    const principal = await options.authenticate(ctx);
    if (principal?.subject !== pending.subject) return oauthProblem(new OAuthError("access_denied", "the signed-in account changed"));
    if (form.get("decision") !== "approve") return redirectTo(pending.redirect_uri, { error: "access_denied", state: pending.state, iss: issuer });
    return issueCode({ ...pending, principal });
  }

  async function revoke(ctx) {
    let form;
    try { form = await formOf(ctx); } catch (error) { return bodyProblem(error, "invalid_request", "expected a form body"); }
    const key = sha256Base64Url(form.get("token") ?? "");
    await store.delete("access", key);
    await store.delete("refresh", key);
    return { status: 200, cacheControl: { noStore: true }, body: "" };
  }

  const resource = (id, match, methods, handler, produces = ["application/json"]) => Object.freeze({ id, match, route: match, methods: Object.freeze(methods), produces: Object.freeze(produces), handler });
  const resourceMetadataPaths = ["/.well-known/oauth-protected-resource", ...resources.map((uri) => `/.well-known/oauth-protected-resource${new URL(uri).pathname === "/" ? "" : new URL(uri).pathname}`)];
  const app = Object.freeze({
    resources: Object.freeze([
      resource("oauth.metadata", "/.well-known/oauth-authorization-server", ["GET", "HEAD"], () => jsonRepr(metadata, { cacheControl: { maxAge: 300 }, headers: { "access-control-allow-origin": "*" } })),
      resource("oauth.openid-configuration", "/.well-known/openid-configuration", ["GET", "HEAD"], () => jsonRepr(metadata, { cacheControl: { maxAge: 300 }, headers: { "access-control-allow-origin": "*" } })),
      ...[...new Set(resourceMetadataPaths)].map((match) => resource(`oauth.protected-resource${match.slice("/.well-known/oauth-protected-resource".length).replaceAll("/", ".")}`, match, ["GET", "HEAD"], () => {
        const target = resources.find((uri) => match.endsWith(new URL(uri).pathname)) ?? resources[0] ?? `${issuer}/`;
        return jsonRepr(protectedResourceMetadata(target), { cacheControl: { maxAge: 300 }, headers: { "access-control-allow-origin": "*" } });
      })),
      resource("oauth.register", paths.register, ["POST"], async (ctx) => {
        let body;
        try { body = await jsonOf(ctx); } catch (error) { return bodyProblem(error, "invalid_client_metadata", "expected a JSON body"); }
        try { return jsonRepr(await registerClient(body), { status: 201, cacheControl: { noStore: true }, headers: { "access-control-allow-origin": "*" } }); }
        catch (error) { return oauthProblem(error); }
      }),
      resource("oauth.authorize", paths.authorize, ["GET", "POST"], (ctx) => (methodOf(ctx) === "POST" ? decide(ctx) : authorize(ctx)), ["text/html", "application/json"]),
      resource("oauth.token", paths.token, ["POST"], async (ctx) => {
        let form;
        try { form = await formOf(ctx); } catch (error) { return bodyProblem(error, "invalid_request", "expected a form body"); }
        try { return jsonRepr(await token(ctx, form), { cacheControl: { noStore: true }, headers: { pragma: "no-cache", "access-control-allow-origin": "*" } }); }
        catch (error) { return oauthProblem(error); }
      }),
      resource("oauth.revoke", paths.revoke, ["POST"], revoke),
    ]),
  });

  /** Withdraw a registered client: it can no longer authenticate, refresh or authorize. */
  async function revokeClient(clientId) { await store.delete("client", clientId); }

  return Object.freeze({ issuer, metadata, protectedResourceMetadata, registerClient, registerMachineClient, revokeClient, verifyToken, app });
}
