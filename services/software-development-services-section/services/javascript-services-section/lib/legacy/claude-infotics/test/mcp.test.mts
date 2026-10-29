import { test } from "node:test";
import assert from "node:assert/strict";
import type { FilesystemBinding } from "@emsenn/metroplat/integrations/filesystem";

import { claudeInfoticsSurface } from "../src/surface.mts";
import { claudeInfoticsMcpTools, handleMcpRequest } from "../src/mcp.mts";

const AT = "2026-07-14T00:00:00.000Z";
const binding = { dataRoot: "/tmp/claude-infotics-test", packageRoot: "/tmp/claude-infotics-test" } as unknown as FilesystemBinding;
const surface = () => claudeInfoticsSurface(binding, AT);
const context = {
  subject: "claude-infotics-operator",
  program: "claude-infotics",
  now: () => AT,
  witness: (() => undefined) as never,
};

test("every catalog operation is projected as an MCP tool with an input schema", () => {
  const s = surface();
  const tools = claudeInfoticsMcpTools(s);
  assert.equal(tools.length, s.operations.length, "no operation is dropped from the MCP face");
  const byName = new Map(tools.map((t) => [t.name, t]));
  for (const verb of ["claude-run", "claude-finding", "claude-recall", "claude-impact", "claude-harness-read"]) {
    assert.ok(byName.has(verb), `${verb} exposed over MCP`);
  }
  const run = byName.get("claude-run")!;
  assert.equal(run.inputSchema?.["type"], "object");
  // declared options become schema properties
  assert.ok((run.inputSchema?.["properties"] as Record<string, unknown>)["prompt"]);
});

test("initialize returns server info and a protocol version", async () => {
  const reply = await handleMcpRequest(surface(), { jsonrpc: "2.0", id: 1, method: "initialize" }, context);
  const result = (reply as { result: Record<string, unknown> }).result;
  assert.equal((result["serverInfo"] as Record<string, unknown>)["name"], "claude-infotics");
  assert.ok(typeof result["protocolVersion"] === "string");
});

test("tools/list returns the full catalog", async () => {
  const reply = await handleMcpRequest(surface(), { jsonrpc: "2.0", id: 2, method: "tools/list" }, context);
  const tools = ((reply as { result: Record<string, unknown> }).result["tools"]) as unknown[];
  assert.equal(tools.length, surface().operations.length);
});

test("a notification (no id) gets no reply, per JSON-RPC", async () => {
  const reply = await handleMcpRequest(surface(), { jsonrpc: "2.0", method: "notifications/initialized" }, context);
  assert.equal(reply, undefined);
});

test("unknown method and unknown tool are rejected, not executed", async () => {
  const unknownMethod = await handleMcpRequest(surface(), { jsonrpc: "2.0", id: 3, method: "nope" }, context);
  assert.equal((unknownMethod as { error: { code: number } }).error.code, -32601);
  const unknownTool = await handleMcpRequest(surface(), { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "not-a-verb" } }, context);
  assert.equal((unknownTool as { error: { code: number } }).error.code, -32602);
  const noName = await handleMcpRequest(surface(), { jsonrpc: "2.0", id: 5, method: "tools/call", params: {} }, context);
  assert.equal((noName as { error: { code: number } }).error.code, -32602);
});
