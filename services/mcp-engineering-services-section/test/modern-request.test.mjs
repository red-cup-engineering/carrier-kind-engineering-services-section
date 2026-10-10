import assert from "node:assert/strict";
import test from "node:test";

import {
  MCP_MODERN_HEADER_MISMATCH_ERROR_CODE,
  MCP_MODERN_PROFILE,
  assayMcpModernRequest,
} from "../src/modern.mjs";

function modernMeta(overrides = {}) {
  return {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {},
    ...overrides,
  };
}

function headers(overrides = {}) {
  return {
    "MCP-Protocol-Version": "2026-07-28",
    "Mcp-Method": "server/discover",
    ...overrides,
  };
}

test("modern profile is explicitly partial and stateless", () => {
  assert.equal(MCP_MODERN_PROFILE.protocolVersion, "2026-07-28");
  assert.equal(MCP_MODERN_PROFILE.era, "modern-stateless");
  assert.equal(MCP_MODERN_PROFILE.wireConformant, false);
  assert.equal(MCP_MODERN_HEADER_MISMATCH_ERROR_CODE, -32020);
  assert.ok(MCP_MODERN_PROFILE.missing.includes("SDK/TCK conformance receiving"));
});

test("server/discover admits a complete modern per-request envelope without session state", () => {
  const reading = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 1,
      method: "server/discover",
      params: { _meta: modernMeta() },
    },
    headers: headers(),
  });

  assert.equal(reading.ok, true);
  assert.deepEqual(reading.reasons, []);
  assert.equal(reading.method, "server/discover");
  assert.equal(reading.name, undefined);
});

test("tools/call requires exact method and tool-name header mirrors", () => {
  const reading = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: "call-1",
      method: "tools/call",
      params: {
        name: "metroplat_metroplex_connect",
        arguments: {},
        _meta: modernMeta(),
      },
    },
    headers: headers({
      "Mcp-Method": "tools/call",
      "Mcp-Name": "metroplat_metroplex_connect",
    }),
  });

  assert.equal(reading.ok, true);
  assert.equal(reading.name, "metroplat_metroplex_connect");
});

test("routing header/body disagreement is an obstruction, never an alias opportunity", () => {
  const reading = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "metroplat_metroplex_connect",
        _meta: modernMeta(),
      },
    },
    headers: headers({
      "Mcp-Method": "tools/call",
      "Mcp-Name": "metroplat_metroplex-connect",
    }),
  });

  assert.equal(reading.ok, false);
  assert.equal(reading.reasons.includes("name-header-mismatch"), true);
  assert.equal(reading.name, "metroplat_metroplex_connect");
});

test("protocol version must agree in body and header", () => {
  const bodyMismatch = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 3,
      method: "server/discover",
      params: {
        _meta: modernMeta({
          "io.modelcontextprotocol/protocolVersion": "2025-11-25",
        }),
      },
    },
    headers: headers(),
  });
  assert.equal(bodyMismatch.reasons.includes("body-protocol-version-mismatch"), true);

  const headerMismatch = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 4,
      method: "server/discover",
      params: { _meta: modernMeta() },
    },
    headers: headers({ "MCP-Protocol-Version": "2025-11-25" }),
  });
  assert.equal(headerMismatch.reasons.includes("protocol-header-mismatch"), true);
});

test("modern requests require per-request client capabilities", () => {
  const reading = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 5,
      method: "server/discover",
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        },
      },
    },
    headers: headers(),
  });

  assert.equal(reading.ok, false);
  assert.equal(reading.reasons.includes("client-capabilities-missing"), true);
});

test("modern sessionless requests reject Mcp-Session-Id", () => {
  const reading = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 6,
      method: "server/discover",
      params: { _meta: modernMeta() },
    },
    headers: headers({ "Mcp-Session-Id": "legacy-session" }),
  });

  assert.equal(reading.ok, false);
  assert.equal(reading.reasons.includes("session-id-present"), true);
});

test("legacy initialize traffic does not silently pass the modern assay", () => {
  const reading = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 7,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
      },
    },
    headers: {
      "MCP-Protocol-Version": "2025-06-18",
      "Mcp-Method": "initialize",
    },
  });

  assert.equal(reading.ok, false);
  assert.equal(reading.reasons.includes("meta-missing"), true);
  assert.equal(reading.reasons.includes("body-protocol-version-missing"), true);
  assert.equal(reading.reasons.includes("protocol-header-mismatch"), true);
});

test("Mcp-Name is method-specific and cannot be smuggled onto unnamed core methods", () => {
  const missing = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 8,
      method: "resources/read",
      params: {
        uri: "file:///resource",
        _meta: modernMeta(),
      },
    },
    headers: headers({ "Mcp-Method": "resources/read" }),
  });
  assert.equal(missing.reasons.includes("name-header-missing"), true);

  const unexpected = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 9,
      method: "server/discover",
      params: { _meta: modernMeta() },
    },
    headers: headers({ "Mcp-Name": "not-a-discovery-name" }),
  });
  assert.equal(unexpected.reasons.includes("name-header-unexpected"), true);
});

test("header lookup is case-insensitive while values remain exact", () => {
  const reading = assayMcpModernRequest({
    request: {
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "tool_exact",
        _meta: modernMeta(),
      },
    },
    headers: {
      "mcp-protocol-version": "2026-07-28",
      "MCP-METHOD": "tools/call",
      "mcp-name": "tool_exact",
    },
  });

  assert.equal(reading.ok, true);
});
