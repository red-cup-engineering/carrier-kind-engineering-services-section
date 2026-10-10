// running/session — a claim session: a bounded interactive exchange of claims.
//
// A session does NOT overwrite: nothing is ever retracted. Each message is a
// CLAIM — a read predication about a cell — and the claims accumulate in a
// monotone log exactly like the Scott ledger. What moves is the JUDGEMENT: the
// ∨ₖ knowledge-join of all claims about a cell. Knowledge only grows, but the
// truth verdict can flip — a cell told true becomes told both (⊤ₖ) when a
// told-false claim arrives, with the earlier claim still in the log.
//
// A session names its readings in one SignChain reading family: `knowledge`
// (absurd/potential/active/stable) by default, or
// `extremal` (unknown/held/denied/contested), the notation's names, which agent
// claim sessions, their observations and their feed rows use.
//
// The session's regime is read off its closure ordinal: the ∨ₖ fold is a monotone
// closure on FOUR, Scott-continuous, so a closed log settles strict and an open
// one scott. A contested cell is ⊤ₖ, the top of the knowledge order, not a
// non-Scott firing at a limit; the house is paraconsistent, so conflicts are
// their own coordinate and never move the regime.

import { classifyRegime, closureRegimeData, cohomologyVanishesInRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/value-category";
import { pricedNerve } from "@red-cup-engineering/signgraph/cohomology";
import { assignments, empiricalModel, hasGlobalSection, measurementScenario } from "@red-cup-engineering/metrologic/models/physics/models/quantum-contextuality/measurement-scenario";
import { logicallyContextual } from "@red-cup-engineering/metrologic/models/physics/models/quantum-contextuality/contextual-obstruction";
import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";
import { statementCell } from "@red-cup-engineering/eavt-services-section/statement";
import { address, utteranceCell } from "@red-cup-engineering/signcell/cell";
import { claimSessionObservationContract, claimSessionRegimeAt } from "./session-schema.mjs";
import { omegaOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { ofNat } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/ordinal-closure";
import { isJsonRecord } from "@red-cup-engineering/json-services-section";
import { knowledgeJoinReading, isReading, readingAs, readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** An uttered claim's reflexive SignCell and its address. */
const utteredCell = (token, claim) => { const told = utteranceCell(token, claim); return Object.freeze({ cell: told, address: address(told) }); };


/** The reading family agent claim sessions name their readings in. */
export const CLAIM_SESSION_FAMILY = "extremal";

/** Two readings named in one family, joined in the knowledge order, named in that family. */
export const joinClaimReadings = (left, right, family) => readingAs(family, knowledgeJoinReading(readingAs(family, left), readingAs(family, right)));

/** The name of ⊤ₖ (told both) in one family. */
const topName = (family) => readingOfSides(family, true, true);

/** Whether a string names a reading in the claim-session (extremal) family. */
export const isSessionReading = (value) => isReading(value, CLAIM_SESSION_FAMILY);

/** Open an empty session whose readings are named in `family` (a SignChain reading family). */
export function openSession(family = "knowledge") {
  return { claims: [], closed: false, family };
}

const familyOfSession = (session) => session.family ?? "knowledge";

/** Append one claim — never overwriting an earlier one. A closed session is inert. */
export function claim(session, cell, reading) {
  if (session.closed) return session;
  return { ...session, claims: [...session.claims, { cell, reading }] };
}

/** Utter a claim as the caller's own identity (the token) asserting some content
 *  (the claim-mark): the cell is the derived predication cell's canonical statement
 *  address, so every string-keyed reader is unchanged. */
export function claimUttered(session, token, claimMark, reading) {
  return claim(session, utteredCell(token, claimMark).address, reading);
}

/** The judgement: for each cell, the ∨ₖ knowledge-join of every claim about it — the
 *  collective standing, named in the session's reading. Told-true and told-false on
 *  one cell settle to told-both (⊤ₖ); knowledge only grows, but the verdict can flip
 *  with no claim removed. */
export function judge(session) {
  const family = familyOfSession(session);
  const byCell = new Map();
  for (const { cell, reading } of session.claims) {
    const prior = byCell.get(cell);
    byCell.set(cell, prior === undefined ? reading : joinClaimReadings(prior, reading, family));
  }
  return byCell;
}

/** The cells whose judgement is in conflict (⊤ₖ, told both): held contradictions,
 *  which a paraconsistent judgement keeps rather than settles away. */
export function conflicts(session) {
  const top = topName(familyOfSession(session));
  return [...judge(session)].filter(([, verdict]) => verdict === top).map(([cell]) => cell);
}

/** The session's settling regime, read off its closure ordinal: a closed session's log is
 *  finite and its fold settles at that finite stage (strict); an open one admits countably
 *  many more claims, so its judgement settles only as their directed join (scott). */
export function sessionRegime(session) {
  return claimSessionRegimeAt(session.closed ? ofNat(session.claims.length) : omegaOrdinal());
}

/** The close handshake: settle the session so no further claim is accepted. The
 *  accumulated log and its judgement are preserved. */
export function settle(session) {
  return { ...session, closed: true };
}

/** The FLEET's own growth-PROCESS classification — distinct from `sessionRegime` (which
 *  reads one bounded claim log's conflict state, not the process admitting sessions to
 *  it). A fleet of Claude Code sessions is never closed at read time: nothing bounds how
 *  many more sessions will be admitted, so its `finiteBase` is always false — the
 *  four-regime classifier (`classifyRegime`/`closureRegimeData`,
 *  `core/closure/value-category.mts`) can therefore never land the fleet on `finite`
 *  (strict). Which of the remaining three regimes it reaches is a real, decidable
 *  question, not an open one:
 *
 *  - `scottContinuous` is true: the fleet glue rule folds every session's claims through
 *    the SAME `knowledgeJoinReading` a single session's `judge` uses, and
 *    `scott-coalgebra.mts`'s `scottContinuityReceipt` already proves that fold commutes
 *    with directed joins over the FOUR value set — Scott-continuous by construction.
 *  - `countableCofinality` is true: sessions are admitted one discrete transcript at a
 *    time, a countable sequence by construction — no continuum of arrivals.
 *
 *  So the fleet's growth process classifies as `scott` (κ=ω), never `aperiodic`,
 *  regardless of how long it runs or how many sessions it eventually admits —
 *  `cohomologyVanishesInRegime` holds, and no coordinator is structurally required.
 *  This is the decided answer to `2026-07-01-kinematic-space-of-runs.md`'s "genuinely
 *  open" run-space closure-regime question, for the claim-session fleet specifically,
 *  read off the classifier metroplat already carries — not a new claim, and not left
 *  open pending some future ruling. */
export function fleetGrowthRegime() {
  const judgment = closureRegimeData(true, false, true);
  if (judgment.kind !== "settling.closureRegimeData:witness") {
    throw new TypeError(`fleetGrowthRegime: unreachable regime-data obstruction ${judgment.constraint}`);
  }
  const regime = classifyRegime(judgment.data);
  return Object.freeze({ regime, coordinationFree: cohomologyVanishesInRegime(regime) });
}

/** The settled judgement face of a claim session. */
export function sessionJudgement(session) {
  return Object.freeze({
    judgement: Object.freeze(Object.fromEntries(judge(session))),
    conflicts: Object.freeze([...conflicts(session)]),
    regime: sessionRegime(session),
  });
}

function normalizedClaimCell(text) {
  return text.trim().toLowerCase().replace(/\s+/gu, " ");
}

/** Glued cross-session settlement: every bundle's discourse claims folded through the
 *  SAME `claim`/`judge` primitives a single session already uses — not a parallel
 *  relation detour. The cell key is `role:normalizedText`, so a goal-utterance and an
 *  obligation-utterance drawn from the same message (different predicates ABOUT it,
 *  never opposing evidence about one subject) never collide as one cell; two sessions
 *  asserting the same role about the same text DO share a cell, and a genuinely
 *  opposing reading there settles to `contested` — a real standing contradiction, not a
 *  classifier artifact.
 *
 *  The fold alone is not the gluing question. `coordination` is: the sessions form a
 *  federated cover (source = session, cell = claim cell, stance = contributed reading),
 *  and the cover-nerve first cohomology — computed by the carried predication
 *  cohomology reader, not by string comparison — marks exactly the cells whose
 *  source-stance nerve has a cycle. A nonzero class is a genuine cross-session
 *  coordination obstruction: the adjudication queue, mathematically read. */

/** The adjudication of the conflict cells, read through possibilistic
 *  contextuality (`core/relational`): the conflicted cells are the measurements,
 *  each source's slice of them is a context, and an assignment is supported on
 *  a context only when EVERY source holding that slice uttered each of its
 *  readings (a global section must satisfy every source, so shared contexts
 *  intersect). `noncontextual` — a global section exists: one reading per cell
 *  every conflicting source has itself uttered (`resolution` carries it; the
 *  conflict dissolves by choosing it). `logically-contextual` — some supported
 *  local stance extends to no global section (`obstruction` pinpoints it).
 *  `strongly-contextual` — some context admits no reading at all: its sources
 *  deadlock outright (`obstruction` names them, with no `localSection`).
 *  `flat` — nothing to adjudicate. */

  

function gluedClaimCell(role, text) {
  return `${role}:${normalizedClaimCell(text)}`;
}

/** The witness search enumerates readings^cells assignments, so the adjudicated
 *  region is bounded; cells beyond the bound are reported in `omitted`, never
 *  silently dropped. */
const ADJUDICATION_CELL_BOUND = 8;

/** Adjudicate the conflicted cells by presenting the glued statements as a
 *  support-level empirical model over a measurement scenario: measurements are
 *  the conflicted cells, one context per distinct source cell-slice, and an
 *  assignment is supported on a context when some source holding that slice
 *  uttered every one of its readings. The classification then falls out of the
 *  carried contextuality readers, not string comparison. */
function adjudicateConflictCells(
  statements,
  conflictCells,
) {
  const cells = conflictCells.slice(0, ADJUDICATION_CELL_BOUND);
  const omitted = Object.freeze(conflictCells.slice(ADJUDICATION_CELL_BOUND));
  const flat = Object.freeze({
    kind: "relational.contextuality.adjudicationReadout",
    cells: Object.freeze([...cells]),
    omitted,
    classification: "flat",
  });
  if (cells.length === 0) return flat;

  const cellSet = new Set(cells);
  const stancesBySource = new Map();
  for (const statement of statements) {
    if (!cellSet.has(statement.cell)) continue;
    const table = stancesBySource.get(statement.source) ?? new Map();
    const readings = table.get(statement.cell) ?? new Set();
    readings.add(statement.stance);
    table.set(statement.cell, readings);
    stancesBySource.set(statement.source, table);
  }
  if (stancesBySource.size === 0) return flat;

  const contextKey = (context) => [...context].sort().join("\0");
  const contextsByKey = new Map();
  for (const [source, table] of stancesBySource) {
    const context = Object.freeze([...table.keys()].sort());
    const key = contextKey(context);
    const entry = contextsByKey.get(key);
    if (entry === undefined) contextsByKey.set(key, { context, sources: [source] });
    else entry.sources.push(source);
  }
  const contextEntries = [...contextsByKey.values()];
  const outcomes = [...new Set(statements.filter((s) => cellSet.has(s.cell)).map((s) => s.stance))].sort();

  // A global section must satisfy every source, so sources sharing one cell
  // slice intersect: the assignment is supported only when each of them
  // uttered every reading it assigns.
  const admittedByAll = (
    entry,
    assignment,
  ) => entry.sources.every((source) => {
    const table = stancesBySource.get(source);
    return entry.context.every((cell) => table?.get(cell)?.has(String(assignment[cell])) === true);
  });

  const scenario = measurementScenario(cells, contextEntries.map((entry) => entry.context));
  const model = empiricalModel(scenario, outcomes, (context, assignment) => {
    const entry = contextsByKey.get(contextKey(context));
    return entry !== undefined && admittedByAll(entry, assignment);
  });

  const restrict = (assignment, context) =>
    Object.freeze(Object.fromEntries(context.map((cell) => [cell, assignment[cell]])));

  const global = hasGlobalSection(model);
  if (global !== undefined) {
    return Object.freeze({
      ...flat,
      classification: "noncontextual",
      resolution: restrict(global.assignment, cells),
    });
  }
  // A context no assignment inhabits is an outright deadlock among its
  // sources — the strongest obstruction, reported before the classical
  // logical-contextuality pinpoint.
  const deadlocked = contextEntries.find((entry) =>
    !assignments(entry.context, outcomes).some((assignment) => admittedByAll(entry, assignment)));
  if (deadlocked !== undefined) {
    return Object.freeze({
      ...flat,
      classification: "strongly-contextual",
      obstruction: Object.freeze({
        sources: Object.freeze([...deadlocked.sources]),
        context: deadlocked.context,
      }),
    });
  }
  const logical = logicallyContextual(model);
  return Object.freeze({
    ...flat,
    classification: "logically-contextual",
    ...(logical === undefined ? {} : {
      obstruction: Object.freeze({
        sources: Object.freeze([...(contextsByKey.get(contextKey(logical.context))?.sources ?? [])]),
        context: logical.context,
        localSection: restrict(logical.localSection, logical.context),
      }),
    }),
  });
}

/** Glue two or more claim-session observation bundles into one shared settlement. */
export function glueClaimSessions(bundles) {
  let glued = openSession(CLAIM_SESSION_FAMILY);
  let claims = 0;
  const statements = [];
  for (const bundle of bundles) {
    for (const observation of bundle.observations) {
      const boundary = observation.boundary;
      const record = boundary !== null && typeof boundary === "object" && !Array.isArray(boundary)
        ? boundary
        : undefined;
      const text = record?.["text"];
      if (typeof text !== "string" || text.length === 0) continue;
      const role = record?.["role"];
      const cell = typeof role === "string" ? gluedClaimCell(role, text) : normalizedClaimCell(text);
      glued = claim(glued, cell, observation.claim.reading);
      statements.push({ source: bundle.source, cell, stance: observation.claim.reading });
      claims += 1;
    }
  }
  const priced = pricedNerve(statements, { readings: true });
  const conflictCells = Object.freeze([...conflicts(glued)]);
  return Object.freeze({
    kind: "metroplat.running.glued-claim-sessions",
    sources: Object.freeze(bundles.map((bundle) => bundle.source)),
    claims,
    judgement: Object.freeze(Object.fromEntries(judge(glued))),
    conflicts: conflictCells,
    regime: sessionRegime(glued),
    growth: fleetGrowthRegime(),
    adjudication: adjudicateConflictCells(statements, conflictCells),
    coordination: Object.freeze({
      kind: "predication.cohomology.coordinationReadout",
      top: priced.top,
      mass: priced.mass,
      rank: priced.rank,
      vanishing: priced.top === 0 ? "witness" : "obstruction",
      obstructions: Object.freeze(priced.obstructions.map((entry) => Object.freeze({
        cell: entry.cell,
        top: entry.top,
        mass: entry.mass,
      }))),
    }),
  });
}

/** Construct and assert one claim-session boundary event before it is cellized. */
export function claimSessionObservation(input) {
  return claimSessionObservationContract.assert(Object.freeze({
    sessionId: input.sessionId,
    transport: input.transport,
    claim: Object.freeze({ cell: input.claim.cell, reading: input.claim.reading }),
    session: input.session,
    judgement: input.judgement,
    at: input.at,
    ...(input.boundary === undefined ? {} : { boundary: input.boundary }),
    ...(input.caller === undefined ? {} : { caller: input.caller }),
  }), "claim-session observation");
}

function recordValue(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : undefined;
}

function stringArray(value) {
  return Array.isArray(value) ? Object.freeze(value.filter((entry) => typeof entry === "string")) : Object.freeze([]);
}

function continuationRole(observation) {
  const boundary = recordValue(observation.boundary);
  return boundary?.["role"] === "goal" ? "goal"
    : boundary?.["role"] === "obligation" ? "obligation"
      : "claim";
}

function continuationText(observation) {
  const boundary = recordValue(observation.boundary);
  return typeof boundary?.["text"] === "string" ? boundary["text"] : observation.claim.cell;
}

function continuationSource(observation) {
  const boundary = recordValue(observation.boundary);
  return typeof boundary?.["source"] === "string" ? boundary["source"] : undefined;
}

function continuationEvidence(observation) {
  const boundary = recordValue(observation.boundary);
  return Object.freeze([
    ...stringArray(boundary?.["evidence"]),
    `cell:${observation.claim.cell}`,
    `reading:${observation.claim.reading}`,
  ]);
}

function latestSession(bundle) {
  const last = bundle.observations[bundle.observations.length - 1];
  return last?.session ?? openSession(CLAIM_SESSION_FAMILY);
}

function continuationTextBody(input

) {
  const goals = input.items.filter((item) => item.role === "goal");
  const obligations = input.items.filter((item) => item.role === "obligation");
  const claimItems = input.items.filter((item) => item.role === "claim");
  const lines = [
    "MetroPlat claim-session continuation",
    `Session: ${input.sessionId ?? "(unnamed)"}`,
    `Source: ${input.source}`,
    `Observations: ${input.observations}`,
    `Regime: ${input.regime}`,
    `Conflicts: ${input.conflicts.length === 0 ? "none" : input.conflicts.join(", ")}`,
    `Goals: ${goals.length}`,
    ...goals.map((item, index) => `${index + 1}. ${item.text}`),
    `Obligations: ${obligations.length}`,
    ...obligations.map((item, index) => `${index + 1}. ${item.text}`),
    ...(claimItems.length === 0 ? [] : [
      `Other claims: ${claimItems.length}`,
      ...claimItems.map((item, index) => `${index + 1}. [${item.reading}] ${item.text}`),
    ]),
    "Evidence:",
    ...input.evidence.map((entry) => `- ${entry}`),
  ];
  return `${lines.join("\n")}\n`;
}

/** Project a finite claim-session observation bundle into continuation material. */
export function claimSessionContinuation(bundle) {
  const session = latestSession(bundle);
  const items = Object.freeze(bundle.observations.map((observation) => {
    const source = continuationSource(observation);
    return Object.freeze({
      cell: observation.claim.cell,
      reading: observation.claim.reading,
      role: continuationRole(observation),
      text: continuationText(observation),
      ...(source === undefined ? {} : { source }),
      evidence: continuationEvidence(observation),
    });
  }));
  const goals = items.filter((item) => item.role === "goal").length;
  const obligations = items.filter((item) => item.role === "obligation").length;
  const regime = sessionRegime(session);
  const conflictCells = Object.freeze([...conflicts(session)]);
  const evidence = Object.freeze([
    ...bundle.evidence,
    `observations:${bundle.observations.length}`,
    `claims:${session.claims.length}`,
    `regime:${regime}`,
  ]);
  const face = {
    ...(bundle.sessionId === undefined ? {} : { sessionId: bundle.sessionId }),
    source: bundle.source,
    observations: bundle.observations.length,
    goals,
    obligations,
    claims: session.claims.length,
    regime,
    conflicts: conflictCells,
    items,
    evidence,
  };
  return Object.freeze({
    kind: "metroplat.claim-session.continuation",
    ...face,
    text: continuationTextBody(face),
  });
}

function slug(value) {
  return (slugify(value) || "mark");
}

/** One host tool act (a Claude tool_use, a Codex function_call) paired with the
 *  outcome its own transcript records for it. */

/** Fold host tool acts into claim-session observations. An act IS a claim —
 *  "I am doing this" — read `held` on its own act cell. Its recorded
 *  result is a second claim on the same cell: `held` when the evidence
 *  closes, `denied` when the evidence contradicts (an errored result), so the
 *  ∨ₖ judgement marks contradicted acts `contested` (⊤) — this is where a
 *  session's conflicts stop being vacuous. An unwitnessed act stands alone as
 *  an unclosed `held`. Act cells carry the host-unique act id, so glued
 *  cross-session settlements never conflate two different acts. */
export function hostActClaimObservations(
  input,
) {
  let session = input.initialSession ?? openSession(CLAIM_SESSION_FAMILY);
  const observations = [];
  const caller = Object.freeze({ protocol: input.protocol, surface: input.surface, session: input.sessionId });
  let item = 0;
  // Each act observation carries the judgement face RESTRICTED to its own act
  // cell, maintained incrementally — re-judging the whole session per act is
  // quadratic in acts, and the authoritative full judgement is recomputed by
  // any continuation/status read from the final session anyway.
  const byCell = new Map();
  const push = (cell, reading, text, evidence) => {
    session = claim(session, cell, reading);
    const prior = byCell.get(cell);
    const verdict = prior === undefined
      ? reading
      : joinClaimReadings(prior, reading, CLAIM_SESSION_FAMILY);
    byCell.set(cell, verdict);
    item += 1;
    observations.push(Object.freeze({
      sessionId: input.sessionId,
      transport: "claim-session",
      claim: Object.freeze({ cell, reading }),
      session,
      judgement: Object.freeze({
        judgement: Object.freeze({ [cell]: verdict }),
        conflicts: verdict === "contested" ? Object.freeze([cell]) : Object.freeze([]),
        regime: sessionRegime(session),
      }),
      at: input.at ?? Object.freeze({ source: input.source, item }),
      boundary: Object.freeze({
        protocol: input.protocol,
        surface: input.surface,
        operation: "host-act-read",
        role: "act",
        source: input.source,
        text,
        evidence: Object.freeze([...evidence]),
      }),
      caller,
    }));
  };
  for (const act of input.acts) {
    const cell = `${input.protocol}/${input.surface}/session/${slug(input.sessionId)}/act/${act.id}`;
    const text = `act:${act.id} ${act.name}`;
    push(cell, "held", text, Object.freeze([`act:${act.id}`, `tool:${act.name}`, "act-claim"]));
    if (act.outcome === "errored") {
      push(cell, "denied", text, Object.freeze([`act:${act.id}`, "result:error"]));
    } else if (act.outcome === "recorded") {
      push(cell, "held", text, Object.freeze([`act:${act.id}`, "result:witnessed"]));
    }
  }
  return Object.freeze({ observations: Object.freeze(observations), session });
}

const eavtTuple = (row) => Object.freeze([row.e, row.a, row.v, row.t]);

function sessionEntity(observation) {
  return Object.freeze({
    kind: "metroplat.claim-session",
    transport: observation.transport,
    session: observation.sessionId,
  });
}

function sessionAttribute(observation) {
  return Object.freeze({
    operation: "claim",
    cell: observation.claim.cell,
    reading: observation.claim.reading,
  });
}

function sessionValue(observation) {
  return Object.freeze({
    claim: Object.freeze({ cell: observation.claim.cell, reading: observation.claim.reading }),
    judgement: observation.judgement,
    claims: observation.session.claims.length,
    regime: sessionRegime(observation.session),
    conflicts: Object.freeze([...conflicts(observation.session)]),
    closed: observation.session.closed,
    ...(observation.boundary === undefined ? {} : { boundary: observation.boundary }),
    ...(observation.caller === undefined ? {} : { caller: observation.caller }),
  });
}

/** The claim-session feed: one accepted frame becomes one source EAVT row. */
export const claimSessionFeed = Object.freeze({
  name: "claim-session",
  functional: Object.freeze([]),
  cellize: (observation, at) => Object.freeze([
    eavtTuple(statementCell(
      sessionEntity(observation),
      sessionAttribute(observation),
      sessionValue(observation),
      at,
    )),
  ]),
});

/** Cellize one accepted claim-session observation through the package-owned feed. */
export function claimSessionStatementRows(observation) {
  return claimSessionFeed.cellize(observation, observation.at);
}

/**
 * The inverse of `claimSessionStatementRows`: recover enough of a recorded
 * claim-session row to feed `glueClaimSessions` — `claim.cell`/`claim.reading`
 * from the row's own attribute, `boundary` (role/text/source/evidence)
 * verbatim from its value, same shape `sessionAttribute`/`sessionValue`
 * wrote. `glueClaimSessions` never reads `session`/`judgement` (it re-derives
 * its own glued session from the claims themselves), so those are
 * reconstructed as a fresh, unopened session rather than replayed — there is
 * no way to recover one row's session-at-that-moment from the row alone
 * (`sessionValue` only projects a moment's summary, not the session value),
 * and glue does not need it. `null` when the row is not a claim-session row
 * at all (a different feed's row sharing the same admitted log file).
 */
export function claimSessionObservationOfRow(row, fallbackSessionId) {
  const [entity, attribute, value, at] = row;
  if (!isJsonRecord(attribute) || !isJsonRecord(value)) return null;
  const cell = attribute["cell"];
  const readingField = attribute["reading"];
  if (typeof cell !== "string" || typeof readingField !== "string" || !isSessionReading(readingField)) return null;
  const sessionId = isJsonRecord(entity) && typeof entity["session"] === "string" ? entity["session"] : fallbackSessionId;
  const boundary = value["boundary"];
  return Object.freeze({
    sessionId,
    transport: "claim-session",
    claim: Object.freeze({ cell, reading: readingField }),
    session: openSession(CLAIM_SESSION_FAMILY),
    judgement: Object.freeze({}),
    at,
    ...(isJsonRecord(boundary) ? { boundary: boundary } : {}),
  });
}
