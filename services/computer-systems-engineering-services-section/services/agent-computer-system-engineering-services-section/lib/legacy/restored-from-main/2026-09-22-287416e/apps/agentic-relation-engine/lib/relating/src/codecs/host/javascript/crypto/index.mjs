/**
 * JavaScript host cryptographic encodings.
 *
 * These helpers are the host-runtime leaf for deterministic hashes and small
 * wire signatures. Relational material asks for a stable commitment or a
 * timing-safe comparison; this leaf records that Node's crypto implementation is
 * the concrete JavaScript host codec used to produce it.
 *
 * Composes `@red-cup-engineering/cryptographic-computer-data-engineering-services-section`'s
 * `src/integrity.mjs` rather than reimplementing these encodings: this file used
 * to carry a byte-for-byte duplicate of that section's SHA-256/SHA-1/HMAC/timing-
 * safe-compare primitives (found and merged 2026-09-11, alongside the same
 * duplication in `@red-cup-engineering/cryptographic-integrity-service`, since
 * deleted).
 *
 * @packageDocumentation
 */

export {
  sha256Hex,
  sha1Base64,
  hmacSha256Base64Url,
  timingSafeStringEqual,
} from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/src/integrity.mjs";
