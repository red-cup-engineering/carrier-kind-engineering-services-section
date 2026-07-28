import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION, circuitInterfaceFromAgentCard } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";
import { SOFTWARE_TRAJECTORY_MEMORY_LAW } from "./law.mjs";
import { decodeReceipt, encodeRequest } from "./protocol.mjs";
export { deriveInducedTrajectoryResolver, trajectoryFingerprint, trajectoryRecipeFingerprint } from "./memory.mjs";
const parts = a2aResultParts;
export async function transactSoftwareTrajectoryMemory(port, input, { agentCardUrl = process.env.SOFTWARE_TRAJECTORY_MEMORY_AGENT_CARD_URL, signal, send = sendRmnTask, invocation } = {}) { if (!agentCardUrl) throw new Error("SOFTWARE_TRAJECTORY_MEMORY_AGENT_CARD_URL is required"); const addressedInput = typeof invocation === "string" && invocation !== "" ? { ...input, invocation } : input; const request = encodeRequest({ kind: "SoftwareTrajectoryMemoryRequest", port, input: addressedInput }); const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(request.bytes, "software-trajectory-memory-request.rmn.cbor")], metadata: {}, extensions: [], referenceTaskIds: [] }); const exchange = await send({ agentUrl: agentCardUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], requireSignature: true, message, ...(signal ? { signal } : {}) }); const output = extractRmnPart(parts(exchange.result)), term = decodeSemantic(output.bytes); if (!semanticBytes(term).equals(output.bytes) || term?.[0] !== "ascribe" || term.length !== 3) throw new Error("trajectory memory provider returned noncanonical RMN"); const receipt = decodeReceipt(term[1], term[2]), provider = circuitInterfaceFromAgentCard(exchange.agentCard); if (provider.component.law !== SOFTWARE_TRAJECTORY_MEMORY_LAW.id || receipt.provider !== provider.account || receipt.subject !== request.id || receipt.port !== port) throw new Error("trajectory memory receipt does not bind the contracted face, port, and exact subject"); return receipt.output; }
export const appendSoftwareTrajectory = (record, options) => transactSoftwareTrajectoryMemory("append", { record }, options);
export const appendSoftwareMissionCheckpoint = (checkpoint, options) => transactSoftwareTrajectoryMemory("checkpoint", { checkpoint }, options);
export const readSoftwareMissionCheckpoint = (missionId, sourceIdentity, options) => transactSoftwareTrajectoryMemory("read-checkpoint", { missionId, sourceIdentity }, options);
export const readSoftwareMissionMemoryContext = (objective, taskClass, missionId, sourceIdentity, options) => transactSoftwareTrajectoryMemory("mission-context", { objective, taskClass, missionId, sourceIdentity }, options);
export const recallSoftwareTrajectories = (objective, { taskClass = null, ...options } = {}) => transactSoftwareTrajectoryMemory("recall", { objective, taskClass }, options);
export const resolveInducedSoftwareTrajectory = (taskClass, options = {}) => transactSoftwareTrajectoryMemory("resolve", { taskClass }, options);
export const readSoftwareTrajectoryPromotion = (taskClass, options = {}) => transactSoftwareTrajectoryMemory("promotion", { taskClass }, options);
export const admitCustomerTrajectoryFoldback = (activity, expectedCustomer, expectedSupplier, options = {}) => transactSoftwareTrajectoryMemory("admit-foldback", { activity, expectedCustomer, expectedSupplier }, options);
