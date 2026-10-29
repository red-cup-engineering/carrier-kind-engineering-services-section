// @red-cup-engineering/llm-openai-codex-harness/service — the persistent Codex hub.
//
// Two jobs over one loopback-trusted MCP endpoint (so Codex/other CLIs on this
// host connect without a bearer token):
//   1. wire — rig the canonical You<->MCP<->561 Group Operations Manifold MCP server
//      into ~/.codex/config.toml, via @red-cup-engineering/organizing-with-openai-codex's harness computer;
//   2. supervise — keep a persistent `codex mcp` process warm and let callers
//      drive it (start/stop/restart, and a raw JSON-RPC passthrough).
//
// The harness can still run standalone on :18806/hub/mcp, but the canonical
// Codex config now points at 561 Group Operations Manifold's mounted copy:
//   http://127.0.0.1:18805/codex/hub/mcp

import { createMcpApp, type App, type McpAuth, type McpTool, type McpDispatch } from "@red-cup-engineering/http-server";
import { EAVT_JSONL } from "@emsenn/relating/writing";
import {
  DEFAULT_OPERATIONS_MANIFOLD_CODEX_HUB_URL,
  readHarness,
  renderHarness,
  applyConfig,
  pointsAtOperationsManifold,
} from "@red-cup-engineering/organizing-with-openai-codex/harness";
import { createCodexProcess, type CodexProcessHandle } from "./process.mjs";

export const HUB_PATH = "/hub/mcp";
export const DEFAULT_PORT = 18806;
export const DEFAULT_OPERATIONS_MANIFOLD_BASE_URL = "http://127.0.0.1:18805";

const TOOLS: readonly McpTool[] = [
  {
    name: "codex_config",
    description: "Read or apply the Codex CLI substrate. Use action=read to inspect ~/.codex/config.toml, or action=apply to merge the canonical 561 Group Operations Manifold MCP hub without clobbering existing servers.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["read", "apply"], description: "Defaults to read." },
        home: { type: "string", description: "Codex home (CODEX_HOME) to inspect. Defaults to ~/.codex." },
        hub_url: { type: "string", description: `561 Group Operations Manifold MCP hub URL. Defaults to ${DEFAULT_OPERATIONS_MANIFOLD_CODEX_HUB_URL}.` },
        dry_run: { type: "boolean", description: "For action=apply, preview only; defaults to false." },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "codex_process",
    description: "Control the supervised Codex process with one tool. Actions: status, start, stop, restart, rpc.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["status", "start", "stop", "restart", "rpc"], description: "Defaults to status." },
        method: { type: "string", description: "For action=rpc, JSON-RPC method, e.g. tools/list." },
        params: { type: "object", description: "For action=rpc, JSON-RPC params object." },
        timeout_ms: { type: "number", description: "For action=rpc, per-request timeout override in milliseconds." },
      },
    },
    annotations: { openWorldHint: true },
  },
  {
    name: "operations_manifold_request",
    description: "Send one HTTP request to the running 561 Group Operations Manifold host. Use this for transport discovery, OpenAPI reads, package-bin discovery, and EAVT package-bin POSTs without expanding the MCP tool surface.",
    inputSchema: {
      type: "object",
      properties: {
        base_url: { type: "string", description: "561 Group Operations Manifold base URL. Defaults to http://127.0.0.1:18805." },
        path: { type: "string", description: "561 Group Operations Manifold path to request, e.g. /.well-known/operations-manifold/transports, /jsnode-bins/, or a package-bin route." },
        method: { type: "string", enum: ["GET", "POST"], description: "HTTP method. Defaults to GET unless body is supplied." },
        body: { type: "string", description: "Optional request body. For package bins, pass EAVT JSONL." },
        content_type: { type: "string", description: "Optional Content-Type. Defaults to application/eavt+jsonl for POST bodies." },
      },
      required: ["path"],
    },
    annotations: { openWorldHint: true },
  },
];

function baseUrl(args: Readonly<Record<string, unknown>>): string {
  const raw = typeof args["base_url"] === "string" ? args["base_url"] : DEFAULT_OPERATIONS_MANIFOLD_BASE_URL;
  return raw.replace(/\/$/, "");
}

function operationsManifoldRequestUrl(args: Readonly<Record<string, unknown>>): string {
  const rawPath = args["path"];
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    throw new Error("operations_manifold_request: 'path' must be a non-empty string");
  }
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  return `${baseUrl(args)}${path}`;
}

