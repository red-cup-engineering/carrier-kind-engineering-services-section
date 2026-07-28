// Correctness gate for the section's crypto core. These keys hold value, so the
// primitives are checked against published Ethereum vectors, not asserted.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { keccak256 } from "../src/keccak256.mjs";
import { N } from "../src/secp256k1.mjs";
import {
  addressFromPrivateKey, toChecksumAddress, signMessage, recoverAddress,
  hashPersonalMessage, signDigest,
} from "../src/evm.mjs";

test("keccak256 published vectors (Ethereum pad, not SHA3)", () => {
  assert.equal(
    keccak256(Buffer.alloc(0)).toString("hex"),
    "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
  );
  assert.equal(
    keccak256(Buffer.from("abc")).toString("hex"),
    "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45",
  );
});

test("keccak256 is Ethereum-Keccak, not finalized SHA3-256", () => {
  // Wikipedia (SHA-3 article) gives SHA3-256("") = a7ffc6f8...; Ethereum's Keccak
  // uses a different pad and MUST produce a different digest for the same input.
  const sha3 = crypto.createHash("sha3-256").update("").digest("hex");
  assert.equal(sha3, "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a");
  assert.notEqual(keccak256(Buffer.alloc(0)).toString("hex"), sha3);
});

test("EIP-155 primary-source signing vector — r verbatim, recovers to EIP address, low-S", () => {
  // Private key, signing hash, and r are verbatim from eips.ethereum.org/EIPS/eip-155
  // "Example". r pins the RFC6979 nonce, so s is then mathematically determined; we
  // prove s is the canonical one via EIP-2 low-S plus recovery to the published
  // address, rather than hardcoding an s literal. (Confirms the EVM signer uses the
  // standard RFC6979+low-S path, NOT the vendored Hive graphene-canonical loop.)
  const priv = "4646464646464646464646464646464646464646464646464646464646464646";
  const digest = "daf5a779ae972f972197303d7b574746c7ef83eadac0f2791ad23db92e4c8e53";
  const sig = signDigest(digest, priv);
  assert.equal(BigInt(sig.r), 18515461264373351373200002665853028612451056578545711640558177340181847433846n);
  assert.ok(BigInt(sig.s) <= N / 2n, "s must be canonical low-S per EIP-2");
  assert.equal(recoverAddress(digest, sig.signature), "0x9d8A62f656a8d1615C1294fd71e9CFb3E4855A4F");
  assert.equal(sig.v, 27); // recovery 0; EIP-155 encodes this as 37 = 0 + chainId(1)*2 + 35
});

test("address from private key — EIP-155 canonical example", () => {
  const priv = "4646464646464646464646464646464646464646464646464646464646464646";
  assert.equal(addressFromPrivateKey(priv), "0x9d8A62f656a8d1615C1294fd71e9CFb3E4855A4F");
});

test("address from private key = 1", () => {
  const priv = "0000000000000000000000000000000000000000000000000000000000000001";
  assert.equal(addressFromPrivateKey(priv), "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
});

test("EIP-55 checksum casing", () => {
  assert.equal(
    toChecksumAddress("5aaeb6053f3e94c9b9a09f33669435e7ef1beaed"),
    "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
  );
});

test("personal_sign round-trips through recovery to the signer address", () => {
  const priv = "4646464646464646464646464646464646464646464646464646464646464646";
  const signer = addressFromPrivateKey(priv);
  const sig = signMessage("union recovery x402 test", priv);
  const digest = hashPersonalMessage("union recovery x402 test");
  assert.equal(recoverAddress(digest, sig.signature), signer);
  assert.equal(sig.v === 27 || sig.v === 28, true);
});

test("raw digest signature recovers to signer", () => {
  const priv = "0000000000000000000000000000000000000000000000000000000000000001";
  const signer = addressFromPrivateKey(priv);
  const digest = keccak256(Buffer.from("payment-authorization"));
  const sig = signDigest(digest, priv);
  assert.equal(recoverAddress(digest, sig.signature), signer);
});
