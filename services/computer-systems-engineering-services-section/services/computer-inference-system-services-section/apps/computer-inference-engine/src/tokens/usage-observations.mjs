/**
 * Enterprise readings composed over the shared token-usage collector.
 * Counting, pricing, grouping, and pressure calculation are owned upstream.
 */
import { agentSessionTokenUsageObservationCollector as collectTokenUsage,

} from "@red-cup-engineering/computer-inference-engine/cost/token-usage/observations";
import { composeTokenUsageCostEstimates } from "@red-cup-engineering/computer-inference-engine/cost/token-usage/core";
import { statementLogInformation } from "@red-cup-engineering/eavt-services-section/statement";
import { ledgerConserved, valueQuantity } from "@red-cup-engineering/x402-services-section/value-settlement";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const MICRODOLLARS_PER_DOLLAR = 1_000_000n;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

/** A pressure band's reading: under the limit told for, over it against, near it both. */
function pressureReading(band) {
  return readingOfSides("knowledge", band === "under" || band === "near", band !== "under");
}

function exactMicrodollarsQuantity(exactMicrodollars) {
  const [numText, denText = "1"] = exactMicrodollars.split("/");
  if (!/^-?\d+$/.test(numText ?? "") || !/^\d+$/.test(denText)) return undefined;
  const numerator = BigInt(numText);
  const denominator = BigInt(denText) * MICRODOLLARS_PER_DOLLAR;
  if (denominator <= 0n || numerator > MAX_SAFE_BIGINT || numerator < -MAX_SAFE_BIGINT || denominator > MAX_SAFE_BIGINT) {
    return undefined;
  }
  return valueQuantity(Number(numerator), Number(denominator), "USD");
}

function tokenUsageCostConservation(
  aggregateCostEstimate,
  byResourceCells,
) {
  if (aggregateCostEstimate === undefined) return undefined;
  const resourceEstimates = byResourceCells.flatMap((cell) => cell.costEstimate === undefined ? [] : [cell.costEstimate]);
  if (resourceEstimates.length === 0) return undefined;
  const resourceCostEstimate = composeTokenUsageCostEstimates(resourceEstimates, ["cost-conservation:by-resource"]);
  const debit = exactMicrodollarsQuantity(aggregateCostEstimate.exactMicrodollars);
  const credit = exactMicrodollarsQuantity(resourceCostEstimate.exactMicrodollars);
  if (debit === undefined || credit === undefined) return undefined;
  const entries = Object.freeze([
    Object.freeze({ quantity: credit, sign: "credit" }),
    Object.freeze({ quantity: debit, sign: "debit" }),
  ]);
  const conservation = ledgerConserved(entries);
  return Object.freeze({
    kind: "metroplat.agent-session.token-usage-cost-conservation",
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

export function agentSessionTokenUsageObservationCollector(options = {}) {
  const collector = collectTokenUsage(options);
  const statementRows = [];
  return Object.freeze({
    push(row) { statementRows.push(row); collector.push(row); },
    read() {
      const { rateLimitPressure: sharedRateLimitPressure, ...result } = collector.read();
      const statementInformation = statementLogInformation(statementRows);
      const costConservation = tokenUsageCostConservation(result.costEstimate, result.byResource);
      const contextWindowReading = result.contextWindowPressureBand === undefined ? undefined : pressureReading(result.contextWindowPressureBand);
      const rateLimitPressure = sharedRateLimitPressure === undefined ? undefined : Object.freeze({
        ...sharedRateLimitPressure, reading: pressureReading(sharedRateLimitPressure.band),
      });
      return Object.freeze({
        ...result, statementInformation,
        ...(costConservation === undefined ? {} : { costConservation }),
        ...(contextWindowReading === undefined ? {} : { contextWindowReading }),
        ...(rateLimitPressure === undefined ? {} : { rateLimitPressure }),
        evidence: Object.freeze(result.evidence.flatMap((evidence) => [
          evidence,
          ...(evidence === "feed:agent-session-token-usage" ? ["journal-information:zero-surprisal-duplicates"] : []),
          ...(evidence === "rows:" + result.rows ? ["entropy-units:" + statementInformation.entropyUnits] : []),
          ...(evidence.startsWith("context-window-pressure-band:") ? ["context-window-reading:" + contextWindowReading] : []),
          ...(evidence.startsWith("rate-limit-pressure:") ? ["rate-limit-reading:" + rateLimitPressure?.reading] : []),
        ]).concat(costConservation === undefined ? [] : ["cost-conservation:value-settlement-ledger"])),
      });
    },
  });
}

export function agentSessionTokenUsageObservationsOfRows(rows, options = {}) {
  const collector = agentSessionTokenUsageObservationCollector(options);
  for (const row of rows) collector.push(row);
  return collector.read();
}
