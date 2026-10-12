import { AGENT_CARD_PATH } from "@red-cup-engineering/a2a-services-section/a2a-client";
import { executeRelationalOperationMessage } from "@red-cup-engineering/a2a-services-section/sovereign-operation-boundary";
import {
  ARTICULATE_OPERATION,
  ARTICULATING_APEX,
  ARTICULATING_LANGUAGE_IDENTIFIERS,
  executeArticulateUtterance,
} from "./articulating-apex.mjs";
import { articulatingSenProtocol } from "./articulating-rmn-face.mjs";

export async function projectSignedArticulatingAgentCard({ baseUrl, signing }) {
  const origin = new URL(baseUrl);
  if (origin.protocol !== "https:" && origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost") {
    throw new TypeError("public Agent Cards require HTTPS");
  }
  if (!signing?.sign || !signing?.jwks) {
    throw new TypeError("Agent Card projection requires an injected ephemeral signing configuration");
  }
  const root = origin.href.replace(/\/$/u, "");
  const unsigned = {
    name: "Obsmetrologia Articulating",
    description: "Canonical RMN articulation of one admitted token/claim utterance.",
    supportedInterfaces: [{ url: `${root}/a2a/jsonrpc`, protocolBinding: "JSONRPC", tenant: "", protocolVersion: "1.0" }],
    provider: { url: "https://561.group/", organization: "Lenticule Science" },
    version: "0.1.0",
    capabilities: { streaming: false, pushNotifications: false, extensions: [], extendedAgentCard: false },
    securitySchemes: {},
    securityRequirements: [],
    defaultInputModes: ["application/sen+cbor"],
    defaultOutputModes: ["application/sen+cbor"],
    skills: [{
      id: ARTICULATE_OPERATION,
      name: "Articulate utterance",
      description: `Execute ${ARTICULATING_APEX} using ${JSON.stringify(ARTICULATING_LANGUAGE_IDENTIFIERS)}.`,
      tags: ["obsmetrologia", "rmn", "articulating"],
      examples: [],
      inputModes: ["application/sen+cbor"],
      outputModes: ["application/sen+cbor"],
      securityRequirements: [],
    }],
    signatures: [],
  };
  const card = signing.sign(unsigned);
  return Object.freeze({
    path: `/${AGENT_CARD_PATH}`,
    card,
    jwksPath: "/.well-known/jwks.json",
    jwks: signing.jwks,
  });
}

export function executeArticulatingA2aMove(message) {
  return executeRelationalOperationMessage(message, {
    protocol: articulatingSenProtocol,
    operations: { [ARTICULATE_OPERATION]: executeArticulateUtterance },
    runtimeLoader: async () => Object.freeze({ kind: "obsmetrologia.articulating.transient-runtime" }),
    responseFilename: "articulating-receipt.rmn.cbor",
    unknownOperationMessage: "unknown Obsmetrologia articulating operation",
  });
}
