/**
 * operations/project — project a claude run into work items and token usage (#12).
 *
 * The archived `events.mts` folded a run into utterances / findings / work items
 * / reports / cost events over `@emsenn/relating` carriers. Those carriers are
 * retired — but the CAPABILITY is not, and "nothing consumes it" is not a reason
 * to drop it. Rebuilt on the platform's live substrate:
 *
 *   - work items  — one per `tool_use`, settled by its paired `tool_result`
 *                   (the archive charged these; the charge vocabulary was the
 *                   retired stack's, so the settlement is carried as plain,
 *                   honest status here)
 *   - token usage — folded into the platform's `TokenUsageCounts` SHAPE (the
 *                   exported token-usage barrel does not re-export its
 *                   constructor, so the shape is mirrored — see RunTokenUsage)
 *                   plus the cached/uncached breakdown that drives spend, and
 *                   the run's own reported dollar cost — rather than the
 *                   retired bespoke CostEvent
 *   - `--write`   — journals each work item and the usage as EAVT rows, so a
 *                   run's work is durable and recallable like a finding
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { operation, type Operation } from "@emsenn/metroplat/operations";
import { openJournal } from "@emsenn/metroplat/journal";
import type { FilesystemBinding } from "@emsenn/metroplat/integrations/filesystem";

/**
 * The platform's `TokenUsageCounts` field-for-field. Its constructor
 * (`tokenUsageCounts`) and the type itself live in
 * `integrations/token-usage/core`, which the exported
 * `./integrations/token-usage` barrel does NOT re-export — it curates only the
 * cost-estimate functions and the agent-session operations. So the shape is
 * mirrored here rather than imported. It is structurally compatible on purpose:
 * if the platform later exports the constructor, this drops out.
 */
export interface RunTokenUsage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly outputTokens: number;
  readonly reasoningOutputTokens: number;
  readonly totalTokens: number;
}

import { parseClaudeEvents, resultEventOf, resultUsageOf, summarizeRun, type ClaudeEvent } from "./events.mts";

const WORK_FEED = "claude-run-work";
const WORK_ATTR = "claude.run.work-item";
const USAGE_ATTR = "claude.run.usage";

/** How a tool_use settled, read from its paired tool_result. */
export type WorkItemStatus = "ok" | "errored" | "unsettled";

export interface RunWorkItem {
  readonly id: string;
  readonly tool: string;
  readonly status: WorkItemStatus;
}

/** One work item per tool_use, settled by whether its tool_result errored. */
export function projectRunWorkItems(events: readonly ClaudeEvent[]): readonly RunWorkItem[] {
  return Object.freeze(summarizeRun(events).toolUses.map((use): RunWorkItem => Object.freeze({
    id: use.id,
    tool: use.name,
    status: use.isError === undefined ? "unsettled" : use.isError ? "errored" : "ok",
  })));
}

