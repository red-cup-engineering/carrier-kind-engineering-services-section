// JSON Web Tokens (RFC 7519) in compact JWS form (RFC 7515): RS256, ES256 and
// EdDSA. Signing uses node:crypto's native JWK support; verification uses Web
// Crypto, which Node and a Cloudflare Worker implement alike, so a Worker can
// check an identity provider's id_token with the same code a server does.
// A key set is either a JWKS object or a remote one fetched from its URL,
// refetched when a token names a key id the cached set does not hold.
import { createPrivateKey, sign as cryptoSign } from "node:crypto";

// `verify` names the Web Crypto import and verify parameters and the JWK
// members the public key is built from; JWS's ES256 signature is already the
// raw r||s form Web Crypto verifies.
const ALGORITHMS = Object.freeze({
  RS256: { digest: "sha256", options: {}, verify: { members: ["kty", "n", "e"], importAs: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, verifyAs: { name: "RSASSA-PKCS1-v1_5" } } },
  ES256: { digest: "sha256", options: { dsaEncoding: "ieee-p1363" }, verify: { members: ["kty", "crv", "x", "y"], importAs: { name: "ECDSA", namedCurve: "P-256" }, verifyAs: { name: "ECDSA", hash: "SHA-256" } } },
  EdDSA: { digest: null, options: {}, verify: { members: ["kty", "crv", "x"], importAs: { name: "Ed25519" }, verifyAs: { name: "Ed25519" } } },
});

const encodePart = (value) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
function decodePart(text, label) {
  try {
    const value = JSON.parse(Buffer.from(text, "base64url").toString("utf8"));
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new TypeError(`JWT ${label} is not a base64url JSON object`);
  }
}

/** The protected header, claims, signing input and signature of a compact JWT, unverified. */
export function decodeJsonWebToken(token) {
  if (typeof token !== "string") throw new TypeError("JWT must be a string");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]*$/u.test(part))) throw new TypeError("JWT must be three base64url segments");
  return {
    header: decodePart(parts[0], "header"),
    claims: decodePart(parts[1], "claims"),
    signingInput: Buffer.from(`${parts[0]}.${parts[1]}`, "ascii"),
    signature: Buffer.from(parts[2], "base64url"),
  };
}

/** Signs claims as a compact JWT. `privateKey` is a KeyObject, PEM or private JWK. */
export function signJsonWebToken(claims, { privateKey, kid, alg = "RS256", header = {} } = {}) {
  const algorithm = ALGORITHMS[alg];
  if (!algorithm) throw new TypeError(`unsupported JWT algorithm ${alg}`);
  const key = typeof privateKey === "object" && privateKey?.kty ? createPrivateKey({ key: privateKey, format: "jwk" }) : privateKey;
  const protectedHeader = { ...header, alg, typ: "JWT", ...(kid === undefined ? {} : { kid }) };
  const signingInput = `${encodePart(protectedHeader)}.${encodePart(claims)}`;
  const signature = cryptoSign(algorithm.digest, Buffer.from(signingInput, "ascii"), { key, ...algorithm.options });
  return `${signingInput}.${signature.toString("base64url")}`;
}

/** A key set fetched from `url`, cached, and refetched (at most once per
 * `cooldownDuration` ms) when asked for a key id it does not hold. */
export function remoteJsonWebKeySet(url, { fetchImpl = fetch, cooldownDuration = 30_000 } = {}) {
  let keys = null;
  let fetchedAt = -Infinity;
  const refresh = async () => {
    const response = await fetchImpl(String(url));
    if (!response.ok && response.ok !== undefined) throw new Error(`JWKS fetch failed with status ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body?.keys)) throw new TypeError("JWKS response has no keys array");
    keys = body.keys;
    fetchedAt = Date.now();
  };
  return async (header) => {
    const find = () => keys?.find((key) => (header.kid === undefined || key.kid === header.kid) && (key.alg === undefined || key.alg === header.alg));
    if (keys === null) await refresh();
    let found = find();
    if (!found && Date.now() - fetchedAt >= cooldownDuration) {
      await refresh();
      found = find();
    }
    if (!found) throw new Error(`no JWKS key matches kid ${String(header.kid)}`);
    return found;
  };
}

/**
 * Verifies a compact JWT's signature against `keySet` (a JWKS object or a
 * resolver from remoteJsonWebKeySet) and its registered claims.
 * @param {string} token
 * @param {object | ((header: object) => Promise<object>)} keySet
 * @param {{ issuer?: string | string[], audience?: string | string[], requiredClaims?: string[], algorithms?: string[], now?: () => number }} [options]
 * @returns {Promise<{ header: object, payload: object }>}
 */
export async function verifyJsonWebToken(token, keySet, options = {}) {
  const { header, claims, signingInput, signature } = decodeJsonWebToken(token);
  const allowed = options.algorithms ?? Object.keys(ALGORITHMS);
  const algorithm = ALGORITHMS[header.alg];
  if (!algorithm || !allowed.includes(header.alg)) throw new Error(`JWT algorithm ${String(header.alg)} is not accepted`);
  const jwk = typeof keySet === "function"
    ? await keySet(header)
    : keySet?.keys?.find((key) => header.kid === undefined || key.kid === header.kid);
  if (!jwk) throw new Error(`no key matches kid ${String(header.kid)}`);
  const { members, importAs, verifyAs } = algorithm.verify;
  const publicJwk = Object.fromEntries(members.filter((name) => jwk[name] !== undefined).map((name) => [name, jwk[name]]));
  const publicKey = await crypto.subtle.importKey("jwk", publicJwk, importAs, false, ["verify"]);
  if (!await crypto.subtle.verify(verifyAs, publicKey, signature, signingInput)) throw new Error("JWT signature verification failed");
  const now = Math.floor((options.now?.() ?? Date.now()) / 1000);
  for (const name of options.requiredClaims ?? []) if (claims[name] === undefined) throw new Error(`JWT claim ${name} is required`);
  if (claims.exp !== undefined && (typeof claims.exp !== "number" || claims.exp <= now)) throw new Error("JWT is expired");
  if (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf > now)) throw new Error("JWT is not yet valid");
  if (options.issuer !== undefined && ![options.issuer].flat().includes(claims.iss)) throw new Error("JWT issuer is not accepted");
  if (options.audience !== undefined) {
    const audiences = [claims.aud].flat();
    if (![options.audience].flat().some((audience) => audiences.includes(audience))) throw new Error("JWT audience is not accepted");
  }
  return { header, payload: claims };
}
