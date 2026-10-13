/**
 * @packageDocumentation
 *
 * integrations/anthropic/services - live Claude Code transcript host-mark reading.
 *
 * This service owns FILESYSTEM access to Claude Code transcript JSONL files:
 * confined path resolution, directory walking, and discovery. The content-level
 * pipelines (chronicle admission, authored-text restriction, work claims,
 * continuation, status settlement) live in `src/claims` and are mounted
 * on the projector catalog, so `read(path)` at a corner and these path-shaped
 * readers are the same machinery. The service-visible Claude session action
 * family lives here with the transcript readers it calls; the generic service
 * mesh mounts it directly.
 */
import path from "node:path";

import {
  claudeSessionTranscriptDiscoveryContract,
  claudeSessionTranscriptReadContract,
  type ClaudeSessionStatusReadOptions,
  type ClaudeSessionTranscriptDiscovery,
  type ClaudeSessionTranscriptDiscoveryMatch,
  type ClaudeSessionTranscriptDiscoveryOptions,
  type ClaudeSessionTranscriptRead,
  type ClaudeSessionTranscriptReadOptions,
  type ClaudeSessionWorkClaimsReadOptions,
} from "./claude-session/schema.mts";
import type { ContractValue } from "../../lib/contracts/index.mts";
import type { StatementValue } from "../../lib/records/persistence.mts";
import {
  claudeCodeTranscriptRecordsFromJsonl,
  claudeSessionChronicleOfContent,
  claudeSessionContinuationOfContent,
  claudeSessionStatusReadoutOfContent,
  claudeSessionWorkClaimsOfContent,
} from "./codec.mts";
import { claudeSessionTokenUsageOfContent } from "./token-usage.mts";
import { operation, type Operation } from "../../rpc/index.mts";
import { suitForCell } from "../../claims/context.mts";
import type { FilesystemBinding } from "../filesystem/services/read-write.mts";
import { suitInputOfFeedRow } from "../filesystem/services/agent-context.mts";
import {
  claimSessionFeed,
  claimSessionStatementRows,
  sampleClaimSessionObservations,
  type AgentStatusReadout,
  type ClaimSessionContinuation,
  type ClaimSessionObservationBundle,
  type ClaimSessionObservationSample,
  type ClaimSessionObservationSampleOptions,
} from "../../claims/index.mts";
import { chronicleSessionIdOf } from "../../work/chronicle.mts";
import type { JsonValue } from "../../lib/codecs/json/core.mts";
import type { TokenUsageSummary } from "@red-cup-engineering/llm-cost-optimization-services-section/token-usage/core";

import {
  claudeSessionConfinedPath,
  claudeSessionRelativePath,
} from "./claude-session/index.mts";
import { pathExists, readFileLinesStream, statPathOrNull, walkFiles } from "../../lib/filesystem/index.mts";
import { openJournal, type EventWriteResult } from "../../journal/index.mts";

/** Never materialize more of a live-growing host transcript than this many
 *  bytes from its start — the durable fix for the Tile heap incident
 *  (bounded reads), replacing a caller-side transcript-COUNT cap that bounded
 *  nothing about any one transcript's own size. */
const DEFAULT_TRANSCRIPT_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Read a transcript's content bounded to `maxBytes` from its start, via a
 * real Node read stream (never holding the whole file resident). A read cut
 * off mid-file may end on a partial JSON line; that line is dropped rather
 * than handed to a JSONL parser that would throw on it and lose every whole
 * line already read.
 */
