/**
 * @packageDocumentation
 *
 * integrations/anthropic/fleet/services - reading many Claude Code
 * sessions under one root as one fleet, glued into a single cross-session
 * judgement.
 *
 * This is Claude-session-specific (Codex has no analogous multi-session
 * reader), so it lives inside anthropic/ rather than as a peer of it —
 * depending on `../../services` (this vendor's own session reads) is a
 * same-domain, downward-into-a-sibling dependency, not a cross-vendor one.
 * It is its own directory because "read many sessions and glue them" is its
 * own concern, distinct from the single-transcript reads `../../services`
 * otherwise owns.
 */
import path from "node:path";

import { mergeOrderIndependentReceipt } from "../../../lib/math/topology/crdt-cohomological-calm.mts";
import { presenceLabel } from "../../../lib/math/physics/session-presence.mts";
import type { ChargeValueName } from "../../../lib/values/index.mts";
import { isChargeValueName } from "../../../lib/values/index.mts";
import {
  claudeSessionFleetReadoutContract,
  type ClaudeSessionFleetReadout,
} from "./schema.mts";
import {
  discoverClaudeSessionTranscripts,
  readClaudeSessionWorkClaims,
} from "../service.mts";
import type { ContractValue } from "../../../lib/contracts/index.mts";
import {
  claimSessionFeed,
  claimSessionContinuation,
  claimSessionObservationOfRow,
  claimSessionStatementRows,
  glueClaimSessions,
  type Claim,
  type ClaimSessionObservation,
  type ClaimSessionObservationBundle,
  type GluedClaimSessions,
} from "../../../claims/index.mts";
import { obsticulationObservationsOfGlue } from "../../../work/obligations.mts";
import { classifyCalmOfGlue } from "../../../claims/calm.mts";
import { operation, type Operation } from "../../../rpc/index.mts";
import type { SchemaConformanceSample } from "../../../lib/schema/conformance.mts";
import { parse, type JsonValue } from "../../../lib/codecs/json/core.mts";
import { readFileUtf8 } from "../../../lib/filesystem/index.mts";
import type { FilesystemBinding } from "../../filesystem/services/read-write.mts";
import { readSessionPresence } from "../../filesystem/services/session-presence.mts";
import { openJournal, journal, type JournalFeed } from "../../../journal/index.mts";

export interface ClaudeSessionFleetReadOptions {
  readonly sessionIds?: readonly string[];
  readonly maxDepth?: number;
  readonly limit?: number;
  readonly at?: ContractValue;
  readonly caller?: ContractValue;
}

export interface ClaudeAgentFleetBinding {
  readonly dataRoot: string;
  readonly claudeSessionRoot?: string;
  readonly rootName?: string;
  now?(): string;
}

function operationDate(binding: FilesystemBinding, input: unknown): string {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const date = (input as Readonly<Record<string, JsonValue>>)["date"];
    if (typeof date === "string" && date.length > 0) return date;
  }
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

export function claudeSessionIdsOfHookState(binding: ClaudeAgentFleetBinding, date: string): readonly string[] {
  const logPath = journal.feed(binding.dataRoot, "hook-event", date, { subject: "hook-event" });
  if (!journal.sourceStatus(logPath).exists) return Object.freeze([]);
  const projection = journal.projectState(logPath.artifact);
  const view = parse(readFileUtf8(projection.artifact.path));
  if (view === null || typeof view !== "object" || Array.isArray(view)) return Object.freeze([]);
  const ids = new Set<string>();
  for (const key of Object.keys(view)) {
    try {
      const entity = JSON.parse(key) as { protocol?: string; harness?: string; session?: string };
      if (entity?.protocol === "agent-hook" && entity.harness === "claude-code" && typeof entity.session === "string") {
        ids.add(entity.session);
      }
    } catch {
      continue;
    }
  }
  return Object.freeze([...ids]);
}

