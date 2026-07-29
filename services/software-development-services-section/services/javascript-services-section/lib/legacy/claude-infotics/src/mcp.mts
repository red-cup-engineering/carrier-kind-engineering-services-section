/**
 * mcp — project the claude-infotics surface as an MCP tool server.
 *
 * This is capability #11 rebuilt. The archived `llm-claude-harness` served an MCP
 * hub exposing two tools (harness_status / harness_apply) so a Claude Code
 * session could reach them. That hub pointed at the retired Operations Manifold,
 * but the *capability* — claude-infotics operations reachable over MCP — is real.
 * Here it covers EVERY operation in the catalog, not two.
 *
 * The platform's `./integrations/mcp` gives the JSON-RPC/MCP envelope vocabulary
 * and "deliberately stops before server dispatch, authorization, transport
 * sessions, or tool execution" — so this module supplies exactly that missing
 * dispatch, and supplies it by delegating to `dispatchProjectedSurface`. So the
 * MCP face inherits the SAME capability authorization, journal witness, and
 * execution path as the CLI face. One catalog, two transports, one governance.
 */
import {
  mcpInitializeResult,
  mcpOk,
  mcpRpcError,
  mcpToolStructuredResult,
  mcpToolTextError,
  mcpToolTextResult,
  mcpToolsListResult,
  type JsonRpcEnvelope,
  type JsonRpcRequest,
  type McpTool,
} from "@emsenn/metroplat/integrations/mcp";
import { dispatchProjectedSurface } from "@emsenn/metroplat/integrations/cli";
import type { ProjectedSurface } from "@emsenn/metroplat/surfaces";

const SERVER_INFO = Object.freeze({ name: "claude-infotics", version: "0.1.0" });

/** Project each operation into an MCP tool. Named options become string properties;
 *  the operation's own JSON input record is allowed through as extra properties. */
export function claudeInfoticsMcpTools(surface: ProjectedSurface): readonly McpTool[] {
  return Object.freeze(
    [...surface.operations]
      .sort((left, right) => left.verb.localeCompare(right.verb))
      .map((operation): McpTool => {
        const properties: Record<string, unknown> = {};
        for (const option of operation.options) properties[option] = { type: "string" };
        return Object.freeze({
          name: operation.verb,
          ...(operation.summary === undefined ? {} : { description: operation.summary }),
          inputSchema: Object.freeze({
            type: "object",
            properties,
            additionalProperties: true,
          }),
        });
      }),
  );
}

export interface McpDispatchContext {
  readonly subject: string;
  readonly program: string;
  readonly now: () => string;
  readonly witness: Parameters<typeof dispatchProjectedSurface>[3]["witness"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Handle one JSON-RPC request. Returns the envelope to write, or undefined for a
 * notification (no id → no response, per JSON-RPC).
 */
export async function handleMcpRequest(
  surface: ProjectedSurface,
  request: JsonRpcRequest,
  context: McpDispatchContext,
): Promise<JsonRpcEnvelope | undefined> {
  const { id, method, params } = request;
  if (method === undefined) return mcpRpcError(id, -32600, "invalid request: no method");

  if (method === "initialize") {
    return mcpOk(id, mcpInitializeResult({
      serverInfo: SERVER_INFO,
      instructions: "Red Cup Engineering's Claude capability on MetroPlat: drive the claude binary, compose/apply a session harness, read transcripts, and keep a durable session memory (findings/recall/impact).",
    }));
  }
  // Notifications carry no id and expect no reply.
  if (method === "notifications/initialized" || method === "initialized") return undefined;
  if (method === "ping") return mcpOk(id, {});
  if (method === "tools/list") return mcpOk(id, mcpToolsListResult(claudeInfoticsMcpTools(surface)));

  if (method === "tools/call") {
    const name = isRecord(params) && typeof params["name"] === "string" ? params["name"] : undefined;
    if (name === undefined) return mcpRpcError(id, -32602, "tools/call: params.name is required");
    if (!surface.catalog.byVerb.has(name)) return mcpRpcError(id, -32602, `tools/call: unknown tool ${JSON.stringify(name)}`);
    const args = isRecord(params) && isRecord(params["arguments"]) ? params["arguments"] : {};
    try {
      // Delegate to the SAME governed dispatcher the CLI uses: the operation's
      // input arrives as JSON on the "stdin" channel, the verb as argv.
      const result = await dispatchProjectedSurface(surface, [name], JSON.stringify(args), {
        subject: context.subject,
        program: context.program,
        now: context.now,
        witness: context.witness,
        caller: Object.freeze({ transport: "mcp" }),
      });
      if (result.code !== 0) return mcpOk(id, mcpToolTextError(result.stderr.trim() || `operation ${name} failed`));
      const parsed: unknown = result.stdout.trim().length === 0 ? {} : JSON.parse(result.stdout);
      return mcpOk(id, isRecord(parsed) ? mcpToolStructuredResult(parsed as never) : mcpToolTextResult(parsed));
    } catch (error) {
      return mcpOk(id, mcpToolTextError(error instanceof Error ? error.message : String(error)));
    }
  }

  return mcpRpcError(id, -32601, `method not found: ${method}`);
}
