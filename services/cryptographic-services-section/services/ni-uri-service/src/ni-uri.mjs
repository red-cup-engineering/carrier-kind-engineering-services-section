// ni-uri — builds and validates RFC 6920 ("Naming Things with Hashes")
// `ni:` content-identity URIs over a SHA-256 digest. The named-information
// scheme this module speaks is the narrow `ni:///sha-256;<base64url-digest>`
// form the RWIL RDF projection service uses for graph and document
// identity; this package extracts just that construction and validation,
// reusing the section's own sha256 rather than re-rolling a digest.
import { sha256 } from "../../../src/hash.mjs";

// RFC 6920 base64url digests of a 32-byte SHA-256 hash are exactly 43
// characters (no padding): ceil(32 * 4 / 3) = 43.
const NI_PATTERN = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;

function fail(message) {
  throw new Error(message);
}

// Build the `ni:` URI for the given bytes, digesting them with SHA-256 and
// base64url-encoding the result per RFC 6920.
export function makeNiUri(bytes) {
  const digest = sha256(bytes).toString("base64url");
  return `ni:///sha-256;${digest}`;
}

// Report whether a value is a well-formed sha-256 `ni:` URI.
export function isNiUri(value) {
  return typeof value === "string" && NI_PATTERN.test(value);
}

// Extract the base64url digest from a validated sha-256 `ni:` URI, throwing
// on anything that does not match the RFC 6920 sha-256 form.
export function niUriDigest(value) {
  if (!isNiUri(value)) fail(`invalid sha-256 ni URI ${JSON.stringify(value)}`);
  return value.slice("ni:///sha-256;".length);
}
