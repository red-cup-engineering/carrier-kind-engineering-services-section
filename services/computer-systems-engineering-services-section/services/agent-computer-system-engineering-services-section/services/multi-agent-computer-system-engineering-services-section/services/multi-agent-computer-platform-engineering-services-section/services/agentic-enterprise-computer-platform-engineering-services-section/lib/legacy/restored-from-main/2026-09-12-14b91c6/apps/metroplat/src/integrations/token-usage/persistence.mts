/**
 * Provider-neutral token-usage journal material.
 *
 * Adapts the published
 * `@red-cup-engineering/llm-cost-optimization-services-section` package's
 * plain `[e, a, v, t]` statement rows to MetroPlat's own local `EAVT` type.
 * `agentSessionTokenUsageFeed` itself carries no MetroPlat-specific
 * adaptation, so consumers import it from that package directly.
 */
import { toEavt, type EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import type { JsonValue } from "../../lib/codecs/json/core.mts";
import type { TokenUsageSummary } from "./core.mts";
import { agentSessionTokenUsageStatementRows as agentSessionTokenUsageStatementRowsUpstream } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/persistence";

export function agentSessionTokenUsageStatementRows(summary: TokenUsageSummary, at: JsonValue): readonly EAVT[] {
  return Object.freeze(agentSessionTokenUsageStatementRowsUpstream(summary as never, at as never)
    .map(([e, a, v, t]) => toEavt({ e: e as never, a: a as never, v: v as never, t: t as never })));
}
