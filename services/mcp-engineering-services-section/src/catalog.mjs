/** MetroPlat catalog admission, name binding, and authority refusal data. */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { mcpToolError as protocolToolError } from "./server.mjs";

/** A tool definition admitted from an external MCP `tools/list` catalog. */

/** The admitted image of one MCP `tools/list` response. */

/** One admitted catalog row bound to the literal MCP `tools/call` name transport. */

/** The transport relation from admitted `tools/list` rows to callable `tools/call` names. */

export const mcpCatalogToolSchema = {
  $id: "metroplat/executing/mcp/catalog-tool",
  title: "McpCatalogTool",
  description: "One external MCP tool descriptor admitted as boundary catalog material.",
  type: "object",
  required: ["kind", "name"],
  properties: {
    kind: { const: "metroplat.mcp.catalog-tool" },
    name: { type: "string", minLength: 1 },
    description: { type: "string" },
    parameters: { type: "object" },
    outputSchema: { type: "object" },
    annotations: {
      type: "object",
      properties: {
        readOnlyHint: { type: "boolean" },
        openWorldHint: { type: "boolean" },
        destructiveHint: { type: "boolean" },
        idempotentHint: { type: "boolean" },
        title: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const mcpToolCatalogProjectionSchema = {
  $id: "metroplat/executing/mcp/tool-catalog-projection",
  title: "McpToolCatalogProjection",
  description: "The admitted projection of an MCP tools/list catalog into metroplat catalog-tool records.",
  type: "object",
  required: ["kind", "source", "tools"],
  properties: {
    kind: { const: "metroplat.mcp.tool-catalog-projection" },
    source: { const: "mcp:tools/list" },
    tools: { type: "array", items: mcpCatalogToolSchema },
  },
  additionalProperties: false,
};

const mcpCatalogToolBindingSchema = {
  type: "object",
  required: ["kind", "source", "target", "name", "catalogTool", "call", "handler"],
  properties: {
    kind: { const: "metroplat.mcp.catalog-tool-binding" },
    source: { const: "mcp:tools/list" },
    target: { const: "mcp:tools/call" },
    name: { type: "string", minLength: 1 },
    catalogTool: mcpCatalogToolSchema,
    call: {
      type: "object",
      required: ["method", "params"],
      properties: {
        method: { const: "tools/call" },
        params: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    handler: {
      type: "object",
      required: ["name", "available"],
      properties: {
        name: { type: "string", minLength: 1 },
        available: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const mcpToolCatalogTransportSchema = {
  $id: "metroplat/executing/mcp/tool-catalog-transport",
  title: "McpToolCatalogTransport",
  description: "The explicit MCP name-transport binding between admitted tools/list catalog rows and tools/call handler names.",
  type: "object",
  required: ["kind", "source", "target", "bindings", "bound", "missing"],
  properties: {
    kind: { const: "metroplat.mcp.tool-catalog-transport" },
    source: { const: "mcp:tools/list" },
    target: { const: "mcp:tools/call" },
    bindings: { type: "array", items: mcpCatalogToolBindingSchema },
    bound: { type: "array", items: { type: "string", minLength: 1 } },
    missing: { type: "array", items: { type: "string", minLength: 1 } },
  },
  additionalProperties: false,
};

export const mcpCatalogToolContract = schemaFrom(mcpCatalogToolSchema);
export const mcpToolCatalogProjectionContract = schemaFrom(mcpToolCatalogProjectionSchema);
export const mcpToolCatalogTransportContract = schemaFrom(mcpToolCatalogTransportSchema);

/**
 * Admit an MCP `tools/list` catalog as metroplat boundary material.
 *
 * This is the inverse-side projection of `mcpToolsListResult`: a remote tool row
 * is not executed here, but its name, description, input schema, output schema,
 * and annotations become a stable catalog-tool record that an agent or service
 * can later bind to handlers under its own capability policy.
 */
export function projectMcpToolCatalog(tools) {
  return Object.freeze({
    kind: "metroplat.mcp.tool-catalog-projection",
    source: "mcp:tools/list",
    tools: Object.freeze(tools.map(projectMcpCatalogTool)),
  });
}

function callableToolName(tool) {
  return typeof tool === "string" ? tool : tool.name;
}

/**
 * Construct the internal MCP transport relation from admitted catalog rows to handlers.
 *
 * MCP's binding law is name equality between a `tools/list` row and a
 * `tools/call` request's `params.name`. This function does not execute tools or
 * grant authority; it only makes that wire-level transport explicit and records
 * which catalog rows have a callable name in the supplied handler set.
 */
export function mcpToolCatalogTransport(
  projection,
  callableTools,
) {
  const callable = new Set(callableTools.map(callableToolName));
  const bindings = Object.freeze(projection.tools.map((tool) => Object.freeze({
    kind: "metroplat.mcp.catalog-tool-binding",
    source: "mcp:tools/list",
    target: "mcp:tools/call",
    name: tool.name,
    catalogTool: tool,
    call: Object.freeze({
      method: "tools/call",
      params: Object.freeze({ name: tool.name }),
    }),
    handler: Object.freeze({
      name: tool.name,
      available: callable.has(tool.name),
    }),
  })));
  return Object.freeze({
    kind: "metroplat.mcp.tool-catalog-transport",
    source: "mcp:tools/list",
    target: "mcp:tools/call",
    bindings,
    bound: Object.freeze(bindings.filter((binding) => binding.handler.available).map((binding) => binding.name)),
    missing: Object.freeze(bindings.filter((binding) => !binding.handler.available).map((binding) => binding.name)),
  });
}

function projectMcpCatalogTool(tool) {
  return Object.freeze({
    kind: "metroplat.mcp.catalog-tool",
    name: tool.name,
    ...(tool.description === undefined ? {} : { description: tool.description }),
    ...(tool.inputSchema === undefined ? {} : { parameters: tool.inputSchema }),
    ...(tool.outputSchema === undefined ? {} : { outputSchema: tool.outputSchema }),
    ...(tool.annotations === undefined ? {} : { annotations: tool.annotations }),
  });
}

/** Mirrors `ExecutionReceipt`'s `ok: false` shape (`src/rpc/receipt.mts`); folds into a tool's `outputSchema` as `oneOf: [codomainSchema, mcpToolRefusalSchema]`. */
export const mcpToolRefusalSchema = {
  $id: "metroplat/executing/mcp/tool-refusal",
  title: "McpToolRefusal",
  description: "A refused or failed MCP tool call: the phase execution stopped at and the named reasons, mirroring metroplat's execution-obstruction receipt.",
  type: "object",
  required: ["kind", "ok", "phase", "reasons"],
  properties: {
    kind: { const: "metroplat.rpc.execution:obstruction" },
    ok: { const: false },
    phase: { type: "string", minLength: 1 },
    reasons: { type: "array", items: { type: "string", minLength: 1 } },
    evidence: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
};

export const mcpToolRefusalContract = schemaFrom(mcpToolRefusalSchema);

/** Build one refusal datum naming the phase execution stopped at and why. */
export function mcpToolRefusal(options

) {
  return Object.freeze({
    kind: "metroplat.rpc.execution:obstruction",
    ok: false,
    phase: options.phase,
    reasons: Object.freeze([...options.reasons]),
    ...(options.evidence === undefined ? {} : { evidence: Object.freeze([...options.evidence]) }),
  });
}

/** Encode a refusal datum as both text and structured MCP content, marked as an error. */
export function mcpToolRefusalResult(text, refusal) {
  return Object.freeze({
    ...protocolToolError(text),
    structuredContent: refusal,
    isError: true,
  });
}

/** Encode a thrown value as an MCP error result, carrying the same refusal datum shape as a dispatch refusal. */
export function mcpExecutionRefusal(error) {
  const text = error instanceof Error ? error.message : String(error);
  return mcpToolRefusalResult(text, mcpToolRefusal({ phase: "execution", reasons: [text] }));
}
