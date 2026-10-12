import { articulatingApex } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/articulating";

export async function handleArticulatingMcp(message) {
  if (message?.jsonrpc !== "2.0" || !(typeof message.id === "string" || typeof message.id === "number")) throw new TypeError("MCP request requires jsonrpc 2.0 and an id");
  if (message.method === "tools/list") return Object.freeze({ jsonrpc: "2.0", id: message.id, result: { tools: articulatingApex.actions.map(({ verb, summary }) => ({ name: verb, description: summary, inputSchema: { type: "object", required: ["input"], properties: { input: { type: "object" } }, additionalProperties: false } })) } });
  if (message.method !== "tools/call") return Object.freeze({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "method not found" } });
  const action = articulatingApex.actions.find(({ verb }) => verb === message.params?.name);
  if (!action) return Object.freeze({ jsonrpc: "2.0", id: message.id, error: { code: -32602, message: "unknown articulation tool" } });
  try {
    const result = await action.run(message.params?.arguments?.input);
    return Object.freeze({ jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: JSON.stringify(result) }] } });
  } catch (error) {
    return Object.freeze({ jsonrpc: "2.0", id: message.id, result: { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }] } });
  }
}
