/**
 * @packageDocumentation
 *
 * integrations/openai/codex/services - live Codex transcript host-mark reading.
 *
 * This service owns FILESYSTEM access to Codex session JSONL files: confined
 * path resolution, dated-directory discovery, and directory walking. The
 * content-level pipelines (chronicle admission, authored-text restriction,
 * work claims, continuation, status settlement) live in `src/claims`
 * and are mounted on the projector catalog, so `read(path)` at a corner and
 * these path-shaped readers are the same machinery. The service-visible Codex
 * operation family lives here with the transcript readers it calls; the generic
 * service mesh mounts it directly.
 */
import path from "node:path";

import {
  codexSessionTranscriptDiscoveryContract,
  codexSessionTranscriptReadContract,
  type CodexSessionStatusReadOptions,
  type CodexSessionTranscriptDiscovery,
  type CodexSessionTranscriptDiscoveryMatch,
  type CodexSessionTranscriptDiscoveryOptions,
  type CodexSessionTranscriptRead,
  type CodexSessionTranscriptReadOptions,
  type CodexSessionWorkClaimsReadOptions,
} from "./codex-session/schema.mts";
import type { StatementValue } from "../../../lib/records/persistence.mts";
import {
  recurringVerbSequences,
  type AdmittedStep,
  type SequenceCandidate,
} from "../../../lib/math/number/sequence-recurrence.mts";
import {
  codexSessionChronicleOfContent,
  codexSessionContinuationOfContent,
  codexSessionEncounterTraceOfContent,
  codexSessionIdFromEvent,
  codexSessionStatusReadoutOfContent,
  codexSessionToolStudyOfContent,
  codexSessionWorkClaimsOfContent,
  type CodexSessionEncounterTrace,
  type CodexSessionToolStudy,
} from "./codec.mts";
import { codexSessionTokenUsageOfContent } from "./token-usage.mts";
import { operation, type Operation } from "../../../rpc/index.mts";
import type { FilesystemBinding } from "../../filesystem/services/read-write.mts";
import {
  claimSessionFeed,
  claimSessionStatementRows,
  sampleClaimSessionObservations,
  type AgentStatusReadout,
  type ClaimSessionContinuation,
  type ClaimSessionObservationBundle,
  type ClaimSessionObservationSample,
  type ClaimSessionObservationSampleOptions,
} from "../../../claims/index.mts";
import type { TokenUsageSummary } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";

import {
  codexSessionConfinedPath,
  codexSessionDateRelativeRoot,
  codexSessionRelativePath,
} from "./codex-session/index.mts";
import { parse, type JsonValue } from "../../../lib/codecs/json/core.mts";
import { pathExists, readFileHeadUtf8, readFileUtf8, statPathOrNull, walkFiles } from "../../../lib/filesystem/index.mts";
import { openJournal, type EventWriteResult } from "../../../journal/index.mts";

export type {
  CodexSessionStatusReadOptions,
  CodexSessionTranscriptDiscovery,
  CodexSessionTranscriptDiscoveryMatch,
  CodexSessionTranscriptDiscoveryOptions,
  CodexSessionTranscriptRead,
  CodexSessionTranscriptReadOptions,
  CodexSessionTranscriptReadRequest,
  CodexSessionWorkClaimsReadOptions,
} from "./codex-session/schema.mts";

function todayIso(binding: FilesystemBinding): string {
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

function sessionIdOfInput(input: unknown): string | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const record = input as Readonly<Record<string, JsonValue>>;
  const sessionId = record["sessionId"] ?? record["id"];
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : undefined;
}

function dateOfInput(input: unknown, binding: FilesystemBinding): string {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const date = (input as Readonly<Record<string, JsonValue>>)["date"];
    if (typeof date === "string" && date.length > 0) return date;
  }
  return todayIso(binding);
}

