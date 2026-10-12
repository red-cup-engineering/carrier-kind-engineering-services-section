
import { composeTokenUsage, type TokenUsageCostRateEntry, type TokenUsageCostRateTable, type TokenUsageCostRates, type TokenUsageProvider, type TokenUsageSummary } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";
import { feedEntropyCharge } from "../../lib/records/persistence.mts";
import { operation, type Operation } from "../../rpc/index.mts";
import type { JsonValue } from "../../lib/codecs/json/core.mts";
import type { JournalFeed } from "../../journal/index.mts";
import type { FilesystemBinding } from "../filesystem/services/read-write.mts";
import { journal, openJournal } from "../../journal/index.mts";
import { statementLogInformationPath } from "../filesystem/services/journal-projections.mts";
import { discoverClaudeSessionTranscripts, readClaudeSessionTokenUsage } from "../anthropic/service.mts";
import { discoverCodexSessionTranscripts, readCodexSessionTokenUsage } from "../openai/codex/service.mts";
import { agentSessionTokenUsageObservationCollector } from "../../../../../../src/integrations/token-usage/observations.mts";
import { agentSessionTokenUsageFeed, agentSessionTokenUsageStatementRows } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/persistence";

export interface AgentTokenUsageActionInput {
  readonly date: string;
  readonly tokenCostRates?: TokenUsageCostRates;
  readonly tokenCostRateTable?: TokenUsageCostRateTable;
}

interface TokenUsageSourceLogEntropy {
  readonly feed: "agent-session-token-usage";
  readonly path: string;
  readonly bytesOnDisk: number;
  readonly entropyUnits: number;
  readonly bytesPerEntropyUnit?: number;
  readonly entropyBoundBytesPerUnit: number;
  readonly charge: string;
}

type AgentSessionTokenUsageAdmitProvider = "all" | "claude" | "codex";

interface AgentSessionTokenUsageAdmitResult {
  readonly kind: "metroplat.holography.agent-session-token-usage-admit-result";
  readonly provider: TokenUsageProvider;
  readonly surface: string;
  readonly sessionId?: string;
  readonly source: string;
  readonly relative: string;
  readonly appended: number;
  readonly events: number;
  readonly turns: number;
  readonly total: TokenUsageSummary["total"];
  readonly modelContextWindow?: number;
}

const FEED_ENTROPY_BOUND_BYTES_PER_UNIT = 4096;