export function orderedFleetSessions<T extends { readonly sessionId: string }>(
  sessions: readonly T[],
  binding: ClaudeAgentFleetBinding,
  date: string,
): readonly T[] {
  try {
    const asOf = binding.now?.() ?? new Date().toISOString();
    const presence = readSessionPresence(binding.dataRoot, date, asOf);
    if (presence.measurements.length === 0) return sessions;
    const labelBySession = new Map(presence.measurements.map((reading) => [reading.session, presenceLabel(reading, presence.staleAfterSeconds)]));
    const rank: Readonly<Record<string, number>> = Object.freeze({ "deshrouded-recent": 0, "deshrouded-stale": 1, settled: 2 });
    const rankOf = (label: string | undefined): number => (label === undefined ? rank["deshrouded-stale"] : rank[label]) ?? 1;
    return Object.freeze([...sessions].sort((left, right) =>
      rankOf(labelBySession.get(left.sessionId)) - rankOf(labelBySession.get(right.sessionId))));
  } catch {
    return sessions;
  }
}

export function claudeSessionClaimCellChargeDeltas(
  binding: ClaudeAgentFleetBinding,
  date: string,
  sessionId: string,
  cell: string,
): readonly ChargeValueName[] {
  const logPath = claudeSessionLogPath(binding, date, sessionId);
  if (!journal.sourceStatus(logPath).exists) return Object.freeze([]);
  const folded = journal.scan(logPath, [] as ChargeValueName[], (deltas, row) => {
    const [, attribute] = row;
    if (attribute === null || typeof attribute !== "object" || Array.isArray(attribute)) return deltas;
    const record = attribute as Readonly<Record<string, JsonValue>>;
    if (record["cell"] !== cell) return deltas;
    const charge = record["charge"];
    if (typeof charge === "string" && isChargeValueName(charge)) deltas.push(charge);
    return deltas;
  });
  return Object.freeze([...folded.result]);
}

function claudeSessionLogPath(binding: ClaudeAgentFleetBinding, date: string, sessionId: string): JournalFeed {
  return journal.feed(binding.dataRoot, "claim-session", date, { subject: `claude-session-${sessionId}` });
}

function claudeSessionIdsOfStatementLogs(binding: ClaudeAgentFleetBinding, date: string): readonly string[] {
  const ids = new Set<string>();
  const pattern = new RegExp(`^${date.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}-admit-claude-session-(.+)\\.jsonl$`, "u");
  for (const log of journal.listFeeds(binding.dataRoot, date)) {
    const match = pattern.exec(log.name);
    if (match?.[1] !== undefined && match[1].length > 0) ids.add(match[1]);
  }
  return Object.freeze([...ids].sort((left, right) => left.localeCompare(right)));
}

function replayClaimObservations(observations: readonly ClaimSessionObservation[]): readonly ClaimSessionObservation[] {
  const claims: Claim[] = [];
  return Object.freeze(observations.map((observation) => {
    claims.push(observation.claim);
    return Object.freeze({
      ...observation,
      session: Object.freeze({
        claims: Object.freeze([...claims]),
        closed: false,
      }),
    });
  }));
}

function recordedClaudeSessionBundle(
  binding: ClaudeAgentFleetBinding,
  date: string,
  sessionId: string,
): ClaimSessionObservationBundle | undefined {
  const logPath = claudeSessionLogPath(binding, date, sessionId);
  if (!journal.sourceStatus(logPath).exists) return undefined;
  const observations: ClaimSessionObservation[] = [];
  const folded = journal.scan(logPath, observations, (accumulator, row) => {
    const observation = claimSessionObservationOfRow(row, sessionId);
    if (observation !== null) accumulator.push(observation);
    return accumulator;
  });
  if (observations.length === 0) return undefined;
  const source = logPath.name;
  return Object.freeze({
    kind: "metroplat.claim-session.observation-bundle" as const,
    sessionId,
    source,
    observations: replayClaimObservations(observations),
    evidence: Object.freeze([
      `statement-log:${source}`,
      `rows:${folded.rows}`,
      ...(folded.malformed === 0 ? [] : [`malformed:${folded.malformed}`]),
    ]),
  });
}

