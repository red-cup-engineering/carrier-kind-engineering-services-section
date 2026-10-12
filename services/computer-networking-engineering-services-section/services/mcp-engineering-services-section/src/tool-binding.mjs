import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Bind explicitly granted MCP tools to an existing connected client. */
export async function bindMcpTools({ client, allowlist, signal, maximumPages = 32 } = {}) {
  if (typeof client?.listTools !== "function" || typeof client?.callTool !== "function") throw new TypeError("one connected MCP client is required");
  if (!Array.isArray(allowlist) || allowlist.some((name) => typeof name !== "string" || !/^[A-Za-z0-9_-]{1,64}$/u.test(name)) || new Set(allowlist).size !== allowlist.length) throw new TypeError("explicit unique tool names compatible with function calling are required");
  if (!Number.isSafeInteger(maximumPages) || maximumPages < 1) throw new TypeError("maximumPages must be a positive safe integer");
  const granted = new Set(allowlist);
  const selected = new Map();
  const names = new Set();
  const cursors = new Set();
  let cursor;
  if (granted.size === 0) return Object.freeze({ tools: Object.freeze([]), toolHandlers: Object.freeze(Object.create(null)) });
  for (let page = 0; ; page += 1) {
    signal?.throwIfAborted();
    if (page >= maximumPages) throw new Error("MCP tool discovery page bound exhausted");
    const result = await client.listTools(cursor === undefined ? {} : { cursor }, { signal });
    if (!Array.isArray(result?.tools)) throw new TypeError("MCP tools/list returned no tool array");
    for (const tool of result.tools) {
      if (!object(tool) || typeof tool.name !== "string" || names.has(tool.name)) throw new TypeError("MCP tools/list returned an invalid or ambiguous name");
      names.add(tool.name);
      if (!granted.has(tool.name)) continue;
      if (!object(tool.inputSchema) || tool.inputSchema.type !== "object") throw new TypeError("MCP tool requires an object input schema");
      if (tool.outputSchema !== undefined && (!object(tool.outputSchema) || tool.outputSchema.type !== "object")) throw new TypeError("MCP tool requires an object output schema");
      selected.set(tool.name, structuredClone(tool));
    }
    if (result.nextCursor === undefined) break;
    if (typeof result.nextCursor !== "string" || result.nextCursor.length === 0 || cursors.has(result.nextCursor)) throw new TypeError("MCP tools/list returned an invalid or repeated cursor");
    cursors.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  if ([...granted].some((name) => !selected.has(name))) throw new Error("one or more granted MCP tools were not discovered");
  const toolHandlers = Object.create(null);
  const tools = [];
  for (const name of granted) {
    const tool = selected.get(name);
    tools.push({ type: "function", function: { name, ...(typeof tool.description === "string" ? { description: tool.description } : {}), parameters: structuredClone(tool.inputSchema) } });
    toolHandlers[name] = async (args) => {
      signal?.throwIfAborted();
      if (!validateJsonSchema(args, tool.inputSchema).valid) throw new TypeError("MCP tool input schema refusal");
      let result;
      try { result = await client.callTool({ name, arguments: args }, undefined, { signal }); }
      catch (error) { throw new Error(`MCP protocol failure${Number.isSafeInteger(error?.code) ? ` (${error.code})` : ""}`); }
      if (!object(result) || !Array.isArray(result.content) || (result.isError !== undefined && typeof result.isError !== "boolean") || (result.structuredContent !== undefined && !object(result.structuredContent))) throw new TypeError("MCP tools/call returned an invalid result");
      if (tool.outputSchema !== undefined && result.isError !== true && !validateJsonSchema(result.structuredContent, tool.outputSchema).valid) throw new TypeError("MCP tool structured output schema refusal");
      return result;
    };
  }
  return Object.freeze({ tools: Object.freeze(tools), toolHandlers: Object.freeze(toolHandlers) });
}
