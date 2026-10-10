import assert from "node:assert/strict";
import test from "node:test";
import { LATEST_MCP_PROTOCOL_VERSION, MCP_PROTOCOL_VERSIONS } from "../src/server.mjs";
import {
  MCP_MODERN_PROTOCOL_VERSION,
  MCP_PROTOCOL_MIGRATION_PROFILE,
  mcpModernRouteHeaders,
  mcpProtocolEra,
} from "../src/modern.mjs";

test("every negotiated revision is in the legacy session era; the modern one is named apart", () => {
  for (const version of MCP_PROTOCOL_VERSIONS) assert.equal(mcpProtocolEra(version), "legacy-session");
  assert.equal(mcpProtocolEra(MCP_MODERN_PROTOCOL_VERSION), "modern-stateless");
  assert.equal(MCP_PROTOCOL_VERSIONS.includes(MCP_MODERN_PROTOCOL_VERSION), false);
  assert.equal(mcpProtocolEra("2099-01-01"), "unknown");
});

test("modern routing helper emits protocol, method, and optional name headers", () => {
  assert.deepEqual(mcpModernRouteHeaders({ method: "tools/call", name: "search" }), {
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "tools/call",
    "Mcp-Name": "search",
  });
  assert.deepEqual(mcpModernRouteHeaders({ method: "server/discover" }), {
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "server/discover",
  });
});

test("modern routing refuses blank method/name values", () => {
  assert.throws(() => mcpModernRouteHeaders({ method: " " }), /Mcp-Method: expected non-empty string/u);
  assert.throws(() => mcpModernRouteHeaders({ method: "tools/call", name: "" }), /Mcp-Name: expected non-empty string/u);
});

test("the migration profile stays not ready and names the legacy default it leaves", () => {
  assert.equal(MCP_PROTOCOL_MIGRATION_PROFILE.ready, false);
  assert.equal(MCP_PROTOCOL_MIGRATION_PROFILE.currentDefault, LATEST_MCP_PROTOCOL_VERSION);
  assert.equal(MCP_PROTOCOL_MIGRATION_PROFILE.currentEra, "legacy-session");
  assert.equal(MCP_PROTOCOL_MIGRATION_PROFILE.targetEra, "modern-stateless");
  assert.ok(MCP_PROTOCOL_MIGRATION_PROFILE.blockers.some((item) => item.includes("io.modelcontextprotocol/tasks")));
});
