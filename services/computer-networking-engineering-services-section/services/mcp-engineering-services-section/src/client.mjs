// The house's one MCP client: the lifecycle and the tool, resource and prompt calls over a
// transport, and its transports: Streamable HTTP, a stdio child process, and a server in this process.

import { spawn } from "node:child_process";
import { LATEST_MCP_PROTOCOL_VERSION } from "./server.mjs";

/** The first JSON-RPC message of a `text/event-stream` body. */
function firstEventMessage(text) {
  for (const block of text.split(/\r?\n\r?\n/u)) {
    const data = block.split(/\r?\n/u).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    if (data !== "") return JSON.parse(data);
  }
  throw new Error("empty text/event-stream response");
}

/**
 * Streamable HTTP: one POST per message; the response is JSON or a one-shot event stream. The
 * session id the server assigns is carried on every later request. `headers()` is awaited per
 * request, so a bearer token can be refreshed between calls.
 */
export function mcpHttpTransport({ url, headers = () => ({}), fetchImpl = fetch, signal, refreshAuthorization } = {}) {
  let sessionId;
  let protocolVersion;
  return Object.freeze({
    set protocolVersion(value) { protocolVersion = value; },
    async send(message) {
      const post = async () => fetchImpl(url, {
        method: "POST",
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
          ...(protocolVersion === undefined ? {} : { "mcp-protocol-version": protocolVersion }),
          ...(sessionId === undefined ? {} : { "mcp-session-id": sessionId }),
          ...(await headers()),
        },
        body: JSON.stringify(message),
        ...(signal === undefined ? {} : { signal }),
      });
      let response = await post();
      // Authentication is checked before the MCP method runs, so a rejected bearer
      // can be refreshed once without replaying a tool effect.
      if (response.status === 401 && refreshAuthorization !== undefined) {
        await response.arrayBuffer();
        await refreshAuthorization();
        response = await post();
      }
      sessionId = response.headers.get("mcp-session-id") ?? sessionId;
      const text = await response.text();
      if (!response.ok) throw Object.assign(new Error(`MCP endpoint returned HTTP ${response.status}${text ? `: ${text.slice(0, 500)}` : ""}`), { status: response.status, challenge: response.headers.get("www-authenticate") ?? undefined });
      if (text.trim() === "") return undefined;
      return (response.headers.get("content-type") ?? "").includes("text/event-stream") ? firstEventMessage(text) : JSON.parse(text);
    },
    reset() { sessionId = undefined; },
    async close() {
      if (sessionId === undefined) return;
      await fetchImpl(url, { method: "DELETE", headers: { "mcp-session-id": sessionId, ...(await headers()) } }).catch(() => undefined);
      sessionId = undefined;
    },
  });
}

/** stdio: a child process speaking newline-delimited JSON-RPC, answers matched to requests by id. */
export function mcpStdioTransport({ command, args = [], cwd, env, stderr = "inherit" } = {}) {
  const child = spawn(command, args, { cwd, env: env === undefined ? process.env : { ...process.env, ...env }, stdio: ["pipe", "pipe", stderr] });
  const pending = new Map();
  let buffer = "";
  let exited;
  const fail = (error) => { for (const { reject } of pending.values()) reject(error); pending.clear(); };
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    for (let newline = buffer.indexOf("\n"); newline >= 0; newline = buffer.indexOf("\n")) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line === "") continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      const waiting = pending.get(message?.id);
      if (waiting !== undefined) { pending.delete(message.id); waiting.resolve(message); }
    }
  });
  child.on("error", (error) => { exited = error; fail(error); });
  child.on("exit", (code, signal) => { exited = new Error(`MCP server exited (${signal ?? code})`); fail(exited); });
  return Object.freeze({
    child,
    send(message) {
      if (exited !== undefined) return Promise.reject(exited);
      child.stdin.write(`${JSON.stringify(message)}\n`);
      if (!("id" in message)) return Promise.resolve(undefined);
      return new Promise((resolve, reject) => pending.set(message.id, { resolve, reject }));
    },
    async close() {
      if (exited !== undefined) return;
      child.stdin.end();
      await new Promise((resolve) => { const timer = setTimeout(() => { child.kill("SIGTERM"); resolve(); }, 2000); child.once("exit", () => { clearTimeout(timer); resolve(); }); });
    },
  });
}

/**
 * In process: a server's own message handler, called directly. `handle(message)` answers a request
 * and returns nothing for a notification. A host mounts a server it composes this way instead of
 * starting it as a child, so one process carries it once.
 */
export function mcpInProcessTransport(handle) {
  return Object.freeze({
    async send(message) {
      const answer = await handle(message);
      return "id" in message ? answer : undefined;
    },
    close: async () => undefined,
  });
}

/** A tool result as the tool's own value: its structured content, else its text parsed as JSON
 *  when it is JSON; an error result throws with the tool's text. */
export function mcpToolValue(name, result) {
  const text = (result?.content ?? []).filter((part) => part.type === "text").map((part) => part.text).join("");
  if (result?.isError === true) throw new Error(`${name}: ${text || "refused"}`);
  if (result?.structuredContent !== undefined) return result.structuredContent;
  if (text === "") return null;
  try { return JSON.parse(text); } catch { return text; }
}

/**
 * One MCP client over a transport, initialized on first use. A JSON-RPC error rejects with the
 * error's `code` and `data`.
 */
export function createMcpClient({ transport, clientInfo = { name: "red-cup-engineering-mcp-client", version: "0.1.0" }, protocolVersion = LATEST_MCP_PROTOCOL_VERSION, capabilities = {} }) {
  let nextId = 1;
  let initialized;
  const rpc = async (method, params) => {
    const answer = await transport.send({ jsonrpc: "2.0", id: nextId++, method, ...(params === undefined ? {} : { params }) });
    if (answer?.error !== undefined) throw Object.assign(new Error(`${method}: ${answer.error.message ?? JSON.stringify(answer.error)}`), { code: answer.error.code, data: answer.error.data });
    return answer?.result;
  };
  const initialize = () => {
    initialized ??= (async () => {
      const result = await rpc("initialize", { protocolVersion, capabilities, clientInfo });
      if ("protocolVersion" in transport) transport.protocolVersion = result?.protocolVersion ?? protocolVersion;
      await transport.send({ jsonrpc: "2.0", method: "notifications/initialized" });
      return result;
    })().catch((error) => { initialized = undefined; throw error; });
    return initialized;
  };
  const request = async (method, params) => { await initialize(); return rpc(method, params); };
  return Object.freeze({
    initialize,
    request,
    ping: () => request("ping"),
    listTools: (params = {}) => request("tools/list", params),
    callTool: (params) => request("tools/call", params),
    call: async (name, args = {}) => mcpToolValue(name, await request("tools/call", { name, arguments: args })),
    listResources: (params = {}) => request("resources/list", params),
    listResourceTemplates: (params = {}) => request("resources/templates/list", params),
    readResource: (params) => request("resources/read", params),
    listPrompts: (params = {}) => request("prompts/list", params),
    getPrompt: (params) => request("prompts/get", params),
    /** Forget the session, so the next request initializes again (after a server restart). */
    reset: () => { initialized = undefined; transport.reset?.(); },
    close: () => transport.close(),
  });
}
