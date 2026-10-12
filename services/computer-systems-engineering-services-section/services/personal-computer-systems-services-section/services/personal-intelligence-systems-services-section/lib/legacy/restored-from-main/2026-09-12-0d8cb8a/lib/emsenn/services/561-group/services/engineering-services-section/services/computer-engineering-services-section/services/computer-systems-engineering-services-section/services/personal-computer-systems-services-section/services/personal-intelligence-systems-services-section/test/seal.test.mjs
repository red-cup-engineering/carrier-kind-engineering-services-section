import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sealSecret,
  openSecret,
  generateKeyBase64,
  hashToken,
  SealFormatError,
  SealDecryptError,
} from "../src/crypto/seal.mjs";

test("sealSecret/openSecret round-trip preserves plaintext", async () => {
  const key = generateKeyBase64();
  const sealed = await sealSecret("super-secret-refresh-token", key);
  const opened = await openSecret(sealed, key);
  assert.equal(opened, "super-secret-refresh-token");
});

test("sealSecret round-trip works for the empty string", async () => {
  const key = generateKeyBase64();
  const sealed = await sealSecret("", key);
  const opened = await openSecret(sealed, key);
  assert.equal(opened, "");
});

test("sealed value has the v1 compact format with three dot-separated segments", async () => {
  const key = generateKeyBase64();
  const sealed = await sealSecret("payload", key);
  const parts = sealed.split(".");
  assert.equal(parts.length, 3);
  assert.equal(parts[0], "v1");
  assert.match(parts[1], /^[A-Za-z0-9_-]+$/);
  assert.match(parts[2], /^[A-Za-z0-9_-]+$/);
});

test("sealSecret produces a fresh random IV on each call (ciphertexts differ)", async () => {
  const key = generateKeyBase64();
  const sealedA = await sealSecret("same-plaintext", key);
  const sealedB = await sealSecret("same-plaintext", key);
  assert.notEqual(sealedA, sealedB);
  const [, ivA] = sealedA.split(".");
  const [, ivB] = sealedB.split(".");
  assert.notEqual(ivA, ivB);
});

test("openSecret rejects when decrypted with the wrong key", async () => {
  const keyA = generateKeyBase64();
  const keyB = generateKeyBase64();
  const sealed = await sealSecret("only-keyA-should-open-this", keyA);
  await assert.rejects(() => openSecret(sealed, keyB), SealDecryptError);
});

test("openSecret detects tampered ciphertext", async () => {
  const key = generateKeyBase64();
  const sealed = await sealSecret("do-not-tamper-with-me", key);
  const [version, iv, ciphertext] = sealed.split(".");
  // Flip one base64url character in the ciphertext segment, keeping it a
  // structurally valid segment so this exercises GCM tag verification, not
  // format parsing. Flipped at index 0 rather than the last character: the
  // final character of a base64 group without padding can carry 1-2 bits
  // that decode to nothing (unused padding bits), so flipping *that*
  // character is sometimes a no-op on the decoded bytes (flaky ~1/16 of
  // runs when the last char happens to be "A"/0). Index 0 never straddles a
  // padding boundary, so flipping it always changes an actual ciphertext byte.
  const flipCharAt = 0;
  const originalChar = ciphertext[flipCharAt];
  const replacementChar = originalChar === "A" ? "B" : "A";
  const tamperedCiphertext =
    ciphertext.slice(0, flipCharAt) + replacementChar + ciphertext.slice(flipCharAt + 1);
  const tampered = `${version}.${iv}.${tamperedCiphertext}`;

  await assert.rejects(() => openSecret(tampered, key), SealDecryptError);
});

test("openSecret rejects an unrecognized format version", async () => {
  const key = generateKeyBase64();
  const sealed = await sealSecret("payload", key);
  const [, iv, ciphertext] = sealed.split(".");
  await assert.rejects(() => openSecret(`v2.${iv}.${ciphertext}`, key), SealFormatError);
});

test("openSecret rejects malformed segment counts", async () => {
  const key = generateKeyBase64();
  await assert.rejects(() => openSecret("v1.onlyoneseg", key), SealFormatError);
  await assert.rejects(() => openSecret("v1.a.b.c", key), SealFormatError);
  await assert.rejects(() => openSecret("not-sealed-at-all", key), SealFormatError);
});

test("openSecret rejects non-base64url segment content", async () => {
  const key = generateKeyBase64();
  await assert.rejects(() => openSecret("v1.not!base64url.also-not-b64", key), SealFormatError);
});

test("openSecret rejects an IV segment of the wrong decoded length", async () => {
  const key = generateKeyBase64();
  // "AAAA" base64url-decodes to 3 bytes, not the required 12-byte IV.
  const sealed = await sealSecret("payload", key);
  const [, , ciphertext] = sealed.split(".");
  await assert.rejects(() => openSecret(`v1.AAAA.${ciphertext}`, key), SealFormatError);
});

test("sealSecret/openSecret reject non-string plaintext or sealed input", async () => {
  const key = generateKeyBase64();
  await assert.rejects(() => sealSecret(12345, key), TypeError);
  await assert.rejects(() => openSecret(null, key), TypeError);
});

test("sealSecret/openSecret reject a key that is not 32 bytes of base64", async () => {
  await assert.rejects(() => sealSecret("payload", "dG9vLXNob3J0"), TypeError);
  const key = generateKeyBase64();
  const sealed = await sealSecret("payload", key);
  await assert.rejects(() => openSecret(sealed, "dG9vLXNob3J0"), TypeError);
});

test("generateKeyBase64 produces a usable, unique 32-byte key each call", async () => {
  const keyA = generateKeyBase64();
  const keyB = generateKeyBase64();
  assert.notEqual(keyA, keyB);
  const sealed = await sealSecret("usable-key-check", keyA);
  assert.equal(await openSecret(sealed, keyA), "usable-key-check");
});

test("hashToken is stable for the same input and differs for different input", async () => {
  const hashA1 = await hashToken("mcp-token-abc");
  const hashA2 = await hashToken("mcp-token-abc");
  const hashB = await hashToken("mcp-token-xyz");
  assert.equal(hashA1, hashA2);
  assert.notEqual(hashA1, hashB);
  assert.match(hashA1, /^[0-9a-f]{64}$/);
});

test("hashToken rejects non-string or empty input", async () => {
  await assert.rejects(() => hashToken(""), TypeError);
  await assert.rejects(() => hashToken(undefined), TypeError);
  await assert.rejects(() => hashToken(12345), TypeError);
});
