import { admit, defineType, type Admission, type DataType, type JsonSchema } from "@red-cup-engineering/computer-data-engine";

/**
 * One Model Context Protocol server as a client sees it: a stdio program under
 * a repository, or an HTTP URL. Paths are repository-relative; whoever binds
 * the endpoint to a machine supplies the root. This is the client-side
 * counterpart of the tool servers this section forms, declared once here so
 * every agent runtime's MCP configuration is a projection of the same type.
 */
export const MCP_CLIENT_ENDPOINT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.561.group/computer/networking/mcp-client-endpoint.schema.json",
  title: "McpClientEndpoint",
  description: "One Model Context Protocol server as a client sees it: a stdio program under the repository, or an HTTP URL. Repository-relative paths only; the binding to a machine supplies the root.",
  $defs: {
    repositoryRelativePath: { type: "string", minLength: 1, pattern: "^(?!/)(?!\\.\\.(/|$))(?!.*/\\.\\.(/|$))[^\\u0000]+$" },
    toolName: { type: "string", pattern: "^[A-Za-z0-9_.:-]+$" },
    seconds: { type: "integer", minimum: 1, maximum: 3600 },
  },
  oneOf: [
    {
      type: "object",
      required: ["transport", "script"],
      additionalProperties: false,
      properties: {
        transport: { const: "stdio" },
        script: { $ref: "#/$defs/repositoryRelativePath" },
        arguments: { type: "array", items: { type: "string" } },
        cwd: { $ref: "#/$defs/repositoryRelativePath" },
        environment: { type: "object", additionalProperties: { type: "string" } },
        enabled: { type: "boolean" },
        enabledTools: { type: "array", items: { $ref: "#/$defs/toolName" }, uniqueItems: true },
        startupTimeoutSeconds: { $ref: "#/$defs/seconds" },
        toolTimeoutSeconds: { $ref: "#/$defs/seconds" },
      },
    },
    {
      type: "object",
      required: ["transport", "url"],
      additionalProperties: false,
      properties: {
        transport: { const: "http" },
        url: { type: "string", pattern: "^https?://" },
        enabled: { type: "boolean" },
        enabledTools: { type: "array", items: { $ref: "#/$defs/toolName" }, uniqueItems: true },
        startupTimeoutSeconds: { $ref: "#/$defs/seconds" },
        toolTimeoutSeconds: { $ref: "#/$defs/seconds" },
      },
    },
  ],
} as const satisfies JsonSchema;

export type McpStdioClientEndpoint = Readonly<{
  transport: "stdio";
  script: string;
  arguments?: readonly string[];
  cwd?: string;
  environment?: Readonly<Record<string, string>>;
  enabled?: boolean;
  enabledTools?: readonly string[];
  startupTimeoutSeconds?: number;
  toolTimeoutSeconds?: number;
}>;
export type McpHttpClientEndpoint = Readonly<{
  transport: "http";
  url: string;
  enabled?: boolean;
  enabledTools?: readonly string[];
  startupTimeoutSeconds?: number;
  toolTimeoutSeconds?: number;
}>;
export type McpClientEndpoint = McpStdioClientEndpoint | McpHttpClientEndpoint;

const declared = defineType({
  id: MCP_CLIENT_ENDPOINT_SCHEMA.$id,
  name: "McpClientEndpoint",
  description: MCP_CLIENT_ENDPOINT_SCHEMA.description,
  parents: [],
  schema: MCP_CLIENT_ENDPOINT_SCHEMA,
});
if (!declared.ok) throw new TypeError(`McpClientEndpoint declaration refused: ${JSON.stringify(declared.refusal)}`);

/** The established McpClientEndpoint data type. */
export const mcpClientEndpointType: DataType = declared.value;

/** Admit one candidate endpoint through the declaration. */
export function admitMcpClientEndpoint(value: unknown): Admission<McpClientEndpoint> {
  return admit(mcpClientEndpointType, value) as Admission<McpClientEndpoint>;
}
