import { join, resolve } from "node:path";

import { readPrincipalsFile } from "./principal-registry.mjs";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]"]);

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} is required`);
  return value.trim();
}

function port(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65_535) throw new TypeError("PORT must be an integer from 1 through 65535");
  return parsed;
}

function optionalText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

// Google sign-in is one of two admitted login paths (Hive Keychain is the
// other, at /login/hive) rather than a hard requirement: GOOGLE_CLIENT_ID
// and GOOGLE_CLIENT_SECRET are all-or-none like ActivityPub's own fields,
// and a deployment configuring neither must instead admit at least one
// Hive principal (checked by the caller against principals.json) so a
// deployment never ends up with zero working login paths.
function googleOAuthConfig(env) {
  const clientId = optionalText(env.GOOGLE_CLIENT_ID);
  const clientSecret = optionalText(env.GOOGLE_CLIENT_SECRET);
  if ((clientId === undefined) !== (clientSecret === undefined)) {
    throw new TypeError("Google OAuth configuration is all-or-none; both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required together");
  }
  return clientId === undefined ? undefined : { clientId, clientSecret };
}

const ACTIVITYPUB_REQUIRED_ENV = Object.freeze([
  "ACTIVITYPUB_ORIGIN",
  "ACTIVITYPUB_IDENTIFIER",
  "ACTIVITYPUB_ACTOR_NAME",
  "ACTIVITYPUB_ACTOR_SUMMARY",
  "ACTIVITYPUB_KEYS_PATH",
]);

function activityPubConfig(env, stateDir) {
  const configured = Object.keys(env).some((name) => name.startsWith("ACTIVITYPUB_"));
  if (!configured) return undefined;
  const missing = ACTIVITYPUB_REQUIRED_ENV.filter((name) => typeof env[name] !== "string" || env[name].trim() === "");
  if (missing.length > 0) throw new TypeError(`ActivityPub configuration is all-or-none; missing ${missing.join(", ")}`);
  return Object.freeze({
    origin: requiredText(env.ACTIVITYPUB_ORIGIN, "ACTIVITYPUB_ORIGIN"),
    identifier: requiredText(env.ACTIVITYPUB_IDENTIFIER, "ACTIVITYPUB_IDENTIFIER"),
    actorName: requiredText(env.ACTIVITYPUB_ACTOR_NAME, "ACTIVITYPUB_ACTOR_NAME"),
    summary: requiredText(env.ACTIVITYPUB_ACTOR_SUMMARY, "ACTIVITYPUB_ACTOR_SUMMARY"),
    keyPath: resolve(requiredText(env.ACTIVITYPUB_KEYS_PATH, "ACTIVITYPUB_KEYS_PATH")),
    statePath: resolve(env.ACTIVITYPUB_SQLITE_PATH
      ? requiredText(env.ACTIVITYPUB_SQLITE_PATH, "ACTIVITYPUB_SQLITE_PATH")
      : join(stateDir, "activitypub.sqlite")),
  });
}

export function normalizePublicBaseUrl(value, { requireTls = true } = {}) {
  const url = new URL(requiredText(value, "PUBLIC_BASE_URL"));
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new TypeError("PUBLIC_BASE_URL must be one origin without credentials, path, query, or fragment");
  if (requireTls && url.protocol !== "https:") throw new TypeError("PUBLIC_BASE_URL must use https");
  if (!requireTls && !["http:", "https:"].includes(url.protocol)) throw new TypeError("PUBLIC_BASE_URL must use http or https");
  return url.origin;
}

export function normalizeLoopbackUpstream(value) {
  const url = new URL(requiredText(value, "UPSTREAM_MCP_URL"));
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new TypeError("UPSTREAM_MCP_URL must be an uncredentialed loopback HTTP origin");
  }
  return url.origin;
}

export function loadGatewayConfig(env = process.env, { requireTls = true } = {}) {
  const host = env.HOST ?? "127.0.0.1";
  if (!LOOPBACK_HOSTS.has(host)) throw new TypeError("HOST must bind a loopback address");
  const stateDir = resolve(requiredText(env.OPS_MCP_STATE_DIR, "OPS_MCP_STATE_DIR"));
  const google = googleOAuthConfig(env);
  // At least one human browser login path must be configured: Google OAuth,
  // an admitted Hive principal, or an admitted password principal already in
  // principals.json. A deployment with no working login path at all is a
  // configuration error caught here, not discovered later by a human at
  // the browser.
  const hiveConfigured = readPrincipalsFile(stateDir).some((entry) => entry?.kind === "hive" && !entry.revoked);
  const passwordConfigured = readPrincipalsFile(stateDir).some((entry) => entry?.kind === "human" && !entry.revoked);
  if (!google && !hiveConfigured && !passwordConfigured) {
    throw new TypeError(
      "Google OAuth credentials, an admitted Hive principal, or an admitted password principal in principals.json is required",
    );
  }
  return Object.freeze({
    host,
    port: port(env.PORT ?? "18807"),
    publicBaseUrl: normalizePublicBaseUrl(env.PUBLIC_BASE_URL ?? env.BASE_URL, { requireTls }),
    upstreamMcpUrl: normalizeLoopbackUpstream(env.UPSTREAM_MCP_URL ?? "http://127.0.0.1:18811"),
    upstreamGatewayToken: env.UPSTREAM_MCP_GATEWAY_TOKEN && env.UPSTREAM_MCP_GATEWAY_TOKEN.trim() !== ""
      ? env.UPSTREAM_MCP_GATEWAY_TOKEN.trim()
      : undefined,
    allowedEmail: optionalText(env.OPS_MCP_ALLOWED_EMAIL)?.toLowerCase(),
    stateDir,
    googleClientId: google?.clientId,
    googleClientSecret: google?.clientSecret,
    hiveLoginConfigured: hiveConfigured,
    passwordLoginConfigured: passwordConfigured,
    activityPub: activityPubConfig(env, stateDir),
    // dataDir is OPTIONAL: absent, the control-plane rooms (/world, /records) are not mounted at
    // all (see app.mjs), so a deployment that has not yet been given a data directory keeps its
    // exact prior surface — this field is additive, never required.
    dataDir: env.OPS_DATA_DIR ? resolve(requiredText(env.OPS_DATA_DIR, "OPS_DATA_DIR")) : undefined,
  });
}