async function readTranscriptBounded(filePath: string, maxBytes: number = DEFAULT_TRANSCRIPT_MAX_BYTES): Promise<string> {
  const truncated = (statPathOrNull(filePath)?.size ?? 0) > maxBytes;
  const lines: string[] = [];
  for await (const line of readFileLinesStream(filePath, maxBytes)) lines.push(line);
  if (truncated && lines.length > 0) lines.pop();
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

export type {
  ClaudeSessionStatusReadOptions,
  ClaudeSessionTranscriptDiscovery,
  ClaudeSessionTranscriptDiscoveryMatch,
  ClaudeSessionTranscriptDiscoveryOptions,
  ClaudeSessionTranscriptRead,
  ClaudeSessionTranscriptReadOptions,
  ClaudeSessionWorkClaimsReadOptions,
} from "./claude-session/schema.mts";

function todayIso(binding: FilesystemBinding): string {
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

function sessionIdOfInput(input: unknown): string | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const record = input as Readonly<Record<string, JsonValue>>;
  const sessionId = record["sessionId"] ?? record["id"];
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : undefined;
}

function newestClaudeSessionTranscriptMatch(
  matches: readonly ClaudeSessionTranscriptDiscoveryMatch[],
): ClaudeSessionTranscriptDiscoveryMatch | undefined {
  return [...matches].sort((left, right) =>
    right.events - left.events
    || right.bytes - left.bytes
    || left.relative.localeCompare(right.relative))[0];
}

export function claudeSessionOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "claude-session-status",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read one Claude Code session's status settlement.",
      description: "Domain: { id | sessionId }. Discovers the bounded transcript under the configured Claude session root and projects status without admitting new rows.",
      run: async (input: unknown): Promise<unknown> => {
        if (binding.claudeSessionRoot === undefined) return null;
        const sessionId = sessionIdOfInput(input);
        if (sessionId === undefined) return null;
        const discovery = await discoverClaudeSessionTranscripts(binding.claudeSessionRoot, { sessionIds: [sessionId], limit: 3 });
        const match = newestClaudeSessionTranscriptMatch(discovery.matches);
        if (match === undefined) return null;
        return await readClaudeSessionStatusReadout(binding.claudeSessionRoot, match.relative, {
          ...(binding.readiness === undefined ? {} : { readiness: binding.readiness }),
        });
      },
    }),
    operation({
      verb: "claude-session-suit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read one Claude Code session's in-memory context suit.",
      description: "Domain: { id | sessionId }. Reads transcript-derived claim rows and ranks them into a bounded suit without writing settlement rows.",
      run: async (input: unknown): Promise<unknown> => {
        if (binding.claudeSessionRoot === undefined) return null;
        const sessionId = sessionIdOfInput(input);
        if (sessionId === undefined) return null;
        const discovery = await discoverClaudeSessionTranscripts(binding.claudeSessionRoot, { sessionIds: [sessionId], limit: 3 });
        const match = newestClaudeSessionTranscriptMatch(discovery.matches);
        if (match === undefined) return null;
        const bundle = await readClaudeSessionWorkClaims(binding.claudeSessionRoot, match.relative);
        const rows = bundle.observations.flatMap((observation) => claimSessionStatementRows(observation));
        const inputs = rows.flatMap((row) => {
          const suitInput = suitInputOfFeedRow(row, match.relative);
          return suitInput === undefined ? [] : [suitInput];
        });
        const cell = `claude-session/${sessionId}`;
        return suitForCell(inputs, { cell, text: cell });
      },
    }),
    operation({
      verb: "claude-session-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit one Claude Code session's transcript as recorded claim-session material.",
      description: "Domain: { sessionId }. Source-admits transcript-derived claim rows; duplicate readings settle downstream.",
      run: async (input: unknown): Promise<unknown> => {
        if (binding.claudeSessionRoot === undefined) return null;
        const sessionId = sessionIdOfInput(input);
        if (sessionId === undefined) return null;
        const discovery = await discoverClaudeSessionTranscripts(binding.claudeSessionRoot, { sessionIds: [sessionId], limit: 3 });
        const match = newestClaudeSessionTranscriptMatch(discovery.matches);
        if (match === undefined) return null;
        const { admission } = await admitClaudeSessionWorkClaims(binding.claudeSessionRoot, match.relative, {
          dataRoot: binding.dataRoot,
          at: todayIso(binding),
          ...(binding.rootName === undefined ? {} : { rootName: binding.rootName }),
        });
        return Object.freeze({ kind: "metroplat.holography.claude-session-admit", sessionId, appended: admission.appended });
      },
    }),
  ]);
}

/** Read one Claude Code transcript as opaque admitted record material. */
export async function readClaudeSessionTranscript(
  root: string,
  relative: string,
  options: ClaudeSessionTranscriptReadOptions = {},
): Promise<ClaudeSessionTranscriptRead> {
  const rootAbs = path.resolve(root);
  const source = claudeSessionConfinedPath(rootAbs, relative);
  const relativePath = claudeSessionRelativePath(rootAbs, source);
  const parentDirectory = path.dirname(source);
  const parentDirectoryName = path.basename(parentDirectory);
  const content = await readTranscriptBounded(source);
  const records = claudeCodeTranscriptRecordsFromJsonl({
    content,
    source,
    relative: relativePath,
    parentDirectory,
    parentDirectoryName,
  });
  const boundary = Object.freeze({
    root: rootAbs,
    relative: relativePath,
    source,
    parentDirectory,
    parentDirectoryName,
    bytes: Buffer.byteLength(content, "utf8"),
    records: records.length,
    roles: Object.freeze(records.flatMap((record) => record.role === undefined ? [] : [record.role])),
  });
  return claudeSessionTranscriptReadContract.assert(Object.freeze({
    kind: "metroplat.claude-session.transcript-read" as const,
    operation: "read-claude-session-transcript" as const,
    root: rootAbs,
    relative: relativePath,
    source,
    parentDirectory,
    parentDirectoryName,
    bytes: boundary.bytes,
    recordCount: records.length,
    records,
  }), "Claude session transcript read") as ClaudeSessionTranscriptRead;
}

