import type { EAVT } from "@emsenn/relating/writing";
import { canonical, type JsonValue } from "@emsenn/relating/writing";

import { hash, optionalText, stringList } from "../../../../../records.mts";
import {
  defaultObject,
  defaultSubject,
  defaultTrace,
  operationKind,
  operationLayer,
  operationNucleus,
  predicateFor,
} from "../../classifying/library/operation-classification.mts";
import {
  contextBudgetMetrics,
  budgetedString,
  money,
  nonNegativeNumber,
  optionalNonNegativeNumber,
} from "../../metering/context/library/context-budget.mts";
import { operationEavtFromValue, type OperationEventValue } from "./operation-event.mts";

export type OperationRecordParams = Readonly<{
  kind?: string | undefined;
  subject?: string | undefined;
  predicate?: string | undefined;
  object?: string | undefined;
  trace?: string | undefined;
  layer?: string | undefined;
  nucleus?: string | undefined;
  tool?: string | undefined;
  paths?: string | readonly string[] | undefined;
  tokens?: string | number | undefined;
  estimatedTokens?: string | number | undefined;
  inputBytes?: string | number | undefined;
  outputBytes?: string | number | undefined;
  budgetLimitTokens?: string | number | undefined;
  costUsd?: string | number | undefined;
  durationMs?: string | number | undefined;
  agent?: string | undefined;
  source?: string | undefined;
  evidence?: string | readonly string[] | undefined;
  note?: string | undefined;
  valueOld?: string | undefined;
  valueNew?: string | undefined;
}>;

export type OperationRecordDraft = Readonly<{
  event: EAVT;
  entryId: string;
  value: OperationEventValue;
}>;

export function operationRecordDraft(params: OperationRecordParams, at = new Date().toISOString()): OperationRecordDraft {
  const eventKind = operationKind(params.kind);
  const paths = stringList(params.paths);
  const tool = optionalText(params.tool);
  const trace = optionalText(params.trace) ?? defaultTrace(eventKind);
  const subject = optionalText(params.subject) ?? defaultSubject(eventKind, tool);
  const predicate = optionalText(params.predicate) ?? predicateFor(eventKind);
  const object = optionalText(params.object) ?? defaultObject(eventKind, tool, paths, params.tokens);
  const layer = operationLayer(params.layer);
  const nucleus = operationNucleus(params.nucleus);
  const tokens = nonNegativeNumber(params.tokens);
  const budgetMetrics = contextBudgetMetrics({
    inputBytes: nonNegativeNumber(params.inputBytes),
    outputBytes: nonNegativeNumber(params.outputBytes),
    explicitEstimatedTokens: optionalNonNegativeNumber(params.estimatedTokens),
    budgetLimitTokens: optionalNonNegativeNumber(params.budgetLimitTokens),
  });
  const costUsd = money(params.costUsd);
  const durationMs = optionalNonNegativeNumber(params.durationMs);
  const evidence = stringList(params.evidence);
  const source = optionalText(params.source) ?? "operations-manifold.read-operations-ledger";
  const seed = { at, eventKind, trace, subject, predicate, object, paths, tool, tokens, costUsd, source };
  const eventId = `operation-event:${hash(seed).slice(0, 24)}`;
  const agent = optionalText(params.agent);
  const note = budgetedNote(optionalText(params.note));
  const value: OperationEventValue = Object.freeze({
    kind: "operations-manifold.operation.event" as const,
    eventId,
    at,
    event: eventKind,
    trace,
    layer,
    nucleus,
    subject,
    predicate,
    object,
    valueOld: optionalText(params.valueOld) ?? "bot|bot",
    valueNew: optionalText(params.valueNew) ?? "t|t",
    ...(tool === null ? {} : { tool }),
    paths,
    tokens,
    estimatedTokens: budgetMetrics.estimatedTokens,
    inputBytes: budgetMetrics.inputBytes,
    outputBytes: budgetMetrics.outputBytes,
    budgetLimitTokens: budgetMetrics.budgetLimitTokens,
    budgetBand: budgetMetrics.budgetBand,
    budgetWarnings: budgetMetrics.budgetWarnings,
    costUsd,
    ...(durationMs === null ? {} : { durationMs }),
    ...(agent === null ? {} : { agent }),
    source,
    evidence,
    ...(note === null ? {} : { note }),
  });
  const event = operationEavtFromValue(`${eventKind}-${predicate}-${object}`, value);
  return Object.freeze({ event, entryId: String(event[0]), value });
}

function budgetedNote(value: string | null): string | null {
  if (value === null) return null;
  const projected = budgetedString(value);
  return typeof projected === "string" ? projected : canonical(projected as JsonValue);
}
