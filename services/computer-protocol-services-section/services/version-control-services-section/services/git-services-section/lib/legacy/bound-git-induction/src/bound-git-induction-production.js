import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  a2aResultMetadata,
  a2aResultParts,
} from "@red-cup-engineering/a2a-rmn-task-client-service";
import {
  decodeCarrier,
  encodeCarrier,
  fixtures,
  normalizeCarrierFamily,
} from "./bound-git-induction-wire.js";
import {
  readFrozenRoutes,
  signCarrier,
  verifyActorCarrier,
  verifyCustomerGrant,
} from "./bound-git-induction-auth.js";
import {
  invokeCarrierTask,
  resumeCarrierTask,
} from "./bound-git-induction-client.js";

function exactRawPart(exchange) {
  const parts = a2aResultParts(exchange.result).filter(
    (part) =>
      part?.mediaType === "application/rmn+cbor" &&
      part?.content?.$case === "raw",
  );
  if (parts.length !== 1) throw new Error("malformed-profile-result");
  return Buffer.from(parts[0].content.value ?? []);
}

function signedMetadata(exchange) {
  const metadata = a2aResultMetadata(exchange.result);
  if (!metadata || typeof metadata.jws !== "object") {
    throw new Error("unsigned-provider-result");
  }
  return metadata;
}

function evidenceRequest(operation) {
  const grant = normalizeCarrierFamily(
    "EvidenceGrant",
    operation.artifactReadGrant ?? operation.phaseReadGrant ?? operation.releaseReadGrant,
  );
  const request = structuredClone(
    fixtures[`EvidenceRequest/${grant.purpose}`],
  );
  Object.assign(request, {
    purpose: grant.purpose,
    grantId: semanticId(grant),
    receiverActor: grant.issuerActor,
    providerActor: grant.recipientActor,
    providerCardId: operation.gitCardId,
    providerCardSignatureId: operation.gitCardSignatureId,
    providerKid: operation.gitKid,
    providerJwks: operation.gitJwks,
    objectId: grant.objectId,
    sha256: grant.sha256,
    length: grant.length,
    evidenceRootId: grant.evidenceRootId,
    taskId: grant.taskId,
    nonce: grant.nonce,
  });
  for (const key of [
    "workOrderId",
    "artifactId",
    "candidatePlateId",
    "journalId",
    "phase",
    "allocationId",
    "privateIndexId",
  ]) {
    if (Object.hasOwn(grant, key)) request[key] = grant[key];
  }
  return {
    grant,
    request: normalizeCarrierFamily("EvidenceRequest", request),
  };
}

function requireFunction(value, name) {
  if (typeof value !== "function") {
    throw new Error(`${name}-custody-unavailable`);
  }
  return value;
}

/**
 * Construct the actual provider boundary for one admitted public carrier.
 * Accounts, keys, routes, receiver and coordinator URLs are supplied by a
 * later activation grant; this builder intentionally refuses when any are
 * absent instead of replacing them with test truth values.
 */
