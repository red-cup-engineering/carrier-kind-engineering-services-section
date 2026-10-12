import { randomUUID } from "node:crypto";

import { Message, Role } from "@a2a-js/sdk";
import {
  admitJsonSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/relation-model-notation-runtime/semantic-content-identity";

export const SEMANTIC_JSON_MEDIA_TYPE = "application/vnd.561-group.semantic-json+cbor";

function requiredText(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} is required`);
  return value;
}

export function semanticJsonPart({ objectKind, value, witnessRoot = EMPTY_WITNESS_ROOT, filename = "semantic-content.cbor" } = {}) {
  const kind = requiredText(objectKind, "semantic JSON objectKind");
  const identified = identifyJsonSemanticContent({ objectKind: kind, value, witnessRoot });
  return Object.freeze({
    content: Object.freeze({ $case: "raw", value: Buffer.from(identified.bytes) }),
    metadata: Object.freeze({ token: identified.token, objectKind: kind }),
    filename,
    mediaType: SEMANTIC_JSON_MEDIA_TYPE,
  });
}

export function extractSemanticJsonPart(parts, { objectKind } = {}) {
  const kind = requiredText(objectKind, "semantic JSON objectKind");
  const candidates = (Array.isArray(parts) ? parts : []).filter(
    (part) => part?.mediaType === SEMANTIC_JSON_MEDIA_TYPE && part?.content?.$case === "raw",
  );
  if (candidates.length !== 1) throw new Error(`an A2A semantic JSON operation must carry exactly one ${SEMANTIC_JSON_MEDIA_TYPE} raw part`);
  const part = candidates[0];
  if (part.metadata?.objectKind !== kind) throw new Error(`A2A semantic JSON part declares ${String(part.metadata?.objectKind)} instead of ${kind}`);
  const bytes = Buffer.from(part.content.value ?? []);
  const admitted = admitJsonSemanticContent({ bytes, token: part.metadata?.token, objectKind: kind });
  return Object.freeze({
    value: admitted.value,
    bytes,
    token: admitted.token,
    objectKind: kind,
    filename: part.filename || "semantic-content.cbor",
  });
}

function semanticJsonMessage(role, options, messageId) {
  return Message.toJSON({
    messageId,
    contextId: "",
    taskId: "",
    role,
    parts: [semanticJsonPart(options)],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  });
}

export function userSemanticJsonMessage(options, messageId = randomUUID()) {
  return semanticJsonMessage(Role.ROLE_USER, options, messageId);
}

export function agentSemanticJsonMessage(options, messageId = randomUUID()) {
  return semanticJsonMessage(Role.ROLE_AGENT, options, messageId);
}

export function parseA2aMessage(source) {
  return Message.fromJSON(source);
}
