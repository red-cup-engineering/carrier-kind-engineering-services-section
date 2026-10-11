#!/usr/bin/env node
import { createHttpServer } from "@red-cup-engineering/http-services-section/node-server";
// Plain-Node A2A 1.0 JSON-RPC server: node:http only, no Express, no old A2A SDK.
// Serves the Agent Card at /.well-known/agent-card.json and dispatches SendMessage,
// tasks/get, and tasks/cancel to a caller-supplied handler map, keyed by JSON-RPC
// method name exactly as the request carries it. tasks/get and tasks/cancel have
// working built-in implementations backed by one in-memory task store (modeled on
// the state machine a2a-task-state-custody-service kept: one current record per
// task, terminal states cannot be reopened); a caller may override either by
// naming it in `handlers`. message/send has no useful built-in: the caller must
// supply it.
import { randomUUID, timingSafeEqual } from "node:crypto";
import http from "node:http";
import { AGENT_CARD_PATH, A2A_PROTOCOL_VERSION, ROLE_AGENT, TASK_STATE, TERMINAL_TASK_STATES } from "./a2a-client.mjs";

import { internalMethod, requestFromJson, resultToJson, wireMethod } from "./json-wire.mjs";

export { AGENT_CARD_PATH, ROLE_AGENT, ROLE_USER, TASK_STATE, TERMINAL_TASK_STATES } from "./a2a-client.mjs";

export class JsonRpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.name = "JsonRpcError";
    this.code = code;
    this.data = data;
  }
}

function refusalMessage(taskId, contextId, error) {
  return {
    messageId: randomUUID(),
    taskId,
    contextId,
    role: ROLE_AGENT,
    parts: [{ content: { $case: "text", value: String(error?.message ?? error) }, metadata: {}, filename: "", mediaType: "text/plain" }],
    metadata: { disposition: "refused", ...(error?.providerExecution ? { providerExecution: error.providerExecution } : {}) },
    extensions: [],
    referenceTaskIds: [],
  };
}

function taskView(task, historyLength) {
  const history = historyLength === 0 ? undefined : historyLength === undefined ? task.history : task.history?.slice(-historyLength);
  return { id: task.id, contextId: task.contextId, status: task.status, ...(history === undefined ? {} : { history }), artifacts: task.artifacts, metadata: task.metadata };
}

/** The in-memory task-state custody a2a-task-state-custody-service kept, minus its
 * network (R2) persistence: one current record per task id, no regression once a
 * task reaches a terminal state. */
export function createInMemoryTaskStore() {
  const tasks = new Map();
  function record(taskId, contextId, message) {
    let task = tasks.get(taskId);
    if (!task) {
      task = { id: taskId, contextId: contextId ?? "", status: { state: TASK_STATE.SUBMITTED, message: undefined, timestamp: new Date().toISOString() }, history: [], artifacts: [], metadata: {} };
      tasks.set(taskId, task);
    }
    if (message && !task.history.some((entry) => entry.messageId === message.messageId)) task.history.push(message);
    return task;
  }
  function get(taskId) {
    return tasks.get(taskId) ?? null;
  }
  function transition(taskId, state, message) {
    const task = tasks.get(taskId);
    if (!task) throw new JsonRpcError(-32602, `unknown task ${taskId}`);
    if (TERMINAL_TASK_STATES.has(task.status.state)) throw new JsonRpcError(-32000, `task ${taskId} is already terminal`);
    task.status = { state, message, timestamp: new Date().toISOString() };
    if (message) task.history.push(message);
    return task;
  }
  function claim(taskId, contextId, message) {
    let task = tasks.get(taskId);
    if (task) {
      return { claimed: false, task };
    }
    task = { id: taskId, contextId: contextId ?? "", status: { state: TASK_STATE.SUBMITTED, message: undefined, timestamp: new Date().toISOString() }, history: [], artifacts: [], metadata: {} };
    if (message) task.history.push(message);
    tasks.set(taskId, task);
    return { claimed: true, task };
  }
  return Object.freeze({ record, get, transition, all: () => [...tasks.values()], claim });
}

