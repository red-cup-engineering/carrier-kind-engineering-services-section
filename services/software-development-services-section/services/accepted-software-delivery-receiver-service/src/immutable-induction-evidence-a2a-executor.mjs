/* Dedicated A2A placement for the receiver-owned evidence-read die. */
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { readFileSync } from "node:fs";
import {
  EVIDENCE_OPERATION,
  immutableEvidenceRefusalAddress,
  readImmutableInductionEvidence,
  signEvidenceRefusal,
  evidenceResultIdentity,
} from "./immutable-induction-evidence.mjs";

function required(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${name} is required`);
  return value;
}
function configuration(options) {
  const identity = options.evidenceIdentity ?? JSON.parse(readFileSync(required("IMMUTABLE_EVIDENCE_RECEIVER_IDENTITY"), "utf8"));
  return {
    dataRoot: options.evidenceDataRoot ?? required("IMMUTABLE_EVIDENCE_DATA_ROOT"),
    routesFile: options.evidenceRoutes ?? required("IMMUTABLE_EVIDENCE_ROUTES"),
    privateKeyPem: options.evidencePrivateKeyPem ?? readFileSync(required("IMMUTABLE_EVIDENCE_SIGNING_KEY"), "utf8"),
    signingKid: options.evidenceSigningKid ?? required("IMMUTABLE_EVIDENCE_SIGNING_KID"),
    signingJwks: options.evidenceSigningJwks ?? required("IMMUTABLE_EVIDENCE_SIGNING_JWKS"),
    receiverCard: identity,
    receiverAgentUrl: options.evidenceReceiverAgentUrl ?? required("IMMUTABLE_EVIDENCE_RECEIVER_AGENT"),
    receiverJwks: options.evidenceReceiverJwks ?? JSON.parse(readFileSync(required("IMMUTABLE_EVIDENCE_VERIFYING_JWKS"), "utf8")),
    fetch: options.fetch, discover: options.discover, discoverReceiver: options.discoverReceiver,
  };
}
export async function executeImmutableInductionEvidenceA2aMessage(source, options = {}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("immutable evidence node requires an A2A user Message");
  const input = extractRmnPart(message.parts); // decode failures deliberately reach contracted A2A failed-task custody.
  const address = immutableEvidenceRefusalAddress({
    requestBytes: input.bytes,
    grant: message.metadata?.evidenceReadGrant,
  });
  if (!address) throw new Error("unaddressable-immutable-evidence-input");
  const base = configuration(options);
  const evidence = {
    ...base, requestBytes: input.bytes, grant: message.metadata?.evidenceReadGrant,
    grantJws: message.metadata?.evidenceReadGrantJws,
    inputJws: message.metadata?.evidenceReadAuthorization?.inputJws,
  };
  let signed;
  try {
    signed = await (options.readEvidence ?? readImmutableInductionEvidence)(evidence);
  } catch (error) {
    // Only the core can establish the lawful purpose/grant address.  Failure
    // to do so remains an A2A failed task; never fabricate a wire refusal.
    signed = await (options.refuseEvidence ?? signEvidenceRefusal)({
      ...evidence,
      address,
      reason: address.addressMismatch ? "binding-mismatch" : error.reason ?? "pre-effect",
    });
  }
  return Message.toJSON({
    messageId: "", contextId: message.contextId ?? "", taskId: message.taskId ?? "",
    role: Role.ROLE_AGENT, parts: [rmnPart(signed.bytes)],
    metadata: { inputNi: input.ni, outputNi: evidenceResultIdentity(signed.result), provider: "urn:ame:accepted-software-delivery-receiver-service", operation: EVIDENCE_OPERATION, jws: signed.jws },
    extensions: [], referenceTaskIds: [],
  });
}
