/**
 * HTTP Message Signatures (RFC 9421) over request bodies bound by Content-Digest (RFC 9530): the
 * profile one server uses to know which peer sent a request and that its body arrived unaltered.
 * Covered components are "@method", "@path" and "content-digest"; the algorithm is "ed25519"
 * (RFC 9421 §3.3.6); keyid names the signer, whose public key the verifier resolves itself.
 */
import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

const COVERED = Object.freeze(["@method", "@path", "content-digest"]);
const LABEL = "sig1";

const bytes = (body) => (typeof body === "string" ? Buffer.from(body, "utf8") : Buffer.from(body ?? ""));

/** The Content-Digest field value of a body: `sha-256=:<base64>:` (RFC 9530). */
export function contentDigest(body) {
  return `sha-256=:${createHash("sha256").update(bytes(body)).digest("base64")}:`;
}

function signatureParams({ created, keyId }) {
  if (!Number.isSafeInteger(created)) throw new TypeError("message signature: created must be an integer time");
  if (typeof keyId !== "string" || keyId.length === 0 || keyId.includes("\"")) throw new TypeError("message signature: keyid must be a non-empty string without quotes");
  return `(${COVERED.map((c) => `"${c}"`).join(" ")});created=${created};keyid="${keyId}";alg="ed25519"`;
}

/** The signature base (RFC 9421 §2.5) of one request under the given parameters. */
export function signatureBase({ method, path, digest, params }) {
  return [`"@method": ${method.toUpperCase()}`, `"@path": ${path}`, `"content-digest": ${digest}`, `"@signature-params": ${params}`].join("\n");
}

/** Headers signing a request: Content-Digest, Signature-Input and Signature. */
export function signRequest({ method, path, body, keyId, privateKey, created = Math.floor(Date.now() / 1000) }) {
  const key = typeof privateKey === "string" ? createPrivateKey(privateKey) : privateKey;
  const digest = contentDigest(body);
  const params = signatureParams({ created, keyId });
  const signature = sign(null, Buffer.from(signatureBase({ method, path, digest, params }), "utf8"), key).toString("base64");
  return Object.freeze({ "content-digest": digest, "signature-input": `${LABEL}=${params}`, signature: `${LABEL}=:${signature}:` });
}

const header = (headers, name) => (typeof headers?.get === "function" ? headers.get(name) : headers?.[name] ?? headers?.[name.toLowerCase()]) ?? undefined;

/**
 * Verify a signed request. `publicKeyFor(keyId)` returns the signer's public key (PEM or KeyObject)
 * or undefined for a signer this server does not know. Returns `{ ok: true, keyId }` or
 * `{ ok: false, reason }`; never throws on a malformed or foreign request.
 */
export async function verifyRequest({ method, path, body, headers, publicKeyFor, maxAgeSeconds = 300, now = Math.floor(Date.now() / 1000) }) {
  const refuse = (reason) => Object.freeze({ ok: false, reason });
  const digest = header(headers, "content-digest");
  const input = header(headers, "signature-input");
  const signatureField = header(headers, "signature");
  if (!digest || !input || !signatureField) return refuse("unsigned request");
  if (digest !== contentDigest(body)) return refuse("content-digest does not match the body");
  const inputMatch = new RegExp(`^${LABEL}=(\\(.*\\);created=(\\d+);keyid="([^"]+)";alg="ed25519")$`, "u").exec(input);
  if (!inputMatch) return refuse("unsupported signature-input");
  const [, params, createdText, keyId] = inputMatch;
  if (params !== signatureParams({ created: Number(createdText), keyId })) return refuse("signature covers other components");
  const created = Number(createdText);
  if (Math.abs(now - created) > maxAgeSeconds) return refuse("signature is outside its validity window");
  const sigMatch = new RegExp(`^${LABEL}=:([A-Za-z0-9+/=]+):$`, "u").exec(signatureField);
  if (!sigMatch) return refuse("malformed signature");
  let publicKey;
  try { publicKey = await publicKeyFor(keyId); } catch { publicKey = undefined; }
  if (publicKey === undefined) return refuse(`unknown signer ${keyId}`);
  const key = typeof publicKey === "string" ? createPublicKey(publicKey) : publicKey;
  const ok = verify(null, Buffer.from(signatureBase({ method, path, digest, params }), "utf8"), key, Buffer.from(sigMatch[1], "base64"));
  return ok ? Object.freeze({ ok: true, keyId }) : refuse("signature does not verify");
}
