import type { EAVT, JsonValue } from "@emsenn/relating/writing";

import { hash, isRecord, isString, slug } from "../../../../../records.mts";
import {
  operationKind,
  operationLayer,
  operationNucleus,
  type OperationEventKind,
  type OperationLayer,
  type OperationNucleus,
} from "../../classifying/library/operation-classification.mts";
import { contextBudgetBand, money, nonNegativeNumber, type ContextBudgetBand } from "../../metering/context/library/context-budget.mts";

export type OperationEventValue = Readonly<{
  kind: "operations-manifold.operation.event";
  eventId: string;
  at: string;
  event: OperationEventKind;
  trace: string;
  layer: OperationLayer;
  nucleus: OperationNucleus;
  subject: string;
  predicate: string;
  object: string;
  valueOld: string;
  valueNew: string;
  tool?: string;
  paths?: readonly string[];
  tokens?: number;
  estimatedTokens?: number;
  inputBytes?: number;
  outputBytes?: number;
  budgetLimitTokens?: number;
  budgetBand?: ContextBudgetBand;
  budgetWarnings?: readonly string[];
  costUsd?: number;
  durationMs?: number;
  agent?: string;
  source: string;
  evidence?: readonly string[];
  note?: string;
}>;

export function operationEavtFromValue(seed: string, value: OperationEventValue): EAVT {
  const entryId = `operation:${slug(seed)}:${hash({ eventId: value.eventId }).slice(0, 12)}`;
  return Object.freeze([
    entryId,
    "operations-manifold.operation.recorded",
    value as unknown as JsonValue,
    Object.freeze({ at: value.at, eventId: value.eventId }) as JsonValue,
  ]);
}

export function operationEventValue(value: JsonValue): OperationEventValue | null {
  if (!isRecord(value) || value["kind"] !== "operations-manifold.operation.event") return null;
  if (typeof value["eventId"] !== "string" || typeof value["at"] !== "string") return null;
  if (typeof value["trace"] !== "string" || typeof value["subject"] !== "string" || typeof value["predicate"] !== "string" || typeof value["object"] !== "string") return null;
  return Object.freeze({
    kind: "operations-manifold.operation.event" as const,
    eventId: value["eventId"],
    at: value["at"],
    event: operationKind(typeof value["event"] === "string" ? value["event"] : undefined),
    trace: value["trace"],
    layer: operationLayer(typeof value["layer"] === "string" ? value["layer"] : undefined),
    nucleus: operationNucleus(typeof value["nucleus"] === "string" ? value["nucleus"] : undefined),
    subject: value["subject"],
    predicate: value["predicate"],
    object: value["object"],
    valueOld: typeof value["valueOld"] === "string" ? value["valueOld"] : "bot|bot",
    valueNew: typeof value["valueNew"] === "string" ? value["valueNew"] : "t|t",
    ...(typeof value["tool"] === "string" ? { tool: value["tool"] } : {}),
    ...(Array.isArray(value["paths"]) ? { paths: Object.freeze(value["paths"].filter(isString)) } : {}),
    ...(typeof value["tokens"] === "number" ? { tokens: nonNegativeNumber(value["tokens"]) } : {}),
    ...(typeof value["estimatedTokens"] === "number" ? { estimatedTokens: nonNegativeNumber(value["estimatedTokens"]) } : {}),
    ...(typeof value["inputBytes"] === "number" ? { inputBytes: nonNegativeNumber(value["inputBytes"]) } : {}),
    ...(typeof value["outputBytes"] === "number" ? { outputBytes: nonNegativeNumber(value["outputBytes"]) } : {}),
    ...(typeof value["budgetLimitTokens"] === "number" ? { budgetLimitTokens: nonNegativeNumber(value["budgetLimitTokens"]) } : {}),
    ...(typeof value["budgetBand"] === "string" ? { budgetBand: contextBudgetBand(value["budgetBand"]) } : {}),
    ...(Array.isArray(value["budgetWarnings"]) ? { budgetWarnings: Object.freeze(value["budgetWarnings"].filter(isString)) } : {}),
    ...(typeof value["costUsd"] === "number" ? { costUsd: money(value["costUsd"]) } : {}),
    ...(typeof value["durationMs"] === "number" ? { durationMs: nonNegativeNumber(value["durationMs"]) } : {}),
    ...(typeof value["agent"] === "string" ? { agent: value["agent"] } : {}),
    source: typeof value["source"] === "string" ? value["source"] : "operations-manifold.read-operations-ledger",
    ...(Array.isArray(value["evidence"]) ? { evidence: Object.freeze(value["evidence"].filter(isString)) } : {}),
    ...(typeof value["note"] === "string" ? { note: value["note"] } : {}),
  });
}

export function eventIdOf(event: EAVT): string | null {
  const value = event[2];
  if (!isRecord(value)) return null;
  const eventId = value["eventId"];
  return typeof eventId === "string" ? eventId : null;
}