function todayIso(binding: FilesystemBinding): string {
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

function tokenCostRate(value: JsonValue | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : undefined;
}

function tokenCostRatesOf(value: JsonValue | undefined): TokenUsageCostRates | undefined {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Readonly<Record<string, JsonValue>>;
  const total = tokenCostRate(record["totalMicrodollarsPerMillionTokens"]);
  const input = tokenCostRate(record["inputMicrodollarsPerMillionTokens"]);
  const output = tokenCostRate(record["outputMicrodollarsPerMillionTokens"]);
  if (total === undefined && (input === undefined || output === undefined)) return undefined;
  const cachedInput = tokenCostRate(record["cachedInputMicrodollarsPerMillionTokens"]);
  const cacheCreationInput = tokenCostRate(record["cacheCreationInputMicrodollarsPerMillionTokens"]);
  const cacheReadInput = tokenCostRate(record["cacheReadInputMicrodollarsPerMillionTokens"]);
  const reasoningOutput = tokenCostRate(record["reasoningOutputMicrodollarsPerMillionTokens"]);
  return Object.freeze({
    ...(total === undefined ? {} : { totalMicrodollarsPerMillionTokens: total }),
    ...(input === undefined ? {} : { inputMicrodollarsPerMillionTokens: input }),
    ...(output === undefined ? {} : { outputMicrodollarsPerMillionTokens: output }),
    ...(cachedInput === undefined ? {} : { cachedInputMicrodollarsPerMillionTokens: cachedInput }),
    ...(cacheCreationInput === undefined ? {} : { cacheCreationInputMicrodollarsPerMillionTokens: cacheCreationInput }),
    ...(cacheReadInput === undefined ? {} : { cacheReadInputMicrodollarsPerMillionTokens: cacheReadInput }),
    ...(reasoningOutput === undefined ? {} : { reasoningOutputMicrodollarsPerMillionTokens: reasoningOutput }),
  });
}

function tokenCostRateEntryOf(value: JsonValue | undefined): TokenUsageCostRateEntry | undefined {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Readonly<Record<string, JsonValue>>;
  const rates = tokenCostRatesOf(record["rates"]);
  if (rates === undefined) return undefined;
  const resourceKind = typeof record["resourceKind"] === "string" && record["resourceKind"].length > 0 ? record["resourceKind"] : undefined;
  const unit = typeof record["unit"] === "string" && record["unit"].length > 0 ? record["unit"] : undefined;
  const agentId = typeof record["agentId"] === "string" && record["agentId"].length > 0 ? record["agentId"] : undefined;
  const provider = typeof record["provider"] === "string" && record["provider"].length > 0 ? record["provider"] : undefined;
  const surface = typeof record["surface"] === "string" && record["surface"].length > 0 ? record["surface"] : undefined;
  const model = typeof record["model"] === "string" && record["model"].length > 0 ? record["model"] : undefined;
  const minInputTokens = tokenCostRate(record["minInputTokens"]);
  const maxInputTokens = tokenCostRate(record["maxInputTokens"]);
  const minTotalTokens = tokenCostRate(record["minTotalTokens"]);
  const maxTotalTokens = tokenCostRate(record["maxTotalTokens"]);
  const evidence = Array.isArray(record["evidence"])
    ? Object.freeze(record["evidence"].filter((item): item is string => typeof item === "string" && item.length > 0))
    : undefined;
  return Object.freeze({
    ...(resourceKind === undefined ? {} : { resourceKind }),
    ...(unit === undefined ? {} : { unit }),
    ...(agentId === undefined ? {} : { agentId }),
    ...(provider === undefined ? {} : { provider }),
    ...(surface === undefined ? {} : { surface }),
    ...(model === undefined ? {} : { model }),
    ...(minInputTokens === undefined ? {} : { minInputTokens }),
    ...(maxInputTokens === undefined ? {} : { maxInputTokens }),
    ...(minTotalTokens === undefined ? {} : { minTotalTokens }),
    ...(maxTotalTokens === undefined ? {} : { maxTotalTokens }),
    rates,
    ...(evidence === undefined ? {} : { evidence }),
  });
}

function tokenCostRateTableOf(value: JsonValue | undefined): TokenUsageCostRateTable | undefined {
  if (Array.isArray(value)) {
    const entries = Object.freeze(value.flatMap((item) => {
      const entry = tokenCostRateEntryOf(item);
      return entry === undefined ? [] : [entry];
    }));
    return entries.length === 0 ? undefined : Object.freeze({ entries });
  }
  if (value === null || value === undefined || typeof value !== "object") return undefined;
  const record = value as Readonly<Record<string, JsonValue>>;
  const entriesValue = record["entries"];
  if (!Array.isArray(entriesValue)) return undefined;
  const defaultRates = tokenCostRatesOf(record["defaultRates"]);
  const entries = Object.freeze(entriesValue.flatMap((item) => {
    const entry = tokenCostRateEntryOf(item);
    return entry === undefined ? [] : [entry];
  }));
  return defaultRates === undefined && entries.length === 0
    ? undefined
    : Object.freeze({
      ...(defaultRates === undefined ? {} : { defaultRates }),
      entries,
    });
}

function operationInputOf(input: unknown, binding: FilesystemBinding): AgentTokenUsageActionInput {
  const record = input !== null && typeof input === "object" && !Array.isArray(input) ? input as Readonly<Record<string, JsonValue>> : {};
  const date = typeof record["date"] === "string" ? record["date"] : todayIso(binding);
  const tokenCostRates = tokenCostRatesOf(record["tokenCostRates"]);
  const tokenCostRateTable = tokenCostRateTableOf(record["tokenCostRateTable"]);
  return Object.freeze({
    date,
    ...(tokenCostRates === undefined ? {} : { tokenCostRates }),
    ...(tokenCostRateTable === undefined ? {} : { tokenCostRateTable }),
  });
}

function sessionIdOfInput(input: unknown): string | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const sessionId = (input as Readonly<Record<string, JsonValue>>)["sessionId"];
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : undefined;
}

