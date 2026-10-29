import { clamp } from "../../../../../records.mts";
import type { ContextBudgetBand } from "../../metering/context/library/context-budget.mts";
import type { OperationEventKind } from "../../classifying/library/operation-classification.mts";

export type OperationLedgerGame = Readonly<{
  kind: "operations-manifold.operation.game";
  experience: number;
  level: number;
  mode: "paidia" | "ludus" | "agon" | "mimicry";
  flow: "bored" | "flow" | "strained";
  badges: readonly string[];
  friction: readonly string[];
  challenges: readonly string[];
}>;

export type OperationGameEntry = Readonly<{
  event: OperationEventKind;
  trace: string;
  evidence: readonly string[];
  score: number;
}>;

export type OperationGameEvent = Readonly<{
  event: OperationEventKind;
  trace: string;
  evidence?: readonly string[] | undefined;
  tokens?: number | undefined;
  costUsd?: number | undefined;
  paths?: readonly string[] | undefined;
}>;

export type OperationGameTotals = Readonly<{
  entries: number;
  tokens: number;
  estimatedTokens: number;
  overBudgetEntries: number;
  hugeEntries: number;
  costUsd: number;
  tools: number;
  fileReads: number;
  fileWrites: number;
  mcpCalls: number;
}>;

/**
 * The level curve shared by the whole-manifold game and any session-scoped game
 * derived from a filtered slice of the same ledger. One curve, so a session's
 * level reads on the same scale as the world's.
 */
export function levelForExperience(experience: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, experience) / 24)) + 1);
}

/** Experience still owed before the next level on the shared curve. */
export function experienceToNextLevel(experience: number): number {
  const level = levelForExperience(experience);
  const nextThreshold = 24 * level * level;
  return Math.max(0, Math.ceil(nextThreshold - Math.max(0, experience)));
}

export function gameFor(entries: readonly OperationGameEntry[], totals: OperationGameTotals): OperationLedgerGame {
  const experience = entries.reduce((sum, entry) => sum + entry.score, 0);
  const level = levelForExperience(experience);
  const evidenceBearing = entries.filter((entry) => entry.evidence.length > 1).length;
  const missingEvidence = entries.filter((entry) => entry.evidence.length <= 1 && entry.event !== "note").length;
  const recent = entries.slice(0, 8);
  const recentAverage = recent.length === 0 ? 0 : recent.reduce((sum, entry) => sum + entry.score, 0) / recent.length;
  const badges = [
    ...(totals.entries >= 1 ? ["first-filing"] : []),
    ...(totals.tools + totals.mcpCalls >= 5 ? ["tool-ledger"] : []),
    ...(totals.fileReads + totals.fileWrites >= 5 ? ["file-sensor"] : []),
    ...(totals.tokens > 0 ? ["token-bookkeeper"] : []),
    ...(totals.estimatedTokens > 0 ? ["context-meter"] : []),
    ...(totals.overBudgetEntries === 0 && totals.estimatedTokens > 0 ? ["budget-steward"] : []),
    ...(evidenceBearing >= 5 ? ["evidence-bound"] : []),
    ...(totals.costUsd > 0 ? ["cost-visible"] : []),
  ];
  const friction = [
    ...(missingEvidence > 0 ? [`${missingEvidence} operation(s) only cite their own log witness`] : []),
    ...(totals.tokens === 0 ? ["token use has not been recorded yet"] : []),
    ...(totals.overBudgetEntries > 0 ? [`${totals.overBudgetEntries} operation(s) exceed context budget`] : []),
    ...(totals.hugeEntries > 0 ? [`${totals.hugeEntries} operation(s) are huge context emitters`] : []),
    ...(totals.fileWrites === 0 ? ["file writes are not yet being booked"] : []),
    ...(totals.mcpCalls === 0 ? ["MCP calls are not yet being booked"] : []),
  ];
  const challenges = [
    ...(totals.tokens === 0 ? ["Record the next model token estimate or cloud inference cost."] : []),
    ...(totals.overBudgetEntries > 0 ? ["Inspect oversized operation entries and replace raw payload replayCheckpoint with compact projections."] : []),
    ...(totals.fileReads === 0 ? ["Book a file-read event with path evidence."] : []),
    ...(totals.fileWrites === 0 ? ["Book the next file-write event with the touched path."] : []),
    ...(totals.mcpCalls === 0 ? ["Book the next MCP call as a trace-local predication."] : []),
    ...(missingEvidence > 0 ? ["Attach external evidence to the next three operation entries."] : []),
    ...(totals.entries > 0 ? ["Fold recent operation entries into the next heartbeat read-work selection."] : []),
  ];
  return Object.freeze({
    kind: "operations-manifold.operation.game" as const,
    experience,
    level,
    mode: totals.entries === 0 ? "paidia" : missingEvidence > evidenceBearing ? "mimicry" : totals.tools + totals.mcpCalls > totals.fileReads + totals.fileWrites ? "agon" : "ludus",
    flow: recentAverage === 0 ? "bored" : recentAverage > 95 ? "strained" : recentAverage >= 58 ? "flow" : "bored",
    badges: Object.freeze(badges),
    friction: Object.freeze(friction),
    challenges: Object.freeze(challenges.slice(0, 6)),
  });
}

export function operationScore(value: OperationGameEvent & Readonly<{ budgetBand?: ContextBudgetBand | undefined }>): number {
  const evidence = value.evidence?.length ?? 0;
  const base = value.event === "note" ? 4 : value.event === "token-cost" ? 8 : value.event === "file-write" ? 12 : 10;
  const evidenceScore = evidence === 0 ? -4 : Math.min(18, evidence * 4);
  const traceScore = value.trace === "global" ? -2 : 5;
  const costScore = (value.tokens ?? 0) > 0 || (value.costUsd ?? 0) > 0 ? 6 : 0;
  const pathScore = (value.paths?.length ?? 0) > 0 ? 4 : 0;
  return clamp(base + evidenceScore + traceScore + costScore + pathScore, 1, 40, 10);
}
