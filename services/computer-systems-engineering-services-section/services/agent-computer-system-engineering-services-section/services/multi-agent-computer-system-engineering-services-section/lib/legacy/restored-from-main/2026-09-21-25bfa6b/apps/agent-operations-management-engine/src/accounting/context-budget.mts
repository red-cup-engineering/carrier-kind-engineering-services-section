/**
 * context-budget — estimated context cost for agent operations.
 *
 * This is accounting, not enforcement: it reads hook/tool payload sizes into a
 * token estimate and budget band so cockpit instances can record pressure and
 * nudge agents toward compact projections.
 */

import { createHash } from "node:crypto";

import { canonical, type JsonValue } from "@red-cup-engineering/agentic-relation-engine/codecs/text/json";

export type ContextBudgetBand = "ok" | "watch" | "over" | "huge";

export type ContextBudgetMetrics = Readonly<{
  inputBytes: number;
  outputBytes: number;
  totalBytes: number;
  estimatedTokens: number;
  budgetLimitTokens: number;
  budgetBand: ContextBudgetBand;
  budgetWarnings: readonly string[];
}>;

export const DEFAULT_CONTEXT_BUDGET_TOKENS = 12_000;
const LARGE_CONTEXT_STRING_BYTES = 4_096;
const CONTEXT_PREVIEW_CHARS = 320;
const CONTEXT_PREVIEW_ITEMS = 5;
const CONTEXT_PREVIEW_FIELDS = 8;

export function contextBudgetMetrics(input: Readonly<{
  inputBytes: number;
  outputBytes: number;
  explicitEstimatedTokens: number | null;
  budgetLimitTokens: number | null;
}>): ContextBudgetMetrics {
  const inputBytes = nonNegativeNumber(input.inputBytes);
  const outputBytes = nonNegativeNumber(input.outputBytes);
  const totalBytes = inputBytes + outputBytes;
  const estimatedTokens = input.explicitEstimatedTokens ?? estimateTokensFromBytes(totalBytes);
  const budgetLimitTokens = input.budgetLimitTokens ?? DEFAULT_CONTEXT_BUDGET_TOKENS;
  const budgetBand = budgetBandFor(estimatedTokens, budgetLimitTokens);
  const budgetWarnings = [
    ...(budgetBand === "watch" ? [`context estimate ${estimatedTokens} tokens is approaching budget ${budgetLimitTokens}`] : []),
    ...(budgetBand === "over" ? [`context estimate ${estimatedTokens} tokens exceeds budget ${budgetLimitTokens}`] : []),
    ...(budgetBand === "huge" ? [`context estimate ${estimatedTokens} tokens is more than double budget ${budgetLimitTokens}`] : []),
    ...(outputBytes > 0 && outputBytes >= inputBytes * 4 ? [`output bytes ${outputBytes} dominate input bytes ${inputBytes}`] : []),
  ];
  return Object.freeze({
    inputBytes,
    outputBytes,
    totalBytes,
    estimatedTokens,
    budgetLimitTokens,
    budgetBand,
    budgetWarnings: Object.freeze(budgetWarnings),
  });
}

export function hookBudgetMetrics(payload: Readonly<Record<string, JsonValue>>, raw: string | null): ContextBudgetMetrics {
  const toolInput = payload["tool_input"];
  const toolResponse = payload["tool_response"];
  const prompt = payload["prompt"] ?? payload["user_prompt"] ?? payload["message"];
  const inputBytes = byteLengthOfJson(toolInput) + byteLengthOfJson(prompt);
  const outputBytes = byteLengthOfJson(toolResponse);
  return contextBudgetMetrics({
    inputBytes: inputBytes === 0 && raw !== null ? byteLength(raw) : inputBytes,
    outputBytes,
    explicitEstimatedTokens: null,
    budgetLimitTokens: null,
  });
}

export function estimateTokensFromBytes(bytes: number): number {
  return bytes === 0 ? 0 : Math.ceil(bytes / 4);
}

