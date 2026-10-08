import { admit, defineType } from "@red-cup-engineering/computer-data-services-section/type-system";

export const MCP_CLIENT_ENDPOINT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.561.group/computer/networking/mcp-client-endpoint.schema.json",
  title: "McpClientEndpoint",
  description: "One Model Context Protocol server as a client sees it: a stdio program under the repository, or an HTTP URL. Repository-relative paths only; the binding to a machine supplies the root.",
  $defs: { repositoryRelativePath: { type: "string", minLength: 1, pattern: "^(?!/)(?!\\.\\.(/|$))(?!.*/\\.\\.(/|$))[^\\u0000]+$" }, toolName: { type: "string", pattern: "^[A-Za-z0-9_.:-]+$" }, seconds: { type: "integer", minimum: 1, maximum: 3600 } },
  oneOf: [
    { type: "object", required: ["transport", "script"], additionalProperties: false, properties: { transport: { const: "stdio" }, script: { $ref: "#/$defs/repositoryRelativePath" }, environmentFile: { $ref: "#/$defs/repositoryRelativePath" }, arguments: { type: "array", items: { type: "string" } }, cwd: { $ref: "#/$defs/repositoryRelativePath" }, environment: { type: "object", additionalProperties: { type: "string" } }, enabled: { type: "boolean" }, enabledTools: { type: "array", items: { $ref: "#/$defs/toolName" }, uniqueItems: true }, startupTimeoutSeconds: { $ref: "#/$defs/seconds" }, toolTimeoutSeconds: { $ref: "#/$defs/seconds" } } },
    { type: "object", required: ["transport", "url"], additionalProperties: false, properties: { transport: { const: "http" }, url: { type: "string", pattern: "^https?://" }, enabled: { type: "boolean" }, enabledTools: { type: "array", items: { $ref: "#/$defs/toolName" }, uniqueItems: true }, startupTimeoutSeconds: { $ref: "#/$defs/seconds" }, toolTimeoutSeconds: { $ref: "#/$defs/seconds" } } },
  ],
};
const declared = defineType({ id: MCP_CLIENT_ENDPOINT_SCHEMA.$id, name: "McpClientEndpoint", description: MCP_CLIENT_ENDPOINT_SCHEMA.description, parents: [], schema: MCP_CLIENT_ENDPOINT_SCHEMA });
if (!declared.ok) throw new TypeError(`McpClientEndpoint declaration refused: ${JSON.stringify(declared.refusal)}`);
export const mcpClientEndpointType = declared.value;
export function admitMcpClientEndpoint(value) { return admit(mcpClientEndpointType, value); }
export function bindMcpClientEndpoint(root, endpoint) {
  const admitted = admitMcpClientEndpoint(endpoint);
  if (!admitted.ok) throw new TypeError(`MCP endpoint refused: ${admitted.refusal.issues.map((issue) => issue.message).join("; ")}`);
  if (endpoint.transport === "http") return { url: endpoint.url };
  return { command: "node", args: [...(endpoint.environmentFile ? [`--env-file=${root}/${endpoint.environmentFile}`] : []), `${root}/${endpoint.script}`, ...(endpoint.arguments ?? [])], ...(endpoint.cwd === undefined ? {} : { cwd: `${root}/${endpoint.cwd}` }), ...(endpoint.environment === undefined ? {} : { env: Object.fromEntries(Object.entries(endpoint.environment).map(([key, value]) => [key, value.replaceAll("{{root}}", root)])) }) };
}
