/**
 * x402's sign-in-with-x extension (SIWX), for EVM wallets: a client proves it
 * controls a wallet by signing a CAIP-122 / EIP-4361 message the server
 * issued, and the server then decides what that wallet may use without
 * paying. The wire format follows the extension's specification
 * (https://docs.x402.org/extensions/sign-in-with-x): the server offers a
 * challenge under `extensions["sign-in-with-x"]` of its 402 answer, and the
 * client returns the signed fields as base64 JSON in the `SIGN-IN-WITH-X`
 * header. Signatures are checked with the house's own secp256k1 and keccak
 * (cryptographic-computer-data); a contract wallet's EIP-1271 check is a
 * chain read, which the caller injects.
 *
 * Nonces are stateless: a nonce is an HMAC over the challenge's issue time
 * and URI under the deployment's secret, so the server can tell a challenge
 * it issued for this resource from one it did not without storing anything.
 * A proof stays usable for the challenge's five-minute window, and only for
 * the resource it names.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { hashPersonalMessage, recoverAddress, toChecksumAddress } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/evm";

export const SIGN_IN_WITH_X = "sign-in-with-x";
export const SIGN_IN_WITH_X_HEADER = "SIGN-IN-WITH-X";
export const SIGN_IN_WINDOW_MS = 5 * 60 * 1000;

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const EVM_CHAIN = /^eip155:(\d+)$/u;

/** The EIP-4361 text an EVM wallet signs for one challenge, byte for byte as the `siwe` library writes it. */
export function formatSignInMessage(info, address) {
  const chain = EVM_CHAIN.exec(info.chainId ?? "");
  if (!chain) throw new TypeError(`sign-in-with-x supports EVM chains (eip155:*), not ${info.chainId}`);
  let head = `${info.domain} wants you to sign in with your Ethereum account:\n${address}`;
  head = info.statement === undefined ? `${head}\n\n` : `${head}\n\n${info.statement}\n`;
  const lines = [`URI: ${info.uri}`, `Version: ${info.version}`, `Chain ID: ${chain[1]}`, `Nonce: ${info.nonce}`];
  if (info.issuedAt) lines.push(`Issued At: ${info.issuedAt}`);
  if (info.expirationTime) lines.push(`Expiration Time: ${info.expirationTime}`);
  if (info.notBefore) lines.push(`Not Before: ${info.notBefore}`);
  if (info.requestId !== undefined) lines.push(`Request ID: ${info.requestId}`);
  if (info.resources) lines.push(["Resources:", ...info.resources.map((resource) => `- ${resource}`)].join("\n"));
  return `${head}\n${lines.join("\n")}`;
}

function nonceFor(secret, issuedAt, uri) {
  return createHmac("sha256", secret).update(`${SIGN_IN_WITH_X}\n${issuedAt}\n${uri}`).digest("hex").slice(0, 32);
}

// The resource a request names, rebased onto the configured origin: the Host
// header is the client's to set, the origin is the deployment's.
function resourceUri(origin, url) {
  const target = new URL(url);
  return `${new URL(origin).origin}${target.pathname}${target.search}`;
}

/**
 * The challenge a 402 answer offers, as its `extensions` entry.
 * @param {{secret: string, origin: string, url: string, network: string, statement?: string, now?: () => number}} options
 */
export function signInChallenge({ secret, origin, url, network, statement, now = Date.now }) {
  if (typeof secret !== "string" || secret.length < 16) throw new TypeError("sign-in-with-x needs a deployment secret of at least 16 characters");
  const uri = resourceUri(origin, url);
  const issued = now();
  const issuedAt = new Date(issued).toISOString();
  return {
    info: {
      domain: new URL(origin).host,
      uri,
      version: "1",
      nonce: nonceFor(secret, issuedAt, uri),
      issuedAt,
      expirationTime: new Date(issued + SIGN_IN_WINDOW_MS).toISOString(),
      ...(statement ? { statement } : {}),
      resources: [uri],
    },
    supportedChains: [{ chainId: network, type: "eip191" }],
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      required: ["domain", "address", "uri", "version", "chainId", "type", "nonce", "issuedAt", "signature"],
      properties: Object.fromEntries(["domain", "address", "uri", "version", "chainId", "type", "nonce", "issuedAt", "expirationTime", "notBefore", "requestId", "statement", "signature"].map((name) => [name, { type: "string" }])),
    },
  };
}