function codexSessionFilterOfInput(input: unknown): readonly string[] | undefined {
  const sessionId = sessionIdOfInput(input);
  if (sessionId === undefined || sessionId.startsWith("agent:")) return undefined;
  return Object.freeze([sessionId]);
}

export function readCodexLatestTranscriptStatus(root: string, date: string): JsonValue | undefined {
  for (let back = 0; back < 2; back += 1) {
    const current = new Date(new Date(`${date}T00:00:00Z`).getTime() - back * 86_400_000).toISOString().slice(0, 10);
    const discovery = discoverCodexSessionTranscripts(root, { date: current });
    const match = newestCodexSessionTranscriptMatch(discovery.matches);
    if (match !== undefined) return codexSessionTranscriptHandleStatus(match) as JsonValue;
  }
  return undefined;
}

export function codexSessionOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "codex-session-status",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read one Codex session's status settlement.",
      description: "Domain: { id | sessionId }. Discovers the bounded transcript under the configured Codex session root and projects status without admitting new rows.",
      run: (input: unknown): unknown => {
        if (binding.codexSessionRoot === undefined) return null;
        const sessionId = sessionIdOfInput(input);
        if (sessionId === undefined) return null;
        const discovery = discoverCodexSessionTranscripts(binding.codexSessionRoot, { sessionIds: [sessionId], limit: 3 });
        const match = newestCodexSessionTranscriptMatch(discovery.matches);
        if (match === undefined) return null;
        return readCodexSessionStatusReadout(binding.codexSessionRoot, match.relative, {
          ...(binding.readiness === undefined ? {} : { readiness: binding.readiness }),
        });
      },
    }),
    operation({
      verb: "codex-session-encounter",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read one lossless, deterministic Codex encounter interpretation.",
      description: "Domain: { id | sessionId }. Preserves the transcript commitment, authored turns, host context, exact tool acts and outcomes, continuation claims, token usage, unresolved correction candidates, and the unassayed terminal assistant outcome. This read makes no customer-acceptance claim and admits no rows.",
      run: (input: unknown): unknown => {
        if (binding.codexSessionRoot === undefined) return null;
        const sessionId = sessionIdOfInput(input);
        if (sessionId === undefined) return null;
        const discovery = discoverCodexSessionTranscripts(binding.codexSessionRoot, { sessionIds: [sessionId], limit: 3 });
        const match = newestCodexSessionTranscriptMatch(discovery.matches);
        if (match === undefined) return null;
        return readCodexSessionEncounter(binding.codexSessionRoot, match.relative, { sessionId });
      },
    }),
    operation({
      verb: "codex-latest",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read the latest bounded Codex transcript handle.",
      description: "Domain: { date? }. Uses bounded transcript discovery over the configured Codex session root.",
      run: (input: unknown): unknown => {
        if (binding.codexSessionRoot === undefined) return null;
        return readCodexLatestTranscriptStatus(binding.codexSessionRoot, dateOfInput(input, binding)) ?? null;
      },
    }),
    operation({
      verb: "codex-tool-study",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read a bounded Codex transcript tool-use corpus.",
      description: "Domain: { date?, id?, sessionId? }. id/sessionId can select a session unless it names an agent actor.",
      run: (input: unknown): unknown => {
        if (binding.codexSessionRoot === undefined) return null;
        const sessionIds = codexSessionFilterOfInput(input);
        const options = {
          date: dateOfInput(input, binding),
          sessionLimit: 12,
        };
        return readCodexSessionToolStudyCorpus(binding.codexSessionRoot, sessionIds === undefined ? options : {
          ...options,
          sessionIds,
        });
      },
    }),
    operation({
      verb: "codex-session-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit one Codex session's transcript as recorded claim-session material.",
      description: "Domain: { sessionId }. Source-admits transcript-derived claim rows; duplicate readings settle downstream.",
      run: (input: unknown): unknown => {
        if (binding.codexSessionRoot === undefined) return null;
        const sessionId = sessionIdOfInput(input);
        if (sessionId === undefined) return null;
        const discovery = discoverCodexSessionTranscripts(binding.codexSessionRoot, { sessionIds: [sessionId], limit: 3 });
        const match = newestCodexSessionTranscriptMatch(discovery.matches);
        if (match === undefined) return null;
        const { admission } = admitCodexSessionWorkClaims(binding.codexSessionRoot, match.relative, {
          dataRoot: binding.dataRoot,
          at: todayIso(binding),
          ...(binding.rootName === undefined ? {} : { rootName: binding.rootName }),
        });
        return Object.freeze({ kind: "metroplat.holography.codex-session-admit", sessionId, appended: admission.appended });
      },
    }),
  ]);
}