export function createProductionContext({
  operationBytes,
  authorization,
  routesFile,
  providerAccount,
  rpcUrl,
  nonceRoot,
  coordinatorIdentity,
  coordinatorAgentUrl,
  receiverAgentUrl,
  objectFormat,
  binding,
  privateKeyPem,
  signingKid,
  signingJwks,
  loadReceipt,
  bindingReceipt,
  loadPrepareChain,
  readPrepareProof,
  fetch,
  discover,
  publicClient,
  invokeTask = invokeCarrierTask,
  resumeTask = resumeCarrierTask,
}) {
  if (!Buffer.isBuffer(operationBytes)) {
    throw new Error("operation-bytes-required");
  }
  if (
    !authorization ||
    typeof authorization.operationJws !== "object" ||
    typeof authorization.customerGrantSignature !== "string" ||
    !Number.isSafeInteger(authorization.customerGrantExpiry)
  ) {
    throw new Error("customer-authorization-unavailable");
  }
  if (
    typeof routesFile !== "string" ||
    typeof providerAccount !== "string" ||
    typeof nonceRoot !== "string" ||
    typeof coordinatorAgentUrl !== "string" ||
    typeof receiverAgentUrl !== "string" ||
    typeof privateKeyPem !== "string" ||
    typeof signingKid !== "string" ||
    typeof signingJwks !== "string"
  ) {
    throw new Error("production-boundary-unavailable");
  }
  const routes = readFrozenRoutes(routesFile);
  return Object.freeze({
    nonceRoot,
    coordinatorIdentity: Object.freeze({ ...coordinatorIdentity }),
    objectFormat,
    binding: Object.freeze({ ...binding }),
    loadReceipt: requireFunction(loadReceipt, "receipt-read"),
    bindingReceipt: requireFunction(bindingReceipt, "binding-read"),
    loadPrepareChain: requireFunction(loadPrepareChain, "prepare-chain-read"),
    publicOperationEvidence: Object.freeze({
      bytes: Buffer.from(operationBytes),
      jws: authorization.operationJws,
    }),
    readPrepareProof,
    async authenticate(operation) {
      return verifyActorCarrier({
        routes,
        actor: operation.customerActor,
        carrier: operation,
        bytes: operationBytes,
        jws: authorization.operationJws,
        prefix: "customer",
        fetch,
        discover,
      });
    },
    async verifyGrant(operation, requestId) {
      if (Date.now() >= authorization.customerGrantExpiry * 1000) {
        throw new Error("expired-customer-grant");
      }
      await verifyCustomerGrant({
        operation,
        requestId,
        signature: authorization.customerGrantSignature,
        expiry: authorization.customerGrantExpiry,
        providerAccount,
        rpcUrl,
        publicClient,
      });
    },
    async readEvidence(operation) {
      if (typeof authorization.evidenceReadGrantJws !== "object") {
        throw new Error("signed-evidence-grant-unavailable");
      }
      const { request } = evidenceRequest(operation);
      const bytes = encodeCarrier("EvidenceRequest", request);
      const inputJws = await signCarrier({
        bytes,
        privateKeyPem,
        kid: signingKid,
        jwks: signingJwks,
      });
      const exchange = await invokeTask({
        agentUrl: receiverAgentUrl,
        bytes,
        metadata: {
          evidenceReadGrant:
            operation.artifactReadGrant ?? operation.phaseReadGrant ?? operation.releaseReadGrant,
          evidenceReadGrantJws: authorization.evidenceReadGrantJws,
          evidenceReadAuthorization: { inputJws },
        },
        requireSignature: true,
      });
      const resultBytes = exactRawPart(exchange);
      const metadata = signedMetadata(exchange);
      let family = "EvidenceResult";
      let result;
      try {
        result = decodeCarrier("EvidenceResult", resultBytes);
      } catch {
        family = "EvidenceRefusal";
        result = decodeCarrier("EvidenceRefusal", resultBytes);
      }
      const resultCardEvidence = await verifyActorCarrier({
        routes,
        actor: result.receiverActor,
        carrier: result,
        bytes: resultBytes,
        jws: metadata.jws,
        prefix: "receiver",
        fetch,
        discover,
      });
      if (family === "EvidenceRefusal") {
        throw Object.assign(new Error(result.reason), {
          reason: result.state === "unresolved" ? "unresolved" : "pre-effect",
          signedEvidenceRefusal: Object.freeze({
            carrier: result,
            jws: metadata.jws,
          }),
        });
      }
      return Object.freeze({
        request,
        result,
        resultBytes: Buffer.from(resultBytes),
        resultJws: metadata.jws,
        resultCardEvidence,
      });
    },
    async invokeProfile(operation, events = {}) {
      const bytes = encodeCarrier("ProfileOperation", operation);
      const inputJws = await signCarrier({
        bytes,
        privateKeyPem,
        kid: signingKid,
        jwks: signingJwks,
      });
      const exchange = await invokeTask({
        agentUrl: coordinatorAgentUrl,
        bytes,
        metadata: { boundGitProfileAuthorization: { inputJws } },
        persist: async persisted => events.persist?.({
          ...persisted,
          profileOperationBytes: Buffer.from(bytes),
          profileOperationJws: inputJws,
          profileOperationCardEvidence: Object.freeze({
            actor: operation.gitActor,
            card: operation.gitCardId,
            signature: operation.gitCardSignatureId,
            kid: operation.gitKid,
            jwks: operation.gitJwks,
          }),
        }),
        observe: events.observe,
        requireSignature: true,
      });
      return verifyProfileExchange({
        exchange,
        operation,
        bytes,
        routes,
        fetch,
        discover,
      });
    },
    async resumeProfile(operation, { taskId, inputNi, observe }) {
      const bytes = encodeCarrier("ProfileOperation", operation);
      const exchange = await resumeTask({
        agentUrl: coordinatorAgentUrl,
        taskId,
        inputNi,
        observe,
        requireSignature: true,
      });
      return verifyProfileExchange({
        exchange,
        operation,
        bytes,
        routes,
        fetch,
        discover,
      });
    },
    async signResult(bytes) {
      return signCarrier({
        bytes,
        privateKeyPem,
        kid: signingKid,
        jwks: signingJwks,
      });
    },
  });
}