async function transcriptContent(root: string, relative: string): Promise<{ content: string; relativePath: string; source: string }> {
  const rootAbs = path.resolve(root);
  const source = claudeSessionConfinedPath(rootAbs, relative);
  const relativePath = claudeSessionRelativePath(rootAbs, source);
  return { content: await readTranscriptBounded(source), relativePath, source };
}

function contentOptions(
  relativePath: string,
  options: ClaudeSessionWorkClaimsReadOptions,
): Parameters<typeof claudeSessionWorkClaimsOfContent>[1] {
  return {
    source: relativePath,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    ...(options.claimSessionId === undefined ? {} : { claimSessionId: options.claimSessionId }),
    ...(options.at === undefined ? {} : { at: String(options.at) }),
    ...(options.caller === undefined ? {} : { caller: options.caller as StatementValue }),
  };
}

/** Read one Claude Code session transcript as charged claim-session material. */
export async function readClaudeSessionWorkClaims(
  root: string,
  relative: string,
  options: ClaudeSessionWorkClaimsReadOptions = {},
): Promise<ClaimSessionObservationBundle> {
  const { content, relativePath } = await transcriptContent(root, relative);
  return claudeSessionWorkClaimsOfContent(content, contentOptions(relativePath, options));
}

/** Read one Claude Code session transcript as detailed Anthropic token-usage material. */
export async function readClaudeSessionTokenUsage(
  root: string,
  relative: string,
  options: ClaudeSessionWorkClaimsReadOptions = {},
): Promise<TokenUsageSummary> {
  const { content, relativePath } = await transcriptContent(root, relative);
  return claudeSessionTokenUsageOfContent(content, {
    source: relativePath,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
  });
}

export interface ClaudeSessionWorkClaimsAdmissionOptions extends ClaudeSessionWorkClaimsReadOptions {
  readonly dataRoot: string;
  readonly rootName?: string;
  /** The day partition to admission under (`YYYY-MM-DD`), typically the cut date of
   *  the state-tier read that triggered this recording. A transcript's own
   *  work-claim observations carry a synthetic `{source, item}` sequencing mark
   *  as their `at` (there is no per-item wall-clock time in a batch transcript
   *  read), which is not a date `openJournal` can partition by — so the
   *  day must come from the caller, not from the rows themselves. */
  readonly at: string;
}

/** Admit one Claude Code session transcript's work claims (goals, obligations,
 *  tool acts — the same `ClaimSessionObservation`s a live WebSocket claim session
 *  produces) into `$dataRoot/data/journals` under the `claim-session` feed, subject
 *  `claude-session-<id>` so the address matches this session's own state-tier cut
 *  token. Once recorded, the generic log→record→content legs already wired for
 *  every other feed (`services/filesystem`'s default cut derivation) promote this
 *  session's claims the same way the hook-event feed promotes: no new
 *  derivation code, only a real log behind the address a `commit`/`realize` read
 *  already knows how to find. A repeated transcript admission is another source
 *  attempt; duplicate readings settle downstream instead of being filtered here. */
export async function admitClaudeSessionWorkClaims(
  root: string,
  relative: string,
  options: ClaudeSessionWorkClaimsAdmissionOptions,
): Promise<{ readonly bundle: ClaimSessionObservationBundle; readonly admission: EventWriteResult }> {
  const bundle = await readClaudeSessionWorkClaims(root, relative, options);
  const sessionId = bundle.sessionId ?? "claude-session";
  const rows = bundle.observations.flatMap((observation) => claimSessionStatementRows(observation));
  const admission = openJournal(options.dataRoot).appendRows(claimSessionFeed.name, rows, {
    at: options.at,
    ...(options.rootName === undefined ? {} : { rootName: options.rootName }),
    subject: `claude-session-${sessionId}`,
    caller: Object.freeze({ transport: "claude-session-transcript", session: sessionId }),
  });
  return Object.freeze({ bundle, admission });
}

/** Read one Claude Code session transcript as claim-session continuation material. */
export async function readClaudeSessionContinuation(
  root: string,
  relative: string,
  options: ClaudeSessionWorkClaimsReadOptions = {},
): Promise<ClaimSessionContinuation> {
  const { content, relativePath } = await transcriptContent(root, relative);
  return claudeSessionContinuationOfContent(content, contentOptions(relativePath, options));
}

/** Read one Claude Code session transcript as agent handoff/status-settlement material — self-inspection of a turn. */
export async function readClaudeSessionStatusReadout(
  root: string,
  relative: string,
  options: ClaudeSessionStatusReadOptions = {},
): Promise<AgentStatusReadout> {
  const { content, relativePath } = await transcriptContent(root, relative);
  return claudeSessionStatusReadoutOfContent(content, {
    ...contentOptions(relativePath, options),
    ...(options.readiness === undefined ? {} : { readiness: options.readiness }),
  });
}

