import {
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
} from "node:crypto";
import { HTTPFacilitatorClient } from "@x402/core/server";

const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

export const CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function ed25519PrivateKey(secret) {
  const decoded = Buffer.from(secret, "base64");
  if (decoded.length !== 64 || decoded.toString("base64") !== secret) {
    throw new TypeError("CDP Ed25519 API key secret must be canonical base64 encoding of 64 bytes");
  }
  const privateKey = createPrivateKey({
    key: Buffer.concat([ED25519_PKCS8_PREFIX, decoded.subarray(0, 32)]),
    format: "der",
    type: "pkcs8",
  });
  const expectedPublicKey = decoded.subarray(32);
  const actualPublicKey = createPublicKey(privateKey).export({ format: "der", type: "spki" }).subarray(-32);
  if (!actualPublicKey.equals(expectedPublicKey)) {
    throw new TypeError("CDP Ed25519 API key secret contains a public key that does not match its seed");
  }
  return privateKey;
}

function signer(apiKeySecret) {
  if (typeof apiKeySecret !== "string" || apiKeySecret.length === 0) {
    throw new TypeError("CDP API key secret is required");
  }
  if (apiKeySecret.includes("-----BEGIN")) {
    const key = createPrivateKey(apiKeySecret);
    if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") {
      throw new TypeError("CDP PEM API key secret must be one P-256 private key");
    }
    return Object.freeze({ algorithm: "ES256", key });
  }
  return Object.freeze({ algorithm: "EdDSA", key: ed25519PrivateKey(apiKeySecret) });
}

function canonicalBaseUrl(value = CDP_FACILITATOR_URL) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\")) {
    throw new TypeError("CDP facilitator baseUrl must be one canonical HTTPS URL");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("CDP facilitator baseUrl must be one canonical HTTPS URL");
  }
  if (
    url.protocol !== "https:"
    || url.username !== ""
    || url.password !== ""
    || url.search !== ""
    || url.hash !== ""
    || /\/\//u.test(url.pathname)
    || /%(?:2f|5c)/iu.test(url.pathname)
  ) {
    throw new TypeError("CDP facilitator baseUrl must be one canonical HTTPS URL without credentials, query, fragment, or ambiguous path separators");
  }
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/$/u, "");
  if (pathname === "") throw new TypeError("CDP facilitator baseUrl must include its API base path");
  url.pathname = pathname;
  return Object.freeze({
    url: url.href.replace(/\/$/u, ""),
    host: url.host,
    pathname,
  });
}

function correlationContext(correlation) {
  if (correlation === null || typeof correlation !== "object" || Array.isArray(correlation)) {
    throw new TypeError("CDP facilitator correlation metadata is required");
  }
  const keys = ["sdkLanguage", "source", "sourceVersion"];
  if (Object.keys(correlation).sort().join(",") !== [...keys].sort().join(",")) {
    throw new TypeError("CDP facilitator correlation must expose exactly sdkLanguage, source, sourceVersion");
  }
  for (const key of keys) {
    if (typeof correlation[key] !== "string" || !/^[A-Za-z0-9._-]+$/u.test(correlation[key])) {
      throw new TypeError(`CDP facilitator correlation ${key} must be one nonempty token`);
    }
  }
  return keys.map((key) => `${key}=${correlation[key]}`).join(",");
}

