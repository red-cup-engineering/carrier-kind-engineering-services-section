#!/usr/bin/env node
// Plain-Node Agent Card JWS signing and verification. Replaces the old A2A SDK's
// canonicalizeAgentCard/generateAgentCardSignature and the "jose" package with
// node:crypto's native Ed25519 and JWK support. Folds together what used to be
// a2a-agent-card-key-service (key provisioning) and the signing/verification
// half of a2a-agent-card-discovery-service.
import { generateKeyPair, generateKeyPairSync, createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { AGENT_CARD_PATH } from "./a2a-client.mjs";

const base64url = {
  encode: (bytes) => Buffer.from(bytes).toString("base64url"),
  decode: (text) => Buffer.from(text, "base64url"),
};

/** The canonical form an Agent Card is signed over: RFC 8785 canonical JSON of
 * the card with its own `signatures` field removed. */
export function canonicalizeAgentCard(card) {
  const { signatures, ...body } = card ?? {};
  return canonicalJson(body);
}

function protectedHeader({ alg, kid, jku }) {
  return { alg, kid, jku, typ: "JOSE" };
}

/** Signs one Agent Card with one Ed25519 private key, returning the card with
 * a `signatures: [{ protected, signature }]` flattened-JWS array (RFC 7515). */
export function signAgentCard(card, { privateKey, kid, jku, algorithm = "EdDSA" }) {
  if (algorithm !== "EdDSA") throw new Error("agent-card-signing only implements EdDSA (Ed25519)");
  const key = typeof privateKey === "string" ? createPrivateKey(privateKey) : privateKey;
  const header = protectedHeader({ alg: algorithm, kid, jku });
  const protectedB64u = base64url.encode(Buffer.from(JSON.stringify(header), "utf8"));
  const payloadB64u = base64url.encode(Buffer.from(canonicalizeAgentCard(card), "utf8"));
  const signature = cryptoSign(null, Buffer.from(`${protectedB64u}.${payloadB64u}`, "utf8"), key);
  return { ...card, signatures: [{ protected: protectedB64u, signature: base64url.encode(signature) }] };
}

function decodeProtectedHeader(signature) {
  return JSON.parse(base64url.decode(signature.protected).toString("utf8"));
}

/** Verifies every signature on a signed Agent Card against its same-origin JWKS
 * (fetched by default; `jwks` may be supplied directly for injected trust). */
export async function verifyAgentCardSignature(card, { cardUrl, fetch: fetchImpl = globalThis.fetch, jwks } = {}) {
  const signatures = card?.signatures ?? [];
  if (signatures.length === 0) throw new Error("Agent Card has no signature");
  let lastError;
  for (const signature of signatures) {
    try {
      const header = decodeProtectedHeader(signature);
      if (!header.kid || !header.jku || !header.alg || header.typ !== "JOSE") throw new Error("Agent Card signature protected header is incomplete");
      let resolvedJwks = jwks;
      if (!resolvedJwks) {
        const jkuUrl = new URL(header.jku);
        const expected = new URL("./jwks.json", cardUrl);
        if (jkuUrl.href !== expected.href) throw new Error("Agent Card jku must name the same-origin sibling .well-known/jwks.json resource");
        const response = await fetchImpl(jkuUrl, { headers: { accept: "application/jwk-set+json, application/json" } });
        if (!response.ok) throw new Error(`Agent Card JWKS discovery returned HTTP ${response.status}`);
        resolvedJwks = await response.json();
      }
      const matches = (resolvedJwks?.keys ?? []).filter((key) => key?.kid === header.kid && key?.alg === header.alg && !Object.hasOwn(key, "d"));
      if (matches.length !== 1) throw new Error("Agent Card JWKS must expose exactly one public key for kid");
      const publicKey = createPublicKey({ key: matches[0], format: "jwk" });
      const { signatures: _omit, ...body } = card;
      const payloadB64u = base64url.encode(Buffer.from(canonicalizeAgentCard(body), "utf8"));
      const verified = cryptoVerify(null, Buffer.from(`${signature.protected}.${payloadB64u}`, "utf8"), publicKey, base64url.decode(signature.signature));
      if (!verified) throw new Error("Agent Card signature did not verify");
      return true;
    } catch (error) { lastError = error; }
  }
  throw new Error("Agent Card has no valid signature", { cause: lastError });
}

/** Reduces a signed Agent Card to durable witness evidence: `ni://` digests of
 * the card body and its one signature, plus the signature's own key claims.
 * Recovered from the retired a2a-agent-card-discovery-service (git 678af4dad41~1)
 * onto today's plain-object card and this module's own canonicalization. */
export function agentCardSignatureEvidence(card) {
  const signatures = card?.signatures ?? [];
  if (signatures.length !== 1) throw new Error("signed Agent Card evidence requires exactly one JWS signature");
  const signature = signatures[0], header = decodeProtectedHeader(signature);
  if (!header.kid || !header.alg || !header.jku || header.typ !== "JOSE") throw new Error("Agent Card signature protected header is incomplete");
  return {
    card: makeNiUri(Buffer.from(canonicalizeAgentCard(card), "utf8")),
    signature: makeNiUri(Buffer.from(canonicalJson(signature), "utf8")),
    kid: header.kid,
    algorithm: header.alg,
    jwks: header.jku,
  };
}

/** Discovers an Agent Card at baseUrl and requires exactly one valid signature. */
export async function discoverSignedAgentCard(baseUrl, { discoverAgentCard, fetch: fetchImpl = globalThis.fetch, jwks } = {}) {
  const discover = discoverAgentCard ?? (await import("./a2a-client.mjs")).discoverAgentCard;
  const card = await discover(baseUrl, { fetch: fetchImpl });
  if ((card.signatures ?? []).length !== 1) throw new Error("sovereign Agent Card profile requires exactly one valid JWS signature");
  const cardUrl = new URL(AGENT_CARD_PATH, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  await verifyAgentCardSignature(card, { cardUrl, fetch: fetchImpl, jwks });
  return card;
}

/** Ed25519 keypair provisioning for Agent Card signing: writes a PKCS8 private
 * key and a public JWKS, both refusing to overwrite an existing file. */
export async function provisionAgentCardKey({ signingKeyPath, jwksPath, kid, algorithm = "EdDSA" }) {
  if (!signingKeyPath || !jwksPath || !kid) throw new Error("signingKeyPath, jwksPath, and kid are required");
  const privatePath = resolve(signingKeyPath), publicPath = resolve(jwksPath);
  for (const path of [privatePath, publicPath]) {
    try { await stat(path); throw new Error(`refusing to replace existing ${path}`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const { privateKey, publicKey } = await new Promise((accept, reject) => generateKeyPair("ed25519", {}, (error, publicKey, privateKey) => (error ? reject(error) : accept({ publicKey, privateKey }))));
  const publicJwk = { ...publicKey.export({ format: "jwk" }), kid, alg: algorithm, use: "sig" };
  await mkdir(dirname(privatePath), { recursive: true });
  await mkdir(dirname(publicPath), { recursive: true });
  await writeFile(privatePath, privateKey.export({ format: "pem", type: "pkcs8" }), { encoding: "utf8", mode: 0o600, flag: "wx" });
  await writeFile(publicPath, `${JSON.stringify({ keys: [publicJwk] })}\n`, { encoding: "utf8", mode: 0o644, flag: "wx" });
  return { kid };
}

/** Loads a provisioned signing key and JWKS from disk and signs a template
 * Agent Card (with ${BASE_URL} substituted), for a real server's startup. */
export async function loadSignedAgentCard({ origin, cardPath, signingKeyPath, jwksPath, kid, algorithm = "EdDSA" }) {
  const baseUrl = origin.replace(/\/$/u, "");
  const jwks = JSON.parse(await readFile(resolve(jwksPath), "utf8"));
  const matches = (jwks?.keys ?? []).filter((key) => key?.kid === kid && key?.alg === algorithm && !Object.hasOwn(key, "d"));
  if (matches.length !== 1) throw new Error("Agent Card JWKS must expose exactly one matching public key");
  const template = await readFile(resolve(cardPath), "utf8");
  const card = JSON.parse(template.replaceAll("${BASE_URL}", baseUrl));
  const privateKey = createPrivateKey(await readFile(resolve(signingKeyPath), "utf8"));
  const signed = signAgentCard(card, { privateKey, kid, jku: `${baseUrl}/.well-known/jwks.json`, algorithm });
  return { card: signed, jwks };
}

/** Builds a signing configuration -- a `sign(card)` closure plus the `kid` and
 * `jwks` a server must publish -- from caller-supplied Ed25519 key material.
 * Recovered from the retired a2a-agent-card-discovery-service (git 678af4dad41~1),
 * whose shape (`agentCardSignatureGenerator`/`agentCardJwks` over the old A2A
 * SDK and "jose") is replaced here by this module's own `sign`/`signAgentCard`. */
export function createAgentCardSigningConfiguration({ baseUrl, kid, privateKey, publicJwk, algorithm = "EdDSA" }) {
  if (!baseUrl || !kid || !privateKey || !publicJwk || Object.hasOwn(publicJwk, "d")) throw new Error("Agent Card signing requires a base URL, kid, private key, and public JWK");
  const jku = `${baseUrl}/.well-known/jwks.json`;
  const jwks = { keys: [{ ...publicJwk, kid, alg: algorithm, use: "sig" }] };
  return { kid, jwks, sign: (card) => signAgentCard(card, { privateKey, kid, jku, algorithm }) };
}

/** One ephemeral Ed25519 keypair for tests: signs a card in-process with no
 * filesystem or network reads. */
export function ephemeralAgentCardSigning(baseUrl, label = "fixture") {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return createAgentCardSigningConfiguration({ baseUrl, kid: `${label}-ed25519`, privateKey, publicJwk: publicKey.export({ format: "jwk" }) });
}

if (import.meta.main) {
  const value = (flag) => { const at = process.argv.indexOf(flag); return at < 0 ? undefined : process.argv[at + 1]; };
  const kid = value("--kid");
  provisionAgentCardKey({ signingKeyPath: value("--signing-key"), jwksPath: value("--jwks"), kid })
    .then(() => { process.stdout.write(`${kid}\n`); })
    .catch((error) => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
}
