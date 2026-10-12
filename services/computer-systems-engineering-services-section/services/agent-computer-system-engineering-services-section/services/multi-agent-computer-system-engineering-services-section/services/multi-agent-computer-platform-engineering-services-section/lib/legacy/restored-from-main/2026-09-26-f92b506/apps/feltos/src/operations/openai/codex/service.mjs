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

} from "./codex-session/schema.mjs";

import {
  recurringVerbSequences,

} from "@red-cup-engineering/metrologic/number-theory/sequence-recurrence";
import {
  codexSessionChronicleOfContent,
  codexSessionContinuationOfContent,
  codexSessionEncounterTraceOfContent,
  codexSessionIdFromEvent,
  codexSessionStatusReadoutOfContent,
  codexSessionToolStudyOfContent,
  codexSessionWorkClaimsOfContent,

} from "./codec.mjs";
import { codexSessionTokenUsageOfContent } from "./token-usage.mjs";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";

import { claimSessionFeed, claimSessionStatementRows } from "@red-cup-engineering/relating/running/session";
import { sampleClaimSessionObservations } from "@red-cup-engineering/feltos/claims/conformance-sample";

import {
  codexSessionConfinedPath,
  codexSessionDateRelativeRoot,
  codexSessionRelativePath,
} from "@red-cup-engineering/feltos/operations/openai/codex/codex-session";
import { parse } from "@red-cup-engineering/json-services-section";
import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { assertStructuredWorkIntent, structuredWorkIntentObservations } from "@red-cup-engineering/feltos/work/structured-intent";
import { workItemOfCell } from "@red-cup-engineering/socializing";

function todayIso(binding) {
  return binding.now().slice(0, 10);
}

function sessionIdOfInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const record = input;
  const sessionId = record["sessionId"] ?? record["id"];
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : undefined;
}

function structuredIntentOfInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const record = input;
  const rawIntent = record["structuredIntent"];
  const rawParent = record["parentScope"];
  if (rawIntent === undefined && rawParent === undefined) return undefined;
  if (rawIntent === undefined || typeof rawParent !== "string") {
    throw new TypeError("codex-session-admit: structuredIntent and parentScope must be supplied together");
  }
  const intent = assertStructuredWorkIntent(rawIntent);
  const parent = intent.items.find((item) => (item.item ?? item.cell) === rawParent);
  if (parent === undefined || workItemOfCell(rawParent)?.level !== "task") {
    throw new TypeError("codex-session-admit: parentScope must name an admitted task");
  }
  return Object.freeze({ intent, parentScope: rawParent });
}

function dateOfInput(input, binding) {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const date = (input)["date"];
    if (typeof date === "string" && date.length > 0) return date;
  }
  return todayIso(binding);
}

function codexSessionFilterOfInput(input) {
  const sessionId = sessionIdOfInput(input);
  if (sessionId === undefined || sessionId.startsWith("agent:")) return undefined;
  return Object.freeze([sessionId]);
}

export function readCodexLatestTranscriptStatus(root, date, options) {
  for (let back = 0; back < 2; back += 1) {
    const current = new Date(new Date(`${date}T00:00:00Z`).getTime() - back * 86_400_000).toISOString().slice(0, 10);
    const discovery = discoverCodexSessionTranscripts(root, { ...options, date: current });
    const match = newestCodexSessionTranscriptMatch(discovery.matches);
    if (match !== undefined) return codexSessionTranscriptHandleStatus(match);
  }
  return undefined;
}

