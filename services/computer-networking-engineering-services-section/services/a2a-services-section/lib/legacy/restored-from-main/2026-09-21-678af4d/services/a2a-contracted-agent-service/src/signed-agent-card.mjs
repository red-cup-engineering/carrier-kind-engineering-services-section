import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AgentCard, generateAgentCardSignature } from "@a2a-js/sdk";
import { importPKCS8 } from "jose";

function required(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} is required`);
  return value.trim();
}

// The injectable sibling of loadSignedAgentCard: signs and wraps an
// already-in-memory Agent Card against an injected signing configuration
// (the { agentCardSignatureGenerator, agentCardJwks } shape produced by
// a2a-agent-card-discovery-service's createAgentCardSigningConfiguration,
// e.g. via a2a-agent-card-key-service/testing's ephemeralAgentCardSigning),
// with no file or environment reads.
export async function createSignedAgentCard(card, { agentCardSignatureGenerator, agentCardJwks } = {}) {
  if (typeof agentCardSignatureGenerator !== "function" || !agentCardJwks) {
    throw new TypeError("Agent Card signing requires an agentCardSignatureGenerator and agentCardJwks");
  }
  const normalized = AgentCard.toJSON(AgentCard.fromJSON(card));
  const signed = await agentCardSignatureGenerator(normalized);
  return Object.freeze({ card: Object.freeze(signed), jwks: Object.freeze(agentCardJwks) });
}

export async function loadSignedAgentCard({ origin, cardPath, signingKeyPath, jwksPath, kid, algorithm = process.env.AGENT_CARD_SIGNING_ALG ?? "EdDSA" }) {
  const baseUrl = required(origin, "Agent Card origin").replace(/\/$/u, "");
  const privateKeyPath = resolve(signingKeyPath ?? required(process.env.AGENT_CARD_SIGNING_KEY, "AGENT_CARD_SIGNING_KEY"));
  const publicJwksPath = resolve(jwksPath ?? required(process.env.AGENT_CARD_JWKS, "AGENT_CARD_JWKS"));
  const signingKid = kid ?? required(process.env.AGENT_CARD_SIGNING_KID, "AGENT_CARD_SIGNING_KID");
  const jwks = JSON.parse(await readFile(publicJwksPath, "utf8"));
  const matching = jwks?.keys?.filter((key) => key?.kid === signingKid && key?.alg === algorithm && !Object.hasOwn(key, "d")) ?? [];
  if (matching.length !== 1) throw new TypeError("Agent Card JWKS must expose exactly one matching public key");
  const template = await readFile(resolve(required(cardPath, "Agent Card template path")), "utf8");
  const card = JSON.parse(template.replaceAll("${BASE_URL}", baseUrl));
  const privateKey = await importPKCS8(await readFile(privateKeyPath, "utf8"), algorithm);
  const agentCardSignatureGenerator = generateAgentCardSignature(privateKey, { alg: algorithm, kid: signingKid, typ: "JOSE", jku: `${baseUrl}/.well-known/jwks.json` });
  return createSignedAgentCard(card, { agentCardSignatureGenerator, agentCardJwks: jwks });
}
