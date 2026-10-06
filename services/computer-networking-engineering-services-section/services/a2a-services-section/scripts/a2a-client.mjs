#!/usr/bin/env node
// Plain-Node A2A 1.0 JSON-RPC client. Replaces the old A2A SDK's client surface for
// every house consumer that only needs the message envelope and the four operations this
// house actually calls: agent card discovery, message/send, tasks/get, tasks/cancel.
// message/stream is not implemented (no house consumer polls a live SSE stream; every
// consumer either blocks on message/send or polls tasks/get).
//
// Wire shapes are plain JSON objects, never SDK classes: a Message is
// { messageId, contextId, taskId, role, parts, metadata, extensions, referenceTaskIds }
// and a Task is { id, contextId, status: { state, message, timestamp }, history,
// artifacts, metadata }. `role` and `status.state` are the A2A 1.0 JSON enum spellings
// ("ROLE_USER"/"ROLE_AGENT", "TASK_STATE_*").

import { readFileSync } from "node:fs";

export const ROLE_USER = "ROLE_USER";
export const ROLE_AGENT = "ROLE_AGENT";

/** The A2A protocol version the house speaks. */
export const A2A_PROTOCOL_VERSION = "1.0.0";

/** The well-known Agent Card path of the current A2A specification. */
export const AGENT_CARD_WELL_KNOWN_PATH = ".well-known/agent-card.json";

/** The Agent Card path earlier drafts and SDKs used, which this client fetches and servers still answer. */
export const AGENT_CARD_PATH = ".well-known/agent.json";

export const TASK_STATE = Object.freeze({
  SUBMITTED: "TASK_STATE_SUBMITTED",
  WORKING: "TASK_STATE_WORKING",
  COMPLETED: "TASK_STATE_COMPLETED",
  FAILED: "TASK_STATE_FAILED",
  CANCELED: "TASK_STATE_CANCELED",
  INPUT_REQUIRED: "TASK_STATE_INPUT_REQUIRED",
  REJECTED: "TASK_STATE_REJECTED",
  AUTH_REQUIRED: "TASK_STATE_AUTH_REQUIRED",
});

export const TERMINAL_TASK_STATES = new Set([
  TASK_STATE.COMPLETED,
  TASK_STATE.FAILED,
  TASK_STATE.CANCELED,
  TASK_STATE.INPUT_REQUIRED,
  TASK_STATE.REJECTED,
  TASK_STATE.AUTH_REQUIRED,
]);

function rooted(baseUrl, path) {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).href;
}

export function bearerHeaderFromFile(path) {
  const bytes = readFileSync(path);
  if (bytes.length === 0 || bytes.length > 4096) throw new Error("A2A Bearer token file must contain 1 through 4096 bytes");
  const token = bytes.toString("utf8").replace(/\r?\n$/u, "");
  if (!/^[A-Za-z0-9\-._~+/]+=*$/u.test(token)) throw new Error("A2A Bearer token file must contain one RFC 6750 bearer token");
  return { authorization: `Bearer ${token}` };
}

/** Fetches the Agent Card at the standard well-known resource and returns its plain JSON. */
export async function discoverAgentCard(baseUrl, { fetch: fetchImpl = globalThis.fetch, headers = {}, signal } = {}) {
  const url = rooted(baseUrl, AGENT_CARD_PATH);
  const response = await fetchImpl(url, { headers: { accept: "application/json", ...headers }, signal });
  if (!response.ok) throw new Error(`Agent Card discovery at ${url} returned HTTP ${response.status}`);
  return response.json();
}

let nextRequestId = 1;

/** One JSON-RPC 2.0 request/response round trip against an A2A provider's RPC endpoint. */
export async function callA2aMethod(baseUrl, method, params, { fetch: fetchImpl = globalThis.fetch, headers = {}, rpcPath = "", signal } = {}) {
  const url = rooted(baseUrl, rpcPath);
  const id = nextRequestId++;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    signal,
  });
  if (!response.ok) throw new Error(`A2A ${method} at ${url} returned HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) {
    const error = new Error(body.error.message ?? `A2A ${method} was refused`);
    error.code = body.error.code;
    error.data = body.error.data;
    throw error;
  }
  return body.result;
}

/** Sends one A2A message. Returns whatever the provider returns: a Message (for a
 * provider that completes synchronously) or a Task (for one that does not). */
export function sendMessage(baseUrl, message, options = {}) {
  const { configuration, ...transport } = options;
  return callA2aMethod(baseUrl, "message/send",
    { message, ...(configuration === undefined ? {} : { configuration }) }, transport);
}

export function getTask(baseUrl, taskId, options = {}) {
  return callA2aMethod(baseUrl, "tasks/get", { id: taskId }, options);
}

export function cancelTask(baseUrl, taskId, options = {}) {
  return callA2aMethod(baseUrl, "tasks/cancel", { id: taskId }, options);
}

export function isTerminalTaskState(state) {
  return TERMINAL_TASK_STATES.has(state);
}

/** The parts array carried by either shape a completed exchange may return. */
export function a2aResultParts(result) {
  if (Array.isArray(result?.parts)) return result.parts;
  if (Array.isArray(result?.status?.message?.parts)) return result.status.message.parts;
  if (Array.isArray(result?.artifacts)) return result.artifacts.flatMap((artifact) => artifact.parts ?? []);
  return [];
}

export function a2aResultMetadata(result) {
  if (Array.isArray(result?.parts)) return result.metadata ?? {};
  if (Array.isArray(result?.status?.message?.parts)) return result.status.message.metadata ?? {};
  return result?.metadata ?? {};
}
