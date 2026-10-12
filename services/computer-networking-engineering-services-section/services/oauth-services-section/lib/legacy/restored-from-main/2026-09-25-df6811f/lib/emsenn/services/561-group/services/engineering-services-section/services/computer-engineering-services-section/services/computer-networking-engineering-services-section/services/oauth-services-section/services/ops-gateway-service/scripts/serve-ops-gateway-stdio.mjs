#!/usr/bin/env node
import readline from "node:readline";
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { createMachineTokenClient } from "../src/machine-token-client.mjs";
import { postMcpJsonRpc } from "../src/mcp-streamable-http-post.mjs";

/** Newline-delimited JSON-RPC over this process's own stdio: the local side of the bridge. */
function createNdjsonStdioTransport({ input = process.stdin, output = process.stdout } = {}) {
  const transport = {
    onmessage: undefined,
    onerror: undefined,
    onclose: undefined,
    async start() {
      const lines = readline.createInterface({ input, crlfDelay: Infinity });
      lines.on("line", (line) => {
        if (!line.trim()) return;
        try {
          transport.onmessage?.(JSON.parse(line));
        } catch (error) {
          transport.onerror?.(error);
        }
      });
      lines.on("close", () => transport.onclose?.());
    },
    async send(message) { output.write(`${JSON.stringify(message)}\n`); },
    async close() { input.destroy?.(); },
  };
  return transport;
}

/** One MCP Streamable HTTP remote, reached one POST per message: the remote side of the bridge. */
function createStreamableHttpClientTransport(url, { requestInit = {}, fetch: fetchImpl = fetch } = {}) {
  const transport = {
    sessionId: undefined,
    onmessage: undefined,
    onerror: undefined,
    onclose: undefined,
    async start() {},
    async send(message) {
      try {
        const headers = { ...requestInit.headers, ...(transport.sessionId === undefined ? {} : { "mcp-session-id": transport.sessionId }) };
        const { message: response, sessionId } = await postMcpJsonRpc(url, { headers, body: message, fetchImpl });
        if (sessionId !== undefined) transport.sessionId = sessionId;
        if (response !== undefined) transport.onmessage?.(response);
      } catch (error) {
        transport.onerror?.(error);
        throw error;
      }
    },
    async close() {},
  };
  return transport;
}

const REFRESH_INTERVAL_MS = 5 * 60_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
/** JSON-RPC error codes: the MCP SDK's RequestTimeout, and a server-defined code for a failed remote hop. */
const REQUEST_TIMEOUT_CODE = -32001;
const REMOTE_SEND_FAILED_CODE = -32000;
const INTERNAL_ID_PREFIX = "ops-gateway-stdio:initialize:";

const isRequest = (message) => message !== null && typeof message === "object" && message.id !== undefined && typeof message.method === "string";
const isResponse = (message) => message !== null && typeof message === "object" && message.id !== undefined && message.method === undefined;
const SAFE_METHODS = new Set(["initialize", "ping", "tools/list", "resources/list", "resources/read", "prompts/list", "prompts/get"]);

/**
 * A JSON-RPC pipe between an MCP Streamable HTTP remote (ops.561.group's
 * `/mcp`, reached with a client_credentials bearer token this process
 * refreshes) and a local stdio MCP client such as the Claude Code harness.
 * Both SDK transports parse/frame the wire protocol. This module owns the two
 * `send` hops, the token refresh, and the one thing a dumb pipe lacks: every
 * local request gets an answer. A request the remote does not answer within
 * `OPS_MCP_REQUEST_TIMEOUT_MS` (default 120000) receives a JSON-RPC error
 * naming the timeout, and the remote session is reset (closed, reopened, and
 * the cached `initialize` handshake replayed) so the next request reaches a
 * live session. A 401 is retried once because the remote rejected it before
 * execution; other send failures replay only known read operations, so a
 * mutation with uncertain delivery is surfaced to the caller. A silent hang is never a possible
 * outcome (the 2026-09-05 admission that sat 1,049s with no datum).
 *
 * @param {{
 *   environment?: Record<string, string | undefined>,
 *   fetchImpl?: typeof fetch,
 *   localTransport?: unknown,
 *   remoteTransportFactory?: (url: URL, opts: object) => unknown,
 *   setTimeoutImpl?: typeof setTimeout,
 *   clearTimeoutImpl?: typeof clearTimeout,
 * }} [options]
 */
