#!/usr/bin/env node
/**
 * Context-budget guard — PostToolUse enforcement of the budget bands the
 * manifold already meters.
 *
 * The manifold meters every operation's context cost (estimatedTokens vs the
 * budget limit) into bands ok/watch/over/huge. This hook reads the just-finished
 * tool's payload, and when it lands over or huge it emits PostToolUse
 * additionalContext pushing the agent toward compact manifold projections
 * (read-* bins, targeted offset/limit reads) instead of raw payloads — turning
 * the meter into an actual budget pressure. Quiet on ok/watch, and degrades to a
 * clean exit so it can never break the turn.
 */
import { hookBudgetMetrics } from "../src/operating/recording/operations/metering/context/library/context-budget.mts";
import { codexHookPayloadFromText } from "../src/codex-hook.mts";
import { isMainModule } from "../src/runtime.mts";
import { readStdin } from "../src/script-stdio.mts";

if (isMainModule(import.meta.url)) {
  try {
    const raw = await readStdin();
    const payload = codexHookPayloadFromText(raw);
    const metrics = hookBudgetMetrics(payload, raw);
    if (metrics.budgetBand === "over" || metrics.budgetBand === "huge") {
      const tool = typeof payload["tool_name"] === "string" ? payload["tool_name"] : "this operation";
      const advice = `Context-budget ${metrics.budgetBand}: ${tool} added ~${metrics.estimatedTokens} tokens (budget ${metrics.budgetLimitTokens}). Push it back toward a compact projection — prefer 561 Group Operations Manifold read-* bins, targeted offset/limit reads, or a summarized query over re-reading raw payloads, to keep the window lean.`;
      process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: advice } })}\n`);
    }
    process.exit(0);
  } catch {
    process.exit(0);
  }
}
