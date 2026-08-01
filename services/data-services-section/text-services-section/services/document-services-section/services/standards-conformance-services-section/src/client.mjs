import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { checkTerm, decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { circuitInterfaceFromAgentCard, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { encodeTerritoryScanRequest } from "./protocol.mjs";
import { PHASE2_RULESET_ID } from "./scan-territory.mjs";

export const PHASE2_CONFORMANCE_ACCOUNT = "eip155:31337:0xf4a619c30b04aa7bf996016de31569ba41c3da6f";
const responseParts = a2aResultParts;

export async function requestPhase2TerritoryScan({ agentUrl, relativePath = ".", expectedAccount = PHASE2_CONFORMANCE_ACCOUNT, signal }) {
  const inputBytes = encodeTerritoryScanRequest(relativePath);
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(inputBytes, "phase2-territory-scan-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await sendRmnTask({ agentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], message, requireSignature: true, ...(signal ? { signal } : {}) });
  const circuit = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (circuit.account !== expectedAccount.toLowerCase()) throw new Error("territory conformance provider account differs from the contract");
  const output = extractRmnPart(responseParts(exchange.result)), term = decodeSemantic(output.bytes);
  if (!semanticBytes(term).equals(output.bytes) || term?.[0] !== "ascribe" || term.length !== 3) throw new Error("territory conformance provider returned noncanonical RMN");
  checkTerm(term[2], term[1]);
  const report = decodeRelationalValue(term[1], term[2]);
  if (report?.type !== "Phase2TerritoryConformanceReport" || report.ruleset !== PHASE2_RULESET_ID || !Array.isArray(report.violations) || report.violationCount !== report.violations.length) throw new Error("territory conformance report is malformed or uses another ruleset");
  return { report, semanticId: semanticId(term), exchange, circuit };
}
