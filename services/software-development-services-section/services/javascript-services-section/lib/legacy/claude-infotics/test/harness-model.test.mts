import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readProjectHarness, HARNESS_PREDICATES, type HarnessFact } from "../src/operations/harness.mts";

function project(): string {
  const root = mkdtempSync(join(tmpdir(), "ci-harness-model-"));
  writeFileSync(join(root, ".mcp.json"), JSON.stringify({
    mcpServers: {
      hub: { type: "http", url: "http://hub/mcp" },
      local: { type: "stdio", command: "node", args: ["server.mjs"] },
    },
  }));
  mkdirSync(join(root, ".claude", "skills", "do-a-thing"), { recursive: true });
  mkdirSync(join(root, ".claude", "agents"), { recursive: true });
  mkdirSync(join(root, ".claude", "commands"), { recursive: true });
  writeFileSync(join(root, ".claude", "agents", "helper.md"), "x");
  writeFileSync(join(root, ".claude", "commands", "ship.md"), "x");
  writeFileSync(join(root, ".claude", "settings.json"), JSON.stringify({
    model: "opus",
    hooks: { Stop: [], PreToolUse: [] },
  }));
  return root;
}

const objectsFor = (facts: readonly HarnessFact[], predicate: string): readonly string[] =>
  facts.filter((f) => f.predicate === predicate).map((f) => f.object).sort();

test("every harness slot the archived topology modelled is recovered", () => {
  const model = readProjectHarness(project(), "demo") as Record<string, unknown>;
  assert.equal(model["term"], "claude-code-cli-harness.demo");
  assert.equal(model["model"], "opus");
  assert.deepEqual([...(model["skills"] as string[])], ["do-a-thing"]);
  assert.deepEqual([...(model["subagents"] as string[])], ["helper"], ".md stripped");
  assert.deepEqual([...(model["commands"] as string[])], ["ship"]);
  assert.deepEqual([...(model["hooks"] as string[])], ["PreToolUse", "Stop"]);
  assert.ok((model["settings"] as string[]).includes("model"));
});

test("an mcp-server points at its endpoint (http) or its command (stdio)", () => {
  const model = readProjectHarness(project(), "demo") as Record<string, unknown>;
  const servers = model["mcpServers"] as { id: string; pointsAt: string }[];
  assert.equal(servers.find((s) => s.id === "hub")?.pointsAt, "http://hub/mcp");
  assert.equal(servers.find((s) => s.id === "local")?.pointsAt, "node server.mjs");
});

test("the model emits the topology's subject/predicate/object facts", () => {
  const model = readProjectHarness(project(), "demo") as Record<string, unknown>;
  const facts = model["facts"] as HarnessFact[];
  assert.deepEqual(objectsFor(facts, HARNESS_PREDICATES.providesSkill), ["skill.do-a-thing"]);
  assert.deepEqual(objectsFor(facts, HARNESS_PREDICATES.hasSubagent), ["subagent.helper"]);
  assert.deepEqual(objectsFor(facts, HARNESS_PREDICATES.hasCommand), ["command.ship"]);
  assert.deepEqual(objectsFor(facts, HARNESS_PREDICATES.hasMcpServer), ["mcp-server.hub", "mcp-server.local"]);
  assert.deepEqual(objectsFor(facts, HARNESS_PREDICATES.hasModel), ["model.opus"]);
  // the archive's load-bearing edge, one per server
  assert.equal(facts.filter((f) => f.predicate === HARNESS_PREDICATES.pointsAt).length, 2);
});

test("an empty project models cleanly rather than throwing", () => {
  const root = mkdtempSync(join(tmpdir(), "ci-harness-empty-"));
  const model = readProjectHarness(root) as Record<string, unknown>;
  assert.equal(model["ok"], true);
  assert.equal(model["hasMcpConfig"], false);
  assert.deepEqual([...(model["skills"] as string[])], []);
});
