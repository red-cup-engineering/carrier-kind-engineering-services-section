/**
 * Enterprise readings composed over the shared token-usage collector.
 * Counting, pricing, grouping, and pressure calculation are owned upstream.
 */
import { agentSessionTokenUsageObservationCollector as collectTokenUsage,
  type AgentSessionTokenUsageReadout as TokenUsageReadout,
  type AgentSessionTokenUsageRateLimitPressure as RateLimitPressure,
  type AgentSessionTokenUsageCell, type AgentSessionTokenUsagePressureBand,
  type AgentSessionTokenUsageObservationOptions,
} from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/observations";
import { composeTokenUsageCostEstimates, type TokenUsageCostEstimate } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";
import { statementLogInformation, type StatementLogInformation } from "@lenticule-science/metrologic/settling/records/persistence";
import { chargeSide, chargeValueName, chargeValueAt, type ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import { ledgerConserved, valueQuantity, type LedgerEntry, type ValueQuantity } from "@red-cup-engineering/x402-value-settlement-service";
import type { EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
export type { AgentSessionTokenUsageCell, AgentSessionTokenUsagePressureBand, AgentSessionTokenUsageObservationOptions };
export interface AgentSessionTokenUsageRateLimitPressure extends RateLimitPressure { readonly charge: ChargeValueName; }
export interface AgentSessionTokenUsageReadout extends TokenUsageReadout {
  readonly statementInformation: StatementLogInformation;
  readonly costConservation?: AgentSessionTokenUsageCostConservation;
  readonly contextWindowCharge?: ChargeValueName;
  readonly rateLimitPressure?: AgentSessionTokenUsageRateLimitPressure;
}
const MICRODOLLARS_PER_DOLLAR = 1_000_000n;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export interface AgentSessionTokenUsageCostConservation {
  readonly kind: "metroplat.agent-session.token-usage-cost-conservation";
  readonly conserved: boolean;
  readonly debit: ValueQuantity;
  readonly credit: ValueQuantity;
  readonly residual: readonly ValueQuantity[];
  readonly evidence: readonly string[];
}

export interface AgentSessionTokenUsageObservationCollector {
  push(row: EAVT): void;
  read(): AgentSessionTokenUsageReadout;
}

function pressureCharge(band: AgentSessionTokenUsagePressureBand): ChargeValueName {
  if (band === "under") return chargeValueName(chargeValueAt([chargeSide("present"), chargeSide("absent")]));
  if (band === "near") return chargeValueName(chargeValueAt([chargeSide("present"), chargeSide("present")]));
  return chargeValueName(chargeValueAt([chargeSide("absent"), chargeSide("present")]));
}

function exactMicrodollarsQuantity(exactMicrodollars: string): ValueQuantity | undefined {
  const [numText, denText = "1"] = exactMicrodollars.split("/");
  if (!/^-?\d+$/.test(numText ?? "") || !/^\d+$/.test(denText)) return undefined;
  const numerator = BigInt(numText!);
  const denominator = BigInt(denText) * MICRODOLLARS_PER_DOLLAR;
  if (denominator <= 0n || numerator > MAX_SAFE_BIGINT || numerator < -MAX_SAFE_BIGINT || denominator > MAX_SAFE_BIGINT) {
    return undefined;
  }
  return valueQuantity(Number(numerator), Number(denominator), "USD");
}

function tokenUsageCostConservation(
  aggregateCostEstimate: TokenUsageCostEstimate | undefined,
  byResourceCells: readonly AgentSessionTokenUsageCell[],
): AgentSessionTokenUsageCostConservation | undefined {
  if (aggregateCostEstimate === undefined) return undefined;
  const resourceEstimates = byResourceCells.flatMap((cell) => cell.costEstimate === undefined ? [] : [cell.costEstimate]);
  if (resourceEstimates.length === 0) return undefined;
  const resourceCostEstimate = composeTokenUsageCostEstimates(resourceEstimates, ["cost-conservation:by-resource"]);
  const debit = exactMicrodollarsQuantity(aggregateCostEstimate.exactMicrodollars);
  const credit = exactMicrodollarsQuantity(resourceCostEstimate.exactMicrodollars);
  if (debit === undefined || credit === undefined) return undefined;
  const entries: readonly LedgerEntry[] = Object.freeze([
    Object.freeze({ quantity: credit, sign: "credit" as const }),
    Object.freeze({ quantity: debit, sign: "debit" as const }),
  ]);
  const conservation = ledgerConserved(entries);
  return Object.freeze({
    kind: "metroplat.agent-session.token-usage-cost-conservation" as const,
    conserved: conservation.conserved,
    debit,
    credit,
    residual: conservation.residual,
    evidence: Object.freeze([
      "ledgerConserved:value-settlement",
      "debit:settlement-cost-estimate",
      "credit:by-resource-cost-estimate",
      `resource-cost-estimates:${resourceEstimates.length}`,
    ]),
  });
}

export function agentSessionTokenUsageObservationCollector(options: AgentSessionTokenUsageObservationOptions = {}): AgentSessionTokenUsageObservationCollector {
  const collector = collectTokenUsage(options);
  const statementRows: EAVT[] = [];
  return Object.freeze({
    push(row: EAVT): void { statementRows.push(row); collector.push(row); },
    read(): AgentSessionTokenUsageReadout {
      const { rateLimitPressure: sharedRateLimitPressure, ...result } = collector.read();
      const statementInformation = statementLogInformation(statementRows);
      const costConservation = tokenUsageCostConservation(result.costEstimate, result.byResource);
      const contextWindowCharge = result.contextWindowPressureBand === undefined ? undefined : pressureCharge(result.contextWindowPressureBand);
      const rateLimitPressure = sharedRateLimitPressure === undefined ? undefined : Object.freeze({
        ...sharedRateLimitPressure, charge: pressureCharge(sharedRateLimitPressure.band),
      });
      return Object.freeze({
        ...result, statementInformation,
        ...(costConservation === undefined ? {} : { costConservation }),
        ...(contextWindowCharge === undefined ? {} : { contextWindowCharge }),
        ...(rateLimitPressure === undefined ? {} : { rateLimitPressure }),
        evidence: Object.freeze(result.evidence.flatMap((evidence) => [
          evidence,
          ...(evidence === "feed:agent-session-token-usage" ? ["journal-information:zero-surprisal-duplicates"] : []),
          ...(evidence === "rows:" + result.rows ? ["entropy-units:" + statementInformation.entropyUnits] : []),
          ...(evidence.startsWith("context-window-pressure-band:") ? ["context-window-charge:" + contextWindowCharge] : []),
          ...(evidence.startsWith("rate-limit-pressure:") ? ["rate-limit-charge:" + rateLimitPressure?.charge] : []),
        ]).concat(costConservation === undefined ? [] : ["cost-conservation:value-settlement-ledger"])),
      });
    },
  });
}

export function agentSessionTokenUsageObservationsOfRows(rows: Iterable<EAVT>, options: AgentSessionTokenUsageObservationOptions = {}): AgentSessionTokenUsageReadout {
  const collector = agentSessionTokenUsageObservationCollector(options);
  for (const row of rows) collector.push(row);
  return collector.read();
}