function candidateRoots(root: string, options: CodexSessionTranscriptDiscoveryOptions): readonly string[] {
  if (options.date === undefined) return Object.freeze([root]);
  const dated = codexSessionConfinedPath(root, codexSessionDateRelativeRoot(options.date));
  return pathExists(dated) ? Object.freeze([dated]) : Object.freeze([]);
}

function walkJsonl(_root: string, start: string, maxDepth: number): readonly string[] {
  return walkFiles(start, { maxDepth, includeFile: (name) => name.endsWith(".jsonl") });
}

const CODEX_DISCOVERY_HEAD_BYTES = 64 * 1024;

function summarizeCodexSessionTranscript(source: string): { readonly sessionId: string; readonly bytes: number; readonly modifiedAt: string; readonly discoveryBytes: number } | undefined {
  const stat = statPathOrNull(source);
  if (stat === null || !stat.isFile()) return undefined;
  const head = readFileHeadUtf8(source, CODEX_DISCOVERY_HEAD_BYTES);
  let sessionId: string | undefined;
  for (const line of head.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    let value;
    try {
      value = parse(trimmed);
    } catch {
      continue;
    }
    try {
      sessionId = codexSessionIdFromEvent(value);
    } catch {
      sessionId = undefined;
    }
    if (sessionId !== undefined) break;
  }
  if (sessionId === undefined) return undefined;
  return Object.freeze({
    sessionId,
    bytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    discoveryBytes: Buffer.byteLength(head, "utf8"),
  });
}

export function newestCodexSessionTranscriptMatch(
  matches: readonly CodexSessionTranscriptDiscoveryMatch[],
): CodexSessionTranscriptDiscoveryMatch | undefined {
  return [...matches].sort((left, right) =>
    right.modifiedAt.localeCompare(left.modifiedAt)
    || right.bytes - left.bytes
    || left.relative.localeCompare(right.relative))[0];
}

/** A bounded latest-transcript status face for entering orientation reads.
 *
 * This is deliberately a handle/statusline over discovery facts, not a
 * transcript interpretation. Full continuation/status settlement remains the
 * explicit `codex-session-status` read or `codex-session-admit` write path.
 */
export function codexSessionTranscriptHandleStatus(match: CodexSessionTranscriptDiscoveryMatch): StatementValue {
  return Object.freeze({
    kind: "metroplat.codex-session.transcript-handle-status" as const,
    sessionId: match.sessionId,
    root: match.root,
    relative: match.relative,
    source: match.source,
    bytes: match.bytes,
    modifiedAt: match.modifiedAt,
    discoveryBytes: match.discoveryBytes,
    statusline: [
      `session:${match.sessionId}`,
      "regime:transcript-handle",
      `bytes:${match.bytes}`,
      `discovery-bytes:${match.discoveryBytes}`,
      "status:bounded",
      "full-status:codex-session-status",
    ].join(" "),
  });
}

function matchesSessionFilter(sessionId: string, relative: string, filters: readonly string[]): boolean {
  return filters.length === 0 || filters.some((filter) =>
    sessionId === filter || sessionId.startsWith(filter) || relative.includes(filter));
}

