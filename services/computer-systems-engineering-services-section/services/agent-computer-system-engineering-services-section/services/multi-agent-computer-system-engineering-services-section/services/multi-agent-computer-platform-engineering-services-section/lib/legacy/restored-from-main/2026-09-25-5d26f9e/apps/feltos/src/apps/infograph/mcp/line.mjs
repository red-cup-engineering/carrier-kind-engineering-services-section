
/**
 * One newline-delimited MCP JSON-RPC message admission.
 */

import { parse as parseJson } from "@red-cup-engineering/json-services-section";
import { programMcpHandle, mcpProtocolError } from "@red-cup-engineering/feltos/presentation/serving";

export async function handleMcpLine(
  line,
  options,
) {
  const trimmed = line.trim();
  if (trimmed === "") return undefined;
  const induced = options.induced;

  let message;
  try {
    message = parseJson(trimmed);
  } catch (error) {
    return `${JSON.stringify(mcpProtocolError(induced, null, -32700, error instanceof Error ? error.message : "parse error", options))}\n`;
  }

  const response = await programMcpHandle(induced, message, options);
  return response === undefined ? undefined : `${JSON.stringify(response)}\n`;
}
