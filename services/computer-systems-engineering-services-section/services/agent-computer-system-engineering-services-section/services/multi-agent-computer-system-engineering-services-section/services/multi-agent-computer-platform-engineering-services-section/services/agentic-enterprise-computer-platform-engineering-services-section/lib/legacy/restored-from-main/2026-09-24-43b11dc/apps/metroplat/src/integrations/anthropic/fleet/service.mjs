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

import { mergeOrderIndependentReceipt } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/crdt-cohomological-calm";
import { presenceLabel } from "@lenticule-science/metrologic/models/physics/session-presence";

import { chargeValueNameOfNotationName } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import {
  claudeSessionFleetReadoutContract,

} from "./schema.mjs";
import {
  discoverClaudeSessionTranscripts,
  readClaudeSessionWorkClaims,
} from "../service.mjs";

import { claimSessionFeed, claimSessionContinuation, claimSessionObservationOfRow, claimSessionStatementRows, glueClaimSessions } from "@red-cup-engineering/relating/running/session";
import { obsticulationObservationsOfGlue } from "@red-cup-engineering/organizing/work/obligations";
import { classifyCalmOfGlue } from "../../../claims/calm.mjs";
import { operation } from "../../../rpc/operation.mjs";

import { parse } from "@red-cup-engineering/json-services-section";

import { readSessionPresence } from "../../filesystem/services/session-presence.mjs";
import { openJournal, journal } from "@red-cup-engineering/computer-system-engine/journal/journal";

/** Claim-session rows carry the relation model notation's own charge vocabulary
 *  (`held`/`denied`/`contested`/`unknown` — see `claims/session.mjs`). */
function isNotationChargeName(value) {
  try {
    chargeValueNameOfNotationName(value);
    return true;
  } catch {
    return false;
  }
}

function operationDate(binding, input) {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const date = (input)["date"];
    if (typeof date === "string" && date.length > 0) return date;
  }
  return binding.now().slice(0, 10);
}

export function claudeSessionIdsOfHookState(binding, date) {
  const logPath = journal.feed(binding.dataRoot, "hook-event", date, { subject: "hook-event" });
  if (!journal.sourceStatus(logPath).exists) return Object.freeze([]);
  const projection = journal.projectState(logPath.artifact);
  const view = parse(binding.readFileUtf8(projection.artifact.path));
  if (view === null || typeof view !== "object" || Array.isArray(view)) return Object.freeze([]);
  const ids = new Set();
  for (const key of Object.keys(view)) {
    try {
      const entity = JSON.parse(key);
      if (entity?.protocol === "agent-hook" && entity.harness === "claude-code" && typeof entity.session === "string") {
        ids.add(entity.session);
      }
    } catch {
      continue;
    }
  }
  return Object.freeze([...ids]);
}

export function orderedFleetSessions(
  sessions,
  binding,
  date,
) {
  try {
    const asOf = binding.now();
    const presence = readSessionPresence(binding.dataRoot, date, asOf, binding);
    if (presence.measurements.length === 0) return sessions;
    const labelBySession = new Map(presence.measurements.map((reading) => [reading.session, presenceLabel(reading, presence.staleAfterSeconds)]));
    const rank = Object.freeze({ "deshrouded-recent": 0, "deshrouded-stale": 1, settled: 2 });
    const rankOf = (label) => (label === undefined ? rank["deshrouded-stale"] : rank[label]) ?? 1;
    return Object.freeze([...sessions].sort((left, right) =>
      rankOf(labelBySession.get(left.sessionId)) - rankOf(labelBySession.get(right.sessionId))));
  } catch {
    return sessions;
  }
}

export function claudeSessionClaimCellChargeDeltas(
  binding,
  date,
  sessionId,
  cell,
) {
  const logPath = claudeSessionLogPath(binding, date, sessionId);
  if (!journal.sourceStatus(logPath).exists) return Object.freeze([]);
  const folded = journal.scan(logPath, [], (deltas, row) => {
    const [, attribute] = row;
    if (attribute === null || typeof attribute !== "object" || Array.isArray(attribute)) return deltas;
    const record = attribute;
    if (record["cell"] !== cell) return deltas;
    const charge = record["charge"];
    if (typeof charge === "string" && isNotationChargeName(charge)) deltas.push(charge);
    return deltas;
  });
  return Object.freeze([...folded.result]);
}