export function decodeProfileOutcome(output, operation) {
  let receipt;
  let refusal;
  try {
    receipt = decodeCarrier("ProfileReceipt", output);
  } catch {
    refusal = decodeCarrier("ProfileRefusal", output);
  }
  const carrier = receipt ?? refusal;
  if (
    carrier.operationId !== operation.operationId ||
    carrier.publicRequestId !== operation.publicRequestId
  ) {
    throw new Error("binding-mismatch");
  }
  return Object.freeze({
    family: receipt ? "ProfileReceipt" : "ProfileRefusal",
    carrier,
  });
}

export function profileRefusalError(refusal, jws) {
  const unresolved =
    refusal.state === "unresolved" || refusal.reason === "unresolved";
  return Object.assign(
    new Error(unresolved ? "unresolved" : "profile-refused"),
    {
      reason: unresolved ? "unresolved" : "pre-effect",
      signedProfileRefusal: Object.freeze({ refusal, jws }),
    },
  );
}

async function verifyProfileExchange({
  exchange,
  operation,
  routes,
  fetch,
  discover,
}) {
  const output = exactRawPart(exchange);
  const metadata = signedMetadata(exchange);
  const outcome = decodeProfileOutcome(output, operation);
  const carrier = outcome.carrier;
  const receiptCardEvidence = await verifyActorCarrier({
    routes,
    actor: carrier.coordinatorActor,
    carrier,
    bytes: output,
    jws: metadata.jws,
    prefix: "coordinator",
    fetch,
    discover,
  });
  if (outcome.family === "ProfileRefusal") {
    throw profileRefusalError(carrier, metadata.jws);
  }
  const receipt = carrier;
  const evidence = metadata.profileEvidence;
  if (
    !evidence?.deviceReceipt ||
    semanticId(evidence.deviceReceipt) !== receipt.deviceReceiptId ||
    typeof metadata.deviceReceiptJws !== "object" ||
    typeof metadata.profileEvidenceJws !== "object"
  ) {
    throw new Error("device-receipt-chain-unavailable");
  }
  await verifyActorCarrier({
    routes,
    actor: receipt.coordinatorActor,
    carrier: receipt,
    bytes: semanticBytes(evidence.deviceReceipt),
    jws: metadata.deviceReceiptJws,
    prefix: "coordinator",
    fetch,
    discover,
  });
  await verifyActorCarrier({
    routes,
    actor: receipt.coordinatorActor,
    carrier: receipt,
    bytes: semanticBytes(evidence),
    jws: metadata.profileEvidenceJws,
    prefix: "coordinator",
    fetch,
    discover,
  });
  return Object.freeze({
    receipt,
    proof: evidence.prepareProof,
    signedDeviceReceipt: evidence.deviceReceipt,
    receiptBytes: Buffer.from(output),
    receiptJws: metadata.jws,
    receiptCardEvidence,
  });
}
