#!/usr/bin/env node
// A contracted A2A provider: one agent whose every task runs a declared executor
// process over exactly one content-addressed input part and must answer with one
// content-addressed output part. Tasks are held in durable custody, so a provider
// restart replays what it left unfinished; an executor may suspend its task on an
// A2A dependency and is resumed when that dependency's terminal push notification
// arrives at its task-scoped callback; push notifications to customers are
// delivered from a durable outbox. Served on the plain-Node A2A server.
import { spawn } from "node:child_process";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isNiUri, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { ROLE_AGENT, ROLE_USER, TASK_STATE, TERMINAL_TASK_STATES } from "./a2a-client.mjs";
import { createA2aServer } from "./a2a-server.mjs";
import { a2aPartBytes } from "./rmn-part.mjs";
import { loadSignedAgentCard, signAgentCard } from "./agent-card-signing.mjs";
import { DurableA2aTaskStore } from "./durable-task-store.mjs";
import { createFilesystemContractedAgentSourcesFromEnvironment } from "./filesystem-state-sources.mjs";
import { DurableDependencyEventInbox, DurablePushNotificationSender, DurablePushNotificationStore } from "./durable-push-notifications.mjs";

function values(flag, argv = process.argv) {
  const result = [];
  for (let index = 0; index < argv.length; index += 1) if (argv[index] === flag) result.push(argv[index + 1]);
  return result;
}
function value(flag, fallback) { const found = values(flag); return found.length === 0 ? fallback : found.at(-1); }
function boundedInteger(flag, fallback, minimum, maximum) {
  const parsed = Number(value(flag, fallback));
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${flag} must be an integer from ${minimum} through ${maximum}`);
  return parsed;
}
function canonicalPositiveInteger(raw, label) {
  if (!/^[1-9][0-9]*$/u.test(raw ?? "")) throw new Error(`${label} must be one canonical positive decimal integer`);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label} exceeds the safe integer range`);
  return parsed;
}

/** The one content-addressed raw part a contracted message must carry, verified against its ni: name. */
function extractAddressedRawPart(parts, label) {
  const candidates = (Array.isArray(parts) ? parts : []).filter((part) => part?.content?.$case === "raw" && isNiUri(part?.metadata?.token ?? part?.metadata?.ni));
  if (candidates.length !== 1) throw new Error(`${label} must carry exactly one content-addressed raw part; found ${candidates.length}`);
  const part = candidates[0];
  const bytes = a2aPartBytes(part.content.value);
  const token = part.metadata.token ?? part.metadata.ni;
  if (!verifyNiUri(bytes, token)) throw new Error("the contracted A2A part bytes do not match their content identity");
  return Object.freeze({ bytes, token, mediaType: part.mediaType, filename: part.filename });
}

/** The one listener systemd socket activation handed this process, or null. */
export function inheritedSystemdListener(environment = process.env, processId = process.pid) {
  const hasPid = environment.LISTEN_PID !== undefined, hasFds = environment.LISTEN_FDS !== undefined, hasNames = environment.LISTEN_FDNAMES !== undefined;
  if (!hasPid && !hasFds && !hasNames) return null;
  if (!hasPid || !hasFds) throw new Error("socket activation requires both LISTEN_PID and LISTEN_FDS");
  if (canonicalPositiveInteger(environment.LISTEN_PID, "LISTEN_PID") !== processId) throw new Error("socket activation LISTEN_PID does not identify this provider process");
  if (canonicalPositiveInteger(environment.LISTEN_FDS, "LISTEN_FDS") !== 1) throw new Error("contracted A2A providers require exactly one inherited listener");
  const names = hasNames ? environment.LISTEN_FDNAMES.split(":") : [];
  if (hasNames && (names.length !== 1 || names[0] !== "a2a")) throw new Error('the inherited contracted A2A listener must be named "a2a"');
  return Object.freeze({ fd: 3, name: "a2a", source: "systemd-socket-activation" });
}

