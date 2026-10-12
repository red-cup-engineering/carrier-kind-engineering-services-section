import { isIP } from "node:net";
import { linkHeader, parseLinkHeader } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/link";
import { observationBatch } from "@red-cup-engineering/eavt-services-section/relation-web";

const DEFAULT_PROFILE_BYTES = 1_000_000;
const DEFAULT_METADATA_BYTES = 64_000;
const DEFAULT_CLIENT_BYTES = 5_120;
const SECRET_METHODS = new Set(["client_secret_post", "client_secret_basic", "client_secret_jwt"]);

function fail(code, message, details) {
  const error = new TypeError(message);
  error.code = code;
  if (details !== undefined) error.details = details;
  throw error;
}

function rawPathSegments(input) {
  const match = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(input);
  return (match?.[1] ?? "").split("/");
}

function urlResult(valid, url, reason = null) {
  return Object.freeze({ valid, url, reason });
}

function hostnameIpVersion(hostname) {
  return isIP(hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname);
}

function parsedIdentifier(input, kind) {
  if (typeof input !== "string" || input.trim() !== input || input.length === 0) {
    return { error: `${kind} must be a non-empty URL without surrounding whitespace` };
  }
  let url;
  try { url = new URL(input); } catch { return { error: `${kind} must be an absolute URL` }; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { url, error: `${kind} must use http or https` };
  if (url.username || url.password) return { url, error: `${kind} must not contain user information` };
  if (url.hash) return { url, error: `${kind} must not contain a fragment` };
  if (rawPathSegments(input).some((part) => part === "." || part === "..")) {
    return { url, error: `${kind} must not contain single-dot or double-dot path segments` };
  }
  return { url };
}

export function canonicalizeProfileInput(input, { defaultScheme = "https" } = {}) {
  if (typeof input !== "string") return null;
  let value = input.trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `${defaultScheme}://${value}`;
  const result = validateProfileUrl(value);
  return result.valid ? result.url : null;
}

/** Whether two spellings of a profile URL canonicalize to the same valid profile. */
export function sameProfile(left, right) {
  const a = canonicalizeProfileInput(left);
  return a !== null && a === canonicalizeProfileInput(right);
}

export function validateProfileUrl(input) {
  const parsed = parsedIdentifier(input, "profile URL");
  if (parsed.error) return urlResult(false, parsed.url?.href ?? null, parsed.error);
  const { url } = parsed;
  if (url.port) return urlResult(false, url.href, "profile URL must not contain a port");
  if (hostnameIpVersion(url.hostname)) return urlResult(false, url.href, "profile URL host must be a domain name, not an IP address");
  return urlResult(true, url.href);
}

export function validateClientId(input) {
  const parsed = parsedIdentifier(input, "client_id");
  if (parsed.error) return urlResult(false, parsed.url?.href ?? null, parsed.error);
  const { url } = parsed;
  const ip = hostnameIpVersion(url.hostname);
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (ip && !loopback) return urlResult(false, url.href, "client_id IP literals are limited to loopback interfaces");
  return Object.freeze({ valid: true, url: url.href, reason: null, loopback: loopback || url.hostname === "localhost" });
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  return Array.isArray(found) ? found.join(", ") : found == null ? null : String(found);
}

function decodeEntities(value) {
  const names = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' };
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|amp|apos|gt|lt|quot);/gi, (whole, entity) => {
    if (entity[0] !== "#") return names[entity.toLowerCase()] ?? whole;
    const hex = entity[1]?.toLowerCase() === "x";
    const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    try { return Number.isFinite(point) ? String.fromCodePoint(point) : whole; } catch { return whole; }
  });
}

function attributes(text) {
  const attrs = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of text.matchAll(pattern)) attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  return attrs;
}

