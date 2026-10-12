export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type TokenUsageProvider = string;
export type TokenUsageResourceKind = string;

export const DEFAULT_TOKEN_USAGE_RESOURCE_KIND = "llm-token";
export const DEFAULT_TOKEN_USAGE_UNIT = "token";

export interface TokenUsageCounts {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly outputTokens: number;
  readonly reasoningOutputTokens: number;
  readonly totalTokens: number;
}

export interface TokenUsageBreakdown {
  readonly inputTokens: number;
  readonly uncachedInputTokens: number;
  readonly cachedInputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly outputTokens: number;
  readonly reasoningOutputTokens: number;
  readonly totalInputTokens: number;
  readonly totalTokens: number;
}

export type TokenUsageCostComponentKind =
  | "total"
  | "uncached-input"
  | "cached-input"
  | "cache-creation-input"
  | "cache-read-input"
  | "output"
  | "reasoning-output";

export interface TokenUsageCostRates {
  readonly totalMicrodollarsPerMillionTokens?: number;
  readonly inputMicrodollarsPerMillionTokens?: number;
  readonly cachedInputMicrodollarsPerMillionTokens?: number;
  readonly cacheCreationInputMicrodollarsPerMillionTokens?: number;
  readonly cacheReadInputMicrodollarsPerMillionTokens?: number;
  readonly outputMicrodollarsPerMillionTokens?: number;
  readonly reasoningOutputMicrodollarsPerMillionTokens?: number;
}

export interface TokenUsageCostRateEntry {
  readonly resourceKind?: string;
  readonly unit?: string;
  readonly agentId?: string;
  readonly provider?: string;
  readonly surface?: string;
  readonly model?: string;
  readonly minInputTokens?: number;
  readonly maxInputTokens?: number;
  readonly minTotalTokens?: number;
  readonly maxTotalTokens?: number;
  readonly rates: TokenUsageCostRates;
  readonly evidence?: readonly string[];
}

export interface TokenUsageCostRateTable {
  readonly defaultRates?: TokenUsageCostRates;
  readonly entries: readonly TokenUsageCostRateEntry[];
}

export interface TokenUsageCostRateQuery {
  readonly resourceKind?: string;
  readonly unit?: string;
  readonly agentId?: string;
  readonly provider?: string;
  readonly surface?: string;
  readonly model?: string;
  readonly usage: TokenUsageCounts;
}

export interface TokenUsageCostComponent {
  readonly kind: TokenUsageCostComponentKind;
  readonly tokens: number;
  readonly microdollarsPerMillionTokens: number;
  readonly exactMicrodollars: string;
  readonly microdollars: number;
  readonly dollars: number;
}

export interface TokenUsageCostEstimate {
  readonly kind: "metroplat.agent-session.token-usage-cost-estimate";
  readonly totalMicrodollars: number;
  readonly exactMicrodollars: string;
  readonly dollars: number;
  readonly components: readonly TokenUsageCostComponent[];
  readonly evidence: readonly string[];
}

export interface TokenUsageGenAiAttributes {
  readonly "gen_ai.usage.input_tokens": number;
  readonly "gen_ai.usage.output_tokens": number;
  readonly "gen_ai.usage.cache_read.input_tokens": number;
  readonly "gen_ai.usage.cache_creation.input_tokens": number;
  readonly "gen_ai.usage.reasoning.output_tokens": number;
  readonly "metroplat.usage.total_tokens": number;
}

export interface TokenUsageEvent {
  readonly kind: "metroplat.agent-session.token-usage-event";
  readonly provider: TokenUsageProvider;
  readonly resourceKind?: TokenUsageResourceKind;
  readonly unit?: string;
  readonly agentId?: string;
  readonly surface: string;
  readonly sessionId?: string;
  readonly source: string;
  readonly row: number;
  readonly at?: string;
  readonly model?: string;
  readonly requestId?: string;
  readonly usageKind: "turn" | "cumulative" | "rate-limit" | "duplicate";
  readonly usage: TokenUsageCounts;
  readonly rawUsage?: JsonValue;
  readonly rateLimits?: JsonValue;
  readonly evidence: readonly string[];
}

export interface TokenUsageSummary {
  readonly kind: "metroplat.agent-session.token-usage-summary";
  readonly provider: TokenUsageProvider;
  readonly resourceKind?: TokenUsageResourceKind;
  readonly unit?: string;
  readonly agentId?: string;
  readonly surface: string;
  readonly sessionId?: string;
  readonly source: string;
  readonly rows: number;
  readonly events: number;
  readonly turns: number;
  readonly cumulative?: TokenUsageCounts;
  readonly total: TokenUsageCounts;
  readonly usageBreakdown: TokenUsageBreakdown;
  readonly genAiAttributes: TokenUsageGenAiAttributes;
  readonly modelContextWindow?: number;
  readonly models: readonly string[];
  readonly requests: readonly string[];
  readonly rateLimitEvents: number;
  readonly rawEvents: readonly TokenUsageEvent[];
  readonly evidence: readonly string[];
}

export const ZERO_TOKEN_USAGE: TokenUsageCounts = Object.freeze({
  inputTokens: 0,
  cachedInputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  totalTokens: 0,
});

// The runtime for the provider-neutral token-usage engine (counting,
// cost estimation, breakdowns) lives in the published
// `@red-cup-engineering/llm-cost-optimization-services-section` package
// (per the 2026-09-05 ruling that a capability found inside MetroPlat is
// not MetroPlat's to keep) — every real consumer imports it from there
// directly. This file keeps only the zero-runtime-cost TypeScript types
// this package's other files need.