function declaredHttpBearer(card) {
  const requirements = card.securityRequirements ?? [], schemes = card.securitySchemes ?? {};
  const same = (left, right) => JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
  if (requirements.length === 0) {
    if (Object.keys(schemes).length !== 0) throw new Error("an A2A Agent Card cannot declare unused security schemes");
    for (const skill of card.skills ?? []) if ((skill.securityRequirements ?? []).length !== 0) throw new Error("an A2A skill cannot require security absent from its Agent Card");
    return null;
  }
  if (requirements.length !== 1) throw new Error("contracted A2A providers support exactly one global security requirement");
  const names = Object.keys(requirements[0]?.schemes ?? {});
  if (names.length !== 1 || Object.keys(schemes).length !== 1 || !Object.hasOwn(schemes, names[0])) throw new Error("contracted A2A providers require exactly one referenced security scheme");
  const declared = schemes[names[0]]?.httpAuthSecurityScheme;
  if (!declared || String(declared.scheme).toLowerCase() !== "bearer") throw new Error("contracted A2A providers currently admit only standard HTTP Bearer security");
  for (const skill of card.skills ?? []) if (!same(skill.securityRequirements, requirements)) throw new Error("every A2A skill must carry the Agent Card's global security requirement");
  return { name: names[0], requirement: requirements };
}

function readBearerToken(path) {
  const bytes = readFileSync(resolve(path));
  if (bytes.length === 0 || bytes.length > 4096) throw new Error("A2A Bearer token must contain 1 through 4096 bytes");
  const token = bytes.toString("utf8").replace(/\r?\n$/u, "");
  if (!/^[A-Za-z0-9\-._~+/]+=*$/u.test(token)) throw new Error("A2A Bearer token file must contain one RFC 6750 bearer token");
  return token;
}

/** The Agent Card template with BASE_URL and controller account seated, validated for 1.0 interfaces. */
function prepareAgentCard(card, baseUrl, environment) {
  const controllerAccount = environment.CONTROLLER_ACCOUNT;
  if (controllerAccount !== undefined) {
    if (!/^eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}$/u.test(controllerAccount)) throw new Error("CONTROLLER_ACCOUNT must be one EIP-155 CAIP-10 account");
    for (const extension of card.capabilities?.extensions ?? []) {
      if (extension?.params?.profile === "org.emsenn.rmn.sovereign-circuit-interface.v1") extension.params.account = controllerAccount;
    }
  }
  card.capabilities = { ...(card.capabilities ?? {}), pushNotifications: true };
  if (!Array.isArray(card.supportedInterfaces) || card.supportedInterfaces.length === 0) throw new Error("Agent Card requires supportedInterfaces");
  for (const endpoint of card.supportedInterfaces) {
    if (endpoint.protocolVersion !== "1.0") throw new Error("only A2A 1.0 interfaces are admitted");
    if (!["JSONRPC", "HTTP+JSON"].includes(endpoint.protocolBinding)) throw new Error(`unsupported A2A binding ${endpoint.protocolBinding}`);
    if (!String(endpoint.url).startsWith(baseUrl)) throw new Error("Agent Card interfaces must be rooted at --base-url");
  }
  return { card, bearer: declaredHttpBearer(card) };
}

/** A signed card and its JWKS, from injected key material or the provider's configured key files. */
async function signedAgentCard(options, cardPath, baseUrl, environment) {
  if (options.signing) {
    const { sign, jwks, callbackKey } = options.signing;
    if (!callbackKey) throw new Error("custom Agent Card signing requires a separate dependency callback key");
    const template = JSON.parse(readFileSync(resolve(cardPath), "utf8").replaceAll("${BASE_URL}", baseUrl));
    const prepared = prepareAgentCard(template, baseUrl, environment);
    return { ...prepared, card: sign(prepared.card), jwks, callbackKey: Buffer.from(callbackKey) };
  }
  const signingKeyPath = value("--agent-card-signing-key", environment.AGENT_CARD_SIGNING_KEY);
  const jwksPath = value("--agent-card-jwks", environment.AGENT_CARD_JWKS);
  const kid = value("--agent-card-signing-kid", environment.AGENT_CARD_SIGNING_KID);
  const algorithm = value("--agent-card-signing-alg", environment.AGENT_CARD_SIGNING_ALG ?? "EdDSA");
  if (!signingKeyPath || !jwksPath || !kid) throw new Error("contracted A2A providers require an Agent Card signing key, public JWKS, and kid");
  const loaded = await loadSignedAgentCard({ origin: baseUrl, cardPath, signingKeyPath, jwksPath, kid, algorithm });
  const { signatures: _unsigned, ...template } = loaded.card;
  const prepared = prepareAgentCard(template, baseUrl, environment);
  const privateKey = readFileSync(resolve(signingKeyPath), "utf8");
  return {
    ...prepared,
    card: signAgentCard(prepared.card, { privateKey, kid, jku: `${baseUrl}/.well-known/jwks.json`, algorithm }),
    jwks: loaded.jwks,
    callbackKey: createHash("sha256").update("A2A dependency callback\0").update(privateKey).digest(),
  };
}