/** Read one Codex session transcript as the admitted boundary chronicle. */
export function readCodexSessionTranscript(
  root: string,
  relative: string,
  options: CodexSessionTranscriptReadOptions = {},
): CodexSessionTranscriptRead {
  const rootAbs = path.resolve(root);
  const source = codexSessionConfinedPath(rootAbs, relative);
  const relativePath = codexSessionRelativePath(rootAbs, source);
  const content = readFileUtf8(source);
  const chronicle = codexSessionChronicleOfContent(content, {
    source,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    ...(options.caller === undefined ? {} : { caller: options.caller as StatementValue }),
  });
  const boundary = Object.freeze({
    root: rootAbs,
    relative: relativePath,
    source,
    bytes: Buffer.byteLength(content, "utf8"),
    events: chronicle.statements.length,
    feed: chronicle.feed,
  });
  return codexSessionTranscriptReadContract.assert(Object.freeze({
    kind: "metroplat.codex-session.transcript-read" as const,
    operation: "read-codex-session-transcript" as const,
    root: rootAbs,
    relative: relativePath,
    source,
    bytes: boundary.bytes,
    events: chronicle.statements.length,
    chronicle,
  }), "Codex session transcript read") as CodexSessionTranscriptRead;
}

function transcriptContent(root: string, relative: string): { content: string; relativePath: string; source: string } {
  const rootAbs = path.resolve(root);
  const source = codexSessionConfinedPath(rootAbs, relative);
  const relativePath = codexSessionRelativePath(rootAbs, source);
  return { content: readFileUtf8(source), relativePath, source };
}

function contentOptions(
  source: string,
  relativePath: string,
  options: CodexSessionWorkClaimsReadOptions,
): Parameters<typeof codexSessionWorkClaimsOfContent>[1] {
  return {
    source: relativePath,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    ...(options.claimSessionId === undefined ? {} : { claimSessionId: options.claimSessionId }),
    ...(options.at === undefined ? {} : { at: String(options.at) }),
    ...(options.caller === undefined ? {} : { caller: options.caller as StatementValue }),
  };
}

/** Read one Codex session transcript as charged claim-session material. */
export function readCodexSessionWorkClaims(
  root: string,
  relative: string,
  options: CodexSessionWorkClaimsReadOptions = {},
): ClaimSessionObservationBundle {
  const { content, relativePath, source } = transcriptContent(root, relative);
  return codexSessionWorkClaimsOfContent(content, contentOptions(source, relativePath, options));
}

/** Read one Codex session transcript as detailed OpenAI token-usage material. */
export function readCodexSessionTokenUsage(
  root: string,
  relative: string,
  options: CodexSessionWorkClaimsReadOptions = {},
): TokenUsageSummary {
  const { content, relativePath } = transcriptContent(root, relative);
  return codexSessionTokenUsageOfContent(content, {
    source: relativePath,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
  });
}

export interface CodexSessionEncounterRead {
  readonly kind: "metroplat.codex-session.encounter-read";
  readonly operation: "read-codex-session-encounter";
  readonly root: string;
  readonly relative: string;
  readonly source: string;
  readonly trace: CodexSessionEncounterTrace;
  readonly continuation: ClaimSessionContinuation;
  readonly tokenUsage: TokenUsageSummary;
  readonly acceptanceStanding: "customer-assay-required";
  readonly evidence: readonly string[];
}

/** Read one full encounter as deterministic claim-token projections. The raw
 * transcript remains owned by the Codex filesystem boundary and is carried by
 * commitment; this provider reports evidence but cannot accept its own work. */