function claudeSessionLogPath(binding, date, sessionId) {
  return journal.feed(binding.dataRoot, "claim-session", date, { subject: `claude-session-${sessionId}` });
}

function claudeSessionIdsOfStatementLogs(binding, date) {
  const ids = new Set();
  const pattern = new RegExp(`^${date.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}-admit-claude-session-(.+)\\.jsonl$`, "u");
  for (const log of journal.listFeeds(binding.dataRoot, date)) {
    const match = pattern.exec(log.name);
    if (match?.[1] !== undefined && match[1].length > 0) ids.add(match[1]);
  }
  return Object.freeze([...ids].sort((left, right) => left.localeCompare(right)));
}

function replayClaimObservations(observations) {
  const claims = [];
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
  binding,
  date,
  sessionId,
) {
  const logPath = claudeSessionLogPath(binding, date, sessionId);
  if (!journal.sourceStatus(logPath).exists) return undefined;
  const observations = [];
  const folded = journal.scan(logPath, observations, (accumulator, row) => {
    const observation = claimSessionObservationOfRow(row, sessionId);
    if (observation !== null) accumulator.push(observation);
    return accumulator;
  });
  if (observations.length === 0) return undefined;
  const source = logPath.name;
  return Object.freeze({
    kind: "metroplat.claim-session.observation-bundle",
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

function discourseBundle(bundle) {
  return Object.freeze({
    ...bundle,
    observations: Object.freeze(bundle.observations.filter((observation) => {
      const boundary = observation.boundary;
      if (boundary === null || boundary === undefined || typeof boundary !== "object" || Array.isArray(boundary)) return true;
      return (boundary)["role"] !== "act";
    })),
  });
}

function fleetReadoutFromStatementLogs(binding, date) {
  const sessionIds = Object.freeze([
    ...new Set([...claudeSessionIdsOfHookState(binding, date), ...claudeSessionIdsOfStatementLogs(binding, date)]),
  ]);
  const bundles = Object.freeze(sessionIds.flatMap((sessionId) => {
    const bundle = recordedClaudeSessionBundle(binding, date, sessionId);
    return bundle === undefined ? [] : [bundle];
  }));
  if (bundles.length === 0) return undefined;

  const sessions = bundles.map((bundle) => {
    const continuation = claimSessionContinuation(bundle);
    const goals = continuation.items.filter((item) => item.role === "goal");
    const latestGoal = goals.length === 0 ? undefined : goals[goals.length - 1].text.slice(0, 200).trim();
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
    });
  });
  const glued = glueClaimSessions(bundles.map(discourseBundle));
  const calm = classifyCalmOfGlue(glued);
  return claudeSessionFleetReadoutContract.assert(Object.freeze({
    kind: "metroplat.claude-session.fleet-settlement",
    operation: "read-claude-session-fleet-settlement",
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
  }), "Claude session fleet settlement");
}

function cellChargeDeltas(cell, sessions, binding, date) {
  const deltas = [];
  for (const session of sessions) {
    if (session === null || typeof session !== "object" || Array.isArray(session)) continue;
    const sessionId = (session)["sessionId"];
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
  root,
  options = {},
) {
  const rootAbs = path.resolve(root);
  const discovery = await discoverClaudeSessionTranscripts(rootAbs, {
    ...(options.sessionIds === undefined ? {} : { sessionIds: options.sessionIds }),
    ...(options.maxDepth === undefined ? {} : { maxDepth: options.maxDepth }),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
    ...(options.caller === undefined ? {} : { caller: options.caller }),
  });
  const bundles = [];
  const sessions = [];
  for (const match of discovery.matches) {
    let bundle;
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
    const latestGoal = goals.length === 0 ? undefined : goals[goals.length - 1].text.slice(0, 200).trim();
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
    }));
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
      return (boundary)["role"] !== "act";
    })),
  }));
  const glued = glueClaimSessions(discourseBundles);
  const calm = classifyCalmOfGlue(glued);
  return claudeSessionFleetReadoutContract.assert(Object.freeze({
    kind: "metroplat.claude-session.fleet-settlement",
    operation: "read-claude-session-fleet-settlement",
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
  }), "Claude session fleet settlement");
}