/** Create one Coinbase REST JWT bound to the exact HTTP operation. */
export function createCdpJwt({
  apiKeyId,
  apiKeySecret,
  method,
  host,
  path,
  now = Math.floor(Date.now() / 1000),
  nonce = randomBytes(16).toString("hex"),
}) {
  if (!apiKeyId) throw new TypeError("CDP API key ID is required");
  if (!/^(?:GET|POST)$/u.test(method ?? "")) throw new TypeError("CDP JWT method must be GET or POST");
  if (typeof host !== "string" || host.length === 0 || typeof path !== "string" || !path.startsWith("/")) {
    throw new TypeError("CDP JWT requires one host and absolute request path");
  }
  if (!Number.isSafeInteger(now) || now < 0) throw new TypeError("CDP JWT time must be Unix seconds");
  if (!/^[0-9a-f]{32}$/u.test(nonce)) throw new TypeError("CDP JWT nonce must be 16 bytes of lowercase hexadecimal");

  const selected = signer(apiKeySecret);
  const encodedHeader = base64url(JSON.stringify({ alg: selected.algorithm, kid: apiKeyId, typ: "JWT", nonce }));
  const encodedPayload = base64url(JSON.stringify({
    sub: apiKeyId,
    iss: "cdp",
    uris: [`${method} ${host}${path}`],
    iat: now,
    nbf: now,
    exp: now + 120,
  }));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = selected.algorithm === "EdDSA"
    ? sign(null, Buffer.from(signingInput), selected.key)
    : sign("sha256", Buffer.from(signingInput), { key: selected.key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${base64url(signature)}`;
}

/** Create one authenticated Coinbase x402 facilitator client. */
export function createCdpFacilitatorClient({
  apiKeyId,
  apiKeySecret,
  baseUrl = CDP_FACILITATOR_URL,
  correlation,
} = {}) {
  if (!apiKeyId || !apiKeySecret) {
    const missing = [...(apiKeyId ? [] : ["apiKeyId"]), ...(apiKeySecret ? [] : ["apiKeySecret"])];
    throw new Error(`Missing required CDP credentials: ${missing.join(", ")}`);
  }
  const base = canonicalBaseUrl(baseUrl);
  const correlationHeader = correlationContext(correlation);
  const endpoint = (operation) => `${base.pathname}/${operation}`;
  return new HTTPFacilitatorClient({
    url: base.url,
    createAuthHeaders: async () => Object.fromEntries(
      [["verify", "POST"], ["settle", "POST"], ["supported", "GET"]].map(([operation, method]) => [operation, {
        Authorization: `Bearer ${createCdpJwt({ apiKeyId, apiKeySecret, method, host: base.host, path: endpoint(operation) })}`,
        "Correlation-Context": correlationHeader,
      }]),
    ),
  });
}

/**
 * Select the facilitator client one deployment hires: an injected client
 * wins; the CDP facilitator (by URL or `X402_FACILITATOR_PROVIDER=cdp`)
 * requires `CDP_API_KEY_ID` and `CDP_API_KEY_SECRET` and is built here; any
 * other facilitator URL returns undefined so the boundary hires it over
 * plain HTTP. Realized once for every seller, in place of the per-gateway
 * copies that preceded it.
 *
 * @param {Record<string, string|undefined>} env The deployment bindings.
 * @param {string} facilitatorUrl The hired facilitator URL.
 * @param {{facilitatorClient?: object, source?: string, sourceVersion?: string, factory?: typeof createCdpFacilitatorClient}} [options]
 * @returns {object|undefined} The CDP client, the injected client, or undefined.
 */
export function selectFacilitatorClient(env = {}, facilitatorUrl, { facilitatorClient, source = "x402-services-section", sourceVersion = "0.10.0", factory = createCdpFacilitatorClient } = {}) {
  if (facilitatorClient !== undefined) return facilitatorClient;
  if (env.X402_FACILITATOR_PROVIDER !== "cdp" && facilitatorUrl !== CDP_FACILITATOR_URL) return undefined;
  const apiKeyId = env.CDP_API_KEY_ID;
  const apiKeySecret = env.CDP_API_KEY_SECRET;
  const missing = [...(apiKeyId ? [] : ["CDP_API_KEY_ID"]), ...(apiKeySecret ? [] : ["CDP_API_KEY_SECRET"])];
  if (missing.length > 0) throw new Error(`CDP facilitator requires ${missing.join(" and ")}`);
  return factory({
    apiKeyId,
    apiKeySecret,
    baseUrl: facilitatorUrl,
    correlation: Object.freeze({ sdkLanguage: "javascript", source, sourceVersion }),
  });
}
