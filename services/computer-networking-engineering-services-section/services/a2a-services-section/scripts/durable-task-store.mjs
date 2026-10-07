import { randomUUID } from "node:crypto";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { ROLE_AGENT, TASK_STATE, TERMINAL_TASK_STATES } from "./a2a-client.mjs";
import { sha256Hex } from "@red-cup-engineering/cryptographic-data-service/integrity";

// A2A task custody over one network (or filesystem) custody/index source: a source
// is { put(record), get({ taskId, tenant }), list({ tenant }) }. Each record is the
// canonical A2A 1.0 envelope of one task with its sha-256, so a task's current state
// survives a provider restart and interrupted tasks can be found and replayed.

function taskStateRecord(envelope) {
  const taskId = envelope?.task?.id, tenant = envelope?.tenant ?? "";
  if (envelope?.protocol !== "A2A" || envelope.protocolVersion !== "1.0" || typeof taskId !== "string" || taskId === "") throw new Error("A2A task-state envelope does not match its tenant and task coordinate");
  return Object.freeze({ taskId, tenant, sha256: sha256Hex(`${canonicalJson(envelope)}\n`), envelope: structuredClone(envelope) });
}

function project(task, historyLength, includeArtifacts = true) {
  const copy = structuredClone(task);
  if (historyLength === 0) copy.history = [];
  else if (Number.isInteger(historyLength) && historyLength > 0) copy.history = (copy.history ?? []).slice(-historyLength);
  if (!includeArtifacts) copy.artifacts = [];
  return copy;
}

/** A capability URL marked ephemeral must never be written to durable custody. */
function containsEphemeralBearer(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (value.mustNotBeRecorded === true && value.durable === false && typeof value.url === "string") return true;
  return Object.values(value).some((child) => containsEphemeralBearer(child, seen));
}

function taskFromRecord(record, taskId, tenant) {
  if (record === null || record === undefined) return undefined;
  const envelope = record.envelope, projection = envelope?.task ?? envelope?.taskIndex;
  if (envelope?.protocol !== "A2A" || envelope.protocolVersion !== "1.0" || envelope.tenant !== tenant || projection?.id !== taskId) {
    throw new Error("task source returned a different A2A task coordinate");
  }
  return structuredClone(projection);
}

const byOldest = (left, right) => (left.status?.timestamp ?? "").localeCompare(right.status?.timestamp ?? "") || left.id.localeCompare(right.id);

/** Durable A2A task custody with the plain server's store interface (record, get,
 * transition, all) plus the reads a restarted provider needs (interrupted, list). */
export class DurableA2aTaskStore {
  constructor(source, { tenant = "" } = {}) {
    if (source === undefined || typeof source.put !== "function" || typeof source.get !== "function" || typeof source.list !== "function") {
      throw new Error("A2A task storage requires one task-state custody/index source");
    }
    this.source = source;
    this.tenant = tenant;
  }

  async save(task) {
    const prior = await this.get(task.id);
    if (prior && TERMINAL_TASK_STATES.has(prior.status?.state) && !TERMINAL_TASK_STATES.has(task.status?.state)) return prior;
    // Custody holds the task's JSON form: absent fields drop, bytes become their JSON carrier.
    const envelope = { protocol: "A2A", protocolVersion: "1.0", tenant: this.tenant, task: JSON.parse(JSON.stringify(task)) };
    if (containsEphemeralBearer(envelope)) throw new Error("ephemeral bearer capability must not enter durable A2A task storage");
    await this.source.put(taskStateRecord(envelope));
    return task;
  }

  async get(taskId) {
    return taskFromRecord(await this.source.get({ taskId, tenant: this.tenant }), taskId, this.tenant) ?? null;
  }

  async record(taskId, contextId, message) {
    const task = (await this.get(taskId)) ?? { id: taskId, contextId: contextId ?? "", status: { state: TASK_STATE.SUBMITTED, message: undefined, timestamp: new Date().toISOString() }, history: [], artifacts: [], metadata: {} };
    if (message && !task.history.some((entry) => entry.messageId === message.messageId)) task.history.push(JSON.parse(JSON.stringify(message)));
    return this.save(task);
  }