export function readCodexSessionEncounter(
  root: string,
  relative: string,
  options: CodexSessionWorkClaimsReadOptions = {},
): CodexSessionEncounterRead {
  const rootAbs = path.resolve(root);
  const { content, relativePath, source } = transcriptContent(rootAbs, relative);
  const interpreted = contentOptions(source, relativePath, options);
  const trace = codexSessionEncounterTraceOfContent(content, interpreted);
  const continuation = codexSessionContinuationOfContent(content, interpreted);
  const tokenUsage = codexSessionTokenUsageOfContent(content, {
    source: relativePath,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
  });
  return Object.freeze({
    kind: "metroplat.codex-session.encounter-read" as const,
    operation: "read-codex-session-encounter" as const,
    root: rootAbs,
    relative: relativePath,
    source,
    trace,
    continuation,
    tokenUsage,
    acceptanceStanding: "customer-assay-required" as const,
    evidence: Object.freeze([
      trace.transcript.commitment,
      ...trace.evidence,
      ...continuation.evidence,
      "terminal-outcome-is-not-customer-acceptance",
    ]),
  });
}

export interface CodexSessionWorkClaimsAdmissionOptions extends CodexSessionWorkClaimsReadOptions {
  readonly dataRoot: string;
  readonly rootName?: string;
  /** The day partition to admission under (`YYYY-MM-DD`), typically the cut date of
   *  the state-tier read that triggered this recording — see
   *  `admitClaudeSessionWorkClaims`'s matching note on why this cannot come
   *  from the rows themselves. */
  readonly at: string;
}

/** Admit one Codex session transcript's work claims (goals, obligations, tool
 *  acts) into `$dataRoot/data/journals` under the `claim-session` feed, subject
 *  `codex-session-<id>` so the address matches this session's own state-tier cut
 *  token — the same promotion `admitClaudeSessionWorkClaims` wires for Claude
 *  Code transcripts. Once recorded, the generic log→record→content legs already
 *  wired for every other feed promote this session's claims the same way. A
 *  repeated transcript admission is another source attempt; duplicate readings
 *  settle downstream instead of being filtered here. */
export function admitCodexSessionWorkClaims(
  root: string,
  relative: string,
  options: CodexSessionWorkClaimsAdmissionOptions,
): { readonly bundle: ClaimSessionObservationBundle; readonly admission: EventWriteResult } {
  const bundle = readCodexSessionWorkClaims(root, relative, options);
  const sessionId = bundle.sessionId ?? "codex-session";
  const rows = bundle.observations.flatMap((observation) => claimSessionStatementRows(observation));
  const admission = openJournal(options.dataRoot).appendRows(claimSessionFeed.name, rows, {
    at: options.at,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    subject: `codex-session-${sessionId}`,
    caller: Object.freeze({ transport: "codex-session-transcript", session: sessionId }),
  });
  return Object.freeze({ bundle, admission });
}

/** Read one Codex session transcript as claim-session continuation material. */
export function readCodexSessionContinuation(
  root: string,
  relative: string,
  options: CodexSessionWorkClaimsReadOptions = {},
): ClaimSessionContinuation {
  const { content, relativePath, source } = transcriptContent(root, relative);
  return codexSessionContinuationOfContent(content, contentOptions(source, relativePath, options));
}

/** Read one Codex session transcript as agent handoff/status-cut material. */
export function readCodexSessionStatusReadout(
  root: string,
  relative: string,
  options: CodexSessionStatusReadOptions = {},
): AgentStatusReadout {
  const { content, relativePath, source } = transcriptContent(root, relative);
  return codexSessionStatusReadoutOfContent(content, {
    ...contentOptions(source, relativePath, options),
    ...(options.readiness === undefined ? {} : { readiness: options.readiness }),
  });
}

/** Read one Codex session transcript as a tool-use study with surrounding chat. */
export function readCodexSessionToolStudy(
  root: string,
  relative: string,
  options: CodexSessionWorkClaimsReadOptions = {},
): CodexSessionToolStudy {
  const { content, relativePath, source } = transcriptContent(root, relative);
  return codexSessionToolStudyOfContent(content, contentOptions(source, relativePath, options));
}

export interface CodexSessionToolStudyCorpusOptions extends CodexSessionTranscriptDiscoveryOptions {
  readonly sessionLimit?: number;
}

