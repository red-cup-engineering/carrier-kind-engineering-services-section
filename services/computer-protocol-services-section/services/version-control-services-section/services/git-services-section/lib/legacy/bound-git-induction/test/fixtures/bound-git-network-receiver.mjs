import { readFileSync } from "node:fs";
import { importJWK, flattenedVerify } from "jose";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  agentRmnMessage,
  extractRmnPart,
  parseA2aMessage,
} from "@red-cup-engineering/a2a-rmn-part-service";
import {
  decodeCarrier,
  encodeCarrier,
  fixtures,
  normalizeCarrierFamily,
  validateCarrierEquality,
} from "../../src/bound-git-induction-wire.js";
import { signCarrier } from "../../src/bound-git-induction-auth.js";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const message = parseA2aMessage(
  JSON.parse(Buffer.concat(chunks).toString("utf8")),
);
const { bytes } = extractRmnPart(message.parts);
const request = decodeCarrier("EvidenceRequest", bytes);
const grant = normalizeCarrierFamily(
  "EvidenceGrant",
  message.metadata?.evidenceReadGrant,
);
const grantJws = message.metadata?.evidenceReadGrantJws;
const requestJws = message.metadata?.evidenceReadAuthorization?.inputJws;
const gitEvidence = JSON.parse(process.env.BGIT_TEST_GIT_EVIDENCE);
const receiverEvidence = JSON.parse(process.env.BGIT_TEST_RECEIVER_EVIDENCE);
for (const [suffix, evidenceKey] of [
  ["CardId", "card"],
  ["CardSignatureId", "signature"],
  ["Kid", "kid"],
  ["Jwks", "jwks"],
]) {
  if (request[`provider${suffix}`] !== gitEvidence[evidenceKey]) {
    throw new Error(`provider-${suffix}-drift`);
  }
}
await flattenedVerify(
  requestJws,
  await importJWK(JSON.parse(process.env.BGIT_TEST_GIT_JWK), "EdDSA"),
);
await flattenedVerify(
  grantJws,
  await importJWK(JSON.parse(process.env.BGIT_TEST_RECEIVER_JWK), "EdDSA"),
);
validateCarrierEquality({ grant, request });
const artifactBytes = Buffer.from(process.env.BGIT_TEST_ARTIFACT, "base64");
const result = structuredClone(fixtures[`EvidenceResult/${request.purpose}`]);
Object.assign(result, {
  purpose: request.purpose,
  requestId: semanticId(request),
  grantId: request.grantId,
  receiverActor: request.receiverActor,
  providerActor: request.providerActor,
  receiverCardId: receiverEvidence.card,
  receiverCardSignatureId: receiverEvidence.signature,
  receiverKid: receiverEvidence.kid,
  receiverJwks: receiverEvidence.jwks,
  providerCardId: request.providerCardId,
  providerCardSignatureId: request.providerCardSignatureId,
  providerKid: request.providerKid,
  providerJwks: request.providerJwks,
  objectId: request.objectId,
  taskId: request.taskId,
  bytes: artifactBytes,
  sha256: request.sha256,
  length: artifactBytes.length,
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
  if (Object.hasOwn(request, key)) result[key] = request[key];
}
const normalized = normalizeCarrierFamily("EvidenceResult", result);
validateCarrierEquality({ grant, request, result: normalized });
const output = encodeCarrier("EvidenceResult", normalized);
const response = agentRmnMessage(output);
response.metadata = {
  ...response.metadata,
  jws: await signCarrier({
    bytes: output,
    privateKeyPem: readFileSync(process.env.BGIT_TEST_RECEIVER_KEY, "utf8"),
    kid: receiverEvidence.kid,
    jwks: receiverEvidence.jwks,
  }),
  requestNi: semanticId(request),
  requestBytesNi: semanticId(normalizeCarrierFamily("EvidenceRequest", request)),
  grantBytesNi: semanticId(normalizeCarrierFamily("EvidenceGrant", grant)),
  requestSemanticBytes: semanticBytes(request).length,
};
process.stdout.write(`${JSON.stringify(response)}\n`);
