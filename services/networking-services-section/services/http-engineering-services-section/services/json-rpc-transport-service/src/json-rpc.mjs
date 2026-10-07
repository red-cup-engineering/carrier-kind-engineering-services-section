import { collectBody } from "./collect-body.mjs";

export function createJsonRpcTransport({ timeout = 8000, maxBytes = 16 * 1024 * 1024, fetchImpl = globalThis.fetch } = {}) {
  return async (url, envelope) => {
    const signal = AbortSignal.timeout(timeout);
    const response = await fetchImpl(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope), signal,
    });
    // Fetch already decodes Content-Encoding; bound the decoded stream.
    const bytes = await collectBody(response.body, maxBytes, "JSON-RPC response", signal);
    return { status: response.status, body: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  };
}

export async function callJsonRpc(transport, url, envelope) {
  const expectedId = envelope?.id;
  const response = await transport(url, envelope);
  if (!response || response.status < 200 || response.status >= 300 || typeof response.status !== "number") {
    throw new Error(`HTTP ${response?.status} from ${url}`);
  }
  const payload = JSON.parse(response.body);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error(`Invalid JSON-RPC response from ${url}`);
  // JSON-RPC 2.0 section 5: correlate the response with this request and
  // distinguish presence from truthiness (null, false and 0 are valid results).
  const hasResult = Object.hasOwn(payload, "result");
  const hasError = Object.hasOwn(payload, "error");
  if (payload.jsonrpc !== "2.0" || !Object.hasOwn(payload, "id") || hasResult === hasError) {
    throw new Error(`Invalid JSON-RPC response from ${url}`);
  }
  if (hasError) {
    if (!payload.error || typeof payload.error !== "object" || Array.isArray(payload.error) ||
        !Number.isInteger(payload.error.code) || typeof payload.error.message !== "string") {
      throw new Error(`Invalid JSON-RPC error from ${url}`);
    }
  }
  // A server unable to recover the request id uses null for these two protocol
  // errors (section 5). Preserve that failure evidence, never an unbound result.
  const unknownRequestId = hasError && payload.id === null &&
    (payload.error.code === -32700 || payload.error.code === -32600);
  if (payload.id !== expectedId && !unknownRequestId) {
    throw new Error(`Invalid JSON-RPC response from ${url}`);
  }
  if (hasError) {
    const error = new Error(`RPC error from ${url}: ${payload.error.message}`);
    error.rpcError = payload.error;
    throw error;
  }
  return payload.result;
}

/**
 * Send one JSON-RPC 2.0 request with a bounded Fetch transport.
 * The caller supplies only the target operation; envelope and transport policy
 * stay shared so callers cannot drift in HTTP/error handling.
 */
export function requestJsonRpc(url, method, params, { timeout = 8000, id = 1, maxBytes = 16 * 1024 * 1024, fetchImpl = globalThis.fetch } = {}) {
  return callJsonRpc(
    createJsonRpcTransport({ timeout, maxBytes, fetchImpl }),
    url,
    { jsonrpc: "2.0", id, method, params },
  );
}