class TaskCancelledError extends Error {
  constructor(message = "contracted executor cancelled") { super(message); this.name = "TaskCancelledError"; this.cancelled = true; }
}

function signalExecutorGroup(child, signal) {
  if (!child.pid) return;
  try { if (process.platform !== "win32") process.kill(-child.pid, signal); else child.kill(signal); }
  catch (error) { if (error.code !== "ESRCH") throw error; }
}
async function terminateExecutor(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise((accept) => child.once("close", accept));
  signalExecutorGroup(child, "SIGTERM");
  await closed;
}
/** The executor never sees the provider's signing or bearer secrets. */
function executorEnvironment(source, grants) {
  const denied = new Set(["AGENT_CARD_SIGNING_KEY", "AGENT_CARD_SIGNING_KID", "AGENT_CARD_SIGNING_ALG", "A2A_BEARER_TOKEN_FILE", "A2A_BEARER_USER", "A2A_DEPENDENCY_CALLBACK_KEY_FILE"]);
  return { ...Object.fromEntries(Object.entries(source).filter(([name]) => !denied.has(name))), ...grants };
}

function runExecutor(command, args, input, { cwd, taskId, contextId, signal, onCancellation, environment, source }) {
  return new Promise((accept, reject) => {
    if (signal?.aborted) return reject(signal.reason instanceof Error ? signal.reason : new TaskCancelledError());
    const child = spawn(command, args, {
      cwd, env: executorEnvironment(source, { A2A_TASK_ID: taskId, A2A_CONTEXT_ID: contextId, ...environment }),
      stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32",
    });
    const stdout = [], stderr = [];
    let settled = false, cancellation = null;
    const finish = (error, result) => { if (settled) return; settled = true; signal?.removeEventListener("abort", cancel); if (error) reject(error); else accept(result); };
    const cancel = (reason = signal?.reason instanceof Error ? signal.reason : new TaskCancelledError()) => {
      if (cancellation) return cancellation;
      cancellation = terminateExecutor(child).then(() => finish(reason), (error) => finish(error));
      onCancellation?.(cancellation);
      return cancellation;
    };
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.stdin.on("error", (error) => { if (error.code !== "EPIPE") finish(error); });
    child.on("error", (error) => finish(error));
    child.on("close", (code, exitSignal) => {
      if (cancellation) return;
      code === 0 ? finish(undefined, Buffer.concat(stdout))
        : finish(new Error(`contracted executor refused with code ${code ?? "none"} signal ${exitSignal ?? "none"}: ${Buffer.concat(stderr).toString("utf8")}`));
    });
    signal?.addEventListener("abort", cancel, { once: true });
    child.stdin.end(input);
  });
}

function providerExecution(active, termination) {
  return {
    measure: "wall-time-milliseconds",
    wallTimeMilliseconds: Number((process.hrtime.bigint() - active.startedAtMonotonic) / 1_000_000n),
    startedAt: active.startedAt, finishedAt: new Date().toISOString(), termination,
  };
}

