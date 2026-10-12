// The MCP 2026-07-28 modern stateless era, as a compatibility boundary and not a conformance
// claim. This module names the era, builds the standard routing headers, and admits one modern
// Streamable HTTP request POST: the per-request `_meta` and the `MCP-Protocol-Version`,
// `Mcp-Method` and `Mcp-Name` headers must agree with the JSON-RPC body, and no session id may
// be present. A witness here does not authenticate a caller, authorize a tool or attest that a
// handler exists. The server's `initialize` still negotiates only `MCP_PROTOCOL_VERSIONS`; it
// answers the newest of those for a modern version, so changing the version string cannot
// pretend the era.

import { LATEST_MCP_PROTOCOL_VERSION, MCP_PROTOCOL_VERSIONS } from "./server.mjs";

export const MCP_MODERN_PROTOCOL_VERSION = "2026-07-28";
export const MCP_MODERN_HEADER_MISMATCH_ERROR_CODE = -32020;

/** The era a protocol version belongs to: `legacy-session`, `modern-stateless` or `unknown`. */
export function mcpProtocolEra(version) {
  if (version === MCP_MODERN_PROTOCOL_VERSION) return "modern-stateless";
  if (MCP_PROTOCOL_VERSIONS.includes(version)) return "legacy-session";
  return "unknown";
}

/** What separates this server from the modern era. `ready` stays false until each blocker is received. */
export const MCP_PROTOCOL_MIGRATION_PROFILE = Object.freeze({
  kind: "metroplat.mcp.protocol-migration-profile",
  currentDefault: LATEST_MCP_PROTOCOL_VERSION,
  currentEra: "legacy-session",
  target: MCP_MODERN_PROTOCOL_VERSION,
  targetEra: "modern-stateless",
  ready: false,
  blockers: Object.freeze([
    "remove initialize/initialized as the modern request bootstrap",
    "implement server/discover capability discovery",
    "carry client identity/capabilities per request in _meta",
    "implement Mcp-Method/Mcp-Name header routing",
    "implement deterministic cacheable list-result hints",
    "model Tasks as the io.modelcontextprotocol/tasks extension",
    "receive modern authorization hardening and conformance tests",
  ]),
});

export const MCP_MODERN_PROFILE = Object.freeze({
  kind: "metroplat.mcp.modern-profile",
  protocolVersion: MCP_MODERN_PROTOCOL_VERSION,
  era: "modern-stateless",
  wireConformant: false,
  coverage: Object.freeze([
    "per-request protocol-version metadata",
    "per-request client-capabilities metadata",
    "MCP-Protocol-Version header mirror",
    "Mcp-Method header mirror",
    "Mcp-Name header mirror for core named methods",
    "modern session-id absence",
  ]),
  missing: Object.freeze([
    "server/discover result/cache semantics",
    "authorization profile",
    "Mcp-Param-* schema mirroring",
    "subscriptions/listen",
    "multi-round-trip inputRequired/requestState",
    "extension negotiation including tasks",
    "SDK/TCK conformance receiving",
  ]),
});

function requiredHeader(value, label) {
  const clean = typeof value === "string" ? value.trim() : "";
  if (clean.length === 0) throw new TypeError(`${label}: expected non-empty string`);
  return clean;
}

/** The routing headers of the modern HTTP era for one method and optional name. */
export function mcpModernRouteHeaders({ method, name } = {}) {
  const cleanMethod = requiredHeader(method, "Mcp-Method");
  const cleanName = name === undefined ? undefined : requiredHeader(name, "Mcp-Name");
  return Object.freeze({
    "MCP-Protocol-Version": MCP_MODERN_PROTOCOL_VERSION,
    "Mcp-Method": cleanMethod,
    ...(cleanName === undefined ? {} : { "Mcp-Name": cleanName }),
  });
}

function headerValue(headers, wanted) {
  const target = wanted.toLowerCase();
  const entries = headers instanceof Map ? headers.entries() : Object.entries(headers ?? {});
  for (const [key, value] of entries) if (key.toLowerCase() === target) return value;
  return undefined;
}

function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}

function nonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function expectedName(method, params) {
  if (method === "tools/call" || method === "prompts/get") return { required: true, value: nonemptyString(params?.name) };
  if (method === "resources/read") return { required: true, value: nonemptyString(params?.uri) };
  return { required: false };
}

/** Admit one 2026-07-28 Streamable HTTP request POST; the witness or obstruction names every reason. */
export function assayMcpModernRequest({ request, headers }) {
  const reasons = [];
  if (request?.jsonrpc !== "2.0") reasons.push("jsonrpc-version-invalid");
  if (request?.id === undefined || request?.id === null) reasons.push("request-id-missing");
  const method = nonemptyString(request?.method);
  if (method === undefined) reasons.push("method-missing");
  const params = asRecord(request?.params);
  if (params === undefined) reasons.push("params-missing");
  const meta = asRecord(params?._meta);
  if (meta === undefined) reasons.push("meta-missing");
  const bodyProtocol = nonemptyString(meta?.["io.modelcontextprotocol/protocolVersion"]);
  if (bodyProtocol === undefined) reasons.push("body-protocol-version-missing");
  else if (bodyProtocol !== MCP_MODERN_PROTOCOL_VERSION) reasons.push("body-protocol-version-mismatch");
  if (asRecord(meta?.["io.modelcontextprotocol/clientCapabilities"]) === undefined) reasons.push("client-capabilities-missing");

  const seen = Object.freeze({
    protocolVersion: headerValue(headers, "MCP-Protocol-Version"),
    method: headerValue(headers, "Mcp-Method"),
    name: headerValue(headers, "Mcp-Name"),
    sessionId: headerValue(headers, "Mcp-Session-Id"),
  });
  if (seen.protocolVersion === undefined) reasons.push("protocol-header-missing");
  else if (seen.protocolVersion !== MCP_MODERN_PROTOCOL_VERSION || (bodyProtocol !== undefined && seen.protocolVersion !== bodyProtocol)) reasons.push("protocol-header-mismatch");
  if (seen.method === undefined) reasons.push("method-header-missing");
  else if (method !== undefined && seen.method !== method) reasons.push("method-header-mismatch");

  const name = expectedName(method, params);
  if (name.required) {
    if (name.value === undefined) reasons.push("name-body-missing");
    if (seen.name === undefined) reasons.push("name-header-missing");
    else if (name.value !== undefined && seen.name !== name.value) reasons.push("name-header-mismatch");
  } else if (seen.name !== undefined) reasons.push("name-header-unexpected");
  if (seen.sessionId !== undefined) reasons.push("session-id-present");

  const unique = Object.freeze([...new Set(reasons)]);
  return Object.freeze({
    kind: unique.length === 0 ? "metroplat.mcp.modern-request:witness" : "metroplat.mcp.modern-request-obstruction",
    ok: unique.length === 0,
    protocolVersion: MCP_MODERN_PROTOCOL_VERSION,
    ...(method === undefined ? {} : { method }),
    ...(name.value === undefined ? {} : { name: name.value }),
    headers: seen,
    reasons: unique,
    evidence: Object.freeze([
      "protocol-era:modern-stateless",
      `protocol-version:${MCP_MODERN_PROTOCOL_VERSION}`,
      ...(method === undefined ? [] : [`method:${method}`]),
      ...(name.value === undefined ? [] : [`name:${name.value}`]),
      `header-mismatch-error-code:${MCP_MODERN_HEADER_MISMATCH_ERROR_CODE}`,
    ]),
  });
}