function matchesSessionFilter(sessionId: string, relative: string, filters: readonly string[]): boolean {
  return filters.length === 0 || filters.some((filter) =>
    sessionId === filter || sessionId.startsWith(filter) || relative.includes(filter));
}

// Claude Code nests a session's subagent transcripts under that session's own
// `subagents/` directory. A subagent run fibers over its parent run, not a peer in
// the run sequence — nesting is proven NOT to be the causal/sequencing order on runs
// (`2026-07-01-research-on-the-kinematic-space-of-runs.md`), so discovering these as flat, independent
// fleet peers would misrepresent the relation entirely (worse than drawing them as
// causal children, which that note already rules out). Until a subagent schema fibers
// them properly over their parent diamond, they are out of scope here — excluded, not
// silently included as false peers.
const SUBAGENT_DIRECTORY_NAME = "subagents";

function walkJsonl(start: string, maxDepth: number): readonly string[] {
  return walkFiles(start, {
    maxDepth,
    pruneDirectory: (name) => name === SUBAGENT_DIRECTORY_NAME,
    includeFile: (name) => name.endsWith(".jsonl"),
  });
}

/** Discover Claude Code session transcript host marks under a root, optionally filtered by session id prefix. */
export async function discoverClaudeSessionTranscripts(
  root: string,
  options: ClaudeSessionTranscriptDiscoveryOptions = {},
): Promise<ClaudeSessionTranscriptDiscovery> {
  const rootAbs = path.resolve(root);
  const maxDepth = options.maxDepth ?? 6;
  const limit = options.limit ?? 50;
  const sessionIds = Object.freeze([...(options.sessionIds ?? [])]);
  const matches: ClaudeSessionTranscriptDiscoveryMatch[] = [];
  if (pathExists(rootAbs)) {
    for (const file of walkJsonl(rootAbs, maxDepth)) {
      if (matches.length >= limit) break;
      const relative = claudeSessionRelativePath(rootAbs, file);
      // Host-mark pre-filter: a Claude Code transcript's filename is its session
      // id, so a session-id filter that matches nowhere in the relative path
      // cannot match the file. This skips the (expensive) chronicle read; the
      // authoritative match below is unchanged.
      if (sessionIds.length > 0 && !sessionIds.some((filter) => relative.includes(filter))) continue;
      let content: string;
      try {
        content = await readTranscriptBounded(file);
      } catch {
        continue;
      }
      let chronicle;
      try {
        chronicle = claudeSessionChronicleOfContent(content, {
          ...(options.caller === undefined ? {} : { caller: options.caller as StatementValue }),
        });
      } catch {
        continue;
      }
      const sessionId = chronicleSessionIdOf(chronicle);
      if (sessionId === undefined) continue;
      if (!matchesSessionFilter(sessionId, relative, sessionIds)) continue;
      // The real on-disk size, not the bounded read's — a truncated transcript
      // must never under-report its own byte count.
      matches.push(Object.freeze({
        root: rootAbs,
        relative,
        source: file,
        sessionId,
        bytes: statPathOrNull(file)?.size ?? Buffer.byteLength(content, "utf8"),
        events: chronicle.statements.length,
      }));
    }
  }
  const boundary = Object.freeze({
    root: rootAbs,
    sessionIds,
    matches: matches.length,
  });
  return claudeSessionTranscriptDiscoveryContract.assert(Object.freeze({
    kind: "metroplat.claude-session.transcript-discovery" as const,
    operation: "discover-claude-session-transcripts" as const,
    root: rootAbs,
    ...(sessionIds.length === 0 ? {} : { sessionIds }),
    matches: Object.freeze(matches),
  }), "Claude session transcript discovery") as ClaudeSessionTranscriptDiscovery;
}

/** A bounded, provenanced sample of real claim-session observation rows from
 *  Claude Code transcripts under `root` — the Claude-specific half of the
 *  schema-conformance cut's claim-session-observation source
 *  (`src/monitoring/schema-conformance`). The bounded discover→read→collect
 *  fold itself is shared with Codex's identical sampler — see
 *  `coordination/claim-sessions/conformance-sample.mts` — this function
 *  only supplies Claude's own discover/read functions to it. */
export async function sampleClaudeClaimSessionObservations(
  root: string,
  options: ClaimSessionObservationSampleOptions = {},
): Promise<ClaimSessionObservationSample> {
  return sampleClaimSessionObservations(root, "claude-session", discoverClaudeSessionTranscripts, readClaudeSessionWorkClaims, options);
}

// Fleet reading (many sessions glued into one cross-session judgement) lives at
// ./fleet/services, which depends on discoverClaudeSessionTranscripts
// and readClaudeSessionWorkClaims above.