function requestMethod(args: Readonly<Record<string, unknown>>): "GET" | "POST" {
  const raw = args["method"];
  if (raw === undefined) return typeof args["body"] === "string" ? "POST" : "GET";
  if (raw === "GET" || raw === "POST") return raw;
  throw new Error("operations_manifold_request: method must be GET or POST");
}

function actionOf(args: Readonly<Record<string, unknown>>, fallback: string, allowed: readonly string[], tool: string): string {
  const raw = args["action"];
  if (raw === undefined) return fallback;
  if (typeof raw === "string" && allowed.includes(raw)) return raw;
  throw new Error(`${tool}: action must be one of ${allowed.join(", ")}`);
}

function makeDispatch(codex: CodexProcessHandle): McpDispatch {
  return async (name, args) => {
    if (name === "codex_config") {
      const action = actionOf(args, "read", ["read", "apply"], name);
      const home = typeof args["home"] === "string" ? args["home"] : undefined;
      if (action === "read") {
        const h = readHarness(home === undefined ? {} : { home });
        return { action, rendered: renderHarness(h), wired: pointsAtOperationsManifold(h), process: codex.status() };
      }
      const hubUrl = typeof args["hub_url"] === "string" ? args["hub_url"] : undefined;
      const dryRun = args["dry_run"] === true;
      const result = applyConfig({
        ...(home === undefined ? {} : { home }),
        ...(hubUrl === undefined ? {} : { hubUrl }),
        write: !dryRun,
      });
      return { action, wrote: result.wrote, alreadyWired: result.alreadyWired, path: result.path, text: result.text };
    }
    if (name === "codex_process") {
      const action = actionOf(args, "status", ["status", "start", "stop", "restart", "rpc"], name);
      if (action === "status") return { action, process: codex.status() };
      if (action === "start") {
        codex.start();
        return { action, process: codex.status() };
      }
      if (action === "stop") {
        await codex.stop();
        return { action, process: codex.status() };
      }
      if (action === "restart") {
        await codex.restart();
        return { action, process: codex.status() };
      }
      const method = args["method"];
      if (typeof method !== "string") throw new Error("codex_process: action=rpc requires a string 'method'");
      const params = args["params"];
      const timeoutMs = typeof args["timeout_ms"] === "number" ? args["timeout_ms"] : undefined;
      const result = await codex.request(method, params, timeoutMs);
      return { action, result };
    }
    if (name === "operations_manifold_request") {
      const url = operationsManifoldRequestUrl(args);
      const method = requestMethod(args);
      const body = typeof args["body"] === "string" ? args["body"] : undefined;
      const contentType = typeof args["content_type"] === "string" ? args["content_type"] : EAVT_JSONL;
      const res = await fetch(url, {
        method,
        headers: {
          accept: `application/json, ${EAVT_JSONL}, text/plain`,
          ...(body === undefined ? {} : { "content-type": contentType }),
        },
        ...(body === undefined ? {} : { body }),
      });
      const text = await res.text();
      const responseType = res.headers.get("content-type");
      return {
        url,
        method,
        status: res.status,
        contentType: responseType,
        ok: res.ok,
        body: text,
        ...(responseType?.includes("json") && text.length > 0 ? { json: JSON.parse(text) as unknown } : {}),
      };
    }
    throw new Error(`unknown tool: ${name}`);
  };
}

export type HarnessServerOptions = Readonly<{
  path?: string;
  /** The supervised Codex process. One is created (not started) if omitted. */
  process?: CodexProcessHandle;
  /** Public bearer-auth seam, supplied by the host that mounts this harness. */
  auth?: McpAuth;
}>;

export function createHarnessServerApp(options: HarnessServerOptions = {}): App {
  const codex = options.process ?? createCodexProcess();
  const { app } = createMcpApp({
    path: options.path ?? HUB_PATH,
    serverInfo: { name: "llm-openai-codex-harness", version: "0.0.0" },
    instructions: "561 Group Operations Manifold MCP hub for the Codex CLI: harness wiring tools plus a supervised, persistent codex process.",
    tools: TOOLS,
    dispatch: makeDispatch(codex),
    ...(options.auth === undefined ? {} : { auth: options.auth }),
  });
  return app;
}
