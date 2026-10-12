
/**
 * @packageDocumentation
 *
 * apps/infograph/mcp - the long-lived MCP stdio process binding.
 *
 * The package already derives MCP tools, resources, and prompts from the action
 * apex in `src/presentation`. This module preserves the public service surface while
 * focused sibling modules own apex selection, one-line JSON-RPC admission, the
 * stdio stream loop, and process-environment option wiring.
 */

export * from "./line.mjs";
export * from "./stdio.mjs";