function discourseBundle(bundle: ClaimSessionObservationBundle): ClaimSessionObservationBundle {
  return Object.freeze({
    ...bundle,
    observations: Object.freeze(bundle.observations.filter((observation) => {
      const boundary = observation.boundary;
      if (boundary === null || boundary === undefined || typeof boundary !== "object" || Array.isArray(boundary)) return true;
      return (boundary as Readonly<Record<string, JsonValue>>)["role"] !== "act";
    })),
  });
}

function fleetReadoutFromStatementLogs(binding: ClaudeAgentFleetBinding, date: string): ClaudeSessionFleetReadout | undefined {
  const sessionIds = Object.freeze([
    ...new Set([...claudeSessionIdsOfHookState(binding, date), ...claudeSessionIdsOfStatementLogs(binding, date)]),
  ]);
  const bundles = Object.freeze(sessionIds.flatMap((sessionId) => {
    const bundle = recordedClaudeSessionBundle(binding, date, sessionId);
    return bundle === undefined ? [] : [bundle];
  }));
  if (bundles.length === 0) return undefined;

  const sessions = bundles.map((bundle): { readonly sessionId: string } & Record<string, JsonValue> => {
    const continuation = claimSessionContinuation(bundle);
    const goals = continuation.items.filter((item) => item.role === "goal");
    const latestGoal = goals.length === 0 ? undefined : goals[goals.length - 1]!.text.slice(0, 200).trim();
    const logPath = claudeSessionLogPath(binding, date, bundle.sessionId ?? "");
    return Object.freeze({
      sessionId: bundle.sessionId ?? "unknown",
      relative: bundle.source,
      bytes: journal.sourceStatus(logPath).bytes,
      events: bundle.observations.length,
      statusline: `session:${bundle.sessionId ?? "unknown"} regime:${continuation.regime} goals:${continuation.goals} obligations:${continuation.obligations} claims:${continuation.claims} conflicts:${continuation.conflicts.length}`,
      goals: continuation.goals,
      obligations: continuation.obligations,
      claims: continuation.claims,
      regime: continuation.regime,
      ...(latestGoal === undefined || latestGoal.length === 0 ? {} : { latestGoal }),
    }) as { readonly sessionId: string } & Record<string, JsonValue>;
  });
  const glued = glueClaimSessions(bundles.map(discourseBundle));
  const calm = classifyCalmOfGlue(glued);
  return claudeSessionFleetReadoutContract.assert(Object.freeze({
    kind: "metroplat.claude-session.fleet-settlement" as const,
    operation: "read-claude-session-fleet-settlement" as const,
    root: path.resolve(binding.dataRoot),
    sessions: orderedFleetSessions(sessions, binding, date),
    glued,
    calm,
    evidence: Object.freeze([
      `source:statement-log`,
      `read:${bundles.length}`,
      `glued-claims:${glued.claims}`,
      `conflicts:${glued.conflicts.length}`,
      `regime:${glued.regime}`,
      `calm:${calm.coordination}`,
    ]),
  }), "Claude session fleet settlement") as ClaudeSessionFleetReadout;
}

function cellChargeDeltas(cell: string, sessions: readonly JsonValue[], binding: ClaudeAgentFleetBinding, date: string): ChargeValueName[] {
  const deltas: ChargeValueName[] = [];
  for (const session of sessions) {
    if (session === null || typeof session !== "object" || Array.isArray(session)) continue;
    const sessionId = (session as Readonly<Record<string, JsonValue>>)["sessionId"];
    if (typeof sessionId !== "string") continue;
    deltas.push(...claudeSessionClaimCellChargeDeltas(binding, date, sessionId, cell));
  }
  return deltas;
}

/** Read every discovered Claude Code session under a root as one fleet: per-session
 *  claim digests plus the carried glueClaimSessions settlement, whose text-keyed
 *  shared cells let claims from different sessions actually collide — a stable cell
 *  in the glued judgement is a real standing contradiction between sessions. */