function tokenUsageAdmitProviderOfInput(input: unknown): AgentSessionTokenUsageAdmitProvider {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return "all";
  const provider = (input as Readonly<Record<string, JsonValue>>)["provider"];
  if (provider === "claude" || provider === "anthropic") return "claude";
  if (provider === "codex" || provider === "openai") return "codex";
  return "all";
}

function positiveLimitOfInput(input: unknown, fallback: number): number {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return fallback;
  const limit = (input as Readonly<Record<string, JsonValue>>)["limit"];
  return typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : fallback;
}

function tokenUsageSourceLogEntropy(logPath: JournalFeed): TokenUsageSourceLogEntropy {
  const bytesOnDisk = journal.sourceStatus(logPath).bytes;
  const { entropyUnits } = statementLogInformationPath(logPath.artifact);
  const bytesPerEntropyUnit = entropyUnits === 0 ? undefined : bytesOnDisk / entropyUnits;
  return Object.freeze({
    feed: "agent-session-token-usage" as const,
    path: logPath.name,
    bytesOnDisk,
    entropyUnits,
    ...(bytesPerEntropyUnit === undefined ? {} : { bytesPerEntropyUnit }),
    entropyBoundBytesPerUnit: FEED_ENTROPY_BOUND_BYTES_PER_UNIT,
    charge: feedEntropyCharge(bytesOnDisk, entropyUnits, FEED_ENTROPY_BOUND_BYTES_PER_UNIT),
  });
}

function tokenUsageAdmitResult(summary: TokenUsageSummary, relative: string, appended: number): AgentSessionTokenUsageAdmitResult {
  return Object.freeze({
    kind: "metroplat.holography.agent-session-token-usage-admit-result" as const,
    provider: summary.provider,
    surface: summary.surface,
    ...(summary.sessionId === undefined ? {} : { sessionId: summary.sessionId }),
    source: summary.source,
    relative,
    appended,
    events: summary.events,
    turns: summary.turns,
    total: summary.total,
    ...(summary.modelContextWindow === undefined ? {} : { modelContextWindow: summary.modelContextWindow }),
  });
}

function admitTokenUsageSummary(
  binding: FilesystemBinding,
  summary: TokenUsageSummary,
  at: string,
  transport: "claude-session-transcript" | "codex-session-transcript",
) {
  const sessionId = summary.sessionId ?? (transport === "claude-session-transcript" ? "claude-session" : "codex-session");
  return openJournal(binding.dataRoot).appendRows(
    agentSessionTokenUsageFeed.name,
    agentSessionTokenUsageStatementRows(summary, at),
    {
      at,
      ...(binding.rootName === undefined ? {} : { rootName: binding.rootName }),
      subject: agentSessionTokenUsageFeed.name,
      caller: Object.freeze({ transport, session: sessionId, measurement: "token-usage" }),
    },
  );
}

export function readAgentSessionTokenUsageReadout(
  binding: FilesystemBinding,
  input: AgentTokenUsageActionInput,
): JsonValue | undefined {
  const logPath = journal.feed(binding.dataRoot, "agent-session-token-usage", input.date, { subject: "agent-session-token-usage" });
  if (!journal.sourceStatus(logPath).exists) return undefined;
  const collector = agentSessionTokenUsageObservationCollector({
    ...(input.tokenCostRates === undefined ? {} : { tokenCostRates: input.tokenCostRates }),
    ...(input.tokenCostRateTable === undefined ? {} : { tokenCostRateTable: input.tokenCostRateTable }),
  });
  let rows = 0;
  try {
    const folded = journal.scan(logPath, undefined, (_accum, row) => {
      collector.push(row);
      return undefined;
    });
    rows = folded.rows;
  } catch {
    return undefined;
  }
  if (rows === 0) return undefined;
  const readout = collector.read();
  const sourceLog = tokenUsageSourceLogEntropy(logPath);
  return Object.freeze({
    ...readout,
    kind: "metroplat.holography.agent-session-token-usage-settlement",
    date: input.date,
    sourceLog,
    evidence: Object.freeze([
      ...readout.evidence,
      "source-log-entropy:feedEntropyCharge",
      `source-log-bytes:${sourceLog.bytesOnDisk}`,
      `source-log-entropy-units:${sourceLog.entropyUnits}`,
      `source-log-charge:${sourceLog.charge}`,
    ]),
  }) as unknown as JsonValue;
}