/** Decode a `SIGN-IN-WITH-X` header value, or throw. */
export function decodeSignInHeader(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 8192) throw new TypeError("sign-in-with-x header is missing or too long");
  let payload;
  try { payload = JSON.parse(Buffer.from(value, "base64").toString("utf8")); } catch { throw new TypeError("sign-in-with-x header is not base64 JSON"); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("sign-in-with-x header is not an object");
  for (const name of ["domain", "address", "uri", "version", "chainId", "nonce", "issuedAt", "signature"]) {
    if (typeof payload[name] !== "string" || payload[name].length === 0) throw new TypeError(`sign-in-with-x header lacks ${name}`);
  }
  return payload;
}

/** Encode a signed payload as a `SIGN-IN-WITH-X` header value. */
export function encodeSignInHeader(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

const refused = (reason) => Object.freeze({ verified: false, reason });

/**
 * Verify one signed payload against the request it arrived on: that this
 * deployment issued its challenge for this resource within the window, and
 * that the address signed it (directly, or as a contract wallet through the
 * injected EIP-1271 check).
 * @param {object} payload from decodeSignInHeader
 * @param {{secret: string, origin: string, url: string, now?: () => number,
 *   verifyContractSignature?: (input: {chainId: string, address: string, digest: string, signature: string}) => Promise<boolean>}} options
 * @returns {Promise<{verified: true, account: string, address: string} | {verified: false, reason: string}>}
 */
export async function verifySignIn(payload, { secret, origin, url, now = Date.now, verifyContractSignature }) {
  const expected = new URL(origin);
  if (payload.domain !== expected.host) return refused("domain-mismatch");
  if (payload.uri !== resourceUri(origin, url)) return refused("uri-mismatch");
  if (payload.version !== "1" || !EVM_CHAIN.test(payload.chainId)) return refused("unsupported-chain-or-version");
  if (!EVM_ADDRESS.test(payload.address)) return refused("malformed-address");
  const issued = Date.parse(payload.issuedAt);
  const at = now();
  if (!Number.isFinite(issued) || issued > at + 30_000 || at - issued > SIGN_IN_WINDOW_MS) return refused("outside-window");
  if (payload.expirationTime !== undefined && !(Date.parse(payload.expirationTime) > at)) return refused("expired");
  if (payload.notBefore !== undefined && !(Date.parse(payload.notBefore) <= at)) return refused("not-yet-valid");
  const nonce = Buffer.from(nonceFor(secret, payload.issuedAt, payload.uri));
  const offered = Buffer.from(String(payload.nonce));
  if (nonce.length !== offered.length || !timingSafeEqual(nonce, offered)) return refused("unknown-challenge");
  const address = toChecksumAddress(payload.address);
  const digest = hashPersonalMessage(formatSignInMessage(payload, payload.address));
  let signer = null;
  const signature = String(payload.signature);
  if (/^0x[0-9a-fA-F]{130}$/u.test(signature)) {
    try { signer = recoverAddress(digest, signature); } catch { signer = null; }
  }
  if (signer !== address) {
    const contractSigned = typeof verifyContractSignature === "function"
      && await verifyContractSignature({ chainId: payload.chainId, address, digest: `0x${digest.toString("hex")}`, signature }).catch(() => false);
    if (!contractSigned) return refused("bad-signature");
  }
  return Object.freeze({ verified: true, account: `${payload.chainId}:${address}`, address });
}