export async function serveOpsMcpStdioBridge({
  environment = process.env,
  fetchImpl = fetch,
  localTransport = createNdjsonStdioTransport(),
  remoteTransportFactory = (url, opts) => createStreamableHttpClientTransport(url, opts),
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
} = {}) {
  const origin = (environment.OPS_MCP_ORIGIN ?? "https://ops.561.group").replace(/\/$/, "");
  const clientId = environment.OPS_MCP_CLIENT_ID;
  const clientSecret = environment.OPS_MCP_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new TypeError("OPS_MCP_CLIENT_ID and OPS_MCP_CLIENT_SECRET are required");
  const requestTimeoutMs = Number(environment.OPS_MCP_REQUEST_TIMEOUT_MS ?? DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) throw new TypeError("OPS_MCP_REQUEST_TIMEOUT_MS must be a positive number of milliseconds");

  const tokenClient = createMachineTokenClient({ tokenUrl: new URL("/oauth/token", origin), clientId, clientSecret, fetchImpl });
  const authHeaders = { Authorization: `Bearer ${await tokenClient.getToken()}` };
  const remoteUrl = new URL("/mcp", origin);
  const logError = (label) => (error) => process.stderr.write(`[ops-mcp-stdio] ${label}: ${error?.stack ?? error}\n`);
  const isUnauthorized = (error) => error?.code === 401 || error?.status === 401;

  /** @type {Map<string | number, { timer: ReturnType<typeof setTimeout>, method: string, message: object }>} */
  const pending = new Map();
  const readOnlyTools = new Set();
  /** The local client's own `initialize` params, replayed on every remote reset. */
  let cachedInitializeParams;
  let internalIdCounter = 0;
  /** Resolvers for the bridge's own replayed `initialize` requests, keyed by internal id. */
  const internalInitializations = new Map();
  let remote;
  let resetting = null;
  let closed = false;

  const answerLocally = (id, code, message, data) => {
    localTransport.send({ jsonrpc: "2.0", id, error: { code, message, data } }).catch(logError("remote -> stdout failed"));
  };

  const settle = (id) => {
    const entry = pending.get(id);
    if (entry === undefined) return;
    clearTimeoutImpl(entry.timer);
    pending.delete(id);
  };

  const attachRemote = (transport) => {
    transport.onmessage = (message) => {
      if (isResponse(message) && typeof message.id === "string" && message.id.startsWith(INTERNAL_ID_PREFIX)) {
        internalInitializations.get(message.id)?.(message);
        internalInitializations.delete(message.id);
        return;
      }
      if (isResponse(message)) {
        const entry = pending.get(message.id);
        if (entry?.method === "tools/list") {
          readOnlyTools.clear();
          for (const tool of message.result?.tools ?? []) {
            if (tool?.annotations?.readOnlyHint === true && typeof tool.name === "string") readOnlyTools.add(tool.name);
          }
        }
        settle(message.id);
      }
      localTransport.send(message).catch(logError("remote -> stdout failed"));
    };
    transport.onerror = logError("remote transport error");
    transport.onclose = () => { if (!closed && remote === transport) process.stderr.write("[ops-mcp-stdio] remote transport closed; it is reopened on the next request\n"); };
  };

  const openRemote = async () => {
    const transport = remoteTransportFactory(remoteUrl, { requestInit: { headers: authHeaders }, fetch: fetchImpl });
    attachRemote(transport);
    await transport.start();
    return transport;
  };

  const replayHandshake = async (transport) => {
    if (cachedInitializeParams === undefined) return;
    internalIdCounter += 1;
    const id = `${INTERNAL_ID_PREFIX}${internalIdCounter}`;
    const answered = new Promise((resolve, reject) => {
      const timer = setTimeoutImpl(() => { internalInitializations.delete(id); reject(new Error(`remote initialize did not answer within ${requestTimeoutMs}ms`)); }, requestTimeoutMs);
      timer.unref?.();
      internalInitializations.set(id, (message) => { clearTimeoutImpl(timer); resolve(message); });
    });
    await transport.send({ jsonrpc: "2.0", id, method: "initialize", params: cachedInitializeParams });
    const response = await answered;
    if (response.error !== undefined) throw new Error(`remote initialize refused: ${JSON.stringify(response.error)}`);
    await transport.send({ jsonrpc: "2.0", method: "notifications/initialized" });
  };

  /** Close the current remote session and open a fresh one with the handshake replayed; concurrent callers share one reset. */
  const resetRemote = (reason) => {
    if (resetting !== null) return resetting;
    process.stderr.write(`[ops-mcp-stdio] resetting remote session: ${reason}\n`);
    const stale = remote;
    readOnlyTools.clear();
    resetting = (async () => {
      try { await stale?.close(); } catch (error) { logError("stale remote close failed")(error); }
      authHeaders.Authorization = `Bearer ${await tokenClient.getToken()}`;
      const fresh = await openRemote();
      remote = fresh;
      await replayHandshake(fresh);
    })().finally(() => { resetting = null; });
    return resetting;
  };

  const isSafeReplay = (message) => {
    if (!isRequest(message)) return false;
    if (SAFE_METHODS.has(message.method)) return true;
    return message.method === "tools/call" && readOnlyTools.has(message.params?.name);
  };

  const forward = async (message) => {
    try {
      await remote.send(message);
      return;
    } catch (error) {
      if (isUnauthorized(error)) {
        authHeaders.Authorization = `Bearer ${await tokenClient.getToken({ forceRefresh: true })}`;
        await remote.send(message);
        return;
      }
      await resetRemote(`send failed: ${error?.message ?? error}`);
      if (!isSafeReplay(message)) throw new Error(`delivery status is uncertain; ${message.method} was not replayed`);
      await remote.send(message);
    }
  };

  localTransport.onmessage = (message) => {
    if (isRequest(message) && message.method === "initialize") cachedInitializeParams = message.params;
    if (isRequest(message)) {
      const timer = setTimeoutImpl(() => {
        pending.delete(message.id);
        answerLocally(message.id, REQUEST_TIMEOUT_CODE, `ops remote did not answer ${message.method} within ${requestTimeoutMs}ms; remote session reset`, { kind: "ops-mcp-stdio:remote-timeout", method: message.method, timeoutMs: requestTimeoutMs });
        resetRemote(`no answer to ${message.method} (${message.id}) within ${requestTimeoutMs}ms`).catch(logError("remote reset after timeout failed"));
      }, requestTimeoutMs);
      timer.unref?.();
      pending.set(message.id, { timer, method: message.method, message });
    }
    forward(message).catch((error) => {
      logError("stdin -> remote failed")(error);
      if (!isRequest(message)) return;
      settle(message.id);
      answerLocally(message.id, REMOTE_SEND_FAILED_CODE, `ops remote refused ${message.method}: ${error?.message ?? error}`, { kind: "ops-mcp-stdio:remote-send-failed", method: message.method, status: error?.status ?? error?.code ?? null });
    });
  };
  localTransport.onerror = logError("local transport error");

  const stop = () => {
    closed = true;
    for (const [id] of pending) settle(id);
    void remote?.close();
    void localTransport.close();
  };
  localTransport.onclose = stop;

  const refreshTimer = setInterval(() => {
    tokenClient.getToken().then((token) => { authHeaders.Authorization = `Bearer ${token}`; }).catch(logError("token refresh failed"));
  }, REFRESH_INTERVAL_MS);
  refreshTimer.unref?.();

  remote = await openRemote();
  await localTransport.start();
  process.stderr.write(`[ops-mcp-stdio] bridging stdio <-> ${origin}/mcp as ${clientId} (request timeout ${requestTimeoutMs}ms)\n`);

  return { close: async () => { clearInterval(refreshTimer); stop(); } };
}

await runMain(() => serveOpsMcpStdioBridge(), {
  moduleUrl: import.meta.url,
  formatError: (error) => `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  exitCode: 1,
});