export interface CodexSessionToolStudyCorpus {
  readonly kind: "metroplat.codex-session.tool-study-corpus";
  readonly root: string;
  readonly date?: string;
  readonly dateWindow: readonly string[];
  readonly sessions: number;
  readonly toolCalls: number;
  readonly tools: readonly { readonly name: string; readonly calls: number }[];
  readonly toolArgumentSummaries: readonly {
    readonly tool: string;
    readonly action: string;
    readonly calls: number;
    readonly examples: readonly string[];
  }[];
  readonly recurringToolSequences: readonly SequenceCandidate[];
  readonly studies: readonly CodexSessionToolStudy[];
  readonly harnessImprovements: readonly string[];
  readonly evidence: readonly string[];
}

function argumentShape(argumentsText: string | undefined): readonly string[] {
  if (argumentsText === undefined) return Object.freeze([]);
  try {
    const parsed = parse(argumentsText);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.freeze(Object.keys(parsed).sort((left, right) => left.localeCompare(right)));
    }
    return Object.freeze(["$value"]);
  } catch {
    return Object.freeze(["$text"]);
  }
}

function shellCommandHead(command: string): string | undefined {
  const trimmed = command.trim();
  if (trimmed.length === 0) return undefined;
  const match = /^([A-Za-z0-9_.:/-]+)/u.exec(trimmed);
  return match?.[1];
}

function argumentAction(tool: string, argumentsText: string | undefined): { readonly action: string; readonly example?: string } {
  if (argumentsText === undefined) return Object.freeze({ action: "no-arguments" });
  try {
    const parsed = parse(argumentsText);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Readonly<Record<string, unknown>>;
      const command = record["cmd"] ?? record["command"];
      if (typeof command === "string") {
        return Object.freeze({
          action: shellCommandHead(command) ?? "shell-command",
          example: command,
        });
      }
      const input = record["input"] ?? record["chars"];
      if (typeof input === "string") {
        return Object.freeze({
          action: input.startsWith("*** Begin Patch") ? "apply-patch" : "text-input",
          example: input,
        });
      }
      const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
      return Object.freeze({
        action: keys.length === 0 ? "empty-object" : `fields:${keys.slice(0, 4).join(",")}`,
        example: argumentsText,
      });
    }
  } catch {
    // Fall through to text-shaped arguments.
  }
  if (argumentsText.startsWith("*** Begin Patch")) return Object.freeze({ action: "apply-patch", example: argumentsText });
  return Object.freeze({ action: tool, example: argumentsText });
}

function compactExample(text: string): string {
  const compact = text.replace(/\s+/gu, " ").trim();
  return compact.length <= 160 ? compact : `${compact.slice(0, 157)}...`;
}

function toolArgumentSummaries(studies: readonly CodexSessionToolStudy[]): CodexSessionToolStudyCorpus["toolArgumentSummaries"] {
  const counts = new Map<string, { tool: string; action: string; calls: number; examples: string[] }>();
  for (const study of studies) {
    for (const call of study.calls) {
      const read = argumentAction(call.tool, call.arguments);
      const key = `${call.tool}\n${read.action}`;
      const current = counts.get(key) ?? { tool: call.tool, action: read.action, calls: 0, examples: [] };
      current.calls += 1;
      if (read.example !== undefined && current.examples.length < 3) current.examples.push(compactExample(read.example));
      counts.set(key, current);
    }
  }
  return Object.freeze([...counts.values()]
    .map((entry) => Object.freeze({
      tool: entry.tool,
      action: entry.action,
      calls: entry.calls,
      examples: Object.freeze(entry.examples),
    }))
    .sort((left, right) => right.calls - left.calls || left.tool.localeCompare(right.tool) || left.action.localeCompare(right.action)));
}

