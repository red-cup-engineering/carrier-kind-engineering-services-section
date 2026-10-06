#!/usr/bin/env node
// SEN parts carried over A2A, and the SEN task client built on top of
// a2a-client.mjs. Folds the former A2A part and task-client services:
// both exist only to carry one content-addressed SEN CBOR blob as an A2A part
// and to hire a signed A2A provider with one such message. Dropped relative to
// the former task-client service: outbound-custody idempotency records,
// push-notification dependency chains, and the multi-transport ClientFactory
// (REST + JSON-RPC) -- this house always speaks JSON-RPC, and durable retry
// custody belongs to a caller that actually needs it, not to every task client.
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { isNiUri, makeNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { a2aResultParts, bearerHeaderFromFile, cancelTask, discoverAgentCard, getTask, isTerminalTaskState, ROLE_AGENT, ROLE_USER, sendMessage, TASK_STATE } from "./a2a-client.mjs";
import { discoverSignedAgentCard } from "./agent-card-signing.mjs";
import { circuitInterfaceFromAgentCard, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "./circuit-interface.mjs";

export { ROLE_AGENT, ROLE_USER } from "./a2a-client.mjs";

export const SEN_MEDIA_TYPE = "application/sen+cbor";

export function rawNi(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("SEN part bytes must be a Uint8Array");
  return makeNiUri(bytes);
}

export function senPart(bytes, filename = "operation.sen.cbor") {
  const body = Buffer.from(bytes);
  return { content: { $case: "raw", value: body.toString("base64") }, metadata: { ni: rawNi(body) }, filename, mediaType: SEN_MEDIA_TYPE };
}

/** A raw part's bytes in every JSON form it travels in: bytes, a byte array, the
 *  { type: "Buffer", data } carrier JSON gives a Buffer, an index-keyed object, or base64 (the A2A JSON wire). */
export function a2aPartBytes(value) {
  if (value instanceof Uint8Array || Array.isArray(value)) return Buffer.from(value);
  if (value?.type === "Buffer" && Array.isArray(value.data)) return Buffer.from(value.data);
  if (typeof value === "string") return Buffer.from(value, "base64");
  if (value && typeof value === "object" && Object.keys(value).every((key) => /^[0-9]+$/u.test(key))) return Buffer.from(Object.keys(value).sort((a, b) => a - b).map((key) => value[key]));
  return Buffer.alloc(0);
}

export function extractSenPart(parts) {
  const candidates = (Array.isArray(parts) ? parts : []).filter((part) => part?.mediaType === SEN_MEDIA_TYPE && part?.content?.$case === "raw");
  if (candidates.length !== 1) throw new Error("an A2A SEN operation must carry exactly one application/sen+cbor raw part");
  const part = candidates[0], bytes = a2aPartBytes(part.content.value), claimed = part.metadata?.ni;
  if (!isNiUri(claimed)) throw new Error("the SEN part must carry a canonical RFC 6920 SHA-256 ni identity");
  if (!verifyNiUri(bytes, claimed)) throw new Error("the SEN part bytes do not match their content identity");
  return { bytes, ni: claimed, filename: part.filename || "operation.sen.cbor" };
}

function senMessage(role, bytes, filename, messageId) {
  return { messageId, contextId: "", taskId: "", role, parts: [senPart(bytes, filename)], metadata: {}, extensions: [], referenceTaskIds: [] };
}

export function userSenMessage(bytes, filename = "operation.sen.cbor", messageId = randomUUID()) {
  return senMessage(ROLE_USER, bytes, filename, messageId);
}

export function agentSenMessage(bytes, filename = "result.sen.cbor", messageId = randomUUID()) {
  return senMessage(ROLE_AGENT, bytes, filename, messageId);
}

/** A2A Message envelopes are plain JSON in this house; parsing is identity. */
export function parseA2aMessage(source) {
  return source;
}

/** Admit the standard A2A Message fields this wire uses and its one SEN operation part. */
export function admitSenMessage(source, { role } = {}) {
  const message = parseA2aMessage(source);
  if (message === null || typeof message !== "object" || Array.isArray(message)) throw new TypeError("A2A SEN message must be an object");
  if (![ROLE_USER, ROLE_AGENT].includes(message.role)) throw new TypeError("A2A SEN message role must be ROLE_USER or ROLE_AGENT");
  if (role !== undefined && message.role !== role) throw new TypeError(`A2A SEN message role must be ${role}`);
  if (typeof message.messageId !== "string" || message.messageId.length === 0) throw new TypeError("A2A SEN message requires messageId");
  const part = extractSenPart(message.parts);
  return Object.freeze({ message, part });
}

// --- the SEN task client: hire a signed A2A provider with one SEN message ---

export class A2aTaskPendingError extends Error {
  constructor(result, agentUrl) {
    super(`A2A task ${result?.id ?? "(unknown)"} remains nonterminal`);
    this.name = "A2aTaskPendingError";
    this.task = result;
    this.taskId = result?.id;
    this.agentUrl = agentUrl;
  }
}

export async function discoverValidatedAgentCard(agentUrl, { requireSignature = false, signal, discover } = {}) {
  const read = discover ?? (requireSignature ? discoverSignedAgentCard : discoverAgentCard);
  return read(agentUrl, { signal });
}

function refusal(result) {
  const text = a2aResultParts(result).find((part) => part?.content?.$case === "text")?.content?.value;
  const state = result?.status?.state;
  const isTaskRefusal = [TASK_STATE.FAILED, TASK_STATE.CANCELED, TASK_STATE.INPUT_REQUIRED, TASK_STATE.REJECTED, TASK_STATE.AUTH_REQUIRED].includes(state);
  return isTaskRefusal ? (text ?? "A2A agent refused the SEN task") : undefined;
}

function requireTerminalTask(result, agentUrl) {
  if (typeof result?.id === "string" && !isTerminalTaskState(result?.status?.state)) throw new A2aTaskPendingError(result, agentUrl);
  return result;
}

function completedExchange(result, extra) {
  const denied = refusal(result);
  if (denied) { const error = new Error(denied); error.result = result; throw error; }
  const output = extractSenPart(a2aResultParts(result));
  return { result, outputNi: output.ni, ...extra };
}

async function connection(agentUrl, requireSignature, signal, bearerTokenFile) {
  const agentCard = await discoverValidatedAgentCard(agentUrl, { requireSignature, signal });
  const headers = bearerTokenFile ? bearerHeaderFromFile(bearerTokenFile) : {};
  if ((agentCard.capabilities?.extensions ?? []).some((extension) => extension.uri === SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION && extension.required)) {
    circuitInterfaceFromAgentCard(agentCard);
  }
  return { agentCard, headers };
}

export async function sendSenTask({ agentUrl, message: source, requireSignature = false, bearerTokenFile, signal }) {
  if (!agentUrl) throw new Error("agentUrl is required");
  const message = { ...source, messageId: source.messageId || randomUUID() };
  if (message.role !== ROLE_USER) throw new Error("outbound A2A message role must be ROLE_USER");
  const input = extractSenPart(message.parts);
  const linked = await connection(agentUrl, requireSignature, signal, bearerTokenFile);
  const result = requireTerminalTask(await sendMessage(agentUrl, message, { headers: linked.headers, signal }), agentUrl);
  return completedExchange(result, { taskId: result.id, inputNi: input.ni, agentCard: linked.agentCard });
}

export async function resumeSenTask({ agentUrl, taskId, requireSignature = false, bearerTokenFile, signal }) {
  if (!agentUrl) throw new Error("agentUrl is required");
  if (typeof taskId !== "string" || taskId.length === 0) throw new Error("taskId is required");
  const linked = await connection(agentUrl, requireSignature, signal, bearerTokenFile);
  const result = requireTerminalTask(await getTask(agentUrl, taskId, { headers: linked.headers, signal }), agentUrl);
  return completedExchange(result, { taskId, agentCard: linked.agentCard });
}

export async function cancelSenTask({ agentUrl, taskId, requireSignature = false, bearerTokenFile, signal }) {
  if (!agentUrl) throw new Error("agentUrl is required");
  if (typeof taskId !== "string" || taskId.length === 0) throw new Error("taskId is required");
  const linked = await connection(agentUrl, requireSignature, signal, bearerTokenFile);
  const result = await cancelTask(agentUrl, taskId, { headers: linked.headers, signal });
  if (result?.id !== taskId || result?.status?.state !== TASK_STATE.CANCELED) throw new Error(`A2A provider did not witness cancellation of task ${taskId}`);
  return Object.freeze({ task: result, taskId, agentCard: linked.agentCard });
}

if (import.meta.main) {
  const value = (flag) => { const at = process.argv.indexOf(flag); return at < 0 ? undefined : process.argv[at + 1]; };
  const command = process.argv[2];
  if (command === "materialize-user-message") {
    const input = value("--input"), output = value("--output");
    if (!input || !output) throw new Error("--input and --output are required");
    const message = userSenMessage(readFileSync(input));
    writeFileSync(output, `${JSON.stringify(message)}\n`, { encoding: "utf8", flag: process.argv.includes("--replace") ? "w" : "wx", mode: 0o644 });
    process.stdout.write(`${JSON.stringify({ type: "A2aSenUserMessageMaterialized", messageId: message.messageId, input: message.parts[0].metadata.ni, output })}\n`);
  } else {
    const agent = value("--agent"), inputFile = value("--input-file");
    if (!agent) throw new Error("send-sen-task usage: sen-part.mjs --agent <url> --input-file <message.json> [--bearer-token-file <path>]");
    sendSenTask({ agentUrl: agent, message: JSON.parse(readFileSync(inputFile ?? 0, "utf8")), bearerTokenFile: value("--bearer-token-file") })
      .then(({ result }) => { process.stdout.write(`${JSON.stringify(result)}\n`); })
      .catch((error) => { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; });
  }
}
