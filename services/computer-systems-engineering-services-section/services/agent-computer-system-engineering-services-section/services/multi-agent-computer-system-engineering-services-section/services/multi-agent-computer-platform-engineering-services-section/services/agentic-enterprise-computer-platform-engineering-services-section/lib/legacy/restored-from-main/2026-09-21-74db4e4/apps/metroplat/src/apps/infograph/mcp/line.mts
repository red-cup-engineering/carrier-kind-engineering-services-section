
/**
 * One newline-delimited MCP JSON-RPC message admission.
 */

import { parse as parseJson } from "../../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { programMcpHandle, mcpProtocolError, type ProjectedSurface, type ServeOptions } from "../../../presentation/index.mts";

export interface McpLineServiceOptions extends ServeOptions {
  /** Application surface supplied by the composition root. */
  readonly induced: ProjectedSurface;
}

export async function handleMcpLine(
  line: string,
  options: McpLineServiceOptions,
): Promise<string | undefined> {
  const trimmed = line.trim();
  if (trimmed === "") return undefined;
  const induced = options.induced;

  let message: unknown;
  try {
    message = parseJson(trimmed);
  } catch (error) {
    return `${JSON.stringify(mcpProtocolError(induced, null, -32700, error instanceof Error ? error.message : "parse error", options))}\n`;
  }

  const response = await programMcpHandle(induced, message, options);
  return response === undefined ? undefined : `${JSON.stringify(response)}\n`;
}