export function codexSessionOperations(binding) {
  return Object.freeze([
    operation({
      verb: "codex-session-status",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read one Codex session's status settlement.",
      description: "Domain: { id | sessionId }. Discovers the bounded transcript under the configured Codex session root and projects status without admitting new rows.",
      run: (input) => {
        if (binding.codexSessionRoot === undefined) return null;
        const sessionId = sessionIdOfInput(input);
        if (sessionId === undefined) return null;
        const discovery = discoverCodexSessionTranscripts(binding.codexSessionRoot, { ...binding, sessionIds: [sessionId], limit: 3 });
        const match = newestCodexSessionTranscriptMatch(discovery.matches);
        if (match === undefined) return null;
        return readCodexSessionStatusReadout(binding.codexSessionRoot, match.relative, {
          ...binding,
          ...(binding.readiness === undefined ? {} : { readiness: binding.readiness }),
        });
      },
    }),
    operation({
      verb: "codex-session-encounter",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read one bounded, deterministic Codex encounter handle.",
      description: "Domain: { id | sessionId }. Returns the transcript commitment and exact structural counts needed to address the lossless encounter without embedding an unbounded transcript interpretation in one RPC receipt. The lossless provider read remains readCodexSessionEncounter; codex-session-admit records its work claims. This read makes no customer-acceptance claim and admits no rows.",
      run: (input) => {
        if (binding.codexSessionRoot === undefined) return null;
        const sessionId = sessionIdOfInput(input);
        if (sessionId === undefined) return null;
        const discovery = discoverCodexSessionTranscripts(binding.codexSessionRoot, { ...binding, sessionIds: [sessionId], limit: 3 });
        const match = newestCodexSessionTranscriptMatch(discovery.matches);
        if (match === undefined) return null;
        return readCodexSessionEncounterHandle(binding.codexSessionRoot, match.relative, { ...binding, sessionId });
      },
    }),
    operation({
      verb: "codex-latest",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read the latest bounded Codex transcript handle.",
      description: "Domain: { date? }. Uses bounded transcript discovery over the configured Codex session root.",
      run: (input) => {
        if (binding.codexSessionRoot === undefined) return null;
        return readCodexLatestTranscriptStatus(binding.codexSessionRoot, dateOfInput(input, binding), binding) ?? null;
      },
    }),
    operation({
      verb: "codex-tool-study",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read a bounded Codex transcript tool-use corpus.",
      description: "Domain: { date?, id?, sessionId? }. id/sessionId can select a session unless it names an agent actor.",
      run: (input) => {
        if (binding.codexSessionRoot === undefined) return null;
        const sessionIds = codexSessionFilterOfInput(input);
        const options = {
          ...binding,
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
      description: "Domain: { sessionId, structuredIntent?, parentScope? }. When intent and parent are supplied together, admits the hierarchy before enclosing transcript-derived work-item leaves under that task in the same claim-session append.",
      run: (input) => {
        if (binding.codexSessionRoot === undefined) return null;
        const sessionId = sessionIdOfInput(input);
        if (sessionId === undefined) return null;
        const structured = structuredIntentOfInput(input);
        const discovery = discoverCodexSessionTranscripts(binding.codexSessionRoot, { ...binding, sessionIds: [sessionId], limit: 3 });
        const match = newestCodexSessionTranscriptMatch(discovery.matches);
        if (match === undefined) return null;
        const { admission } = admitCodexSessionWorkClaims(binding.codexSessionRoot, match.relative, {
          ...binding,
          dataRoot: binding.dataRoot,
          at: todayIso(binding),
          ...(binding.rootName === undefined ? {} : { rootName: binding.rootName }),
          ...(structured === undefined ? {} : { structuredIntent: structured.intent, parentScope: structured.parentScope }),
        });
        return Object.freeze({ kind: "metroplat.holography.codex-session-admit", sessionId, appended: admission.appended });
      },
    }),
  ]);
}

function candidateRoots(root, options) {
  if (options.date === undefined) return Object.freeze([root]);
  const dated = codexSessionConfinedPath(root, codexSessionDateRelativeRoot(options.date));
  return options.pathExists(dated) ? Object.freeze([dated]) : Object.freeze([]);
}

function walkJsonl(_root, start, maxDepth, options) {
  return options.walkFiles(start, { maxDepth, includeFile: (name) => name.endsWith(".jsonl") });
}

const CODEX_DISCOVERY_HEAD_BYTES = 64 * 1024;

function summarizeCodexSessionTranscript(source, options) {
  const stat = options.statPathOrNull(source);
  if (stat === null || !stat.isFile()) return undefined;
  const head = options.readFileHeadUtf8(source, CODEX_DISCOVERY_HEAD_BYTES);
  let sessionId;
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
  matches,
) {
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
export function codexSessionTranscriptHandleStatus(match) {
  return Object.freeze({
    kind: "metroplat.codex-session.transcript-handle-status",
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

function matchesSessionFilter(sessionId, relative, filters) {
  return filters.length === 0 || filters.some((filter) =>
    sessionId === filter || sessionId.startsWith(filter) || relative.includes(filter));
}

/** Read one Codex session transcript as the admitted boundary chronicle. */
export function readCodexSessionTranscript(
  root,
  relative,
  options = {},
) {
  const rootAbs = path.resolve(root);
  const source = codexSessionConfinedPath(rootAbs, relative);
  const relativePath = codexSessionRelativePath(rootAbs, source);
  const content = options.readFileUtf8(source);
  const chronicle = codexSessionChronicleOfContent(content, {
    source,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    ...(options.caller === undefined ? {} : { caller: options.caller }),
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
    kind: "metroplat.codex-session.transcript-read",
    operation: "read-codex-session-transcript",
    root: rootAbs,
    relative: relativePath,
    source,
    bytes: boundary.bytes,
    events: chronicle.statements.length,
    chronicle,
  }), "Codex session transcript read");
}

function transcriptContent(root, relative, options) {
  const rootAbs = path.resolve(root);
  const source = codexSessionConfinedPath(rootAbs, relative);
  const relativePath = codexSessionRelativePath(rootAbs, source);
  return { content: options.readFileUtf8(source), relativePath, source };
}

function contentOptions(
  source,
  relativePath,
  options,
) {
  return {
    source: relativePath,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
    ...(options.claimSessionId === undefined ? {} : { claimSessionId: options.claimSessionId }),
    ...(options.at === undefined ? {} : { at: String(options.at) }),
    ...(options.caller === undefined ? {} : { caller: options.caller }),
  };
}

/** Read one Codex session transcript as valued claim-session material. */
export function readCodexSessionWorkClaims(
  root,
  relative,
  options = {},
) {
  const { content, relativePath, source } = transcriptContent(root, relative, options);
  return codexSessionWorkClaimsOfContent(content, contentOptions(source, relativePath, options));
}

/** Read one Codex session transcript as detailed OpenAI token-usage material. */
export function readCodexSessionTokenUsage(
  root,
  relative,
  options = {},
) {
  const { content, relativePath } = transcriptContent(root, relative, options);
  return codexSessionTokenUsageOfContent(content, {
    source: relativePath,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
  });
}

/** Address a lossless encounter through a bounded receipt-safe projection.
 * The full typed interpretation remains available from
 * `readCodexSessionEncounter`; this handle commits to the same transcript and
 * reports exact cardinalities without copying arbitrarily large turns, tool
 * arguments, outcomes, continuation text, or raw usage events into RPC state. */
export function readCodexSessionEncounterHandle(
  root,
  relative,
  options = {},
) {
  const encounter = readCodexSessionEncounter(root, relative, options);
  const { rawEvents, ...tokenUsage } = encounter.tokenUsage;
  return Object.freeze({
    kind: "metroplat.codex-session.encounter-handle",
    operation: "read-codex-session-encounter-handle",
    root: encounter.root,
    relative: encounter.relative,
    source: encounter.source,
    ...(encounter.trace.sessionId === undefined ? {} : { sessionId: encounter.trace.sessionId }),
    transcript: encounter.trace.transcript,
    counts: Object.freeze({
      authoredTurns: encounter.trace.authoredTurns.length,
      hostContexts: encounter.trace.hostContexts.length,
      toolActs: encounter.trace.toolActs.length,
      toolOutcomes: encounter.trace.toolActs.reduce((sum, act) => sum + act.outcomes.length, 0),
      missingToolOutcomes: encounter.trace.toolActs.filter((act) => act.outcomeStatus === "missing-output").length,
      correctionCandidates: encounter.trace.correctionCandidates.length,
    }),
    continuation: Object.freeze({
      observations: encounter.continuation.observations,
      goals: encounter.continuation.goals,
      obligations: encounter.continuation.obligations,
      claims: encounter.continuation.claims,
      conflicts: encounter.continuation.conflicts.length,
      regime: encounter.continuation.regime,
    }),
    tokenUsage: Object.freeze({ ...tokenUsage, rawEventCount: rawEvents.length }),
    ...(encounter.trace.terminalOutcome === undefined ? {} : { terminalStanding: encounter.trace.terminalOutcome.standing }),
    acceptanceStanding: encounter.acceptanceStanding,
    evidence: Object.freeze([
      encounter.trace.transcript.commitment,
      `authored-turns:${encounter.trace.authoredTurns.length}`,
      `tool-acts:${encounter.trace.toolActs.length}`,
      `continuation-items:${encounter.continuation.items.length}`,
      `token-usage-events:${rawEvents.length}`,
      "lossless-provider:readCodexSessionEncounter",
      "terminal-outcome-is-not-customer-acceptance",
    ]),
  });
}

/** Read one full encounter as deterministic claim-token projections. The raw
 * transcript remains owned by the Codex filesystem boundary and is carried by
 * commitment; this provider reports evidence but cannot accept its own work. */
export function readCodexSessionEncounter(
  root,
  relative,
  options = {},
) {
  const rootAbs = path.resolve(root);
  const { content, relativePath, source } = transcriptContent(rootAbs, relative, options);
  const interpreted = contentOptions(source, relativePath, options);
  const trace = codexSessionEncounterTraceOfContent(content, interpreted);
  const continuation = codexSessionContinuationOfContent(content, interpreted);
  const tokenUsage = codexSessionTokenUsageOfContent(content, {
    source: relativePath,
    ...(options.sessionId === undefined ? {} : { sessionId: options.sessionId }),
  });
  return Object.freeze({
    kind: "metroplat.codex-session.encounter-read",
    operation: "read-codex-session-encounter",
    root: rootAbs,
    relative: relativePath,
    source,
    trace,
    continuation,
    tokenUsage,
    acceptanceStanding: "customer-assay-required",
    evidence: Object.freeze([
      trace.transcript.commitment,
      ...trace.evidence,
      ...continuation.evidence,
      "terminal-outcome-is-not-customer-acceptance",
    ]),
  });
}

  

function encloseCodexWorkItemObservation(observation, parent) {
  if (workItemOfCell(observation.claim.cell)?.level !== "work-item") return observation;
  const boundary = observation.boundary;
  const boundaryRecord = boundary !== null && typeof boundary === "object" && !Array.isArray(boundary)
    ? boundary
    : {};
  return Object.freeze({
    ...observation,
    boundary: Object.freeze({ ...boundaryRecord, parent }),
  });
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
  root,
  relative,
  options,
) {
  if ((options.structuredIntent === undefined) !== (options.parentScope === undefined)) {
    throw new TypeError("admit Codex session work claims: structuredIntent and parentScope must be supplied together");
  }
  const readBundle = readCodexSessionWorkClaims(root, relative, options);
  const sessionId = readBundle.sessionId ?? "codex-session";
  let hierarchy = Object.freeze([]);
  if (options.structuredIntent !== undefined) {
    const intent = assertStructuredWorkIntent(options.structuredIntent);
    const parent = options.parentScope;
    if (workItemOfCell(parent)?.level !== "task" || !intent.items.some((item) => (item.item ?? item.cell) === parent)) {
      throw new TypeError("admit Codex session work claims: parentScope must name an admitted task");
    }
    hierarchy = structuredWorkIntentObservations(intent);
  }
  const transcript = options.parentScope === undefined
    ? readBundle.observations
    : Object.freeze(readBundle.observations.map((observation) => encloseCodexWorkItemObservation(observation, options.parentScope)));
  const observations = Object.freeze([...hierarchy, ...transcript]);
  const bundle = Object.freeze({ ...readBundle, observations });
  const rows = observations.flatMap((observation) => claimSessionStatementRows(observation));
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
  root,
  relative,
  options = {},
) {
  const { content, relativePath, source } = transcriptContent(root, relative, options);
  return codexSessionContinuationOfContent(content, contentOptions(source, relativePath, options));
}

/** Read one Codex session transcript as agent handoff/status-cut material. */
export function readCodexSessionStatusReadout(
  root,
  relative,
  options = {},
) {
  const { content, relativePath, source } = transcriptContent(root, relative, options);
  return codexSessionStatusReadoutOfContent(content, {
    ...contentOptions(source, relativePath, options),
    ...(options.readiness === undefined ? {} : { readiness: options.readiness }),
  });
}

/** Read one Codex session transcript as a tool-use study with surrounding chat. */
export function readCodexSessionToolStudy(
  root,
  relative,
  options = {},
) {
  const { content, relativePath, source } = transcriptContent(root, relative, options);
  return codexSessionToolStudyOfContent(content, contentOptions(source, relativePath, options));
}

function argumentShape(argumentsText) {
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

function shellCommandHead(command) {
  const trimmed = command.trim();
  if (trimmed.length === 0) return undefined;
  const match = /^([A-Za-z0-9_.:/-]+)/u.exec(trimmed);
  return match?.[1];
}

function argumentAction(tool, argumentsText) {
  if (argumentsText === undefined) return Object.freeze({ action: "no-arguments" });
  try {
    const parsed = parse(argumentsText);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed;
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

function compactExample(text) {
  const compact = text.replace(/\s+/gu, " ").trim();
  return compact.length <= 160 ? compact : `${compact.slice(0, 157)}...`;
}

function toolArgumentSummaries(studies) {
  const counts = new Map();
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

function toolStudySteps(studies) {
  return Object.freeze(studies.flatMap((study) => study.calls.map((call) => Object.freeze({
    actor: study.sessionId ?? study.source,
    verb: call.tool,
    argShape: argumentShape(call.arguments),
    validated: call.outputStatus === "recorded",
  }))));
}

function priorIsoDate(date) {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
}

function toolStudyDiscoveryDates(date) {
  if (date === undefined) return Object.freeze([undefined]);
  return Object.freeze([date, priorIsoDate(date)]);
}

/** Study a bounded corpus of Codex transcripts under the host session root. */
export function readCodexSessionToolStudyCorpus(
  root,
  options = {},
) {
  const sessionLimit = options.sessionLimit ?? 12;
  const discoveryDates = toolStudyDiscoveryDates(options.date);
  const discoveries = discoveryDates.map((date) => {
    const discoveryOptions = {
      ...options,
      ...(options.sessionIds === undefined ? {} : { sessionIds: options.sessionIds }),
      ...(date === undefined ? {} : { date }),
      ...(options.maxDepth === undefined ? {} : { maxDepth: options.maxDepth }),
      ...(options.at === undefined ? {} : { at: options.at }),
      ...(options.caller === undefined ? {} : { caller: options.caller }),
      limit: options.limit ?? Math.max(50, sessionLimit * 4),
    };
    return discoverCodexSessionTranscripts(root, discoveryOptions);
  });
  const matchesByRelative = new Map();
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
    ...options,
    sessionId: match.sessionId,
  })));
  const counts = new Map();
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
    kind: "metroplat.codex-session.tool-study-corpus",
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
  root,
  options = {},
) {
  const rootAbs = path.resolve(root);
  const maxDepth = options.maxDepth ?? (options.date === undefined ? 8 : 0);
  const limit = options.limit ?? 50;
  const sessionIds = Object.freeze([...(options.sessionIds ?? [])]);
  const matches = [];
  for (const start of candidateRoots(rootAbs, options)) {
    for (const file of walkJsonl(rootAbs, start, maxDepth, options)) {
      if (matches.length >= limit) break;
      const relative = codexSessionRelativePath(rootAbs, codexSessionConfinedPath(rootAbs, codexSessionRelativePath(rootAbs, file)));
      const source = codexSessionConfinedPath(rootAbs, relative);
      const summary = summarizeCodexSessionTranscript(source, options);
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
    kind: "metroplat.codex-session.transcript-discovery",
    operation: "discover-codex-session-transcripts",
    root: rootAbs,
    ...(sessionIds.length === 0 ? {} : { sessionIds }),
    ...(options.date === undefined ? {} : { date: options.date }),
    matches: Object.freeze(matches),
  }), "Codex session transcript discovery");
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
  root,
  options = {},
) {
  return sampleClaimSessionObservations(root, "codex-session", discoverCodexSessionTranscripts, readCodexSessionWorkClaims, options);
}