function toolStudySteps(studies: readonly CodexSessionToolStudy[]): readonly AdmittedStep[] {
  return Object.freeze(studies.flatMap((study) => study.calls.map((call) => Object.freeze({
    actor: study.sessionId ?? study.source,
    verb: call.tool,
    argShape: argumentShape(call.arguments),
    validated: call.outputStatus === "recorded",
  }))));
}

function priorIsoDate(date: string): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
}

function toolStudyDiscoveryDates(date: string | undefined): readonly (string | undefined)[] {
  if (date === undefined) return Object.freeze([undefined]);
  return Object.freeze([date, priorIsoDate(date)]);
}

/** Study a bounded corpus of Codex transcripts under the host session root. */
export function readCodexSessionToolStudyCorpus(
  root: string,
  options: CodexSessionToolStudyCorpusOptions = {},
): CodexSessionToolStudyCorpus {
  const sessionLimit = options.sessionLimit ?? 12;
  const discoveryDates = toolStudyDiscoveryDates(options.date);
  const discoveries = discoveryDates.map((date) => {
    const discoveryOptions: CodexSessionTranscriptDiscoveryOptions = {
      ...(options.sessionIds === undefined ? {} : { sessionIds: options.sessionIds }),
      ...(date === undefined ? {} : { date }),
      ...(options.maxDepth === undefined ? {} : { maxDepth: options.maxDepth }),
      ...(options.at === undefined ? {} : { at: options.at }),
      ...(options.caller === undefined ? {} : { caller: options.caller }),
      limit: options.limit ?? Math.max(50, sessionLimit * 4),
    };
    return discoverCodexSessionTranscripts(root, discoveryOptions);
  });
  const matchesByRelative = new Map<string, CodexSessionTranscriptDiscoveryMatch>();
  for (const discovery of discoveries) {
    for (const match of discovery.matches) {
      const prior = matchesByRelative.get(match.relative);
      if (prior === undefined || match.modifiedAt > prior.modifiedAt) matchesByRelative.set(match.relative, match);
    }
  }
  const matches = [...matchesByRelative.values()]
    .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt) || right.bytes - left.bytes)
    .slice(0, sessionLimit);
  const studies = Object.freeze(matches.map((match) => readCodexSessionToolStudy(root, match.relative, {
    sessionId: match.sessionId,
  })));
  const counts = new Map<string, number>();
  for (const study of studies) {
    for (const tool of study.tools) counts.set(tool.name, (counts.get(tool.name) ?? 0) + tool.calls);
  }
  const tools = Object.freeze([...counts.entries()]
    .map(([name, calls]) => Object.freeze({ name, calls }))
    .sort((left, right) => right.calls - left.calls || left.name.localeCompare(right.name)));
  const missingOutputs = studies.reduce((sum, study) =>
    sum + study.calls.filter((call) => call.outputStatus === "missing-output").length, 0);
  const functionCalls = studies.reduce((sum, study) => sum + study.toolCalls, 0);
  const argumentSummaries = toolArgumentSummaries(studies);
  const recurringToolSequences = recurringVerbSequences(toolStudySteps(studies)).candidates;
  const harnessImprovements = Object.freeze([
    "Expose transcript tool-study as a first-class service action so agents can inspect real prior tool loops before inventing workflow.",
    "Promote repeated tool chains from transcript evidence into reviewable skill proposals only after strict input/output/effect gates.",
    "Bind tool calls to work-item scopes and effect reports so MetroPlat can tell which tool advanced which obligation.",
    "Keep nearby user and assistant discourse with every tool call; otherwise the tool name explains mechanics but not why the agent reached for it.",
    ...(missingOutputs === 0 ? [] : ["Require every harness tool call to carry a recorded output or explicit failure outcome."]),
  ]);
  return Object.freeze({
    kind: "metroplat.codex-session.tool-study-corpus" as const,
    root: path.resolve(root),
    ...(options.date === undefined ? {} : { date: options.date }),
    dateWindow: Object.freeze(discoveryDates.map((date) => date ?? "all")),
    sessions: studies.length,
    toolCalls: functionCalls,
    tools,
    toolArgumentSummaries: argumentSummaries,
    recurringToolSequences,
    studies,
    harnessImprovements,
    evidence: Object.freeze([
      `date-window:${discoveryDates.map((date) => date ?? "all").join(",")}`,
      `discovered:${discoveries.reduce((sum, discovery) => sum + discovery.matches.length, 0)}`,
      `sessions:${studies.length}`,
      `tool-calls:${functionCalls}`,
      `tools:${tools.length}`,
      `tool-argument-summaries:${argumentSummaries.length}`,
      `recurring-tool-sequences:${recurringToolSequences.length}`,
      `missing-outputs:${missingOutputs}`,
    ]),
  });
}

