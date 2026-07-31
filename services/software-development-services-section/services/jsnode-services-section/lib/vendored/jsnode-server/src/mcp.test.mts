import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

import { handler } from "@emsenn/web/server";

import { createJSNodeServer } from "./service.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "../../../../../");

async function withMcpServer(fn: (rpc: (body: unknown) => Promise<any>, hasRoute: (m: string) => boolean) => Promise<void>): Promise<void> {
  const service = createJSNodeServer({ name: "jsnode", root: REPO_ROOT, port: 0, mcp: {} });
  await service.refresh();
  const hasRoute = (m: string): boolean => (service.app.resources ?? []).some((r) => r.match === m);
  const server: Server = createServer(handler(service.app));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const rpc = async (body: unknown): Promise<any> => {
    // Loopback request (no x-forwarded-for) → the bearer gate is skipped.
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };
  try {
    await fn(rpc, hasRoute);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("jsnode-server MCP capability", () => {
  it("is absent unless config.mcp is set", () => {
    const without = createJSNodeServer({ name: "jsnode", root: REPO_ROOT, port: 0 });
    assert.ok(!(without.app.resources ?? []).some((r) => r.match === "/mcp"), "no /mcp without config.mcp");
    const withMcp = createJSNodeServer({ name: "jsnode", root: REPO_ROOT, port: 0, mcp: {} });
    assert.ok((withMcp.app.resources ?? []).some((r) => r.match === "/mcp"), "/mcp present with config.mcp");
  });

  it("initialize advertises the jsnode server and instructions", async () => {
    await withMcpServer(async (rpc) => {
      const { status, json } = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize" });
      assert.equal(status, 200);
      assert.equal(json.result.serverInfo.name, "jsnode");
      assert.match(json.result.instructions, /workspace package graph/);
    });
  });

  it("tools/list exposes the jsnode tool surface", async () => {
    await withMcpServer(async (rpc) => {
      const { json } = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
      const names = (json.result.tools as { name: string }[]).map((t) => t.name);
      for (const expected of ["jsnode_search", "jsnode_package", "jsnode_atlas", "jsnode_typeflow_type"]) {
        assert.ok(names.includes(expected), `expected tool ${expected}`);
      }
    });
  });

  it("tools/call jsnode_search returns ranked matches from the live workspace", async () => {
    await withMcpServer(async (rpc) => {
      const { json } = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "jsnode_search", arguments: { query: "jsnode" } } });
      assert.notEqual(json.result.isError, true);
      const payload = JSON.parse(json.result.content[0].text) as { count: number; matches: { name: string }[] };
      assert.ok(payload.count > 0, "expected at least one match for 'jsnode'");
      assert.ok(payload.matches.some((m) => m.name.includes("jsnode")));
    });
  });

  it("tools/call jsnode_package reports a tool error for an unknown package", async () => {
    await withMcpServer(async (rpc) => {
      const { json } = await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "jsnode_package", arguments: { name: "@nope/does-not-exist" } } });
      assert.equal(json.result.isError, true);
      assert.match(json.result.content[0].text, /package not found/);
    });
  });
});
