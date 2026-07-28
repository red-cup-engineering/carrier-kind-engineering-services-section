import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { admitCustomerTrajectoryFoldback, appendMissionCheckpoint, appendTrajectory, inducedTrajectoryResolver, latestMissionCheckpoint, missionMemoryContext, promotionReadout, recallTrajectories } from "./memory.mjs";
export const PROFILE = "org.emsenn.software.trajectory-memory.v1";
export const PROVIDER_ACCOUNT = "eip155:5615610:0x4c684d1d810702fd3488caa60035b9e8e98bf199";
const PORTS = new Set(["append", "mission-context", "recall", "resolve", "promotion", "checkpoint", "read-checkpoint", "admit-foldback"]);
function exactKeys(value, keys) { return value && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
function typed(value) { const encoded = encodeRelationalValue(value), term = ["ascribe", encoded.type, encoded.term]; return { bytes: semanticBytes(term), id: semanticId(term), term }; }
export function normalizeRequest(value) { if (!exactKeys(value, ["input", "kind", "port"]) || value.kind !== "SoftwareTrajectoryMemoryRequest" || !PORTS.has(value.port) || !value.input || Object.getPrototypeOf(value.input) !== Object.prototype) throw new Error("trajectory memory request has an unknown, absent, or legacy field"); return value; }
export function encodeRequest(value) { return typed(normalizeRequest(value)); }
export function decodeRequest(type, term) { if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new Error("trajectory memory request must use relational RMN"); return normalizeRequest(decodeRelationalValue(type, term)); }
export async function performRequest(value, options = {}) {
  const request = normalizeRequest(value); let output;
  if (request.port === "append") output = await (options.appendTrajectory ?? appendTrajectory)(request.input.record, options.memory);
  else if (request.port === "checkpoint") output = await (options.appendMissionCheckpoint ?? appendMissionCheckpoint)(request.input.checkpoint, options.memory);
  else if (request.port === "read-checkpoint") output = await (options.latestMissionCheckpoint ?? latestMissionCheckpoint)(request.input.missionId, request.input.sourceIdentity, options.memory);
  else if (request.port === "mission-context") output = await (options.missionMemoryContext ?? missionMemoryContext)(request.input.objective, request.input.taskClass ?? null, request.input.missionId, request.input.sourceIdentity, options.memory);
  else if (request.port === "recall") output = await (options.recallTrajectories ?? recallTrajectories)(request.input.objective, { ...options.memory, taskClass: request.input.taskClass ?? null });
  else if (request.port === "resolve") output = await (options.inducedTrajectoryResolver ?? inducedTrajectoryResolver)(request.input.taskClass, options.memory);
  else if (request.port === "promotion") output = await (options.promotionReadout ?? promotionReadout)(request.input.taskClass, options.memory);
  else output = await (options.admitCustomerTrajectoryFoldback ?? admitCustomerTrajectoryFoldback)(request.input.activity, { expectedCustomer: request.input.expectedCustomer, expectedSupplier: request.input.expectedSupplier, ...options.memory });
  const receipt = { kind: "SoftwareTrajectoryMemoryReceipt", profile: PROFILE, provider: PROVIDER_ACCOUNT, subject: typed(request).id, port: request.port, output }; const document = typed(receipt); return { receipt, semanticId: document.id, canonicalBytes: document.bytes };
}
export function decodeReceipt(type, term) { if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new Error("trajectory memory receipt must use relational RMN"); const value = decodeRelationalValue(type, term); if (!exactKeys(value, ["kind", "output", "port", "profile", "provider", "subject"]) || value.kind !== "SoftwareTrajectoryMemoryReceipt" || value.profile !== PROFILE || value.provider !== PROVIDER_ACCOUNT || !PORTS.has(value.port)) throw new Error("trajectory memory receipt is malformed or foreign"); return value; }
