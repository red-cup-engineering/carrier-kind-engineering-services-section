import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import {
  isNiUri,
  makeNiUri,
  verifyNiUri,
} from "@red-cup-engineering/uri-services-section/ni-uri";

export const RMN_MEDIA_TYPE = "application/rmn+cbor";

export function rawNi(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("RMN part bytes must be a Uint8Array");
  return makeNiUri(bytes);
}

export function rmnPart(bytes, filename = "operation.rmn.cbor") {
  const body = Buffer.from(bytes), ni = rawNi(body);
  return {
    content: { $case: "raw", value: body },
    metadata: { ni },
    filename,
    mediaType: RMN_MEDIA_TYPE
  };
}

export function extractRmnPart(parts) {
  const candidates = (Array.isArray(parts) ? parts : []).filter((part) => part?.mediaType === RMN_MEDIA_TYPE && part?.content?.$case === "raw");
  if (candidates.length !== 1) throw new Error("an A2A RMN operation must carry exactly one application/rmn+cbor raw part");
  const part = candidates[0], bytes = Buffer.from(part.content.value ?? []), claimed = part.metadata?.ni;
  if (!isNiUri(claimed)) throw new Error("the RMN part must carry a canonical RFC 6920 SHA-256 ni identity");
  if (!verifyNiUri(bytes, claimed)) throw new Error("the RMN part bytes do not match their content identity");
  return { bytes, ni: claimed, filename: part.filename || "operation.rmn.cbor" };
}

export function userRmnMessage(bytes, filename = "operation.rmn.cbor", messageId = randomUUID()) {
  return Message.toJSON({ messageId, contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(bytes, filename)], metadata: {}, extensions: [], referenceTaskIds: [] });
}

export function agentRmnMessage(bytes, filename = "result.rmn.cbor", messageId = randomUUID()) {
  return Message.toJSON({ messageId, contextId: "", taskId: "", role: Role.ROLE_AGENT, parts: [rmnPart(bytes, filename)], metadata: {}, extensions: [], referenceTaskIds: [] });
}

export function parseA2aMessage(source) { return Message.fromJSON(source); }
