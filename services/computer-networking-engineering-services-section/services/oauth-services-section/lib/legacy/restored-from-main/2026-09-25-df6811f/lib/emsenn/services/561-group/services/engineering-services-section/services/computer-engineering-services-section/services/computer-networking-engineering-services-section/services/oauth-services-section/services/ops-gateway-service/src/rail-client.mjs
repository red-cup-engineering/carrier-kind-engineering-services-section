// rail-client — a client of the production work rail: MetroPlat at

// ops.561.group, reached through this gateway's /mcp with a client_credentials
// bearer token. Harness-neutral: a Claude hook, a Codex script, a timer, and
// a free-lane model's tool loop all call the same verbs through this one file.
import { createMachineTokenClient } from "./machine-token-client.mjs";
import { postMcpJsonRpc } from "./mcp-streamable-http-post.mjs";

export const DEFAULT_OPS_ORIGIN = "https://ops.561.group";
const CLIENT_NAME = "ops-561-group-rail-client";
const CLIENT_VERSION = "0.10.0";

/**
 * Reads the machine credential this gateway issued a host: the same three
 * variables its stdio bridge reads (OPS_MCP_ORIGIN, OPS_MCP_CLIENT_ID,
 * OPS_MCP_CLIENT_SECRET). When the environment lacks them and a credential
 * file is named, the file is loaded into the environment first.
 * @param {object} [options]
 * @param {string} [options.envPath] - a dotenv-shaped credential file; absent means environment only.
 * @param {Record<string, string|undefined>} [options.environment] - defaults to process.env.
 * @returns {{origin: string, clientId: string, clientSecret: string}|null} null when no credential is present.
 */
export function loadOpsClientEnvironment({ envPath, environment = process.env } = {}) {
  if (envPath && (!environment.OPS_MCP_CLIENT_ID || !environment.OPS_MCP_CLIENT_SECRET)) {
    try {
      process.loadEnvFile(envPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const clientId = environment.OPS_MCP_CLIENT_ID;
  const clientSecret = environment.OPS_MCP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { origin: (environment.OPS_MCP_ORIGIN ?? DEFAULT_OPS_ORIGIN).replace(/\/$/u, ""), clientId, clientSecret };
}

/**
 * Turns one MCP tool result into the verb's own value: the JSON the tool
 * printed, or a thrown Error carrying the tool's refusal text.
 * @param {string} tool
 * @param {{content?: readonly {type: string, text?: string}[], structuredContent?: unknown, isError?: boolean}} result
 * @returns {unknown}
 * @throws {Error} when the tool reported an error.
 */
export function readToolResult(tool, result) {
  const text = (result?.content ?? []).filter((part) => part.type === "text").map((part) => part.text).join("");
  if (result?.isError) throw new Error(`ops ${tool}: ${text || "refused"}`);
  if (result?.structuredContent !== undefined) return result.structuredContent;
  if (text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * One MCP session over the gateway's streamable HTTP transport, opened on
 * first use, bearer token minted with the client_credentials grant.
 * @param {object} options
 * @param {string} options.origin
 * @param {string} options.clientId
 * @param {string} options.clientSecret
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(headers: Record<string, string>) => {callTool: Function, close: Function}|Promise<{callTool: Function, close: Function}>} [options.connectFn] - injectable for tests.
 * @returns {{origin: string, call: (tool: string, input?: object) => Promise<unknown>, close: () => Promise<void>}}
 */
export function createOpsRail({ origin, clientId, clientSecret, fetchImpl = fetch, connectFn } = {}) {
  if (typeof origin !== "string" || origin === "") throw new TypeError("ops rail: origin is required");
  const tokenClient = createMachineTokenClient({ tokenUrl: new URL("/oauth/token", origin), clientId, clientSecret, fetchImpl });
  const connect = connectFn ?? (async (headers) => {
    const endpoint = new URL("/mcp", origin);
    let sessionId;
    let nextId = 1;
    async function rpc(method, params) {
      const requestHeaders = { ...headers, "mcp-protocol-version": "2025-06-18", ...(sessionId === undefined ? {} : { "mcp-session-id": sessionId }) };
      const { message, sessionId: nextSessionId } = await postMcpJsonRpc(endpoint, { headers: requestHeaders, body: { jsonrpc: "2.0", id: nextId++, method, ...(params === undefined ? {} : { params }) }, fetchImpl });
      if (nextSessionId !== undefined) sessionId = nextSessionId;
      if (message?.error !== undefined) throw Object.assign(new Error(`ops rail ${method}: ${message.error.message ?? JSON.stringify(message.error)}`), { data: message.error });
      return message?.result;
    }
    await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: CLIENT_NAME, version: CLIENT_VERSION } });
    return { callTool: ({ name, arguments: toolArguments }) => rpc("tools/call", { name, arguments: toolArguments }), close: async () => {} };
  });
  let session = null;
  async function open() {
    if (session !== null) return session;
    session = await connect({ Authorization: `Bearer ${await tokenClient.getToken()}` });
    return session;
  }
  async function call(tool, input = {}) {
    const client = await open();
    return readToolResult(tool, await client.callTool({ name: tool, arguments: { input } }));
  }
  async function close() {
    if (session === null) return;
    const closing = session;
    session = null;
    await closing.close?.();
  }
  return Object.freeze({ origin, call, close });
}