export async function readClaudeSessionFleetReadout(
  root: string,
  options: ClaudeSessionFleetReadOptions = {},
): Promise<ClaudeSessionFleetReadout> {
  const rootAbs = path.resolve(root);
  const discovery = await discoverClaudeSessionTranscripts(rootAbs, {
    ...(options.sessionIds === undefined ? {} : { sessionIds: options.sessionIds }),
    ...(options.maxDepth === undefined ? {} : { maxDepth: options.maxDepth }),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
    ...(options.caller === undefined ? {} : { caller: options.caller }),
  });
  const bundles: ClaimSessionObservationBundle[] = [];
  const sessions: Record<string, JsonValue>[] = [];
  for (const match of discovery.matches) {
    let bundle: ClaimSessionObservationBundle;
    try {
      bundle = await readClaudeSessionWorkClaims(rootAbs, match.relative, {
        ...(options.caller === undefined ? {} : { caller: options.caller }),
      });
    } catch {
      continue;
    }
    bundles.push(bundle);
    const continuation = claimSessionContinuation(bundle);
    const goals = continuation.items.filter((item) => item.role === "goal");
    const latestGoal = goals.length === 0 ? undefined : goals[goals.length - 1]!.text.slice(0, 200).trim();
    sessions.push(Object.freeze({
      sessionId: match.sessionId,
      relative: match.relative,
      bytes: match.bytes,
      events: match.events,
      statusline: `session:${match.sessionId} regime:${continuation.regime} goals:${continuation.goals} obligations:${continuation.obligations} claims:${continuation.claims} conflicts:${continuation.conflicts.length}`,
      goals: continuation.goals,
      obligations: continuation.obligations,
      claims: continuation.claims,
      regime: continuation.regime,
      ...(latestGoal === undefined || latestGoal.length === 0 ? {} : { latestGoal }),
    }) as unknown as Record<string, JsonValue>);
  }
  // Glue DISCOURSE only. Act cells are session-local by construction (their
  // texts carry host-unique act ids, so cross-session gluing of acts is
  // vacuous), and an errored act's potential+active pair would re-surface as a
  // glued conflict — a per-session fact, not a cross-session contradiction.
  // Per-session act conflicts stay visible in each session's own digest.
  const discourseBundles = bundles.map((bundle) => Object.freeze({
    ...bundle,
    observations: Object.freeze(bundle.observations.filter((observation) => {
      const boundary = observation.boundary;
      if (boundary === null || boundary === undefined || typeof boundary !== "object" || Array.isArray(boundary)) return true;
      return (boundary as Readonly<Record<string, JsonValue>>)["role"] !== "act";
    })),
  }));
  const glued = glueClaimSessions(discourseBundles);
  const calm = classifyCalmOfGlue(glued);
  return claudeSessionFleetReadoutContract.assert(Object.freeze({
    kind: "metroplat.claude-session.fleet-settlement" as const,
    operation: "read-claude-session-fleet-settlement" as const,
    root: rootAbs,
    sessions: Object.freeze(sessions),
    glued,
    calm,
    evidence: Object.freeze([
      `discovered:${discovery.matches.length}`,
      `read:${bundles.length}`,
      `glued-claims:${glued.claims}`,
      `conflicts:${glued.conflicts.length}`,
      `regime:${glued.regime}`,
      `calm:${calm.coordination}`,
    ]),
  }), "Claude session fleet settlement") as ClaudeSessionFleetReadout;
}