/** Discover Codex session transcript host marks under a root. */
export function discoverCodexSessionTranscripts(
  root: string,
  options: CodexSessionTranscriptDiscoveryOptions = {},
): CodexSessionTranscriptDiscovery {
  const rootAbs = path.resolve(root);
  const maxDepth = options.maxDepth ?? (options.date === undefined ? 8 : 0);
  const limit = options.limit ?? 50;
  const sessionIds = Object.freeze([...(options.sessionIds ?? [])]);
  const matches: CodexSessionTranscriptDiscoveryMatch[] = [];
  for (const start of candidateRoots(rootAbs, options)) {
    for (const file of walkJsonl(rootAbs, start, maxDepth)) {
      if (matches.length >= limit) break;
      const relative = codexSessionRelativePath(rootAbs, codexSessionConfinedPath(rootAbs, codexSessionRelativePath(rootAbs, file)));
      const source = codexSessionConfinedPath(rootAbs, relative);
      const summary = summarizeCodexSessionTranscript(source);
      if (summary === undefined) continue;
      const sessionId = summary.sessionId;
      if (!matchesSessionFilter(sessionId, relative, sessionIds)) continue;
      matches.push(Object.freeze({
        root: rootAbs,
        relative,
        source,
        sessionId,
        bytes: summary.bytes,
        modifiedAt: summary.modifiedAt,
        discoveryBytes: summary.discoveryBytes,
      }));
    }
  }
  const boundary = Object.freeze({
    root: rootAbs,
    ...(options.date === undefined ? {} : { date: options.date }),
    sessionIds,
    matches: matches.length,
  });
  return codexSessionTranscriptDiscoveryContract.assert(Object.freeze({
    kind: "metroplat.codex-session.transcript-discovery" as const,
    operation: "discover-codex-session-transcripts" as const,
    root: rootAbs,
    ...(sessionIds.length === 0 ? {} : { sessionIds }),
    ...(options.date === undefined ? {} : { date: options.date }),
    matches: Object.freeze(matches),
  }), "Codex session transcript discovery") as CodexSessionTranscriptDiscovery;
}

/** A bounded, provenanced sample of real claim-session observation rows from
 *  Codex transcripts under `root` — the Codex-specific half of the
 *  schema-conformance cut's claim-session-observation source
 *  (`src/monitoring/schema-conformance`). The bounded discover→read→collect
 *  fold itself is shared with Claude's identical sampler — see
 *  `coordination/claim-sessions/conformance-sample.mts` — this function
 *  only supplies Codex's own discover/read functions to it. There is no
 *  Codex equivalent of Claude's fleet-glue reader (`anthropic/fleet/services`)
 *  — Codex has no analogous multi-session gluing, so the glued-claim-sessions
 *  schema is sampled from Claude alone. */
export async function sampleCodexClaimSessionObservations(
  root: string,
  options: ClaimSessionObservationSampleOptions = {},
): Promise<ClaimSessionObservationSample> {
  return sampleClaimSessionObservations(root, "codex-session", discoverCodexSessionTranscripts, readCodexSessionWorkClaims, options);
}
