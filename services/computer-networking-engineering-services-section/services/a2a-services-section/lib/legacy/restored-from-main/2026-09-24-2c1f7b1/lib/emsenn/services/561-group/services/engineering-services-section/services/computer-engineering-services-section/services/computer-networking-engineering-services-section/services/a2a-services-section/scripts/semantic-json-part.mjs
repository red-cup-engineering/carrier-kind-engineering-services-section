#!/usr/bin/env node
// Semantic-JSON parts carried over A2A, and the semantic-JSON task client built
// on top of a2a-client.mjs. Folds a2a-semantic-json-part-service and
// a2a-semantic-json-task-client-service, mirroring rmn-part.mjs's fold of the
// RMN equivalents.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/runtime";
import { a2aResultParts, discoverAgentCard, ROLE_AGENT, ROLE_USER, sendMessage, TASK_STATE } from "./a2a-client.mjs";
import { discoverSignedAgentCard } from "./agent-card-signing.mjs";

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
  const candidates = (Array.isArray(parts) ? parts : []).filter((part) => part?.mediaType === SEMANTIC_JSON_MEDIA_TYPE && part?.content?.$case === "raw");
  if (candidates.length !== 1) throw new Error(`an A2A semantic JSON operation must carry exactly one ${SEMANTIC_JSON_MEDIA_TYPE} raw part`);
  const part = candidates[0];
  if (part.metadata?.objectKind !== kind) throw new Error(`A2A semantic JSON part declares ${String(part.metadata?.objectKind)} instead of ${kind}`);
  const bytes = Buffer.from(part.content.value ?? []);
  const admitted = admitJsonSemanticContent({ bytes, token: part.metadata?.token, objectKind: kind });
  return Object.freeze({ value: admitted.value, bytes, token: admitted.token, objectKind: kind, filename: part.filename || "semantic-content.cbor" });
}

function semanticJsonMessage(role, options, messageId) {
  return { messageId, contextId: "", taskId: "", role, parts: [semanticJsonPart(options)], metadata: {}, extensions: [], referenceTaskIds: [] };
}

export function userSemanticJsonMessage(options, messageId = randomUUID()) {
  return semanticJsonMessage(ROLE_USER, options, messageId);
}

export function agentSemanticJsonMessage(options, messageId = randomUUID()) {
  return semanticJsonMessage(ROLE_AGENT, options, messageId);
}

export function parseA2aMessage(source) {
  return source;
}

// --- the semantic-JSON task client: hire an A2A provider with one such message ---

const TERMINAL = new Set([TASK_STATE.COMPLETED, TASK_STATE.FAILED, TASK_STATE.CANCELED, TASK_STATE.INPUT_REQUIRED, TASK_STATE.REJECTED, TASK_STATE.AUTH_REQUIRED]);

function refusal(result) {
  const state = result?.status?.state;
  if (state === undefined || state === TASK_STATE.COMPLETED) return null;
  const text = a2aResultParts(result).find((part) => part?.content?.$case === "text")?.content?.value;
  return text ?? `A2A provider ended in task state ${String(state)}`;
}

export async function sendSemanticJsonTask({ agentUrl, objectKind, value, resultObjectKind, requireSignature = true, signal, discover } = {}) {
  if (typeof agentUrl !== "string" || agentUrl.length === 0) throw new TypeError("agentUrl is required");
  const discoverCard = discover ?? (requireSignature ? discoverSignedAgentCard : discoverAgentCard);
  const card = await discoverCard(agentUrl, { signal });
  const message = userSemanticJsonMessage({ objectKind, value });
  const inputPart = extractSemanticJsonPart(message.parts, { objectKind });
  const result = await sendMessage(agentUrl, message, { signal });
  if (typeof result?.id === "string" && !TERMINAL.has(result?.status?.state)) {
    const error = new Error(`A2A task ${result.id} remains nonterminal`);
    error.name = "A2aTaskPendingError";
    error.task = result;
    error.taskId = result.id;
    throw error;
  }
  const denied = refusal(result);
  if (denied) throw new Error(denied);
  const output = extractSemanticJsonPart(a2aResultParts(result), { objectKind: resultObjectKind ?? objectKind });
  return Object.freeze({ result, value: output.value, inputToken: inputPart.token, outputToken: output.token, agentCard: card });
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { agent: { type: "string" }, input: { type: "string" }, "object-kind": { type: "string" }, "result-object-kind": { type: "string" } } });
  if (values.agent && values.input && values["object-kind"]) {
    const result = await sendSemanticJsonTask({ agentUrl: values.agent, objectKind: values["object-kind"], resultObjectKind: values["result-object-kind"], value: JSON.parse(readFileSync(values.input, "utf8")) });
    process.stdout.write(`${JSON.stringify({ value: result.value, inputToken: result.inputToken, outputToken: result.outputToken })}\n`);
  } else if (values.input && values["object-kind"]) {
    process.stdout.write(`${JSON.stringify(userSemanticJsonMessage({ objectKind: values["object-kind"], value: JSON.parse(readFileSync(values.input, "utf8")) }))}\n`);
  } else {
    throw new Error("usage: semantic-json-part.mjs --input <value.json> --object-kind <kind> [--agent <url> --result-object-kind <kind>]");
  }
}