export async function readClaudeAgentFleetReadout(
  binding: ClaudeAgentFleetBinding,
  date: string,
): Promise<JsonValue | undefined> {
  const recorded = fleetReadoutFromStatementLogs(binding, date);
  if (recorded !== undefined) return recorded as unknown as JsonValue;
  if (binding.claudeSessionRoot === undefined) return undefined;
  const sessionIds = claudeSessionIdsOfHookState(binding, date);
  const discovered = await readClaudeSessionFleetReadout(binding.claudeSessionRoot, {
    ...(sessionIds.length === 0 ? {} : { sessionIds }),
  });
  const fleet = Object.freeze({
    ...discovered,
    sessions: orderedFleetSessions(discovered.sessions, binding, date),
  });
  const fleetRecord = fleet as unknown as Record<string, JsonValue>;
  const glued = fleetRecord["glued"];
  const conflicts = glued !== null && typeof glued === "object" && !Array.isArray(glued) && Array.isArray((glued as Record<string, JsonValue>)["conflicts"])
    ? (glued as Record<string, JsonValue>)["conflicts"] as readonly JsonValue[]
    : Object.freeze([]);
  if (conflicts.length === 0) return fleet as unknown as JsonValue;

  const conflictMerges: Record<string, JsonValue> = {};
  for (const conflict of conflicts) {
    if (typeof conflict !== "string") continue;
    const deltas = cellChargeDeltas(conflict, fleet.sessions as unknown as readonly JsonValue[], binding, date);
    if (deltas.length === 0) continue;
    try {
      const receipt = mergeOrderIndependentReceipt(deltas, Object.freeze([...deltas].reverse()));
      conflictMerges[conflict] = receipt as unknown as JsonValue;
    } catch (error) {
      conflictMerges[conflict] = Object.freeze({
        deltas,
        obstruction: error instanceof Error ? error.message : String(error),
      }) as unknown as JsonValue;
    }
  }
  return Object.freeze({
    ...fleetRecord,
    conflictMerges: Object.freeze(conflictMerges),
  }) as unknown as JsonValue;
}

export async function admitClaudeFleetObstructions(
  binding: ClaudeAgentFleetBinding,
  date: string,
): Promise<JsonValue | undefined> {
  if (binding.claudeSessionRoot === undefined) return undefined;
  const sessionIds = claudeSessionIdsOfHookState(binding, date);
  const discovered = await readClaudeSessionFleetReadout(binding.claudeSessionRoot, {
    ...(sessionIds.length === 0 ? {} : { sessionIds }),
  });
  const observations = obsticulationObservationsOfGlue(discovered.glued as unknown as GluedClaimSessions, {
    source: `${date}-settle-claude-fleet.json`,
    settlementToken: "claude-fleet",
  });
  if (observations.length === 0) return Object.freeze({ kind: "metroplat.holography.fleet-admit", appended: 0 }) as unknown as JsonValue;
  const rows = observations.flatMap((observation) => claimSessionStatementRows(observation));
  const admission = openJournal(binding.dataRoot).appendRows(claimSessionFeed.name, rows, {
    at: date,
    ...(binding.rootName === undefined ? {} : { rootName: binding.rootName }),
    subject: "work-ledger",
    caller: Object.freeze({ transport: "claude-fleet-obsticulation", action: "fleet-admit" }),
  });
  return Object.freeze({ kind: "metroplat.holography.fleet-admit", appended: admission.appended }) as unknown as JsonValue;
}

export function claudeFleetOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    operation({
      verb: "claude-fleet",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read the Claude Code fleet settlement.",
      description: "Domain: { date? }. Reads recorded Claude session statements first and falls back to bounded transcript discovery when needed.",
      run: async (input: unknown): Promise<unknown> => {
        return await readClaudeAgentFleetReadout(binding, operationDate(binding, input)) ?? null;
      },
    }),
    operation({
      verb: "fleet-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit Claude fleet obstructions as work-ledger statements.",
      description: "Domain: { date? }. Reads the Claude fleet glue settlement and source-admits its obstruction observations.",
      run: async (input: unknown): Promise<unknown> => {
        return await admitClaudeFleetObstructions(binding, operationDate(binding, input)) ?? null;
      },
    }),
  ]);
}

/** One live `glueClaimSessions` result as a schema-conformance sample of the
 *  glued-claim-sessions schema — the regression case for the 2026-07-04
 *  `growth` incident (`src/monitoring/schema-conformance`). Rethrows on
 *  failure rather than swallowing it: the caller decides whether "unchecked"
 *  and "broken" need to be told apart in its own evidence trail — the exact
 *  distinction a bare `catch {}` here erased during that incident. */
export async function sampleClaudeGluedClaimSessions(
  root: string,
  options: ClaudeSessionFleetReadOptions = {},
): Promise<SchemaConformanceSample> {
  const fleetReadout = await readClaudeSessionFleetReadout(root, options);
  return Object.freeze({ value: fleetReadout.glued, provenance: "live:glueClaimSessions" });
}
