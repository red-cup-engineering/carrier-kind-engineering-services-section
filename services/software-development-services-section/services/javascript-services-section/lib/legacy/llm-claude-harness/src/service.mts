// @red-cup-engineering/llm-claude-harness/service — the 561 Group Operations Manifold MCP hub.
//
// Binds @red-cup-engineering/organizing-with-claude's harness computer to an MCP transport via
// @red-cup-engineering/http-server. Loopback-trusted (no auth required from 127.0.0.1), so
// Claude Code CLI processes on this host connect without a bearer token.
// The hub serves /hub/mcp to match the address applyMcpConfig writes into
// .mcp.json by default.

import { createMcpApp, type App, type McpTool, type McpDispatch } from "@red-cup-engineering/http-server";
import { readHarness, renderHarness, applyMcpConfig } from "@red-cup-engineering/organizing-with-claude/harness";

export const HUB_PATH = "/hub/mcp";
export const DEFAULT_PORT = 18805;

const TOOLS: readonly McpTool[] = [
  {
    name: "harness_status",
    description: "Read the Claude Code CLI substrate (.mcp.json, .claude/settings.json) and report whether the 561 Group Operations Manifold MCP hub is wired. Pass root to check a specific project directory.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string", description: "Project root to inspect. Defaults to process.cwd()." },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "harness_apply",
    description: "Project the canonical 561 Group Operations Manifold wiring into .mcp.json for the given project directory. Merges (never clobbers) existing servers. Pass dry_run: true to preview without writing.",
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "string", description: "Project root to wire. Defaults to process.cwd()." },
        hub_url: { type: "string", description: "561 Group Operations Manifold MCP hub URL. Defaults to http://127.0.0.1:18805/hub/mcp." },
        dry_run: { type: "boolean", description: "Preview only — do not write to disk." },
      },
    },
    annotations: { destructiveHint: false, idempotentHint: true },
  },
];

const dispatch: McpDispatch = async (name, args) => {
  if (name === "harness_status") {
    const root = typeof args["root"] === "string" ? args["root"] : undefined;
    const h = readHarness(root === undefined ? {} : { root });
    return { rendered: renderHarness(h), wired: h.mcpServers.some((s) => s.pointsAt === "operations-manifold") };
  }
  if (name === "harness_apply") {
    const root = typeof args["root"] === "string" ? args["root"] : undefined;
    const hubUrl = typeof args["hub_url"] === "string" ? args["hub_url"] : undefined;
    const dryRun = args["dry_run"] === true;
    const result = applyMcpConfig({
      ...(root === undefined ? {} : { root }),
      ...(hubUrl === undefined ? {} : { hubUrl }),
      write: !dryRun,
    });
    return { wrote: result.wrote, path: result.path, after: result.after };
  }
  throw new Error(`unknown tool: ${name}`);
};

/** Service projection controls for the MCP transport. Harness state and apply
 *  results are read from @red-cup-engineering/organizing-with-claude harness carriers; this option only
 *  selects the route where those tools are exposed. */
export type HarnessServerOptions = Readonly<{
  path?: string;
}>;

export function createHarnessServerApp(options: HarnessServerOptions = {}): App {
  const { app } = createMcpApp({
    path: options.path ?? HUB_PATH,
    serverInfo: { name: "llm-claude-harness", version: "0.0.0" },
    instructions: "561 Group Operations Manifold MCP hub: Claude Code harness wiring tools for the 561-group workspace.",
    tools: TOOLS,
    dispatch,
  });
  return app;
}
