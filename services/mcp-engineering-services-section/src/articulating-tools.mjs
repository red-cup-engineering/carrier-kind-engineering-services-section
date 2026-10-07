// The articulating apex's actions as MCP tools: one tool per verb, its input the action's input.
import { articulatingApex } from "@red-cup-engineering/signcell/articulating";

export const articulatingMcpTools = Object.freeze(articulatingApex.actions.map(({ verb, summary, run }) => Object.freeze({
  name: verb,
  description: summary,
  inputSchema: { type: "object", required: ["input"], properties: { input: { type: "object" } }, additionalProperties: false },
  handler: (args) => run(args.input),
})));
