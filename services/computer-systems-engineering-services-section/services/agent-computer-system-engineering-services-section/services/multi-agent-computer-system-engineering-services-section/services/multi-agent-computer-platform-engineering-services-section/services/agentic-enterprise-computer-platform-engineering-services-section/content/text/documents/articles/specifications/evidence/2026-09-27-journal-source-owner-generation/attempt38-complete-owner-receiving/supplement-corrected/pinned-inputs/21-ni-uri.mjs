// The house RFC 6920 ("Naming Things with Hashes") module: builds and
// validates the narrow `ni:///sha-256;<base64url-digest>` content-identity URI
// that every house content address is written in.
import { sha256Bytes } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/portable-sha256";

function base64url(bytes) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(value) {
  const text = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

function sha256(bytes) {
  const hex = sha256Bytes(bytes);
  return Uint8Array.from(hex.match(/../g), (pair) => Number.parseInt(pair, 16));
}

const NI_PREFIX = "ni:///sha-256;";

// RFC 6920 base64url digests of a 32-byte SHA-256 hash are exactly 43
// characters without padding. The last character contains four digest bits
// and two zero pad bits, so only every fourth base64url character is canonical.
// Enforcing that final sextet prevents four different URI strings from naming
// the same digest bytes.
export const NI_URI_PATTERN = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;

function fail(message) {
  const error = new Error(message);
  error.code = "invalid-ni-uri";
  throw error;
}

function byteString(value) {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError("ni URI input must be a Uint8Array");
  }
  return value;
}

function digestBytes(value) {
  if (typeof value !== "string" || !NI_URI_PATTERN.test(value)) return null;
  const encoded = value.slice(NI_PREFIX.length);
  const digest = fromBase64url(encoded);
  return digest.length === 32 && base64url(digest) === encoded
    ? digest
    : null;
}

// Build the `ni:` URI for the given bytes, digesting them with SHA-256 and
// base64url-encoding the result per RFC 6920.
export function makeNiUri(bytes) {
  const digest = base64url(sha256(byteString(bytes)));
  return `${NI_PREFIX}${digest}`;
}

// Report whether a value is a well-formed sha-256 `ni:` URI.
export function isNiUri(value) {
  return digestBytes(value) !== null;
}

// Extract the base64url digest from a validated sha-256 `ni:` URI, throwing
// on anything that does not match the RFC 6920 sha-256 form.
export function niUriDigest(value) {
  if (digestBytes(value) === null) fail(`invalid sha-256 ni URI ${JSON.stringify(value)}`);
  return value.slice(NI_PREFIX.length);
}

// Recover the named 32-byte SHA-256 digest from a canonical URI.
export function niUriDigestBytes(value) {
  const digest = digestBytes(value);
  if (digest === null) fail(`invalid sha-256 ni URI ${JSON.stringify(value)}`);
  return digest.slice();
}

// Verify the complete receiver-facing relation: these exact bytes must hash
// to this exact canonical RFC 6920 name.
export function verifyNiUri(bytes, value) {
  if (!isNiUri(value)) return false;
  return makeNiUri(bytes) === value;
}

/** {bytesBase64 | text, algorithm?} -> {uri}: the ni: name of bytes or UTF-8 text. */
export function makeNiUriService(request) {
  const hasBytes = typeof request?.bytesBase64 === "string";
  const hasText = typeof request?.text === "string";
  if (hasBytes === hasText) throw new TypeError("exactly one of bytesBase64 or text is required");
  if (request.algorithm !== undefined && request.algorithm !== "sha-256") {
    throw new TypeError(`unsupported ni URI algorithm ${JSON.stringify(request.algorithm)}; only sha-256 is available`);
  }
  const bytes = hasBytes ? Buffer.from(request.bytesBase64, "base64") : Buffer.from(request.text, "utf8");
  return { uri: makeNiUri(bytes) };
}

/** {uri} -> {algorithm, digest}: a validated sha-256 ni: URI taken apart. */
export function parseNiUri(request) {
  if (typeof request?.uri !== "string") throw new TypeError("uri must be a string");
  if (!isNiUri(request.uri)) throw new TypeError(`invalid sha-256 ni URI ${JSON.stringify(request.uri)}`);
  return { algorithm: "sha-256", digest: niUriDigest(request.uri) };
}

// RFC 6920 section 3: an ni URI may carry query attributes after its name; `ct`
// gives the content type (`ni:///sha-256;…?ct=video/mp4`). These split one
// into its canonical name and that type.
export function niUriName(value) {
  const name = String(value).split("?")[0];
  return isNiUri(name) ? name : null;
}
export function niUriContentType(value) {
  const query = String(value).split("?")[1];
  return query === undefined ? null : new URLSearchParams(query).get("ct");
}
export function niUriWithContentType(value, contentType) {
  const name = niUriName(value);
  if (name === null) fail(`invalid sha-256 ni URI ${JSON.stringify(value)}`);
  return `${name}?ct=${contentType.split(";")[0].trim()}`;
}

// RFC 6920 section 4: the HTTP(S) form of an ni name is /.well-known/ni/<alg>/<digest>.
export const NI_WELL_KNOWN_PREFIX = "/.well-known/ni/sha-256/";
export function niWellKnownPath(value) {
  const name = niUriName(value);
  if (name === null) fail(`invalid sha-256 ni URI ${JSON.stringify(value)}`);
  return `${NI_WELL_KNOWN_PREFIX}${niUriDigest(name)}`;
}
export function niUriOfWellKnownPath(path) {
  if (typeof path !== "string" || !path.startsWith(NI_WELL_KNOWN_PREFIX)) return null;
  return niUriName(`${NI_PREFIX}${path.slice(NI_WELL_KNOWN_PREFIX.length)}`);
}