const callbackToken = (key, taskId) => createHmac("sha256", key).update(`a2a-parent-task\n${taskId}`, "utf8").digest("base64url");
function sameToken(left, right) {
  const one = Buffer.from(left ?? "", "utf8"), two = Buffer.from(right ?? "", "utf8");
  return one.length === two.length && timingSafeEqual(one, two);
}
function terminalStreamResponse(body) {
  const state = body?.task?.status?.state ?? body?.statusUpdate?.status?.state;
  return TERMINAL_TASK_STATES.has(state);
}

/** Replay a task's latest customer message into its provider, marked with why. */
async function replayTask(sendMessage, task, metadata = {}) {
  const prior = [...(task.history ?? [])].reverse().find((message) => message.role === ROLE_USER);
  if (!prior) throw new Error(`durable task ${task.id} has no customer message to replay`);
  const message = { ...structuredClone(prior), messageId: randomUUID(), taskId: task.id, contextId: task.contextId, metadata: { ...(prior.metadata ?? {}), ...metadata, replayOfMessageId: prior.messageId } };
  await sendMessage({ message, configuration: { returnImmediately: true } });
  return { taskId: task.id, replayed: true, replayOfMessageId: prior.messageId, messageId: message.messageId };
}

/** Replay every task the store holds non-terminal, as a restarted provider must. */
export async function replayInterruptedTasks(sendMessage, taskStore) {
  const outcomes = [];
  for (const task of await taskStore.interrupted()) {
    try { outcomes.push(await replayTask(sendMessage, task, { recoveredAfterInterruption: true })); }
    catch (error) { outcomes.push({ taskId: task.id, replayed: false, reason: error.message }); }
  }
  return outcomes;
}

/** Task and coordination custody from one explicit composition, or the configured filesystem root. */
export function resolveContractedAgentState(options = {}, environment = process.env) {
  const injected = options.taskStore !== undefined || options.taskSource !== undefined || options.coordinationSource !== undefined;
  if (injected) {
    if ((!options.taskStore && !options.taskSource) || !options.coordinationSource) throw new Error("contracted A2A agent requires task and coordination state from one explicit composition");
    return Object.freeze({ taskStore: options.taskStore ?? new DurableA2aTaskStore(options.taskSource), coordinationSource: options.coordinationSource });
  }
  const sources = createFilesystemContractedAgentSourcesFromEnvironment(environment);
  return Object.freeze({ taskStore: new DurableA2aTaskStore(sources.taskSource), coordinationSource: sources.coordinationSource });
}

