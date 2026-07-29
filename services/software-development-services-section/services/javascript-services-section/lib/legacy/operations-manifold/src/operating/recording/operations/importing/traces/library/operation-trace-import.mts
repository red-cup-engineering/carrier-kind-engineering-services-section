import type { EAVT } from "@emsenn/relating/writing";

import type { AgentRunTraceProjection } from "../../../../../../holography/llm/agent-run-trace.mts";
import { hash, recordOf } from "../../../../../../records.mts";
import {
  classifyCommand,
  commandTool,
  eventTime,
  extractCommandPaths,
  predicateFor,
  type OperationEventKind,
} from "../../../classifying/library/operation-classification.mts";
import { DEFAULT_CONTEXT_BUDGET_TOKENS } from "../../../metering/context/library/context-budget.mts";
import { operationEavtFromValue, type OperationEventValue } from "../../../recording/library/operation-event.mts";

export function traceImportEvents(projection: AgentRunTraceProjection, source: string): readonly EAVT[] {
  const events: EAVT[] = [];
  for (const [index, cost] of projection.costs.entries()) {
    const ordinal = costOrdinal(cost, index);
    const tokens = cost.tokens.input + cost.tokens.output;
    events.push(operationEavtFromValue(
      `trace-token-cost-${projection.run}-${ordinal}`,
      traceEventValue({
        projection,
        ordinal,
        event: projection.trace.events[ordinal] ?? {},
        eventKind: "token-cost",
        subject: `codex.exec.${projection.run}`,
        predicate: "operations-manifold.operation.spent-tokens",
        object: `${tokens} tokens`,
        tokens,
        costUsd: cost.dollars,
        tool: "codex.exec",
        source,
        note: `cost ${cost.id}: input=${cost.tokens.input} output=${cost.tokens.output}`,
      }),
    ));
  }
  for (const [ordinal, event] of projection.trace.events.entries()) {
    const item = recordOf(event["item"]);
    if (item === null) continue;
    const command = typeof item["command"] === "string" ? item["command"] : null;
    if (command === null || command.trim() === "") continue;
    const eventKind = classifyCommand(command);
    events.push(operationEavtFromValue(
      `trace-command-${projection.run}-${ordinal}-${command}`,
      traceEventValue({
        projection,
        ordinal,
        event,
        eventKind,
        subject: `codex.item.${typeof item["id"] === "string" ? item["id"] : hash(item).slice(0, 12)}`,
        predicate: predicateFor(eventKind),
        object: command,
        tool: commandTool(command),
        paths: extractCommandPaths(command),
        source,
        note: `${event.type}${typeof item["status"] === "string" ? ` ${item["status"]}` : ""}`,
      }),
    ));
  }
  return Object.freeze(events);
}

function costOrdinal(cost: AgentRunTraceProjection["costs"][number], fallback: number): number {
  for (const evidence of cost.evidence) {
    const match = /\.event\.(\d+)$/u.exec(evidence);
    if (match?.[1] !== undefined) return Number.parseInt(match[1], 10);
  }
  return fallback;
}

function traceEventValue(input: Readonly<{
  projection: AgentRunTraceProjection;
  ordinal: number;
  event: Readonly<Record<string, unknown>>;
  eventKind: OperationEventKind;
  subject: string;
  predicate: string;
  object: string;
  tool?: string | undefined;
  paths?: readonly string[] | undefined;
  tokens?: number | undefined;
  costUsd?: number | undefined;
  source: string;
  note: string;
}>): OperationEventValue {
  const eventSeed = {
    source: "codex.exec.trace",
    run: input.projection.run,
    ordinal: input.ordinal,
    kind: input.eventKind,
    subject: input.subject,
    predicate: input.predicate,
    object: input.object,
  };
  return Object.freeze({
    kind: "operations-manifold.operation.event" as const,
    eventId: `operation-event:${hash(eventSeed).slice(0, 24)}`,
    at: eventTime(input.event) ?? input.projection.generatedAt,
    event: input.eventKind,
    trace: `codex.exec:${input.projection.run}`,
    layer: "asserted" as const,
    nucleus: "translation" as const,
    subject: input.subject,
    predicate: input.predicate,
    object: input.object,
    valueOld: "bot|bot",
    valueNew: "t|t",
    ...(input.tool === undefined ? {} : { tool: input.tool }),
    paths: Object.freeze([...(input.paths ?? [])]),
    tokens: input.tokens ?? 0,
    estimatedTokens: input.tokens ?? 0,
    inputBytes: 0,
    outputBytes: 0,
    budgetLimitTokens: DEFAULT_CONTEXT_BUDGET_TOKENS,
    budgetBand: "ok",
    budgetWarnings: Object.freeze([]),
    costUsd: input.costUsd ?? 0,
    agent: "codex",
    source: input.source,
    evidence: Object.freeze([
      `codex.exec.${input.projection.run}.event.${input.ordinal}`,
      ...(input.projection.source.file === undefined ? [] : [input.projection.source.file]),
    ]),
    note: input.note,
  });
}
