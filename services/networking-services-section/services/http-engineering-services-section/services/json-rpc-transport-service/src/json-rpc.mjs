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
  const response = await transport(url, envelope);
  if (!response || response.status < 200 || response.status >= 300 || typeof response.status !== "number") {
    throw new Error(`HTTP ${response?.status} from ${url}`);
  }
  const payload = JSON.parse(response.body);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error(`Invalid JSON-RPC response from ${url}`);
  if (payload.error !== undefined && payload.error !== null) {
    const error = new Error(`RPC error from ${url}: ${payload.error?.message ?? JSON.stringify(payload.error)}`);
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
