// Admission of the stable A2A 1.0 core objects (Message, TaskStatus, Task) a peer returns.
// The client in `a2a-client.mjs` hands back whatever the provider sent; this module is the check a
// consumer runs before it trusts the shape. It is a partial boundary, not a wire-conformance claim:
// bindings, Agent Card discovery and negotiation, security, streaming and push, extensions and the
// A2A TCK are separate obligations. No capability, office, custody or authority field is read into
// or written onto these objects; those are bound beside them by the consumer.

import { ROLE_AGENT, ROLE_USER, TASK_STATE } from "./a2a-client.mjs";

export const A2A_V1_CORE_PROFILE = Object.freeze({
  kind: "a2a-services-section.v1-core-profile",
  releasedVersion: "1.0.0",
  coverage: Object.freeze(["Task", "TaskStatus", "TaskState", "Message"]),
  wireConformant: false,
  reasons: Object.freeze([
    "protocol bindings and operations are not implemented here",
    "AgentCard discovery/version negotiation are not implemented here",
    "security schemes and request authentication are not implemented here",
    "streaming/push/extension negotiation are not implemented here",
    "A2A TCK conformance has not been received",
  ]),
});

export const A2A_V1_TASK_STATES = Object.freeze(["TASK_STATE_UNSPECIFIED", ...Object.values(TASK_STATE)]);

/** States a task rests in until the caller supplies input or credentials; the task is not over. */
export const A2A_V1_INTERRUPTED_TASK_STATES = Object.freeze([TASK_STATE.INPUT_REQUIRED, TASK_STATE.AUTH_REQUIRED]);

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

function isJsonValue(value) {
  if (value === null || ["string", "boolean"].includes(typeof value)) return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function nonempty(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return value;
}

const optionalString = (value, label) => (value === undefined ? undefined : nonempty(value, label));

function stringArray(value, label) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new TypeError(`${label}: expected string array`);
  return Object.freeze(value.map((entry, index) => nonempty(entry, `${label}[${index}]`)));
}

function jsonArray(value, label) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new TypeError(`${label}: expected array`);
  return Object.freeze(value.map((entry, index) => {
    if (!isJsonValue(entry)) throw new TypeError(`${label}[${index}]: expected JSON value`);
    return entry;
  }));
}

function optionalMetadata(value, label) {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !isJsonValue(value)) throw new TypeError(`${label}: expected object`);
  return Object.freeze({ ...value });
}

const present = (key, value) => (value === undefined ? {} : { [key]: value });

/** Admit one A2A 1.0 Message. */
export function admitA2AV1Message(value) {
  if (!isRecord(value)) throw new TypeError("A2A v1 Message: expected object");
  const parts = jsonArray(value.parts, "A2A v1 Message parts");
  if (parts === undefined || parts.length === 0) throw new TypeError("A2A v1 Message parts: expected at least one part");
  if (value.role !== ROLE_USER && value.role !== ROLE_AGENT) throw new TypeError("A2A v1 Message role: unexpected value");
  return Object.freeze({
    messageId: nonempty(value.messageId, "A2A v1 Message messageId"),
    role: value.role,
    parts,
    ...present("contextId", optionalString(value.contextId, "A2A v1 Message contextId")),
    ...present("taskId", optionalString(value.taskId, "A2A v1 Message taskId")),
    ...present("metadata", optionalMetadata(value.metadata, "A2A v1 Message metadata")),
    ...present("extensions", stringArray(value.extensions, "A2A v1 Message extensions")),
    ...present("referenceTaskIds", stringArray(value.referenceTaskIds, "A2A v1 Message referenceTaskIds")),
  });
}

/** Admit one A2A 1.0 TaskStatus. */
export function admitA2AV1TaskStatus(value) {
  if (!isRecord(value)) throw new TypeError("A2A v1 TaskStatus: expected object");
  if (!A2A_V1_TASK_STATES.includes(value.state)) throw new TypeError("A2A v1 task status state: unexpected value");
  return Object.freeze({
    state: value.state,
    ...present("message", value.message === undefined ? undefined : admitA2AV1Message(value.message)),
    ...present("timestamp", optionalString(value.timestamp, "A2A v1 TaskStatus timestamp")),
  });
}

/** Admit one A2A 1.0 Task received from a server. */
export function admitA2AV1Task(value) {
  if (!isRecord(value)) throw new TypeError("A2A v1 Task: expected object");
  let history;
  if (value.history !== undefined) {
    if (!Array.isArray(value.history)) throw new TypeError("A2A v1 Task history: expected array");
    history = Object.freeze(value.history.map(admitA2AV1Message));
  }
  return Object.freeze({
    id: nonempty(value.id, "A2A v1 Task id"),
    status: admitA2AV1TaskStatus(value.status),
    ...present("contextId", optionalString(value.contextId, "A2A v1 Task contextId")),
    ...present("artifacts", jsonArray(value.artifacts, "A2A v1 Task artifacts")),
    ...present("history", history),
    ...present("metadata", optionalMetadata(value.metadata, "A2A v1 Task metadata")),
  });
}

/** A task is final when no further transition is expected of the agent. Interrupted states are not final. */
export function isFinalTaskState(state) {
  return [TASK_STATE.COMPLETED, TASK_STATE.FAILED, TASK_STATE.CANCELED, TASK_STATE.REJECTED].includes(state);
}

export function isSuccessfulTaskState(state) {
  return state === TASK_STATE.COMPLETED;
}
