// EVM identity & signing — the section's Ethereum-family face over the shared
// secp256k1 curve and keccak256. Provides the primitives x402 settlement and any
// union office needs to hold an on-chain identity: address derivation, EIP-55
// checksum, raw digest signing with EVM v-encoding, EIP-191 personal_sign, and
// address recovery. No network calls, no key persistence — key custody is the
// caller's; this module is pure compute.
import crypto from "node:crypto";
import { P, getPublicKeyPoint, signRfc6979LowS, recover as secpRecover } from "./secp256k1.mjs";
import { keccak256 } from "./keccak256.mjs";

const hexToBuf = (h) => Buffer.from(h.replace(/^0x/, ""), "hex");
const bufToHex = (b) => "0x" + Buffer.from(b).toString("hex");

export function toChecksumAddress(hex40) {
  const lower = hex40.replace(/^0x/, "").toLowerCase();
  const hash = keccak256(Buffer.from(lower, "ascii")).toString("hex");
  let out = "0x";
  for (let i = 0; i < 40; i++) out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

export function addressFromPublicKeyPoint(pub64) {
  const hash = keccak256(pub64); // keccak256 of the 64-byte X||Y coordinate pair
  return toChecksumAddress(hash.subarray(12).toString("hex"));
}

export function addressFromPrivateKey(secret32) {
  const key = Buffer.isBuffer(secret32) ? secret32 : hexToBuf(secret32);
  return addressFromPublicKeyPoint(getPublicKeyPoint(key));
}

export function generateAccount() {
  const priv = crypto.randomBytes(32);
  return { privateKey: bufToHex(priv), address: addressFromPrivateKey(priv) };
}

// Sign a 32-byte digest, returning r/s hex and EVM recovery id v (27|28) plus a
// 65-byte compact signature (r||s||v). Callers that need EIP-712 or transaction
// signing hash their payload to a digest first and call this.
export function signDigest(digest32, secret32) {
  const key = Buffer.isBuffer(secret32) ? secret32 : hexToBuf(secret32);
  const digest = Buffer.isBuffer(digest32) ? digest32 : hexToBuf(digest32);
  const { signature, recovery } = signRfc6979LowS(digest, key);
  const v = 27 + recovery;
  return {
    r: bufToHex(signature.subarray(0, 32)),
    s: bufToHex(signature.subarray(32, 64)),
    v,
    signature: bufToHex(Buffer.concat([signature, Buffer.from([v])])),
  };
}

// EIP-191 personal_sign: keccak256("\x19Ethereum Signed Message:\n" + len + msg).
export function hashPersonalMessage(message) {
  const msg = Buffer.isBuffer(message) ? message : Buffer.from(message, "utf8");
  const prefix = Buffer.from(`\x19Ethereum Signed Message:\n${msg.length}`, "utf8");
  return keccak256(Buffer.concat([prefix, msg]));
}

export function signMessage(message, secret32) {
  return signDigest(hashPersonalMessage(message), secret32);
}

// Recover the signer's checksummed address from a digest + 65-byte signature.
export function recoverAddress(digest32, signature65) {
  const digest = Buffer.isBuffer(digest32) ? digest32 : hexToBuf(digest32);
  const sig = Buffer.isBuffer(signature65) ? signature65 : hexToBuf(signature65);
  const recovery = sig[64] >= 27 ? sig[64] - 27 : sig[64];
  const pub33 = secpRecover(digest, sig.subarray(0, 64), recovery);
  // decompress to X||Y for address hashing
  const x = BigInt(bufToHex(pub33.subarray(1)));
  let y = modPow((x * x * x + 7n) % P, (P + 1n) / 4n, P);
  if ((y & 1n) !== (pub33[0] === 0x03 ? 1n : 0n)) y = P - y;
  const pub64 = Buffer.concat([
    Buffer.from(x.toString(16).padStart(64, "0"), "hex"),
    Buffer.from(y.toString(16).padStart(64, "0"), "hex"),
  ]);
  return addressFromPublicKeyPoint(pub64);
}

function modPow(base, exp, m) {
  let r = 1n; base %= m;
  while (exp > 0n) { if (exp & 1n) r = (r * base) % m; base = (base * base) % m; exp >>= 1n; }
  return r;
}