// A task store may be synchronous (the in-memory one) or asynchronous (a durable
// custody source); every call is awaited, so both serve the same methods.
export function createA2aTaskMethods(taskStore, handlers, { onTaskEvent, pushNotificationStore } = {}) {
  const emit = async (task, context) => { if (task && onTaskEvent) await onTaskEvent({ task: taskView(task) }, context); return task; };
  const transition = async (taskId, state, message, context) => emit(await taskStore.transition(taskId, state, message), context);
  async function messageSend(params, context) {
    const custom = handlers["message/send"];
    if (typeof custom !== "function") throw new JsonRpcError(-32601, "message/send is not implemented");
    const message = params?.message ?? {};
    const taskId = message.taskId || randomUUID();
    const contextId = message.contextId || randomUUID();
    const prior = await taskStore.get(taskId);
    if (prior && TERMINAL_TASK_STATES.has(prior.status?.state)) return taskView(prior, params?.configuration?.historyLength);
    await taskStore.record(taskId, contextId, message);
    if (prior?.status?.state !== TASK_STATE.WORKING) await transition(taskId, TASK_STATE.WORKING, undefined, context);
    const run = async () => {
      try {
        const answer = await custom({ ...message, taskId, contextId }, { ...context, taskId, contextId });
        // This server creates a task for every hired operation. Keep that custody
        // on the response even when a generic SEN message factory leaves it empty.
        const response = { ...answer, taskId, contextId };
        // An answer that suspends on a dependency keeps its task working; a later
        // dependency event resumes it by replaying the customer message.
        const state = response?.metadata?.suspension ? TASK_STATE.WORKING : TASK_STATE.COMPLETED;
        await transition(taskId, state, response, context);
        return response;
      } catch (error) {
        const refused = error?.cancelled ? undefined : refusalMessage(taskId, contextId, error);
        if (refused) await transition(taskId, TASK_STATE.FAILED, refused, context);
        return refused;
      }
    };
    if (params?.configuration?.returnImmediately === true) {
      run().catch(() => {});
      return taskView(await taskStore.get(taskId), params?.configuration?.historyLength);
    }
    return run();
  }
  async function tasksGet(params) {
    const task = await taskStore.get(params?.id);
    if (!task) throw new JsonRpcError(-32602, `unknown task ${params?.id}`);
    return taskView(task, params?.historyLength);
  }
  async function tasksCancel(params, context) {
    const task = await taskStore.get(params?.id);
    if (!task) throw new JsonRpcError(-32602, `unknown task ${params?.id}`);
    if (typeof handlers.cancel === "function") await handlers.cancel(task.id, context);
    if (!TERMINAL_TASK_STATES.has(task.status.state)) {
      return taskView(await transition(task.id, TASK_STATE.CANCELED, {
        messageId: randomUUID(), taskId: task.id, contextId: task.contextId, role: ROLE_AGENT,
        parts: [{ content: { $case: "text", value: "Task cancellation requested by customer." }, metadata: {}, filename: "", mediaType: "text/plain" }],
        metadata: { disposition: "cancelled" }, extensions: [], referenceTaskIds: [],
      }, context));
    }
    return taskView(task);
  }
  const methods = { "message/send": messageSend, "tasks/get": tasksGet, "tasks/cancel": tasksCancel };
  if (typeof taskStore.list === "function") methods["tasks/list"] = (params) => taskStore.list(params ?? {});
  if (pushNotificationStore) {
    methods["tasks/pushNotificationConfig/set"] = async (params, context) => { await pushNotificationStore.save(params?.taskId, context, params?.pushNotificationConfig ?? params?.config); return params; };
    methods["tasks/pushNotificationConfig/get"] = (params, context) => pushNotificationStore.load(params?.id ?? params?.taskId, context);
    methods["tasks/pushNotificationConfig/list"] = (params, context) => pushNotificationStore.load(params?.id ?? params?.taskId, context);
    methods["tasks/pushNotificationConfig/delete"] = async (params, context) => { await pushNotificationStore.delete(params?.id ?? params?.taskId, context, params?.pushNotificationConfigId); return {}; };
  }
  return methods;
}

async function readJsonBody(req, maxBytes = 8_000_000) {
  let text = "", bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new Error(`A2A request exceeds ${maxBytes} bytes`);
    text += chunk;
  }
  return text.length === 0 ? {} : JSON.parse(text);
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(payload);
}

