import { test } from "node:test";
import assert from "node:assert/strict";

import { parseClaudeEvents } from "../src/operations/events.mts";
import { projectRunWorkItems, projectRunUsage, projectRunCostUsd, runUsageBreakdown } from "../src/operations/project.mts";

// A real `claude --print --output-format json` result envelope (haiku), trimmed.
// The numbers are as observed: input_tokens is the FRESH input only; the cache
// traffic is reported separately and is what actually drives the $0.028 cost.
const REAL_RESULT = [{
  type: "result",
  is_error: false,
  session_id: "5f668b39-0000-0000-0000-000000000000",
  result: "project-me",
  total_cost_usd: 0.0277729,
  usage: {
    input_tokens: 10,
    cache_creation_input_tokens: 12603,
    cache_read_input_tokens: 17339,
    output_tokens: 49,
  },
}];

test("usage mapping counts cache traffic — a $0.028 call is not 59 tokens", () => {
  const usage = projectRunUsage(parseClaudeEvents(JSON.stringify(REAL_RESULT)));
  // Regression: input_tokens (10) is FRESH input only. Total input must include
  // cache read + cache creation, or the run looks ~500x smaller than it was.
  assert.equal(usage.inputTokens, 10 + 17339 + 12603);
  assert.equal(usage.cachedInputTokens, 17339);
  assert.equal(usage.cacheCreationInputTokens, 12603);
  assert.equal(usage.outputTokens, 49);
  assert.equal(usage.totalTokens, 10 + 17339 + 12603 + 49);
  assert.ok(usage.totalTokens > 29000, "cache traffic is not silently dropped");
});

test("breakdown's uncached input is the fresh + cache-creation tokens billed at full rate", () => {
  const usage = projectRunUsage(parseClaudeEvents(JSON.stringify(REAL_RESULT)));
  const breakdown = runUsageBreakdown(usage);
  assert.equal(breakdown.uncachedInputTokens, 10 + 12603);
  assert.equal(breakdown.cachedInputTokens, 17339);
});

test("the run's reported dollar cost is carried through", () => {
  assert.equal(projectRunCostUsd(parseClaudeEvents(JSON.stringify(REAL_RESULT))), 0.0277729);
  assert.equal(projectRunCostUsd(parseClaudeEvents("[]")), undefined);
});

test("work items are settled by their paired tool_result", () => {
  const events = parseClaudeEvents(JSON.stringify([
    { type: "assistant", message: { role: "assistant", content: [
      { type: "tool_use", id: "a", name: "Bash", input: {} },
      { type: "tool_use", id: "b", name: "Edit", input: {} },
      { type: "tool_use", id: "c", name: "Read", input: {} },
    ] } },
    { type: "user", message: { role: "user", content: [
      { type: "tool_result", tool_use_id: "a", is_error: false },
      { type: "tool_result", tool_use_id: "b", is_error: true },
    ] } },
  ]));
  const items = projectRunWorkItems(events);
  assert.deepEqual(items.map((i) => [i.tool, i.status]), [
    ["Bash", "ok"],
    ["Edit", "errored"],
    ["Read", "unsettled"], // no tool_result came back
  ]);
});