  async transition(taskId, state, message) {
    const task = await this.get(taskId);
    if (!task) throw new Error(`unknown task ${taskId}`);
    if (TERMINAL_TASK_STATES.has(task.status.state)) return task;
    task.status = { state, message, timestamp: new Date().toISOString() };
    if (message) task.history.push(JSON.parse(JSON.stringify(message)));
    return this.save(task);
  }

  async all() {
    const records = await this.source.list({ tenant: this.tenant });
    if (!Array.isArray(records)) throw new Error("task source list must return an array");
    return records.map((record) => taskFromRecord(record, record?.taskId, this.tenant)).filter(Boolean);
  }

  /** Tasks a provider left non-terminal when it stopped, oldest first. */
  async interrupted() {
    return (await this.all()).filter((task) => !TERMINAL_TASK_STATES.has(task.status?.state)).sort(byOldest);
  }

  /** Explicitly settle an interrupted task without deleting its trajectory. */
  async cancel(taskId, reason = "Task cancellation requested by customer.") {
    const task = await this.get(taskId);
    if (!task || TERMINAL_TASK_STATES.has(task.status?.state)) return task ?? undefined;
    return this.transition(taskId, TASK_STATE.CANCELED, {
      messageId: randomUUID(), taskId, contextId: task.contextId, role: ROLE_AGENT,
      parts: [{ content: { $case: "text", value: reason }, metadata: {}, filename: "", mediaType: "text/plain" }],
      metadata: { disposition: "cancelled" }, extensions: [], referenceTaskIds: [],
    });
  }

  /** A2A tasks/list: newest first, filtered and paged by an opaque cursor. */
  async list(params = {}) {
    let tasks = await this.all();
    if (params.contextId) tasks = tasks.filter((task) => task.contextId === params.contextId);
    if (params.status) tasks = tasks.filter((task) => task.status?.state === params.status);
    if (params.statusTimestampAfter) {
      const after = new Date(params.statusTimestampAfter).getTime();
      tasks = tasks.filter((task) => new Date(task.status?.timestamp ?? 0).getTime() >= after);
    }
    tasks.sort((left, right) => byOldest(right, left));
    const totalSize = tasks.length;
    if (params.pageToken) {
      const [timestamp, ...id] = Buffer.from(params.pageToken, "base64").toString("utf8").split("|");
      const cursor = tasks.findIndex((task) => (task.status?.timestamp ?? "") === timestamp && task.id === id.join("|"));
      tasks = cursor < 0 ? [] : tasks.slice(cursor + 1);
    }
    const pageSize = Math.max(1, Math.min(params.pageSize ?? 50, 100));
    const page = tasks.slice(0, pageSize), last = page.at(-1);
    return {
      tasks: page.map((task) => project(task, params.historyLength, params.includeArtifacts === true)),
      nextPageToken: last && tasks.length > page.length ? Buffer.from(`${last.status?.timestamp ?? ""}|${last.id}`).toString("base64") : "",
      pageSize,
      totalSize,
    };
  }

  /** Atomically admit a new task if it does not already exist. */
  async claim(taskId, contextId, message) {
    const task = { id: taskId, contextId: contextId ?? "", status: { state: TASK_STATE.SUBMITTED, message: undefined, timestamp: new Date().toISOString() }, history: [], artifacts: [], metadata: {} };
    if (message) task.history.push(JSON.parse(JSON.stringify(message)));
    const envelope = { protocol: "A2A", protocolVersion: "1.0", tenant: this.tenant, task: JSON.parse(JSON.stringify(task)) };
    if (containsEphemeralBearer(envelope)) throw new Error("ephemeral bearer capability must not enter durable A2A task storage");
    const result = await this.source.create(taskStateRecord(envelope));
    if (result.created) {
      return { claimed: true, task };
    }
    const existing = taskFromRecord(result.record, taskId, this.tenant);
    return { claimed: false, task: existing };
  }
}