export function agentTokenUsageOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "agent-session-token-usage",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read recorded agent session token usage.",
      description: "Domain: { date?, tokenCostRates?, tokenCostRateTable? }. Folds the agent-session-token-usage admission feed into provider, surface, session, model, cost, and pressure readouts.",
      run: (input: unknown): unknown => readAgentSessionTokenUsageReadout(binding, operationInputOf(input, binding)) ?? null,
    }),
    operation({
      verb: "agent-session-token-usage-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit recent Claude and Codex transcript token usage as recorded agent-session accounting.",
      description: "Domain: { provider?, sessionId?, limit? }. provider may be all, claude/anthropic, or codex/openai. Discovers bounded recent transcripts from configured session roots, source-admits detailed token usage rows under agent-session-token-usage, and leaves duplicate readings to the feed fold.",
      run: async (input: unknown): Promise<unknown> => {
        const provider = tokenUsageAdmitProviderOfInput(input);
        const sessionId = sessionIdOfInput(input);
        const limit = positiveLimitOfInput(input, sessionId === undefined ? 12 : 3);
        const at = todayIso(binding);
        const results: AgentSessionTokenUsageAdmitResult[] = [];

        if ((provider === "all" || provider === "claude") && binding.claudeSessionRoot !== undefined) {
          const discovery = await discoverClaudeSessionTranscripts(binding.claudeSessionRoot, {
            ...(sessionId === undefined ? {} : { sessionIds: [sessionId] }),
            limit,
          });
          const matches = [...discovery.matches]
            .sort((left, right) => right.events - left.events || right.bytes - left.bytes || left.relative.localeCompare(right.relative))
            .slice(0, limit);
          for (const match of matches) {
            const summary = await readClaudeSessionTokenUsage(binding.claudeSessionRoot, match.relative);
            const admission = admitTokenUsageSummary(binding, summary, at, "claude-session-transcript");
            results.push(tokenUsageAdmitResult(summary, match.relative, admission.appended));
          }
        }

        if ((provider === "all" || provider === "codex") && binding.codexSessionRoot !== undefined) {
          const discovery = discoverCodexSessionTranscripts(binding.codexSessionRoot, {
            ...(sessionId === undefined ? {} : { sessionIds: [sessionId] }),
            limit,
          });
          const matches = [...discovery.matches]
            .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt) || right.bytes - left.bytes || left.relative.localeCompare(right.relative))
            .slice(0, limit);
          for (const match of matches) {
            const summary = readCodexSessionTokenUsage(binding.codexSessionRoot, match.relative);
            const admission = admitTokenUsageSummary(binding, summary, at, "codex-session-transcript");
            results.push(tokenUsageAdmitResult(summary, match.relative, admission.appended));
          }
        }

        return Object.freeze({
          kind: "metroplat.holography.agent-session-token-usage-admit" as const,
          provider,
          ...(sessionId === undefined ? {} : { sessionId }),
          limit,
          sessions: results.length,
          appended: results.reduce((sum, result) => sum + result.appended, 0),
          events: results.reduce((sum, result) => sum + result.events, 0),
          turns: results.reduce((sum, result) => sum + result.turns, 0),
          total: composeTokenUsage(results.map((result) => result.total)),
          results: Object.freeze(results),
        });
      },
    }),
  ]);
}
