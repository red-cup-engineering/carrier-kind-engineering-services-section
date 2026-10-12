/**
 * running/obsticulation — turning a glue's obstruction readings into work-ledger
 * obligations.
 *
 * `obsticulation`: the event by which resistance under observation becomes carried,
 * articulated structure — "the conversion of a refusal into a datum," not error
 * handling (obsmetrologia `2026-07-03-obsticulation-mathematics.md`, conjectures
 * C1-C2). `glueClaimSessions` (`../claims/session.mjs`) already computes three obstruction
 * readings over a glued claim-session settlement — `conflicts` (cells at ⊤),
 * `adjudication` (possibilistic-contextuality classification of those conflicts),
 * and `coordination` (cover-nerve H¹ rank) — but nothing consumed them: no branch
 * ever turned a nonzero reading into a remediation. This module is that turn, over
 * the SAME `ClaimSessionObservation` shape every other claim-session producer
 * (`chronicleWorkClaims`, `hostActClaimObservations`, `fact-claims.mts`) already
 * writes, so the obligations land on the work-ledger feed as ordinary
 * `work-item:<id>` scoped claims.
 *
 * No discharge leg here: retracting/settling an obstruction obligation once its
 * reading clears is constrained by settling-monotonicity (settled cells are never
 * retracted) and needs its own ruling before it is built.
 */
import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";

import { claimSessionObservation } from "@red-cup-engineering/relating/running/session";

/** The context a glue itself carries nothing about: where the glue was read from
 *  (the settlement artifact name, for the hand-ledger-matching `source`/`boundary.source`
 *  field) and the settlement token that derived it (cited as evidence, never as
 *  authority). */

/** The deterministic, idempotent cell address one obstructed cell settles to:
 *  `work-item:<slug>-obstruction` — a `level:id` scope
 *  (socializing office's `scopeOf` grammar, `work-item` a real `WorkLevel`),
 *  so `workItemOfCell` (socializing office) recognizes it
 *  automatically instead of dropping it. The id's internal dash follows
 *  *Three Dots and a Dash* (`2026-07-04-three-dots-and-a-dash-…md`): `A-B`
 *  reads "B obstructs A", so `<slug>-obstruction` reads "an obstruction
 *  obstructs the named cell" — obstruction on the right, the obstructed
 *  cell's slug on the left, not the reverse. */
export function obstructionWorkLedgerCell(obstructedCell) {
  return `work-item:${(slugify(obstructedCell) || "slug")}-obstruction`;
}

/** Merge the three readings down to one record per raw obstructed cell — the
 *  dedup the task requires, computed before any cell is slugged or texted. */
function obstructedCellsOfGlue(glued) {
  const byCell = new Map();
  const ensure = (cell) => {
    const existing = byCell.get(cell);
    if (existing !== undefined) return existing;
    const created = { cell, conflict: false };
    byCell.set(cell, created);
    return created;
  };
  for (const cell of glued.conflicts) ensure(cell).conflict = true;
  // `adjudication.cells` is the whole presented conflict batch; only
  // `obstruction.context` pinpoints the cells an obstruction was actually found
  // on (a `noncontextual` classification carries `resolution`, not
  // `obstruction`, and is not an obstruction to obsticulate).
  const obstruction = glued.adjudication.obstruction;
  if (obstruction !== undefined) {
    for (const cell of obstruction.context) {
      const info = ensure(cell);
      info.classification = glued.adjudication.classification;
      if (glued.adjudication.classification === "strongly-contextual") {
        info.deadlockedSources = obstruction.sources;
      }
    }
  }
  for (const entry of glued.coordination.obstructions) {
    ensure(entry.cell).mass = entry.mass;
  }
  return Object.freeze([...byCell.values()]);
}

function obstructionText(info) {
  const parts = [`cell "${info.cell}" is obstructed`];
  if (info.conflict) parts.push("holds a standing conflict (⊤) across the glued claim sessions");
  if (info.classification !== undefined) parts.push(`adjudication classifies it ${info.classification}`);
  if (info.deadlockedSources !== undefined && info.deadlockedSources.length > 0) {
    parts.push(`deadlocked sources: ${info.deadlockedSources.join(", ")}`);
  }
  if (info.mass !== undefined) parts.push(`contradiction mass ${info.mass} to coordinate`);
  return parts.join("; ");
}

