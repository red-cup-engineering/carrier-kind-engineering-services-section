import { ROLE_AGENT, ROLE_USER } from "@red-cup-engineering/a2a-services-section/a2a-client";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-services-section/rmn-part";
import { loadSettlementAccount } from "./settlement-account-binding.mjs";
import { recordSettlementRecord } from "@red-cup-engineering/witness-journal-document-service";
import { renderDeterministicReportGraphic } from "@red-cup-engineering/deterministic-report-graphic-service/renderer";
import { OPERATION_KIND, admit, identify } from "@red-cup-engineering/deterministic-report-graphic-service/semantic-content";

export const ACTOR = "urn:ame:deterministic-report-graphic-service";
const ROOT = "deterministic-report-graphic-service"; // moved out of the service; identity stays the service's own basename
const id = (value) => identify(value, OPERATION_KIND).id;
const record = (body) => Object.freeze({ id: id(body), ...body });
const exact = (value) => value?.id === id(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id")));
export const operationBytes = (value) => identify(value, OPERATION_KIND).bytes;
export function operationFromBytes(bytes) { return admit(bytes, OPERATION_KIND); }
async function recordResult(value, recordedAt) {
  const account = loadSettlementAccount(ROOT);
  return recordSettlementRecord({ settlement: account.settlement, actor: account.actor, agentUrl: process.env.WITNESS_JOURNAL_RDF_AGENT, category: "rendering-outcomes", recordedAt, record: value });
}
export async function executeOperation(request, options = {}) {
  if (!exact(request) || request.type !== "DeterministicReportGraphicOperation" || request.provider !== ACTOR || request.packet?.type !== "HarmoniousUnionDeltaPacket") throw new Error("exact provider-addressed canonical RMN graphic operation is required");
  const recordedAt = options.recordedAt ?? new Date().toISOString(), artifact = (options.render ?? renderDeterministicReportGraphic)(request.packet);
  const response = record({ type: "DeterministicReportGraphicOperationResult", provider: ACTOR, request: request.id, packet: request.packet.id ?? artifact.packetDigest ?? null, artifact });
  await (options.recordResult ?? recordResult)({ type: "DeterministicReportGraphicWitness", request: request.id, response: response.id, outcome: artifact.type, packet: response.packet, svg: artifact.svgDigest ?? null, png: artifact.pngDigest ?? null, recordedAt }, recordedAt);
  return response;
}
export async function executeA2aMessage(source, options = {}) { const message = (source); if (message.role !== ROLE_USER) throw new Error("graphic executor requires an A2A user Message"); const input = extractRmnPart(message.parts), response = await executeOperation(operationFromBytes(input.bytes), options); return ({ messageId: "", contextId: message.contextId ?? "", taskId: message.taskId ?? "", role: ROLE_AGENT, parts: [rmnPart(operationBytes(response))], metadata: { inputNi: input.ni, outputNi: response.id, provider: ACTOR }, extensions: [], referenceTaskIds: [] }); }