export function budgetBandFor(estimatedTokens: number, budgetLimitTokens: number): ContextBudgetBand {
  if (budgetLimitTokens <= 0) return "ok";
  if (estimatedTokens > budgetLimitTokens * 2) return "huge";
  if (estimatedTokens > budgetLimitTokens) return "over";
  if (estimatedTokens > budgetLimitTokens * 0.6) return "watch";
  return "ok";
}

export function contextBudgetBand(value: string): ContextBudgetBand {
  if (value === "watch" || value === "over" || value === "huge") return value;
  return "ok";
}

export function budgetedJson(value: JsonValue): JsonValue {
  return budgetedJsonValue(value, 0);
}

function budgetedJsonValue(value: JsonValue, depth: number): JsonValue {
  if (typeof value === "string") return budgetedString(value);
  if (Array.isArray(value)) return budgetedArray(value, depth);
  if (value !== null && typeof value === "object") {
    return budgetedObject(value as Readonly<Record<string, JsonValue>>, depth);
  }
  return value;
}

export function budgetedString(value: string): JsonValue {
  const bytes = byteLength(value);
  if (bytes <= LARGE_CONTEXT_STRING_BYTES) return value;
  return Object.freeze({
    kind: "managing.accounting.context.large-string-summary",
    bytes,
    estimatedTokens: estimateTokensFromBytes(bytes),
    sha256: sha256Hex(value),
    preview: value.slice(0, CONTEXT_PREVIEW_CHARS),
  }) as JsonValue;
}

function budgetedArray(value: readonly JsonValue[], depth: number): JsonValue {
  const projected = Object.freeze(value.map((item) => budgetedJsonValue(item, depth + 1)));
  if (byteLengthOfJson(projected as unknown as JsonValue) <= LARGE_CONTEXT_STRING_BYTES) return projected as unknown as JsonValue;
  const raw = canonical(value as unknown as JsonValue);
  return Object.freeze({
    kind: "managing.accounting.context.large-array-summary",
    items: value.length,
    bytes: byteLength(raw),
    estimatedTokens: estimateTokensFromBytes(byteLength(raw)),
    sha256: sha256Hex(raw),
    preview: Object.freeze(projected.slice(0, CONTEXT_PREVIEW_ITEMS)),
  }) as JsonValue;
}

function budgetedObject(value: Readonly<Record<string, JsonValue>>, depth: number): JsonValue {
  const projected = Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, budgetedJsonValue(item, depth + 1)]),
  )) as Readonly<Record<string, JsonValue>>;
  if (byteLengthOfJson(projected as unknown as JsonValue) <= LARGE_CONTEXT_STRING_BYTES) return projected as unknown as JsonValue;
  const raw = canonical(value as unknown as JsonValue);
  const fields = Object.freeze(Object.entries(value).slice(0, CONTEXT_PREVIEW_FIELDS).map(([key, item]) => Object.freeze({
    key,
    bytes: byteLengthOfJson(item),
    value: budgetedJsonValue(item, depth + 1),
  })));
  return Object.freeze({
    kind: "managing.accounting.context.large-object-summary",
    keys: Object.freeze(Object.keys(value)),
    fields,
    bytes: byteLength(raw),
    estimatedTokens: estimateTokensFromBytes(byteLength(raw)),
    sha256: sha256Hex(raw),
  }) as JsonValue;
}

export function byteLengthOfJson(value: JsonValue | undefined): number {
  if (value === undefined) return 0;
  return byteLength(canonical(value));
}

export function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

export function nonNegativeNumber(value: string | number | undefined): number {
  if (typeof value === "number") return clamp(value, 0, Number.MAX_SAFE_INTEGER, 0);
  const text = optionalText(value);
  if (text === null) return 0;
  return clamp(Number(text), 0, Number.MAX_SAFE_INTEGER, 0);
}

export function optionalNonNegativeNumber(value: string | number | undefined): number | null {
  const text = optionalText(value);
  if (text === null) return null;
  return nonNegativeNumber(text);
}

function optionalText(value: string | number | undefined): string | null {
  if (value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
