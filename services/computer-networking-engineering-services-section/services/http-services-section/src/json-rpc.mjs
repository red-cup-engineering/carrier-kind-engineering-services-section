import { callJsonRpc } from "@red-cup-engineering/json-rpc-transport-service";
export { callJsonRpc };

import { collectBody } from "./body/body.mjs";

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
