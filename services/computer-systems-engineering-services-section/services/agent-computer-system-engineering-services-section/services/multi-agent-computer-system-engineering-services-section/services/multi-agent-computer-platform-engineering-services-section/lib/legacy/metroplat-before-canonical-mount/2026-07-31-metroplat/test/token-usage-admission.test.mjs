import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { executeOperationHandler } from "../src/rpc/handler.mts";
import { claudeSessionOperations } from "../src/integrations/anthropic/service.mts";
import { codexSessionOperations } from "../src/integrations/openai/codex/service.mts";
import { agentTokenUsageOperations } from "../src/integrations/token-usage/service.mts";
import { readModuleTopology } from "../src/monitoring/index.mts";

test("one provider-neutral operation admits Claude and Codex transcript token usage", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "metroplat-token-usage-admission-"));
  const claudeRoot = path.join(root, "claude");
  const codexRoot = path.join(root, "codex");
  const dataRoot = path.join(root, "data-root");
  const at = "2026-07-12T18:00:00.000Z";
  try {
    mkdirSync(claudeRoot, { recursive: true });
    mkdirSync(codexRoot, { recursive: true });
    mkdirSync(dataRoot, { recursive: true });
    writeFileSync(path.join(claudeRoot, "claude-test.jsonl"), `${JSON.stringify({
      type: "assistant",
      sessionId: "claude-test",
      requestId: "request-claude-test",
      timestamp: at,
      message: {
        id: "message-claude-test",
        model: "claude-test",
        role: "assistant",
        usage: { input_tokens: 5, output_tokens: 2 },
      },
    })}\n`);
    writeFileSync(path.join(codexRoot, "codex-test.jsonl"), `${JSON.stringify({
      timestamp: at,
      session_id: "codex-test",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: { input_tokens: 11, output_tokens: 4, total_tokens: 15 },
          last_token_usage: { input_tokens: 6, output_tokens: 3, total_tokens: 9 },
          model_context_window: 128_000,
        },
      },
    })}\n`);

    const binding = {
      dataRoot,
      claudeSessionRoot: claudeRoot,
      codexSessionRoot: codexRoot,
      now: () => at,
    };
    assert.equal(claudeSessionOperations(binding).some((operation) =>
      operation.verb === "claude-session-token-usage-admit"), false);
    assert.equal(codexSessionOperations(binding).some((operation) =>
      operation.verb === "codex-session-token-usage-admit"), false);

    const operations = agentTokenUsageOperations(binding);
    const admit = operations.find((operation) => operation.verb === "agent-session-token-usage-admit");
    const read = operations.find((operation) => operation.verb === "agent-session-token-usage");
    assert.ok(admit);
    assert.ok(read);
    const admitted = await executeOperationHandler(admit, { provider: "all", limit: 5 }, {});
    assert.equal(admitted.sessions, 2);
    assert.deepEqual(admitted.results.map((result) => result.provider).sort(), ["anthropic", "openai"]);
    assert.ok(admitted.appended >= 4);

    const settlement = await executeOperationHandler(read, { date: "2026-07-12" }, {});
    assert.equal(settlement.kind, "metroplat.holography.agent-session-token-usage-settlement");
    assert.ok(settlement.evidence.includes("source-log-entropy:feedEntropyCharge"));

    const topology = readModuleTopology(process.cwd(), {
      sourceDirs: [
        "src/integrations/anthropic",
        "src/integrations/openai/codex",
        "src/integrations/token-usage",
      ],
      maxFiles: 200,
    });
    const importsOf = (modulePath) => topology.modules.find((moduleEntry) => moduleEntry.path === modulePath)?.imports ?? [];
    assert.equal(importsOf("src/integrations/anthropic/service.mts")
      .some((target) => target.includes("/token-usage/index.mts")), false);
    assert.equal(importsOf("src/integrations/openai/codex/service.mts")
      .some((target) => target.includes("/token-usage/index.mts")), false);
    assert.ok(importsOf("src/integrations/token-usage/service.mts")
      .includes("src/integrations/anthropic/service.mts"));
    assert.ok(importsOf("src/integrations/token-usage/service.mts")
      .includes("src/integrations/openai/codex/service.mts"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