function obstructionEvidence(info, settlementToken) {
  const evidence = [`cell:${info.cell}`];
  if (info.classification !== undefined) evidence.push(`classification:${info.classification}`);
  if (info.mass !== undefined) evidence.push(`contradiction-mass:${info.mass}`);
  if (info.deadlockedSources !== undefined && info.deadlockedSources.length > 0) {
    evidence.push(`sources:${info.deadlockedSources.join(",")}`);
  }
  evidence.push(`settlement:${settlementToken}`);
  return Object.freeze(evidence);
}

/** One dated recorded feed read as over its bytes-per-entropy-unit bound —
 *  `feedEntropyReading` (`core/persistence`) valued it `held` — the
 *  obstruction this module turns into a work-ledger obligation, the same way
 *  it turns a glue's conflict/adjudication/coordination readings into one
 *  below. */

/** Work material already interpreted by its domain owner rather than inferred
 * here from arbitrary reading data. */

function deterministicExecutionBoundary(value) {
  const request = Object.freeze({
    type: value.request.type,
    version: value.request.version,
    command: value.request.command,
    arguments: Object.freeze([...value.request.arguments]),
    directory: value.request.directory,
    environment: value.request.environment === null ? null : Object.freeze({ ...value.request.environment }),
    input: value.request.input,
  });
  const acceptance = value.acceptance.kind === "command-exit-status"
    ? Object.freeze({ kind: value.acceptance.kind, status: value.acceptance.status })
    : Object.freeze({ kind: value.acceptance.kind, stdout: value.acceptance.stdout });
  return Object.freeze({ operation: value.operation, request, acceptance });
}

function feedEntropyObstructionText(info) {
  return `feed "${info.feed}" is obstructed: ${info.bytesPerEntropyUnit.toFixed(2)} bytes/entropy-unit ` +
    `(${info.bytesOnDisk} bytes over ${info.entropyUnits} entropy units) exceeds the bound of ${info.bound}`;
}

function feedEntropyObstructionEvidence(info, settlementToken) {
  return Object.freeze([
    `feed:${info.feed}`,
    `bytes-per-entropy-unit:${info.bytesPerEntropyUnit}`,
    `bound:${info.bound}`,
    `settlement:${settlementToken}`,
  ]);
}

/** Convert dated recorded feeds `feedEntropyReading` (`core/persistence`)
 *  valued `held` into `work-ledger` obligation observations — one per
 *  over-bound feed, entering the SAME work-ledger obligation shape
 *  (`obstructionWorkLedgerCell`, `claimSessionObservation`, reading
 *  `unknown`) `obsticulationObservationsOfGlue` below already produces for
 *  a glue's obstruction readings. Empty when no feed is over its bound. */
export function obsticulationObservationsOfFeedEntropy(
  overBoundFeeds,
  context,
) {
  const sessionId = context.sessionId ?? "work-ledger";
  return Object.freeze(overBoundFeeds.map((info, index) => {
    const at = Object.freeze({ source: context.source, item: index + 1 });
    return claimSessionObservation({
      sessionId,
      transport: "claim-session",
      claim: Object.freeze({ cell: obstructionWorkLedgerCell(`feed:${info.feed}`), reading: "unknown" }),
      session: Object.freeze({ claims: Object.freeze([]), closed: false }),
      judgement: Object.freeze({}),
      at,
      boundary: Object.freeze({
        protocol: "metroplat",
        surface: "work-ledger",
        operation: "work-ledger-item",
        role: "obligation",
        source: context.source,
        text: feedEntropyObstructionText(info),
        ...(context.parent === undefined ? {} : { parent: context.parent }),
        evidence: Object.freeze([...feedEntropyObstructionEvidence(info, context.settlementToken), ...(context.evidence ?? [])]),
      }),
      caller: Object.freeze({ protocol: "metroplat", session: sessionId, surface: "work-ledger" }),
    });
  }));
}

/** Convert domain-interpreted material into the same work-ledger obligation
 * observations as every other obsticulation source. This function only
 * projects; admission remains an explicit application action. */
