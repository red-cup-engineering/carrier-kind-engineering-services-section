/**
 * integrations/a2a/src/codec — Agent2Agent Agent Cards and tasks.
 *
 * A2A's own concepts (Agent Card, Task) here; the object-capability model they
 * carry (`ObjectCapability`, `CapabilityInvocation`) is realized in the package's
 * shared capability model, which is where the base OCapPub model lives, not
 * reimplemented here.
 */
import { requireJsonValue, type JsonValue } from "../../lib/codecs/json/core.mts";
import { schemaFrom } from "../../lib/schema/contract.mts";
import { a2aAgentCardSchema, a2aTaskSchema } from "../../lib/capability/schemas/index.mts";
import {
  capabilityInvocationContract,
  objectCapabilityContract,
  type CapabilityInvocation,
  type ObjectCapability,
} from "../../lib/capability/index.mts";
import { scopeOf } from "../../work/model.mts";

export const a2aAgentCardContract = schemaFrom(a2aAgentCardSchema);
export const a2aTaskContract = schemaFrom(a2aTaskSchema);

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

export interface A2AAgentCard {
  readonly kind: "a2a.agent-card";
  readonly agent: string;
  readonly endpoint: string;
  readonly capabilities: readonly ObjectCapability[];
}

export interface A2ATask {
  readonly kind: "a2a.task";
  readonly taskId: string;
  readonly contextId: string;
  readonly capability: ObjectCapability;
  readonly input: JsonValue;
}

export function a2aAgentCard(agent: string, endpoint: string, capabilities: readonly ObjectCapability[]): A2AAgentCard {
  return a2aAgentCardContract.assert(Object.freeze({
    kind: "a2a.agent-card" as const,
    agent: nonempty(agent, "agent"),
    endpoint: nonempty(endpoint, "endpoint"),
    capabilities: Object.freeze(capabilities.map((capability) => objectCapabilityContract.assert(capability, "agent-card capability") as ObjectCapability)),
  }), "a2a agent card") as A2AAgentCard;
}

/** Project one capability into an A2A task boundary. */
export function taskFromCapability(input: {
  readonly taskId: string;
  readonly contextId: string;
  readonly capability: ObjectCapability;
  readonly input: JsonValue;
}): A2ATask {
  return a2aTaskContract.assert(Object.freeze({
    kind: "a2a.task" as const,
    taskId: nonempty(input.taskId, "task id"),
    contextId: nonempty(input.contextId, "context id"),
    capability: objectCapabilityContract.assert(input.capability, "task capability") as ObjectCapability,
    input: requireJsonValue(input.input, "task input"),
  }), "a2a task") as A2ATask;
}

/** The task's work-item cell address (`task:<taskId>`, `scopeOf` grammar) —
 *  a wire A2A task and a declared registry task share this address. */
export function workItemCellOfTask(task: A2ATask): string {
  const admitted = a2aTaskContract.assert(task, "a2a task") as A2ATask;
  return scopeOf("task", admitted.taskId);
}

/** Recover the object capability carried by an A2A task. */
export function capabilityFromTask(task: A2ATask): ObjectCapability {
  return (a2aTaskContract.assert(task, "a2a task") as A2ATask).capability;
}

/** Read an A2A task as a concrete capability invocation. */
export function invocationFromTask(task: A2ATask, action?: string): CapabilityInvocation {
  const admitted = a2aTaskContract.assert(task, "a2a task") as A2ATask;
  const selected = action ?? admitted.capability.actions[0];
  if (selected === undefined) throw new TypeError("invocationFromTask: task capability has no action");
  return capabilityInvocationContract.assert(Object.freeze({
    kind: "capability.invocation" as const,
    actor: admitted.capability.holder,
    resource: admitted.capability.resource,
    action: selected,
    input: admitted.input,
  }), "capability invocation") as CapabilityInvocation;
}
