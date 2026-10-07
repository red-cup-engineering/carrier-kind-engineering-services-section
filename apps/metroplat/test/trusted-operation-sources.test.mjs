import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { defaultMcpApex } from "@red-cup-engineering/metroplat/mcp-surface";
import { activateMcpRequestedCapabilities } from "@red-cup-engineering/metroplat/mcp-options";

const fixture = Object.freeze([{ module: "@example/trusted-fixture", operations: Object.freeze([
  operation({ verb: "trusted-fixture", summary: "A fixed trusted fixture", effects: { class: "pure", replay: "safe", coordination: "coordination-free", deterministic: true, totality: "schema-bounded" }, run: (input) => input }),
]) }]);

test("trusted operation families enter the normal MCP projection and require normal capability grants", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "metroplat-trusted-source-"));
  try {
    const apex = defaultMcpApex(dataRoot, { trustedOperationSources: fixture });
    assert.ok(apex.catalog.byVerb.has("trusted-fixture"));
    assert.ok(apex.discovery.programs.some((program) => program.name === "trusted-fixture"));
    const action = apex.catalog.byVerb.get("trusted-fixture");
    assert.ok(action);
    assert.equal(apex.authorize({ id: "x", subject: "fixture", resource: "infograph" }, action, "2026-09-02T00:00:00.000Z").ok, false);
    const activation = activateMcpRequestedCapabilities(dataRoot, apex, { subject: "fixture", requestedCapabilityVerbs: ["trusted-fixture"] }, () => "2026-09-02T00:00:00.000Z");
    assert.deepEqual(activation.granted, ["infograph#trusted-fixture"]);
    const refreshed = defaultMcpApex(dataRoot, { trustedOperationSources: fixture });
    const granted = refreshed.catalog.byVerb.get("trusted-fixture");
    assert.ok(granted);
    assert.equal(refreshed.authorize({ id: "x", subject: "fixture", resource: "infograph" }, granted, "2026-09-02T00:00:01.000Z").ok, true);
  } finally { rmSync(dataRoot, { recursive: true, force: true }); }
});
