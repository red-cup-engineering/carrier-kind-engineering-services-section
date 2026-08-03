import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { readFileSync } from "node:fs";
import {
  EVIDENCE_OPERATION,
  readImmutableInductionEvidence,
  signEvidenceRefusal,
  evidenceRequestFromBytes,
  evidenceResultIdentity,
} from "./immutable-induction-evidence.mjs";
import { admit, identify } from "./semantic-content.mjs";
import {
  ACTOR,
  ADMIT_OPERATION,
  CORRECTION_ADMIT_OPERATION,
  CORRECTION_STAGE_OPERATION,
  ReceiverRefusal,
  STAGE_OPERATION,
  reviewAndAdmitStagedSoftwareDelivery,
  reviewAndAdmitStagedSoftwareDeliveryCorrection,
  solicitCorrectionOperation,
  solicitOperation,
  stageAcceptedSoftwareDelivery,
  stageAcceptedSoftwareDeliveryCorrection,
} from "./accepted-software-delivery-receiver.mjs";

export { ACTOR };
export const OPERATIONS = Object.freeze([
  STAGE_OPERATION,
  ADMIT_OPERATION,
  CORRECTION_STAGE_OPERATION,
  CORRECTION_ADMIT_OPERATION,
]);

function requiredEnvironment(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is required for immutable evidence ingress`);
  }
  return value;
}

const OPERATION_KIND = "accepted-software-delivery-receiver.operation";
function rmnId(value) { return identify(value, "accepted-software-delivery-receiver.record-body").id; }
export function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
export function operationBytes(value) { return identify(value, OPERATION_KIND).bytes; }
export function operationFromBytes(bytes) { return admit(bytes, OPERATION_KIND); }
function exact(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "id"));
  return value.id === rmnId(body);
}

function solicitationResult(operation, input) {
  if (operation === STAGE_OPERATION || operation === ADMIT_OPERATION) {
    return solicitOperation(operation, input.requestCore, input.customer, input.recordedAt);
  }
  return solicitCorrectionOperation(operation, input.requestCore, input.customer, input.recordedAt);
}

async function invocationResult(operation, request, options) {
  if (operation === STAGE_OPERATION) return (options.stage ?? stageAcceptedSoftwareDelivery)(request, options.receiver);
  if (operation === ADMIT_OPERATION) return (options.admit ?? reviewAndAdmitStagedSoftwareDelivery)(request, options.receiver);
  if (operation === CORRECTION_STAGE_OPERATION) return (options.correctionStage ?? stageAcceptedSoftwareDeliveryCorrection)(request, options.receiver);
  return (options.correctionAdmit ?? reviewAndAdmitStagedSoftwareDeliveryCorrection)(request, options.receiver);
}

export async function executeOperation(input, options = {}) {
  if (!exact(input) || input.provider !== ACTOR || !OPERATIONS.includes(input.operation)) {
    throw new Error("exact provider-addressed canonical RMN receiver operation is required");
  }
  try {
    if (input.type === "AcceptedSoftwareDeliveryReceiverSolicitation") {
      if (typeof input.customer !== "string" || !input.customer.startsWith("urn:") || !input.requestCore) {
        throw new ReceiverRefusal("invalid-solicitation", "customer and request core are required");
      }
      return record({
        type: "AcceptedSoftwareDeliveryReceiverSolicitationResult",
        provider: ACTOR,
        customer: input.customer,
        request: input.id,
        operation: input.operation,
        offer: solicitationResult(input.operation, input),
      });
    }
    if (input.type === "AcceptedSoftwareDeliveryReceiverInvocation") {
      const result = await invocationResult(input.operation, input.receiverRequest, options);
      return record({
        type: "AcceptedSoftwareDeliveryReceiverInvocationResult",
        provider: ACTOR,
        customer: input.customer,
        request: input.id,
        operation: input.operation,
        result,
      });
    }
    throw new Error(`unsupported accepted-delivery receiver operation: ${String(input.type)}`);
  } catch (error) {
    if (!(error instanceof ReceiverRefusal)) throw error;
    return record({
      type: "AcceptedSoftwareDeliveryReceiverRefusal",
      provider: ACTOR,
      customer: input.customer,
      request: input.id,
      operation: input.operation,
      code: error.code,
      detail: error.message,
      evidence: error.evidence,
      customerMutation: false,
      foreignMutation: false,
    });
  }
}

export async function executeA2aMessage(source, options = {}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("accepted-delivery receiver requires an A2A user Message");
  const input = extractRmnPart(message.parts);
  let evidenceRequest;
  try { evidenceRequest = evidenceRequestFromBytes(input.bytes); } catch {}
  if (evidenceRequest?.type === "ImmutableInductionEvidenceReadRequest") {
    const identityPath = options.evidenceIdentity ??
      requiredEnvironment("IMMUTABLE_EVIDENCE_RECEIVER_IDENTITY");
    const identity = typeof identityPath === "string"
      ? JSON.parse(readFileSync(identityPath, "utf8"))
      : identityPath;
    const evidenceOptions = {
      requestBytes: input.bytes,
      grant: message.metadata?.evidenceReadGrant,
      grantJws: message.metadata?.evidenceReadGrantJws,
      inputJws: message.metadata?.evidenceReadAuthorization?.inputJws,
      dataRoot: options.evidenceDataRoot ??
        requiredEnvironment("IMMUTABLE_EVIDENCE_DATA_ROOT"),
      routesFile: options.evidenceRoutes ??
        requiredEnvironment("IMMUTABLE_EVIDENCE_ROUTES"),
      privateKeyPem: options.evidencePrivateKeyPem ??
        readFileSync(requiredEnvironment("IMMUTABLE_EVIDENCE_SIGNING_KEY"), "utf8"),
      signingKid: options.evidenceSigningKid ??
        requiredEnvironment("IMMUTABLE_EVIDENCE_SIGNING_KID"),
      signingJwks: options.evidenceSigningJwks ??
        requiredEnvironment("IMMUTABLE_EVIDENCE_SIGNING_JWKS"),
      receiverCard: identity,
      receiverAgentUrl: options.evidenceReceiverAgentUrl ??
        requiredEnvironment("IMMUTABLE_EVIDENCE_RECEIVER_AGENT"),
      receiverJwks: options.evidenceReceiverJwks ??
        JSON.parse(readFileSync(
          requiredEnvironment("IMMUTABLE_EVIDENCE_VERIFYING_JWKS"),
          "utf8",
        )),
      fetch: options.fetch,
      discover: options.discover,
    };
    let signed;
    try {
      signed = await (options.readEvidence ?? readImmutableInductionEvidence)(evidenceOptions);
    } catch (error) {
      signed = await (options.refuseEvidence ?? signEvidenceRefusal)({
        ...evidenceOptions,
        reason: error.reason ?? "pre-effect",
      });
    }
    return Message.toJSON({
      messageId: "",
      contextId: message.contextId ?? "",
      taskId: message.taskId ?? "",
      role: Role.ROLE_AGENT,
      parts: [rmnPart(signed.bytes)],
      metadata: {
        inputNi: input.ni,
        outputNi: evidenceResultIdentity(signed.result),
        provider: ACTOR,
        operation: EVIDENCE_OPERATION,
        jws: signed.jws,
      },
      extensions: [],
      referenceTaskIds: [],
    });
  }
  const response = await executeOperation(operationFromBytes(input.bytes), options);
  return Message.toJSON({
    messageId: "",
    contextId: message.contextId ?? "",
    taskId: message.taskId ?? "",
    role: Role.ROLE_AGENT,
    parts: [rmnPart(operationBytes(response))],
    metadata: { inputNi: input.ni, outputNi: response.id, provider: ACTOR },
    extensions: [],
    referenceTaskIds: [],
  });
}
