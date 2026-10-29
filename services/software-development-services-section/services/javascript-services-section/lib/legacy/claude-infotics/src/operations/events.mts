/**
 * operations/events — the one genuinely Claude-specific codec with no MetroPlat
 * home: parse the `claude --print --output-format json|stream-json` LIVE-run
 * event envelope (MetroPlat reads *persisted* transcripts, not live-run output).
 *
 * Pure and dependency-free. Salvaged from the earlier standalone driver — the
 * one piece worth keeping — and consumed by `operations/run`. It defines no
 * Operation itself; it is the codec the run operation folds with.
 */

export type ClaudeEvent = Readonly<Record<string, unknown> & { readonly type: string }>;

export interface ClaudeRunSummary {
  readonly sessionId?: string;
  readonly isError: boolean;
  readonly text?: string;
  readonly numTurns?: number;
  readonly durationMs?: number;
  readonly totalCostUsd?: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly toolUses: readonly { readonly id: string; readonly name: string; readonly isError?: boolean }[];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toEvent(parsed: unknown): ClaudeEvent | undefined {
  if (!isRecord(parsed)) return undefined;
  const type = parsed["type"];
  if (typeof type !== "string" || type.length === 0) return undefined;
  return Object.freeze({ ...parsed, type });
}

/** Parse either the json-array envelope or the stream-json JSONL into events. */
export function parseClaudeEvents(input: string): readonly ClaudeEvent[] {
  const trimmed = input.trim();
  if (trimmed.length === 0) return Object.freeze([]);
  const records: readonly unknown[] = trimmed.startsWith("[")
    ? (JSON.parse(trimmed) as unknown[])
    : trimmed.split("\n").map((line) => line.trim()).filter((line) => line.length > 0).map((line) => {
        try { return JSON.parse(line) as unknown; } catch { return undefined; }
      });
  const events: ClaudeEvent[] = [];
  for (const record of records) {
    const event = toEvent(record);
    if (event !== undefined) events.push(event);
  }
  return Object.freeze(events);
}

function contentBlocks(event: ClaudeEvent): readonly Readonly<Record<string, unknown>>[] {
  const message = event["message"];
  if (!isRecord(message)) return [];
  const content = message["content"];
  return Array.isArray(content) ? content.filter(isRecord) : [];
}

function usageTokens(usage: Readonly<Record<string, unknown>> | undefined, keys: readonly string[]): number {
  if (usage === undefined) return 0;
  for (const key of keys) {
    const value = usage[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  }
  return 0;
}

/** The terminal `result` event — the authoritative envelope of a print-mode run. */
export function resultEventOf(events: readonly ClaudeEvent[]): ClaudeEvent | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.type === "result") return events[i];
  }
  return undefined;
}

/** The raw `usage` record the terminal result carries, if any. */
export function resultUsageOf(events: readonly ClaudeEvent[]): Readonly<Record<string, unknown>> | undefined {
  const result = resultEventOf(events);
  return result !== undefined && isRecord(result["usage"]) ? result["usage"] : undefined;
}

/** Fold a completed run's events into one summary. */
export function summarizeRun(events: readonly ClaudeEvent[]): ClaudeRunSummary {
  const result = resultEventOf(events);
  const toolErrors = new Map<string, boolean>();
  for (const event of events) {
    if (event.type !== "user") continue;
    for (const block of contentBlocks(event)) {
      if (block["type"] !== "tool_result") continue;
      const forId = stringValue(block["tool_use_id"]);
      if (forId !== undefined) toolErrors.set(forId, block["is_error"] === true);
    }
  }
  const toolUses: { id: string; name: string; isError?: boolean }[] = [];
  for (const event of events) {
    if (event.type !== "assistant") continue;
    for (const block of contentBlocks(event)) {
      if (block["type"] !== "tool_use") continue;
      const id = stringValue(block["id"]);
      if (id === undefined) continue;
      const settled = toolErrors.get(id);
      toolUses.push({ id, name: stringValue(block["name"]) ?? "tool", ...(settled === undefined ? {} : { isError: settled }) });
    }
  }
  const usage = result !== undefined && isRecord(result["usage"]) ? result["usage"] : undefined;
  return Object.freeze({
    ...(result !== undefined && stringValue(result["session_id"]) !== undefined ? { sessionId: stringValue(result["session_id"])! } : {}),
    isError: result?.["is_error"] === true,
    ...(result !== undefined && stringValue(result["result"]) !== undefined ? { text: stringValue(result["result"])! } : {}),
    ...(result !== undefined && numberValue(result["num_turns"]) !== undefined ? { numTurns: numberValue(result["num_turns"])! } : {}),
    ...(result !== undefined && numberValue(result["duration_ms"]) !== undefined ? { durationMs: numberValue(result["duration_ms"])! } : {}),
    ...(result !== undefined && numberValue(result["total_cost_usd"]) !== undefined ? { totalCostUsd: numberValue(result["total_cost_usd"])! } : {}),
    inputTokens: usageTokens(usage, ["input_tokens", "inputTokens"]),
    outputTokens: usageTokens(usage, ["output_tokens", "outputTokens"]),
    toolUses: Object.freeze(toolUses),
  });
}