function htmlLinks(html, baseUrl, { anchors = false } = {}) {
  const baseTag = /<base\b([^>]*)>/i.exec(html);
  let base = baseUrl;
  if (baseTag) {
    const href = attributes(baseTag[1]).href;
    try { if (href) base = new URL(href, baseUrl).href; } catch { /* retain response URL */ }
  }
  const result = [];
  const tagPattern = anchors ? /<(?:a|link)\b([^>]*)>/gi : /<link\b([^>]*)>/gi;
  for (const match of html.matchAll(tagPattern)) {
    const attrs = attributes(match[1]);
    const rels = (attrs.rel ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    if (!attrs.href || rels.length === 0) continue;
    try { result.push(Object.freeze({ href: new URL(attrs.href, base).href, rels: Object.freeze(rels), source: "html" })); } catch { /* ignore malformed link */ }
  }
  return result;
}

function responseLinks(response, html, baseUrl, options) {
  const result = [];
  for (const item of parseLinkHeader(headerValue(response.headers, "link"))) {
    const rels = (item.params.rel ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    if (rels.length === 0) continue;
    try { result.push(Object.freeze({ href: new URL(item.href, baseUrl).href, rels: Object.freeze(rels), source: "http" })); } catch { /* ignore malformed link */ }
  }
  result.push(...htmlLinks(html, baseUrl, options));
  return Object.freeze(result);
}

function firstRel(links, rel) {
  return links.find((link) => link.rels.includes(rel))?.href ?? null;
}

function defaultAdmitFetch(url) {
  const parsed = new URL(url);
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) return false;
  if (parsed.username || parsed.password) return false;
  return !hostnameIpVersion(parsed.hostname) && parsed.hostname !== "localhost" && !parsed.hostname.endsWith(".localhost");
}

async function admittedFetch(url, init, options, purpose) {
  if (typeof options.fetchImpl !== "function") fail("INDIEAUTH_FETCH_REQUIRED", `${purpose} requires an injected fetchImpl`);
  const admit = options.admitFetch ?? defaultAdmitFetch;
  if (await admit(url, Object.freeze({ purpose })) !== true) fail("INDIEAUTH_FETCH_DENIED", `fetch policy denied ${purpose}`, { url });
  return options.fetchImpl(url, init);
}

async function responseText(response, maxBytes, purpose) {
  if (!response || !Number.isInteger(response.status) || typeof response.text !== "function") {
    fail("INDIEAUTH_FETCH_RESPONSE", `${purpose} returned an invalid response`);
  }
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > maxBytes) fail("INDIEAUTH_DOCUMENT_TOO_LARGE", `${purpose} exceeded ${maxBytes} bytes`);
  return body;
}

function secureEndpoint(value, name, { allowInsecureHttp = false } = {}) {
  let url;
  try { url = new URL(value); } catch { fail("INDIEAUTH_METADATA_INVALID", `${name} must be an absolute URL`); }
  if (url.protocol !== "https:" && !(allowInsecureHttp && url.protocol === "http:")) {
    fail("INDIEAUTH_METADATA_INVALID", `${name} must use https`);
  }
  if (url.username || url.password || url.hash) fail("INDIEAUTH_METADATA_INVALID", `${name} contains forbidden URL components`);
  return url.href;
}

function parseJson(body, purpose) {
  try {
    const value = JSON.parse(body);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError();
    return value;
  } catch {
    fail("INDIEAUTH_JSON_INVALID", `${purpose} must be a JSON object`);
  }
}

