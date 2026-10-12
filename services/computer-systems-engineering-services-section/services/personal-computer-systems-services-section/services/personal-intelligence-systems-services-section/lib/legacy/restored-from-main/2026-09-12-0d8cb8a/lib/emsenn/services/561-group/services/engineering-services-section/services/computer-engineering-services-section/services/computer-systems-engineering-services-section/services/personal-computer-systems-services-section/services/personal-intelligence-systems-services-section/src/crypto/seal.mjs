// AES-256-GCM encryption-at-rest for secrets EVE Assist stores (ESI refresh
// tokens, users' own Gemini API keys). WebCrypto only (crypto.subtle) so this
// runs unmodified on Node 24 and on Cloudflare Workers -- no node:crypto.
//
// Sealed format: "v1.<iv b64url>.<ciphertext b64url>". The version segment
// lets us change the scheme later (e.g. v2 with a different cipher) without
// guessing from shape.

const IV_BYTES = 12; // AES-GCM's recommended/standard nonce length
const KEY_BYTES = 32; // AES-256

export class SealFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = "SealFormatError";
  }
}

export class SealDecryptError extends Error {
  constructor(message) {
    super(message);
    this.name = "SealDecryptError";
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(base64Url) {
  if (!/^[A-Za-z0-9_-]*$/.test(base64Url)) {
    throw new Error(`invalid base64url characters in "${base64Url}"`);
  }
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = base64.length % 4;
  if (remainder === 1) {
    throw new Error("invalid base64url length");
  }
  if (remainder > 0) {
    base64 += "=".repeat(4 - remainder);
  }
  return base64ToBytes(base64);
}

function bytesToHex(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

async function importAesKey(keyBase64, keyUsages) {
  if (typeof keyBase64 !== "string" || keyBase64.length === 0) {
    throw new TypeError("seal: keyBase64 must be a non-empty string");
  }
  let keyBytes;
  try {
    keyBytes = base64ToBytes(keyBase64);
  } catch (err) {
    throw new TypeError(`seal: keyBase64 is not valid base64: ${err.message}`);
  }
  if (keyBytes.length !== KEY_BYTES) {
    throw new TypeError(
      `seal: keyBase64 must decode to ${KEY_BYTES} bytes for AES-256-GCM, got ${keyBytes.length}`,
    );
  }
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM", length: 256 }, false, keyUsages);
}

/** Generate a fresh base64-encoded AES-256 key, suitable for the SEAL_KEY secret. */
export function generateKeyBase64() {
  const key = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  return bytesToBase64(key);
}

/** Encrypt `plaintext` (string) under `keyBase64`, returning "v1.<iv>.<ciphertext>" (base64url). */
export async function sealSecret(plaintext, keyBase64) {
  if (typeof plaintext !== "string") {
    throw new TypeError("seal: sealSecret requires plaintext to be a string");
  }
  const key = await importAesKey(keyBase64, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`;
}

/** Decrypt a "v1.<iv>.<ciphertext>" string produced by sealSecret, returning the plaintext. */
export async function openSecret(sealed, keyBase64) {
  if (typeof sealed !== "string") {
    throw new TypeError("seal: openSecret requires sealed to be a string");
  }
  const parts = sealed.split(".");
  if (parts.length !== 3) {
    throw new SealFormatError(
      `seal: openSecret expected format "v1.<iv>.<ciphertext>", got ${parts.length} segment(s)`,
    );
  }
  const [version, ivPart, ciphertextPart] = parts;
  if (version !== "v1") {
    throw new SealFormatError(`seal: openSecret does not recognize format version "${version}" (expected "v1")`);
  }
  if (ivPart.length === 0 || ciphertextPart.length === 0) {
    throw new SealFormatError("seal: openSecret requires non-empty iv and ciphertext segments");
  }

  let iv;
  let ciphertext;
  try {
    iv = base64UrlToBytes(ivPart);
    ciphertext = base64UrlToBytes(ciphertextPart);
  } catch (err) {
    throw new SealFormatError(`seal: openSecret segments are not valid base64url: ${err.message}`);
  }
  if (iv.length !== IV_BYTES) {
    throw new SealFormatError(`seal: openSecret expected a ${IV_BYTES}-byte iv, got ${iv.length} bytes`);
  }

  const key = await importAesKey(keyBase64, ["decrypt"]);
  let plaintextBuf;
  try {
    plaintextBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  } catch {
    // AES-GCM's authentication tag check fails identically whether the key
    // is wrong or the ciphertext was tampered with -- WebCrypto gives no way
    // to distinguish the two cases, so both surface as SealDecryptError.
    throw new SealDecryptError(
      "seal: openSecret failed to authenticate/decrypt (wrong key or corrupted/tampered data)",
    );
  }
  return new TextDecoder().decode(plaintextBuf);
}

/** SHA-256 hash of `token`, returned as lowercase hex (for storing/looking up token hashes). */
export async function hashToken(token) {
  if (typeof token !== "string" || token.length === 0) {
    throw new TypeError("seal: hashToken requires a non-empty string token");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}
