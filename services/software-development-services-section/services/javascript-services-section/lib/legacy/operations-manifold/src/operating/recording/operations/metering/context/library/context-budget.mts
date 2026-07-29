/**
 * Compatibility path for the Operations Manifold context-budget meter.
 *
 * The carrier implementation lives upstream in @emsenn/managing-operations so
 * dev.bare-cedar-fog.emsenn.net and ops.561.group remain peer instances over the same budget
 * accounting vocabulary.
 */

export {
  DEFAULT_CONTEXT_BUDGET_TOKENS,
  contextBudgetMetrics,
  hookBudgetMetrics,
  estimateTokensFromBytes,
  budgetBandFor,
  contextBudgetBand,
  budgetedJson,
  budgetedString,
  byteLengthOfJson,
  byteLength,
  nonNegativeNumber,
  optionalNonNegativeNumber,
} from "@emsenn/managing-operations/accounting";
export type {
  ContextBudgetBand,
  ContextBudgetMetrics,
} from "@emsenn/managing-operations/accounting";

export function money(value: string | number | undefined): number {
  if (typeof value === "number") return roundMoney(Math.max(0, value));
  const text = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  if (text === null) return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? roundMoney(Math.max(0, parsed)) : 0;
}

export function roundMoney(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