function jsonContentType(response) {
  const type = (headerValue(response.headers, "content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  return type === "application/json" || /^application\/[a-z0-9!#$&^_.+-]+\+json$/.test(type);
}

function validateServerMetadata(metadata, metadataUrl, options) {
  const issuer = secureEndpoint(metadata.issuer, "issuer", options);
  const issuerUrl = new URL(issuer);
  if (issuerUrl.search || issuerUrl.hash) fail("INDIEAUTH_METADATA_INVALID", "issuer must not contain a query or fragment");
  if (!metadataUrl.startsWith(issuer)) fail("INDIEAUTH_METADATA_INVALID", "issuer must be a prefix of the indieauth-metadata URL");
  return Object.freeze({
    metadata: Object.freeze({ ...metadata }),
    issuer,
    authorizationEndpoint: secureEndpoint(metadata.authorization_endpoint, "authorization_endpoint", options),
    tokenEndpoint: metadata.token_endpoint == null ? null : secureEndpoint(metadata.token_endpoint, "token_endpoint", options),
  });
}

export async function discoverIndieAuthProfile(input, options = {}) {
  const validation = validateProfileUrl(input);
  if (!validation.valid) fail("INDIEAUTH_PROFILE_INVALID", validation.reason, { input });
  const response = await admittedFetch(validation.url, {
    method: "GET",
    redirect: "follow",
    headers: { accept: "text/html, application/xhtml+xml;q=0.9, */*;q=0.1" },
  }, options, "profile discovery");
  if (response.status < 200 || response.status >= 300) fail("INDIEAUTH_PROFILE_FETCH", `profile discovery returned HTTP ${response.status}`);
  const body = await responseText(response, options.maxProfileBytes ?? DEFAULT_PROFILE_BYTES, "profile document");
  const finalValidation = validateProfileUrl(response.url ?? validation.url);
  if (!finalValidation.valid) fail("INDIEAUTH_PROFILE_INVALID", `profile response URL is invalid: ${finalValidation.reason}`);
  const type = (headerValue(response.headers, "content-type") ?? "").toLowerCase();
  const html = type.includes("html") || type === "" ? body : "";
  const links = responseLinks(response, html, finalValidation.url);
  const metadataEndpoint = firstRel(links, "indieauth-metadata");
  if (metadataEndpoint) {
    const metadataResponse = await admittedFetch(metadataEndpoint, {
      method: "GET", redirect: "follow", headers: { accept: "application/json" },
    }, options, "IndieAuth server metadata discovery");
    if (metadataResponse.status !== 200) fail("INDIEAUTH_METADATA_FETCH", `IndieAuth metadata returned HTTP ${metadataResponse.status}`);
    if (!jsonContentType(metadataResponse)) fail("INDIEAUTH_METADATA_FETCH", "IndieAuth metadata must use a JSON media type");
    const metadataBody = await responseText(metadataResponse, options.maxMetadataBytes ?? DEFAULT_METADATA_BYTES, "IndieAuth metadata");
    const fetchedMetadataUrl = metadataResponse.url ?? metadataEndpoint;
    const validated = validateServerMetadata(parseJson(metadataBody, "IndieAuth metadata"), fetchedMetadataUrl, options);
    return Object.freeze({
      inputProfileUrl: validation.url,
      profileUrl: finalValidation.url,
      metadataEndpoint,
      issuer: validated.issuer,
      authorizationEndpoint: validated.authorizationEndpoint,
      tokenEndpoint: validated.tokenEndpoint,
      metadata: validated.metadata,
      source: "indieauth-metadata",
    });
  }
  const authorizationEndpoint = firstRel(links, "authorization_endpoint");
  if (!authorizationEndpoint) fail("INDIEAUTH_ENDPOINT_MISSING", "profile does not advertise indieauth-metadata or authorization_endpoint");
  const tokenEndpoint = firstRel(links, "token_endpoint");
  return Object.freeze({
    inputProfileUrl: validation.url,
    profileUrl: finalValidation.url,
    metadataEndpoint: null,
    issuer: null,
    authorizationEndpoint: secureEndpoint(authorizationEndpoint, "authorization_endpoint", options),
    tokenEndpoint: tokenEndpoint ? secureEndpoint(tokenEndpoint, "token_endpoint", options) : null,
    metadata: null,
    source: "legacy-rel",
  });
}

function normalizeClientMetadata(clientId, metadata) {
  if (metadata.client_id !== clientId) fail("INDIEAUTH_CLIENT_METADATA_INVALID", "client metadata client_id must exactly match its document URL");
  if ("client_secret" in metadata || "client_secret_expires_at" in metadata) {
    fail("INDIEAUTH_CLIENT_METADATA_INVALID", "client metadata must not contain shared client secrets");
  }
  if (typeof metadata.token_endpoint_auth_method === "string" && SECRET_METHODS.has(metadata.token_endpoint_auth_method)) {
    fail("INDIEAUTH_CLIENT_METADATA_INVALID", "client metadata must not use shared-secret authentication");
  }
  if (Array.isArray(metadata.jwks?.keys)
    && metadata.jwks.keys.some((key) => key && typeof key === "object" && ["d", "p", "q", "dp", "dq", "qi", "oth", "k"].some((name) => name in key))) {
    fail("INDIEAUTH_CLIENT_METADATA_INVALID", "client metadata jwks must contain public key material only");
  }
  const referenceUrl = (value, name) => {
    let url;
    try { url = new URL(value, clientId); } catch { fail("INDIEAUTH_CLIENT_METADATA_INVALID", `${name} must be a URL`); }
    if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password || url.hash) {
      fail("INDIEAUTH_CLIENT_METADATA_INVALID", `${name} must be an http(s) URL without credentials or a fragment`);
    }
    return url.href;
  };
  let clientUri = null;
  if (metadata.client_uri !== undefined) {
    clientUri = referenceUrl(metadata.client_uri, "client_uri");
    if (!clientId.startsWith(clientUri)) fail("INDIEAUTH_CLIENT_METADATA_INVALID", "client_uri must be a prefix of client_id");
  }
  const logoUri = metadata.logo_uri === undefined ? null : referenceUrl(metadata.logo_uri, "logo_uri");
  if (metadata.redirect_uris !== undefined && (!Array.isArray(metadata.redirect_uris) || metadata.redirect_uris.some((uri) => typeof uri !== "string"))) {
    fail("INDIEAUTH_CLIENT_METADATA_INVALID", "redirect_uris must be an array of strings");
  }
  const redirectUris = [...new Set((metadata.redirect_uris ?? []).map((uri) => {
    try { return new URL(uri, clientId).href; } catch { fail("INDIEAUTH_CLIENT_METADATA_INVALID", "redirect_uris contains an invalid URL"); }
  }))].sort();
  return Object.freeze({
    clientId,
    clientName: typeof metadata.client_name === "string" ? metadata.client_name : null,
    clientUri,
    logoUri,
    redirectUris: Object.freeze(redirectUris),
    oauthClient: Object.freeze({ client_id: clientId, redirect_uris: Object.freeze(redirectUris) }),
    metadata: Object.freeze({ ...metadata }),
    source: "client-id-metadata",
  });
}

export async function resolveIndieAuthClient(input, options = {}) {
  const validation = validateClientId(input);
  if (!validation.valid) fail("INDIEAUTH_CLIENT_ID_INVALID", validation.reason, { input });
  const clientId = validation.url;
  if (options.custody?.get) {
    const held = await options.custody.get(clientId);
    if (held != null) return Object.freeze({ ...normalizeClientMetadata(clientId, held), source: "custody" });
  }
  if (validation.loopback) fail("INDIEAUTH_CLIENT_FETCH_FORBIDDEN", "loopback client_id metadata must come from injected custody");
  const response = await admittedFetch(clientId, {
    method: "GET", redirect: "manual", headers: { accept: "application/json, text/html;q=0.5" },
  }, options, "client_id metadata discovery");
  if (response.status !== 200) fail("INDIEAUTH_CLIENT_FETCH", `client_id metadata returned HTTP ${response.status}`);
  if (response.url && response.url !== clientId) fail("INDIEAUTH_CLIENT_FETCH", "client_id metadata fetch must not redirect");
  const body = await responseText(response, options.maxClientBytes ?? DEFAULT_CLIENT_BYTES, "client_id metadata");
  if (jsonContentType(response)) return normalizeClientMetadata(clientId, parseJson(body, "client_id metadata"));
  const type = (headerValue(response.headers, "content-type") ?? "").toLowerCase();
  if (!type.includes("html")) fail("INDIEAUTH_CLIENT_METADATA_INVALID", "client_id must return JSON metadata or legacy HTML");
  const links = responseLinks(response, body, clientId);
  const redirectUris = [...new Set(links.filter((link) => link.rels.includes("redirect_uri")).map((link) => link.href))].sort();
  return Object.freeze({
    clientId,
    clientName: null,
    clientUri: clientId,
    logoUri: null,
    redirectUris: Object.freeze(redirectUris),
    oauthClient: Object.freeze({ client_id: clientId, redirect_uris: Object.freeze(redirectUris) }),
    metadata: null,
    source: "legacy-rel",
  });
}

export function validateIndieAuthRedirectUri(client, input) {
  let redirectUri;
  try { redirectUri = new URL(input).href; } catch { fail("INDIEAUTH_REDIRECT_INVALID", "redirect_uri must be an absolute URL"); }
  if (!client?.redirectUris?.includes(redirectUri)) {
    fail("INDIEAUTH_REDIRECT_INVALID", "redirect_uri must exactly match a registered client redirect URI", { redirectUri });
  }
  return redirectUri;
}

export async function discoverRelMe(input, options = {}) {
  const validation = validateProfileUrl(input);
  if (!validation.valid) fail("INDIEAUTH_PROFILE_INVALID", validation.reason, { input });
  const response = await admittedFetch(validation.url, { method: "GET", redirect: "follow", headers: { accept: "text/html" } }, options, "rel=me discovery");
  if (response.status < 200 || response.status >= 300) fail("INDIEAUTH_REL_ME_FETCH", `rel=me discovery returned HTTP ${response.status}`);
  const body = await responseText(response, options.maxProfileBytes ?? DEFAULT_PROFILE_BYTES, "rel=me profile");
  const finalUrl = response.url ?? validation.url;
  const links = responseLinks(response, body, finalUrl, { anchors: true });
  return Object.freeze({ profileUrl: new URL(finalUrl).href, links: Object.freeze([...new Set(links.filter((link) => link.rels.includes("me")).map((link) => link.href))].sort()) });
}

export async function verifyReciprocalRelMe(left, right, options = {}) {
  try {
    const [a, b] = await Promise.all([discoverRelMe(left, options), discoverRelMe(right, options)]);
    const verified = a.links.includes(b.profileUrl) && b.links.includes(a.profileUrl);
    return Object.freeze({ verified, left: a, right: b, reason: verified ? null : "profiles do not link to each other with rel=me" });
  } catch (error) {
    return Object.freeze({ verified: false, left: null, right: null, reason: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * A reciprocal rel=me check as a SignGraph relation-web observation: each profile `me` the other, told
 * for when both link to each other and against when either does not, refused when discovery failed.
 */
export function relMeObservation(result) {
  const source = { protocol: "indieauth", check: "rel=me" };
  if (!result.left || !result.right) return observationBatch({ source, admission: { status: "refused", refusal: { reason: result.reason ?? "rel=me discovery failed" } }, relations: [] });
  const polarity = result.verified ? "for" : "against";
  const evidence = { verified: result.verified, ...(result.reason ? { reason: result.reason } : {}) };
  return observationBatch({ source, relations: [
    { subject: result.left.profileUrl, predicate: "me", object: result.right.profileUrl, polarity, evidence },
    { subject: result.right.profileUrl, predicate: "me", object: result.left.profileUrl, polarity, evidence },
  ] });
}

export async function validateReturnedProfile(returnedMe, originalDiscovery, options = {}) {
  const validation = validateProfileUrl(returnedMe);
  if (!validation.valid) return Object.freeze({ valid: false, profileUrl: null, reason: validation.reason, discovery: null });
  if (validation.url === originalDiscovery.profileUrl) {
    return Object.freeze({ valid: true, profileUrl: validation.url, reason: null, discovery: originalDiscovery });
  }
  try {
    const discovery = await discoverIndieAuthProfile(validation.url, options);
    const valid = discovery.authorizationEndpoint === originalDiscovery.authorizationEndpoint;
    return Object.freeze({ valid, profileUrl: discovery.profileUrl, reason: valid ? null : "returned profile uses a different authorization endpoint", discovery });
  } catch (error) {
    return Object.freeze({ valid: false, profileUrl: validation.url, reason: error instanceof Error ? error.message : String(error), discovery: null });
  }
}

export function indieAuthProfileLinkHeader({ metadataEndpoint, relMe = [] }) {
  return linkHeader([
    { href: secureEndpoint(metadataEndpoint, "metadataEndpoint"), rel: "indieauth-metadata" },
    ...relMe.map((href) => ({ href: secureEndpoint(href, "rel=me URL", { allowInsecureHttp: true }), rel: "me" })),
  ]);
}

export { indieAuthApp } from "./indieauth-app.mjs";
