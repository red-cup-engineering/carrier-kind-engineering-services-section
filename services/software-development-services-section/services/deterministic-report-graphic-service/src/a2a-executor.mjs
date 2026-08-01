import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { createSettlementStore, relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { renderDeterministicReportGraphic } from "./deterministic-report-graphic.mjs";

export const ACTOR = "urn:ame:deterministic-report-graphic-service";
const ROOT = new URL("..", import.meta.url).pathname;
const id = (value) => semanticId(relationalWitnessJournalDocument(value));
const record = (body) => Object.freeze({ id: id(body), ...body });
const exact = (value) => value?.id === id(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id")));
export const operationBytes = (value) => semanticBytes(relationalWitnessJournalDocument(value));
export function operationFromBytes(bytes) { const term = decodeSemantic(bytes); if (term?.[0] !== "ascribe" || term.length !== 3) throw new Error("graphic operation is not one typed relational RMN document"); return decodeRelationalValue(term[1], term[2]); }
async function recordResult(value, recordedAt) {
  const store = createSettlementStore({ settlementRoot: ROOT, agentUrl: process.env.WITNESS_JOURNAL_RDF_AGENT });
  return store.record({ category: "rendering-outcomes", recordedAt, record: value });
}
export async function executeOperation(request, options = {}) {
  if (!exact(request) || request.type !== "DeterministicReportGraphicOperation" || request.provider !== ACTOR || request.packet?.type !== "HarmoniousUnionDeltaPacket") throw new Error("exact provider-addressed canonical RMN graphic operation is required");
  const recordedAt = options.recordedAt ?? new Date().toISOString(), artifact = (options.render ?? renderDeterministicReportGraphic)(request.packet);
  const response = record({ type: "DeterministicReportGraphicOperationResult", provider: ACTOR, request: request.id, packet: request.packet.id ?? artifact.packetDigest ?? null, artifact });
  await (options.recordResult ?? recordResult)({ type: "DeterministicReportGraphicWitness", request: request.id, response: response.id, outcome: artifact.type, packet: response.packet, svg: artifact.svgDigest ?? null, png: artifact.pngDigest ?? null, recordedAt }, recordedAt);
  return response;
}
export async function executeA2aMessage(source, options = {}) { const message = Message.fromJSON(source); if (message.role !== Role.ROLE_USER) throw new Error("graphic executor requires an A2A user Message"); const input = extractRmnPart(message.parts), response = await executeOperation(operationFromBytes(input.bytes), options); return Message.toJSON({ messageId: "", contextId: message.contextId ?? "", taskId: message.taskId ?? "", role: Role.ROLE_AGENT, parts: [rmnPart(operationBytes(response))], metadata: { inputNi: input.ni, outputNi: response.id, provider: ACTOR }, extensions: [], referenceTaskIds: [] }); }