function bearerAuthorized(req, token) {
  const supplied = Buffer.from(/^Bearer (\S+)$/u.exec(req.headers.authorization ?? "")?.[1] ?? "", "utf8");
  const expected = Buffer.from(String(token), "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/**
 * Serves one A2A 1.0 provider: GET /{agentCardPath} returns `agentCard`, POST /
 * dispatches JSON-RPC 2.0 requests to `handlers` (falling back to the in-memory
 * task store's tasks/get and tasks/cancel).
 */
export async function createA2aServer({
  agentCard,
  handlers = {},
  host = "127.0.0.1",
  port = 0,
  agentCardPath = AGENT_CARD_PATH,
  jwks,
  bearerToken,
  taskStore = createInMemoryTaskStore(),
  pushNotificationStore,
  onTaskEvent,
  routes = [],
  listener,
  context: baseContext = {},
} = {}) {
  if (!agentCard) throw new Error("createA2aServer requires an agentCard");
  // "message/send" in `handlers` is business logic (message in, response message out);
  // the wrapper below is the actual JSON-RPC method, and always owns task bookkeeping.
  // "tasks/get" and "tasks/cancel" in `handlers` fully replace their in-memory-store
  // default, for a caller that wants a different task authority. Any other method
  // name in `handlers` is dispatched to verbatim.
  // agentCard and jwks may be functions of the bound base URL, for a card that
  // names its own endpoint and a signature whose jku is same-origin.
  let servedCard = agentCard, servedJwks = jwks;
  const built = createA2aTaskMethods(taskStore, handlers, { onTaskEvent, pushNotificationStore });
  const { cancel: _cancel, ...named } = handlers;
  const methods = { ...built, ...named, "tasks/get": handlers["tasks/get"] ?? built["tasks/get"], "tasks/cancel": handlers["tasks/cancel"] ?? built["tasks/cancel"], "message/send": built["message/send"] };
  const server = createHttpServer({ handle: async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host ?? `${host}:${port}`}`);
      if (req.method === "GET" && url.pathname === `/${agentCardPath}`) return send(res, 200, servedCard);
      // The signed card's jku names this same-origin sibling key set.
      if (req.method === "GET" && servedJwks && url.pathname === "/.well-known/jwks.json") return send(res, 200, servedJwks);
      // Extra routes (a dependency-callback inbox, say) are the caller's own and carry their own authority.
      for (const route of routes) if (route.method === req.method && (route.path instanceof RegExp ? route.path.test(url.pathname) : url.pathname === route.path)) return route.handle(req, res, url, { send, readJsonBody });
      if (req.method !== "POST") return send(res, 404, { error: "route not found" });
      if (bearerToken !== undefined && !bearerAuthorized(req, bearerToken)) {
        res.setHeader("www-authenticate", 'Bearer realm="A2A"');
        return send(res, 401, { error: "A2A Bearer authentication required" });
      }
      const message = await readJsonBody(req);
      if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string" || !["string", "number"].includes(typeof message.id)) return send(res, 200, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "invalid JSON-RPC request" } });
      const requestedVersion = String(req.headers["a2a-version"] ?? "").trim() || "0.3";
      if (!/^1\.0(?:\.\d+)?$/u.test(requestedVersion)) return send(res, 200, { jsonrpc: "2.0", id: message.id, error: { code: -32009, message: `A2A version ${requestedVersion} is unsupported; this interface speaks ${A2A_PROTOCOL_VERSION}` } });
      // Legacy spellings remain internal function keys, never protocol aliases.
      const handler = wireMethod(message.method) === message.method ? methods[internalMethod(message.method)] : undefined;
      if (typeof handler !== "function") return send(res, 200, { jsonrpc: "2.0", id: message?.id ?? null, error: { code: -32601, message: `unknown method ${message?.method}` } });
      try {
        let params;
        try { params = requestFromJson(message.method, message.params); } catch (error) { throw new JsonRpcError(-32602, error.message); }
        const result = await handler(params, { ...baseContext, req });
        return send(res, 200, { jsonrpc: "2.0", id: message.id, result: resultToJson(message.method, result) });
      } catch (error) {
        const code = error instanceof JsonRpcError ? error.code : -32000;
        return send(res, 200, { jsonrpc: "2.0", id: message.id ?? null, error: { code, message: error.message, ...(error.data !== undefined ? { data: error.data } : {}) } });
      }
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  } });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    if (listener?.fd !== undefined) server.listen({ fd: listener.fd }, () => resolve());
    else server.listen(port, host, () => resolve());
  });
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : port;
  const baseUrl = listener?.baseUrl ?? `http://${host}:${boundPort}`;
  if (typeof servedCard === "function") servedCard = servedCard(baseUrl);
  if (typeof servedJwks === "function") servedJwks = servedJwks(baseUrl);
  return { server, host, port: boundPort, baseUrl, taskStore, close: () => new Promise((resolve) => server.close(resolve)) };
}

/** Convenience matching the retired serveContractedAgentProcess: starts the server,
 * writes its base URL to stdout, and exits cleanly on SIGINT/SIGTERM. */
export async function createA2aServerProcess(options = {}, { processHandle = process, serve = createA2aServer } = {}) {
  try {
    const { baseUrl, close } = await serve(options);
    processHandle.stdout.write(`${baseUrl}\n`);
    const stop = () => close().then(() => processHandle.exit(0));
    processHandle.once("SIGINT", stop);
    processHandle.once("SIGTERM", stop);
  } catch (error) {
    processHandle.stderr.write(`${error.stack ?? error.message}\n`);
    processHandle.exitCode = 1;
  }
}
