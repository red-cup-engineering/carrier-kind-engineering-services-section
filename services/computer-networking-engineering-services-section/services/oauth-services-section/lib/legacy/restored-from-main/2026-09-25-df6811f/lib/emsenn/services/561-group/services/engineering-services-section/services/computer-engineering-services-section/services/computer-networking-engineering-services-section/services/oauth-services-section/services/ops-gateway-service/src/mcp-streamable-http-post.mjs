// One MCP Streamable HTTP request/response hop, shared by this gateway's own rail client and its
// stdio<->HTTP bridge: no `@modelcontextprotocol/sdk`, one POST per JSON-RPC message.
function parseFirstSseJsonRpcMessage(text) {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) return JSON.parse(trimmed.slice(5).trim());
  }
  throw new Error("empty text/event-stream response");
}

/**
 * POSTs one JSON-RPC message to an MCP Streamable HTTP endpoint and returns the parsed JSON-RPC
 * message the response carries (as plain `application/json`, or a one-shot `text/event-stream`).
 * @param {string|URL} url
 * @param {{headers?: Record<string,string>, body: object, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{message: object|undefined, sessionId: string|undefined}>}
 */
export async function postMcpJsonRpc(url, { headers = {}, body, fetchImpl = fetch }) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const sessionId = response.headers?.get?.("mcp-session-id") ?? undefined;
  const text = await response.text();
  if (!response.ok) throw Object.assign(new Error(`MCP endpoint returned HTTP ${response.status}${text ? `: ${text.slice(0, 500)}` : ""}`), { status: response.status });
  if (text.trim() === "") return { message: undefined, sessionId };
  const contentType = response.headers?.get?.("content-type") ?? "";
  const message = contentType.includes("text/event-stream") ? parseFirstSseJsonRpcMessage(text) : JSON.parse(text);
  return { message, sessionId };
}
