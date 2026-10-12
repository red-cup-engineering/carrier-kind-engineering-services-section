/**
 * HTTP Message Signatures (RFC 9421) over request bodies bound by Content-Digest (RFC 9530): the
 * profile one server uses to know which peer sent a request and that its body arrived unaltered.
 * Covered components are "@method", "@path" and "content-digest"; the algorithm is "ed25519"
 * (RFC 9421 §3.3.6); keyid names the signer, whose public key the verifier resolves itself.
 */
import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { parseDictionary, serializeDictionary, serializeList, innerList, itemConstruct, string, integer, byteSequence } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/http-structured-fields";

const COVERED = Object.freeze(["@method", "@path", "content-digest"]);
const LABEL = "sig1";

const bytes = (body) => (typeof body === "string" ? Buffer.from(body, "utf8") : Buffer.from(body ?? ""));

/** The Content-Digest field value of a body: `sha-256=:<base64>:` (RFC 9530). */
export function contentDigest(body) {
  return serializeDictionary(new Map([["sha-256", itemConstruct(byteSequence(createHash("sha256").update(bytes(body)).digest()))]]));
}

function signatureParams({ created, keyId }) {
  if (!Number.isSafeInteger(created) || created < 0) throw new TypeError("message signature: created must be a nonnegative integer time");
  if (typeof keyId !== "string" || keyId.length === 0) throw new TypeError("message signature: keyid must be non-empty text");
  return serializeList([innerList(COVERED.map(c => itemConstruct(string(c))), [["created", integer(created)], ["keyid", string(keyId)], ["alg", string("ed25519")]])]);
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
  const signature = sign(null, Buffer.from(signatureBase({ method, path, digest, params }), "utf8"), key);
  const input = parseDictionary(`${LABEL}=${params}`);
  return Object.freeze({ "content-digest": digest, "signature-input": serializeDictionary(input), signature: serializeDictionary(new Map([[LABEL, itemConstruct(byteSequence(signature))]])) });
}

const header = (headers, name) => (typeof headers?.get === "function" ? headers.get(name) : headers?.[name] ?? headers?.[name.toLowerCase()]) ?? undefined;

/**
 * Verify a signed request. `publicKeyFor(keyId)` returns the signer's public key (PEM or KeyObject)
 * or undefined for a signer this server does not know. Returns `{ ok: true, keyId }` or
 * `{ ok: false, reason }`; never throws on a malformed or foreign request.
 */
export async function verifyRequest({ method, path, body, headers, publicKeyFor, maxAgeSeconds = 300, now = Math.floor(Date.now() / 1000) }) {
  const refuse = (reason) => Object.freeze({ ok: false, reason });
  try {
  const digest = header(headers, "content-digest");
  const input = header(headers, "signature-input");
  const signatureField = header(headers, "signature");
  if (!digest || !input || !signatureField) return refuse("unsigned request");
  if (digest !== contentDigest(body)) return refuse("content-digest does not match the body");
  if ([digest, input, signatureField].some(value => typeof value !== "string" || value.length > 16384)) return refuse("malformed signature fields");
  const inputs = parseDictionary(input), signatures = parseDictionary(signatureField);
  const entry = inputs.get(LABEL), signatureEntry = signatures.get(LABEL);
  if (inputs.size !== 1 || !entry || entry.type !== "innerList" || entry.value.length !== COVERED.length || entry.value.some((item, index) => item.type !== "item" || item.value.type !== "string" || item.value.value !== COVERED[index] || item.parameters.size)) return refuse("signature covers other components");
  if (entry.parameters.size !== 3 || entry.parameters.get("created")?.type !== "integer" || entry.parameters.get("keyid")?.type !== "string" || entry.parameters.get("alg")?.type !== "string" || entry.parameters.get("alg").value !== "ed25519") return refuse("unsupported signature-input");
  const created = entry.parameters.get("created").value, keyId = entry.parameters.get("keyid").value;
  const params = serializeList([entry]);
  if (params !== signatureParams({ created, keyId })) return refuse("unsupported signature parameters");
  if (!Number.isFinite(now) || !Number.isFinite(maxAgeSeconds) || maxAgeSeconds < 0) return refuse("invalid verification window");
  if (Math.abs(now - created) > maxAgeSeconds) return refuse("signature is outside its validity window");
  if (signatures.size !== 1 || !signatureEntry || signatureEntry.type !== "item" || signatureEntry.parameters.size || signatureEntry.value.type !== "byteSequence" || signatureEntry.value.value.length !== 64) return refuse("malformed signature");
  let publicKey;
  try { publicKey = await publicKeyFor(keyId); } catch { publicKey = undefined; }
  if (publicKey === undefined) return refuse(`unknown signer ${keyId}`);
  const key = typeof publicKey === "string" ? createPublicKey(publicKey) : publicKey;
  const ok = verify(null, Buffer.from(signatureBase({ method, path, digest, params }), "utf8"), key, signatureEntry.value.value);
  return ok ? Object.freeze({ ok: true, keyId }) : refuse("signature does not verify");
  } catch { return refuse("malformed or unsupported signed request"); }
}