export async function serveContractedAgent(options = {}) {
  const environment = options.environment ?? process.env;
  const inherited = options.listener ?? inheritedSystemdListener(environment, options.processId ?? process.pid);
  const port = inherited ? null : options.port ?? boundedInteger("--port", "8080", 1, 65535);
  const host = inherited ? null : options.host ?? value("--host", "127.0.0.1");
  if (host !== null && !["127.0.0.1", "localhost", "::1"].includes(host)) throw new Error("public A2A listeners are forbidden: carry A2A inside the actor's ActivityPub CloudEvents membrane");
  const configuredBaseUrl = options.baseUrl ?? value("--base-url", environment.BASE_URL);
  if (inherited && !configuredBaseUrl) throw new Error("an inherited listener requires an explicit public --base-url or BASE_URL");
  const baseUrl = configuredBaseUrl ?? `http://${host}:${port}`;
  const cardPath = options.agentCard ?? value("--agent-card");
  const command = options.executor ?? value("--executor");
  const args = options.executorArgs ?? values("--executor-arg");
  const cwd = options.executorCwd ?? value("--executor-cwd", process.cwd());
  for (const [option, flag] of [["maxBytes", "--max-bytes"], ["requestMaxBytes", "--request-max-bytes"]]) {
    if (options[option] !== undefined || value(flag) !== undefined) throw new Error(`${option} is retired: contracted tasks remain durable until completion, provider refusal, or explicit A2A customer cancellation`);
  }
  if (!cardPath || !command) throw new Error("--agent-card and --executor are required");
  const { taskStore, coordinationSource } = resolveContractedAgentState(options, environment);
  const pushNotificationStore = options.pushNotificationStore ?? new DurablePushNotificationStore(coordinationSource);
  const pushNotificationSender = options.pushNotificationSender ?? new DurablePushNotificationSender(pushNotificationStore, coordinationSource);
  const dependencyEventInbox = options.dependencyEventInbox ?? new DurableDependencyEventInbox(coordinationSource);
  const signed = await signedAgentCard(options, cardPath, baseUrl, environment);
  const bearerTokenPath = options.bearerTokenFile ?? value("--bearer-token-file", environment.A2A_BEARER_TOKEN_FILE);
  const bearerUser = options.bearerUser ?? value("--bearer-user", environment.A2A_BEARER_USER);
  if (signed.bearer && (!bearerTokenPath || !bearerUser)) throw new Error("secured A2A Agent Cards require a Bearer token file and authenticated user name");
  if (!signed.bearer && (bearerTokenPath || bearerUser)) throw new Error("A2A Bearer configuration requires a matching Agent Card security declaration");
  const context = { tenant: "", user: signed.bearer ? { isAuthenticated: true, userName: bearerUser } : undefined, requestedVersion: "1.0" };

  const activeTasks = new Map();
  async function executeTask(message) {
    const { taskId, contextId } = message;
    let release;
    const active = { controller: new AbortController(), contextId, startedAt: new Date().toISOString(), startedAtMonotonic: process.hrtime.bigint(), cleanup: Promise.resolve(), settled: new Promise((accept) => { release = accept; }) };
    activeTasks.set(taskId, active);
    try {
      const input = extractAddressedRawPart(message.parts, "contracted A2A input");
      let output;
      try {
        output = await runExecutor(command, args, Buffer.from(`${JSON.stringify(message)}\n`, "utf8"), {
          cwd, taskId, contextId, signal: active.controller.signal, source: environment,
          onCancellation: (cleanup) => { active.cleanup = cleanup; },
          environment: { A2A_PARENT_CALLBACK_URL: `${baseUrl}/dependency-events/${encodeURIComponent(taskId)}`, A2A_PARENT_CALLBACK_TOKEN: callbackToken(signed.callbackKey, taskId) },
        });
      } catch (error) {
        if (active.controller.signal.aborted || error instanceof TaskCancelledError) throw Object.assign(error, { cancelled: true });
        throw Object.assign(error, { providerExecution: providerExecution(active, "refused") });
      }
      let response;
      try { response = JSON.parse(output.toString("utf8")); }
      catch (error) { throw new Error(`contracted executor did not return an A2A 1.0 Message: ${error.message}`); }
      if (response?.role !== ROLE_AGENT) throw new Error("contracted executor response role must be ROLE_AGENT");
      extractAddressedRawPart(response.parts, "contracted A2A executor output");
      const answered = { ...response, messageId: response.messageId || randomUUID(), contextId, taskId };
      if (response.metadata?.suspension?.type === "A2aTaskDependency") return answered;
      return { ...answered, metadata: { ...(response.metadata ?? {}), inputToken: input.token, inputNi: input.token, providerExecution: providerExecution(active, "completed") } };
    } finally {
      activeTasks.delete(taskId);
      release();
    }
  }
  async function cancelTask(taskId) {
    const active = activeTasks.get(taskId);
    if (!active) return;
    active.controller.abort(new TaskCancelledError("contracted executor cancelled by its A2A customer"));
    await active.cleanup;
  }

  const served = await createA2aServer({
    agentCard: signed.card,
    jwks: signed.jwks,
    host: host ?? "127.0.0.1",
    port: port ?? 0,
    listener: inherited ? { fd: inherited.fd, baseUrl } : undefined,
    bearerToken: signed.bearer ? readBearerToken(bearerTokenPath) : undefined,
    taskStore,
    pushNotificationStore,
    context,
    onTaskEvent: (event) => pushNotificationSender.send(event, context).catch((error) => process.stderr.write(`push delivery obstructed: ${error.stack ?? error.message}\n`)),
    handlers: { "message/send": executeTask, cancel: cancelTask },
    routes: [{
      method: "POST", path: /^\/dependency-events\/[^/]+$/u,
      handle: async (req, res, url, { send, readJsonBody }) => {
        const taskId = decodeURIComponent(url.pathname.slice("/dependency-events/".length));
        const supplied = /^Bearer (\S+)$/u.exec(req.headers.authorization ?? "")?.[1];
        if (!sameToken(supplied, callbackToken(signed.callbackKey, taskId))) return send(res, 401, { error: "task-scoped callback capability required" });
        const body = await readJsonBody(req);
        if (!terminalStreamResponse(body)) return send(res, 202, { accepted: true, resumed: false });
        try {
          const receipt = await dependencyEventInbox.accept(taskId, body);
          drainDependencyEvents(taskId).catch((error) => process.stderr.write(`dependency drain ${taskId} obstructed: ${error.stack ?? error.message}\n`));
          return send(res, 202, { accepted: true, seated: true, duplicate: receipt.duplicate });
        } catch (error) { return send(res, 409, { accepted: false, error: error.message }); }
      },
    }],
  });
  const sendMessage = async (params) => {
    const response = await fetch(served.baseUrl, {
      method: "POST",
      headers: { "content-type": "application/json", ...(signed.bearer ? { authorization: `Bearer ${readBearerToken(bearerTokenPath)}` } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method: "message/send", params }),
    });
    const reply = await response.json();
    if (reply.error) throw new Error(reply.error.message);
    return reply.result;
  };

  // A dependency's terminal event resumes its suspended parent by replaying the parent's customer message.
  const continuationDrains = new Map();
  function drainDependencyEvents(taskId) {
    if (continuationDrains.has(taskId)) return continuationDrains.get(taskId);
    const drain = (async () => {
      if (await dependencyEventInbox.isQuarantined(taskId)) { await dependencyEventInbox.quarantine(taskId, "task coordination trajectory was explicitly dissociated"); return; }
      for (const event of await dependencyEventInbox.pending(taskId)) {
        await activeTasks.get(taskId)?.settled;
        const task = await taskStore.get(taskId);
        if (!task) throw new Error("parent task not found");
        if (![TASK_STATE.COMPLETED, TASK_STATE.FAILED, TASK_STATE.CANCELED].includes(task.status?.state)) {
          await replayTask(sendMessage, task, { dependencyEventAccepted: true });
          await activeTasks.get(taskId)?.settled;
        }
        await dependencyEventInbox.settle(event);
      }
    })().finally(() => {
      if (continuationDrains.get(taskId) === drain) continuationDrains.delete(taskId);
      // A callback can be seated between the final read and the drain's release; start another from durable state.
      dependencyEventInbox.pending(taskId).then((pending) => { if (pending.length > 0) drainDependencyEvents(taskId); })
        .catch((error) => process.stderr.write(`dependency recheck ${taskId} obstructed: ${error.stack ?? error.message}\n`));
    });
    continuationDrains.set(taskId, drain);
    return drain;
  }

  const recovery = await replayInterruptedTasks(sendMessage, taskStore);
  const recoveredPushDeliveries = await pushNotificationSender.replayPending();
  for (const taskId of [...new Set((await dependencyEventInbox.pending()).map((event) => event.taskId))]) {
    drainDependencyEvents(taskId).catch((error) => process.stderr.write(`dependency recovery ${taskId} obstructed: ${error.stack ?? error.message}\n`));
  }
  return {
    server: served.server, baseUrl, card: signed.card, recovery, recoveredPushDeliveries, close: served.close,
    listener: inherited ?? Object.freeze({ host, port: served.port, source: "process-bound-listener" }),
  };
}

export async function serveContractedAgentProcess(options = {}, { processHandle = process, serve = serveContractedAgent } = {}) {
  try {
    const { server, baseUrl } = await serve(options);
    processHandle.stdout.write(`${baseUrl}\n`);
    const stop = () => server.close(() => processHandle.exit(0));
    processHandle.once("SIGINT", stop);
    processHandle.once("SIGTERM", stop);
  } catch (error) {
    processHandle.stderr.write(`${error.stack ?? error.message}\n`);
    processHandle.exitCode = 1;
  }
}

if (import.meta.main) serveContractedAgentProcess();