export function obsticulationObservationsOfObligations(
  obligations,
  context,
) {
  const sessionId = context.sessionId ?? "work-ledger";
  return Object.freeze(obligations.map((obligation, index) => {
    const at = Object.freeze({ source: context.source, item: index + 1 });
    const item = obligation.item ?? obstructionWorkLedgerCell(obligation.cell);
    return claimSessionObservation({
      sessionId,
      transport: "claim-session",
      claim: Object.freeze({ cell: item, reading: "unknown" }),
      session: Object.freeze({ claims: Object.freeze([]), closed: false }),
      judgement: Object.freeze({}),
      at,
      boundary: Object.freeze({
        protocol: "metroplat",
        surface: "work-ledger",
        operation: "work-ledger-item",
        role: "obligation",
        source: context.source,
        ...(context.subject === undefined ? {} : { subject: context.subject }),
        text: obligation.text,
        ...(obligation.work === undefined ? {} : { work: obligation.work }),
        ...(obligation.skill === undefined ? {} : { skill: obligation.skill }),
        ...(obligation.requiredCarrier === undefined ? {} : {
          requiredCarrier: Object.freeze({
            model: obligation.requiredCarrier.model,
            reasoningEffort: obligation.requiredCarrier.reasoningEffort,
          }),
        }),
        ...(obligation.deterministicExecution === undefined ? {} : {
          deterministicExecution: deterministicExecutionBoundary(obligation.deterministicExecution),
        }),
        ...(obligation.returns === undefined ? {} : { returns: obligation.returns }),
        ...(obligation.order === undefined ? {} : { order: obligation.order }),
        ...(obligation.parent === undefined && context.parent === undefined
          ? {}
          : { parent: obligation.parent ?? context.parent }),
        ...(obligation.dependencies === undefined ? {} : {
          dependencies: Object.freeze([...new Set(obligation.dependencies)].sort()),
        }),
        ...(obligation.conflicts === undefined ? {} : {
          conflicts: Object.freeze([...new Set(obligation.conflicts)].sort()),
        }),
        evidence: Object.freeze([...obligation.evidence, `cell:${obligation.cell}`, `settlement:${context.settlementToken}`, ...(context.evidence ?? [])]),
      }),
      caller: Object.freeze({ protocol: "metroplat", session: sessionId, surface: "work-ledger" }),
    });
  }));
}

/** Project explicit resolution evidence onto the exact cell an earlier
 * obsticulation opened. Admission remains an application responsibility. */
export function obsticulationDischargeObservations(
  discharges,
  context,
) {
  const sessionId = context.sessionId ?? "work-ledger";
  return Object.freeze(discharges.map((discharge, index) => claimSessionObservation({
    sessionId,
    transport: "claim-session",
    claim: Object.freeze({ cell: discharge.cell, reading: "unknown" }),
    session: Object.freeze({ claims: Object.freeze([]), closed: false }),
    judgement: Object.freeze({}),
    at: Object.freeze({ source: context.source, item: index + 1 }),
    boundary: Object.freeze({
      protocol: "metroplat",
      surface: "work-ledger",
      operation: "work-ledger-item",
      role: "discharge",
      source: context.source,
      text: discharge.text,
      ...(context.parent === undefined ? {} : { parent: context.parent }),
      evidence: Object.freeze([...discharge.evidence, `settlement:${context.settlementToken}`, ...(context.evidence ?? [])]),
    }),
    caller: Object.freeze({ protocol: "metroplat", session: sessionId, surface: "work-ledger" }),
  })));
}

/** Convert a glue's nonzero obstruction readings into `work-ledger` obligation
 *  observations — one per obstructed cell, deduplicated across the three
 *  readings, reading `unknown` (a standing obligation; there is no evidenced
 *  failure to reading `held`, per `workItemReading`'s doctrine in `./chronicle.mts`).
 *  Empty when the glue carries no obstruction at all. */
export function obsticulationObservationsOfGlue(
  glued,
  context,
) {
  const sessionId = context.sessionId ?? "work-ledger";
  const cells = obstructedCellsOfGlue(glued);
  return Object.freeze(cells.map((info, index) => {
    const at = Object.freeze({ source: context.source, item: index + 1 });
    return claimSessionObservation({
      sessionId,
      transport: "claim-session",
      claim: Object.freeze({ cell: obstructionWorkLedgerCell(info.cell), reading: "unknown" }),
      session: Object.freeze({ claims: Object.freeze([]), closed: false }),
      judgement: Object.freeze({}),
      at,
      boundary: Object.freeze({
        protocol: "metroplat",
        surface: "work-ledger",
        operation: "work-ledger-item",
        role: "obligation",
        source: context.source,
        text: obstructionText(info),
        ...(context.parent === undefined ? {} : { parent: context.parent }),
        evidence: Object.freeze([...obstructionEvidence(info, context.settlementToken), ...(context.evidence ?? [])]),
      }),
      caller: Object.freeze({ protocol: "metroplat", session: sessionId, surface: "work-ledger" }),
    });
  }));
}