export async function readClaudeAgentFleetReadout(
  binding,
  date,
) {
  const recorded = fleetReadoutFromStatementLogs(binding, date);
  if (recorded !== undefined) return recorded;
  if (binding.claudeSessionRoot === undefined) return undefined;
  const sessionIds = claudeSessionIdsOfHookState(binding, date);
  const discovered = await readClaudeSessionFleetReadout(binding.claudeSessionRoot, {
    ...(sessionIds.length === 0 ? {} : { sessionIds }),
  });
  const fleet = Object.freeze({
    ...discovered,
    sessions: orderedFleetSessions(discovered.sessions, binding, date),
  });
  const fleetRecord = fleet;
  const glued = fleetRecord["glued"];
  const conflicts = glued !== null && typeof glued === "object" && !Array.isArray(glued) && Array.isArray((glued)["conflicts"])
    ? (glued)["conflicts"]
    : Object.freeze([]);
  if (conflicts.length === 0) return fleet;

  const conflictMerges = {};
  for (const conflict of conflicts) {
    if (typeof conflict !== "string") continue;
    const deltas = cellChargeDeltas(conflict, fleet.sessions, binding, date);
    if (deltas.length === 0) continue;
    try {
      const receipt = mergeOrderIndependentReceipt(deltas, Object.freeze([...deltas].reverse()));
      conflictMerges[conflict] = receipt;
    } catch (error) {
      conflictMerges[conflict] = Object.freeze({
        deltas,
        obstruction: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return Object.freeze({
    ...fleetRecord,
    conflictMerges: Object.freeze(conflictMerges),
  });
}

export async function admitClaudeFleetObstructions(
  binding,
  date,
) {
  if (binding.claudeSessionRoot === undefined) return undefined;
  const sessionIds = claudeSessionIdsOfHookState(binding, date);
  const discovered = await readClaudeSessionFleetReadout(binding.claudeSessionRoot, {
    ...(sessionIds.length === 0 ? {} : { sessionIds }),
  });
  const observations = obsticulationObservationsOfGlue(discovered.glued, {
    source: `${date}-settle-claude-fleet.json`,
    settlementToken: "claude-fleet",
  });
  if (observations.length === 0) return Object.freeze({ kind: "metroplat.holography.fleet-admit", appended: 0 });
  const rows = observations.flatMap((observation) => claimSessionStatementRows(observation));
  const admission = openJournal(binding.dataRoot).appendRows(claimSessionFeed.name, rows, {
    at: date,
    ...(binding.rootName === undefined ? {} : { rootName: binding.rootName }),
    subject: "work-ledger",
    caller: Object.freeze({ transport: "claude-fleet-obsticulation", action: "fleet-admit" }),
  });
  return Object.freeze({ kind: "metroplat.holography.fleet-admit", appended: admission.appended });
}

export function claudeFleetOperations(binding) {
  return Object.freeze([
    operation({
      verb: "claude-fleet",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read the Claude Code fleet settlement.",
      description: "Domain: { date? }. Reads recorded Claude session statements first and falls back to bounded transcript discovery when needed.",
      run: async (input) => {
        return await readClaudeAgentFleetReadout(binding, operationDate(binding, input)) ?? null;
      },
    }),
    operation({
      verb: "fleet-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit Claude fleet obstructions as work-ledger statements.",
      description: "Domain: { date? }. Reads the Claude fleet glue settlement and source-admits its obstruction observations.",
      run: async (input) => {
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
  root,
  options = {},
) {
  const fleetReadout = await readClaudeSessionFleetReadout(root, options);
  return Object.freeze({ value: fleetReadout.glued, provenance: "live:glueClaimSessions" });
}
