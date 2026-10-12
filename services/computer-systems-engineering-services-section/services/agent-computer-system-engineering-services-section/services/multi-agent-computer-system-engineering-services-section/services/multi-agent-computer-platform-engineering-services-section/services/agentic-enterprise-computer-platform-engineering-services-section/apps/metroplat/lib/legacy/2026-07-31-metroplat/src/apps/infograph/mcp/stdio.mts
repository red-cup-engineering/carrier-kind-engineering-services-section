
import { once } from "node:events";
import type { Readable, Writable } from "node:stream";

/**
 * Long-lived MCP stdio stream binding.
 */

import type { ServiceLifecycleEvent } from "../../../integrations/process/services/lifecycle-schema/schema.mts";
import { serviceLifecycleEvent } from "../../../integrations/process/index.mts";
import { handleMcpLine, type McpLineServiceOptions } from "./line.mts";

/** Options for the stdio MCP service binding. */
export interface McpStdioServiceOptions extends McpLineServiceOptions {
  readonly lifecycle?: ((event: ServiceLifecycleEvent) => void) | undefined;
}

interface McpStdioMessage {
  readonly body: string;
  readonly framed: boolean;
}

function parseContentLength(header: string): number | undefined {
  for (const line of header.split(/\r?\n/u)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    if (name !== "content-length") continue;
    const length = Number(line.slice(separator + 1).trim());
    return Number.isInteger(length) && length >= 0 ? length : undefined;
  }
  return undefined;
}

function takeMcpMessage(buffer: string): { readonly message?: McpStdioMessage; readonly rest: string } {
  if (buffer.startsWith("Content-Length:") || buffer.startsWith("content-length:")) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) return { rest: buffer };
    const length = parseContentLength(buffer.slice(0, headerEnd));
    if (length === undefined) {
      const lineEnd = buffer.indexOf("\n");
      return lineEnd < 0 ? { rest: buffer } : { message: { body: buffer.slice(0, lineEnd), framed: false }, rest: buffer.slice(lineEnd + 1) };
    }
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + length;
    if (buffer.length < bodyEnd) return { rest: buffer };
    return {
      message: { body: buffer.slice(bodyStart, bodyEnd), framed: true },
      rest: buffer.slice(bodyEnd),
    };
  }

  const lineEnd = buffer.indexOf("\n");
  if (lineEnd < 0) return { rest: buffer };
  return {
    message: { body: buffer.slice(0, lineEnd), framed: false },
    rest: buffer.slice(lineEnd + 1),
  };
}

function frameMcpResponse(response: string): string {
  const body = response.trimEnd();
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

/** Serve standard header-framed MCP stdio, while still accepting newline JSON-RPC for local probes. */
export async function serveMcpStdio(
  input: Readable,
  output: Writable,
  options: McpStdioServiceOptions,
): Promise<void> {
  const induced = options.induced;
  emitMcpLifecycle(options, "mcp-stdio", "start");
  emitMcpLifecycle(options, "stream", "stream-open", { input: "stdin", output: "stdout" });
  let buffer = "";
  try {
    for await (const chunk of input) {
      buffer += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      while (buffer.length > 0) {
        const parsed = takeMcpMessage(buffer);
        buffer = parsed.rest;
        if (parsed.message === undefined) break;
        const response = await handleMcpLine(parsed.message.body, { ...options, induced });
        if (response !== undefined) {
          await writeStdioResponse(output, parsed.message.framed ? frameMcpResponse(response) : response, options);
        }
      }
    }
  } catch (error) {
    emitMcpLifecycle(options, "mcp-stdio", "error", error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) }, false);
    throw error;
  } finally {
    emitMcpLifecycle(options, "stream", "stream-close", { input: "stdin", output: "stdout" });
    emitMcpLifecycle(options, "mcp-stdio", "close");
  }
}

function emitMcpLifecycle(
  options: McpStdioServiceOptions,
  boundary: ServiceLifecycleEvent["boundary"],
  event: ServiceLifecycleEvent["event"],
  detail?: unknown,
  ok = true,
): void {
  if (options.lifecycle === undefined) return;
  options.lifecycle(serviceLifecycleEvent({
    service: "src/integrations/mcp/stdio:serveMcpStdio",
    boundary,
    event,
    ok,
    ...(detail === undefined ? {} : { detail }),
    evidence: ["src/integrations/mcp/stdio.mts"],
  }));
}

async function writeStdioResponse(output: Writable, response: string, options: McpStdioServiceOptions): Promise<void> {
  if (output.write(response)) return;
  emitMcpLifecycle(options, "stream", "backpressure", { output: "stdout", bytes: Buffer.byteLength(response, "utf8") });
  await once(output, "drain");
  emitMcpLifecycle(options, "stream", "drain", { output: "stdout" });
}