function count(usage: Readonly<Record<string, unknown>> | undefined, ...keys: string[]): number {
  if (usage === undefined) return 0;
  for (const key of keys) {
    const value = usage[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  }
  return 0;
}

/**
 * Fold a run's reported usage into the platform-shaped counts.
 *
 * The mapping is the whole point, and it is easy to get wrong: claude's
 * `input_tokens` is only the FRESH, uncached input — cache reads and cache
 * creation are reported SEPARATELY and are not included in it. Treating
 * `input_tokens` as total input makes a real call look like ~59 tokens when it
 * actually moved ~30,000 and cost ~$0.028, hiding the cache traffic that
 * dominates spend. So total input = fresh + cache-read + cache-creation, and
 * `cachedInputTokens` is the cache-read portion — which makes the platform's
 * `uncachedInputTokens = inputTokens - cachedInputTokens` come out to
 * fresh + cache-creation, i.e. exactly the tokens actually billed at full rate.
 */
export function projectRunUsage(events: readonly ClaudeEvent[]): RunTokenUsage {
  const usage = resultUsageOf(events);
  const freshInput = count(usage, "input_tokens", "inputTokens");
  const outputTokens = count(usage, "output_tokens", "outputTokens");
  const cacheRead = count(usage, "cache_read_input_tokens", "cacheReadInputTokens");
  const cacheCreation = count(usage, "cache_creation_input_tokens", "cacheCreationInputTokens");
  const inputTokens = freshInput + cacheRead + cacheCreation;
  return Object.freeze({
    inputTokens,
    cachedInputTokens: cacheRead,
    cacheReadInputTokens: cacheRead,
    cacheCreationInputTokens: cacheCreation,
    outputTokens,
    reasoningOutputTokens: 0,
    totalTokens: inputTokens + outputTokens,
  });
}

/** Uncached vs cached input, the split that actually drives spend. */
export function runUsageBreakdown(usage: RunTokenUsage): Readonly<Record<string, number>> {
  return Object.freeze({
    inputTokens: usage.inputTokens,
    uncachedInputTokens: Math.max(0, usage.inputTokens - usage.cachedInputTokens),
    cachedInputTokens: usage.cachedInputTokens,
    cacheCreationInputTokens: usage.cacheCreationInputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  });
}

/** The dollar cost the run itself reported, when present. */
export function projectRunCostUsd(events: readonly ClaudeEvent[]): number | undefined {
  const result = resultEventOf(events);
  const value = result?.["total_cost_usd"];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Where the run's events come from. A whole transcript must NOT be pushed
 * through the JSON input channel — the platform caps boundary strings at 256KB
 * and real sessions blow past that — so `session`/`file` are read from disk here
 * (a host read), exactly as the platform's own transcript operations do.
 */
function eventsOf(record: Record<string, unknown>, binding: FilesystemBinding): readonly ClaudeEvent[] {
  const file = typeof record["file"] === "string"
    ? record["file"]
    : typeof record["session"] === "string" && binding.claudeSessionRoot !== undefined
      ? path.join(binding.claudeSessionRoot, `${record["session"]}.jsonl`)
      : undefined;
  if (file !== undefined) {
    try {
      return parseClaudeEvents(readFileSync(file, "utf8"));
    } catch {
      return Object.freeze([]);
    }
  }
  if (Array.isArray(record["events"])) return parseClaudeEvents(JSON.stringify(record["events"]));
  if (typeof record["stdout"] === "string") return parseClaudeEvents(record["stdout"]);
  return Object.freeze([]);
}

export function claudeProjectOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "claude-project-run",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Project a claude run into work items and token usage.",
      description: "Options: --session <id> (read from the data-root's transcripts) or --file <path>; or pass events[]/stdout inline for small runs. Emits one work item per tool_use (settled by its tool_result), the run's token usage + cached/uncached breakdown, and the reported dollar cost. write:true journals them as EAVT rows.",
      options: Object.freeze(["run", "write", "session", "file"]),
      run: (input: unknown, args: Record<string, unknown>): unknown => {
        const record = { ...(input !== null && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {}), ...args };
        const events = eventsOf(record, binding);
        if (events.length === 0) {
          return Object.freeze({ ok: false, error: "claude-project-run: give --session <id> (with --data-root), --file <path>, or events[]/stdout" });
        }
        const summary = summarizeRun(events);
        const workItems = projectRunWorkItems(events);
        const usage = projectRunUsage(events);
        const costUsd = projectRunCostUsd(events);
        // Identity, most explicit first: --run, then the session we were asked
        // to read, then the run's own result envelope. A persisted transcript
        // carries no `result` event, so sessionId alone would leave it unnamed.
        const run = typeof record["run"] === "string"
          ? record["run"]
          : typeof record["session"] === "string"
            ? record["session"]
            : summary.sessionId ?? (typeof record["file"] === "string" ? path.basename(record["file"], ".jsonl") : "unidentified-run");
        const write = record["write"] === true || record["write"] === "true";

        let journaled = 0;
        if (write) {
          const at = new Date().toISOString();
          const rows = [
            ...workItems.map((item) => [`${run}/${item.id}`, WORK_ATTR, { kind: WORK_ATTR, run, tool: item.tool, status: item.status }, at] as const),
            [run, USAGE_ATTR, { kind: USAGE_ATTR, run, usage, ...(costUsd === undefined ? {} : { costUsd }) }, at] as const,
          ];
          const journal = openJournal(binding.dataRoot);
          type Rows = Parameters<typeof journal.appendRows>[1];
          const result = journal.appendRows(WORK_FEED, Object.freeze(rows) as unknown as Rows, { at, subject: WORK_FEED });
          journaled = result.rows;
        }

        return Object.freeze({
          ok: true,
          run,
          workItems,
          workItemCount: workItems.length,
          errored: workItems.filter((item) => item.status === "errored").length,
          usage,
          breakdown: runUsageBreakdown(usage),
          ...(costUsd === undefined ? {} : { costUsd }),
          ...(write ? { journaled } : {}),
          evidence: Object.freeze(["fold:claude-run-events", "read:token-usage"]),
        });
      },
    }),
  ]);
}
