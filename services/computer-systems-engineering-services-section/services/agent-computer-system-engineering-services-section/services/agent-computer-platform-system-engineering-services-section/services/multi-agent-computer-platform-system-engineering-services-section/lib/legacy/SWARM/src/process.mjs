// process.mjs — SWARM work objects, lifted onto the OS process model it seeded.
//
// @561-group/computer-kernel-process is the aperiodic PROCESS MODEL the swarm consolidation lifted
// out of swarm's own {readiness,dispatch,status,coordination}. It composes read->fold->settle tiles
// into PROCESSES and settles them to fixed points with NO clock, and it BAKES IN NO DOMAIN: every
// place a swarm-specific check, regime, office, or order-edge goes is a PARAMETER. This module is the
// SEAM: it lifts a swarm work record into a process value and threads swarm's CONCRETE domain through
// the runtime —
//   • judge        = swarm's ten readiness checks (computeReadiness), as the process's FOUR-valued
//                    judgments. The runtime folds them through its admissibility chain; the composite
//                    it returns IS computeReadiness's composite (same fold, lifted off swarm).
//   • regimeSelector = swarm's structuration→regime fold (selectGovernanceRegime), reading a work's
//                    observable shape to the governing regime.
//   • regimes      = the OS distribution regimes swarm re-exports (REGIMES), so admitUnder speaks them.
//   • ctx.can      = swarm's office-capability test (offices.can), the kyriarchical default gate.
//   • after        = the work's dependsOn edges, as the process happens-before order (orderProcess).
//
// THE LAW it keeps: a process value is the FOLD of an append-only trace; governance is FOUR-valued (⊤
// held); the runtime's settle is monotone (Knaster–Tarski). Nothing here re-derives the process
// algebra — it supplies the agent domain and lets the runtime run it.

import { settleProcess, advanceProcesses, allocateProcess, orderProcess, accessibleFrom, dispatchProcess, executeProcess, deriveProcessState } from "@561-group/computer-kernel-process";
import { REGIMES } from "@561-group/computer/distribution/governance";

import { can } from "./offices.mjs";
import { computeReadiness } from "./readiness.mjs";
import { selectGovernanceRegime, readStructuration } from "./structuration.mjs";
import { listWorkObjects } from "./work.mjs";

const idOf = (work) => work?.doc?.id ?? work?.id ?? "";

function dependsOn(work) {
  const value = work?.doc?.dependsOn ?? [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

// workProcess(root, work, dispatcher, options) — lift one swarm work record into a process value.
// The process's `judge` runs swarm's ten readiness checks and presents them as FOUR-valued judgments;
// the runtime's settleProcess folds them through its admissibility chain to the composite. The process
// carries swarm's structuration as its `doc` (so the runtime's structuration read and swarm's
// selectGovernanceRegime see the same shape), its dependsOn as the happens-before `after` order, and
// its work term as a stable id. Pure over the world; the readiness reads are swarm's existing disk reads.
export function workProcess(root, work, dispatcher, options = {}) {
  const witness = computeReadiness(root, work, dispatcher, options);
  const judge = () => witness.checks.map((c) => ({ name: c.name, value: c.value, reason: c.reason, path: c.path }));
  const after = dependsOn(work).map((dep) => `work:${dep}`);
  const proc = {
    id: `work:${idOf(work)}`,
    rows: [],
    doc: work.doc,
    judge,
    witness,
    work,
  };
  return orderProcess(proc, after);
}

// settleWork(root, work, dispatcher, options) — settle ONE work as a process to its fixed point, under
// the regime its structuration selects. Returns the runtime's settled process (its FOUR-valued value,
// ready flag, per-judgment witnesses) plus the swarm structuration/regime and the original readiness
// witness. This is swarm's readiness, RUN BY the OS process model rather than swarm's own fold.
export function settleWork(root, work, dispatcher, options = {}) {
  const proc = workProcess(root, work, dispatcher, options);
  const settled = settleProcess(null, proc, { judge: proc.judge });
  const structuration = readStructuration(root, work, options);
  const regime = selectGovernanceRegime(structuration);
  return Object.freeze({ ...settled, structuration, regime, witness: proc.witness, work });
}

// advanceWorkBoard(root, works, dispatcher, options) — ONE aperiodic advance pass over a board of
// works, run by the runtime's advanceProcesses. The board partitions into dispatched (ready AND every
// dependency settled-ready), blocked (denied, or held by an unsettled predecessor), and contradicted
// (⊤ held, surfaced not collapsed). The regimeSelector folds each work's structuration to its regime;
// ctx.can is swarm's office gate. Symmetric under reordering independent works (the runtime's law).
export function advanceWorkBoard(root, works, dispatcher, options = {}) {
  const processList = works.map((work) => workProcess(root, work, dispatcher, options));
  const byId = new Map(processList.map((p) => [p.id, p.work]));
  const regimeSelector = (structuration) => selectGovernanceRegime(structuration);
  const advance = advanceProcesses(
    { processList },
    regimeSelector,
    {
      // each process carries its own judge; advanceProcesses reads proc.judge per process.
      regimes: REGIMES,
      can,
      defaultRegime: "kyriarchical",
    },
  );
  const workOf = (settled) => byId.get(settled.id) ?? null;
  return Object.freeze({
    kind: "swarm.work.advance",
    dispatched: advance.dispatched.map((s) => ({ settled: s, work: workOf(s) })),
    blocked: advance.blocked.map((s) => ({ settled: s, work: workOf(s) })),
    contradicted: advance.contradicted.map((s) => ({ settled: s, work: workOf(s) })),
    settled: advance.settled,
    counts: advance.counts,
  });
}

// workOrder(root, options) — the happens-before relation over the whole board, read through the
// runtime's accessibleFrom. For each ordered pair of works (a, b) where b depends on a, control is
// accessible a → b. Pure; no disk beyond the work list. Surfaces the dependency DAG as the process
// accessibility relation the runtime uses to gate dispatch.
export function workOrder(root, options = {}) {
  const works = listWorkObjects(root, options);
  const procs = works.map((work) => {
    const after = dependsOn(work).map((dep) => `work:${dep}`);
    return orderProcess({ id: `work:${idOf(work)}` }, after);
  });
  const edges = [];
  for (const from of procs) {
    for (const to of procs) {
      if (from.id !== to.id && accessibleFrom(from, to)) edges.push({ from: from.id, to: to.id });
    }
  }
  return Object.freeze({ kind: "swarm.work.order", edges });
}

// resolve a work-or-process to a process VALUE carrying its rows. A bare work record starts an empty
// process trace; an already-transitioned process (the return of a prior dispatch/execute) is carried
// forward, so the transition acts CHAIN — their rows accumulate append-only, exactly as the law requires.
function asWorkProcess(workOrProc) {
  if (workOrProc && Array.isArray(workOrProc.rows) && typeof workOrProc.id === "string") return workOrProc;
  return { id: `work:${idOf(workOrProc)}`, rows: [], work: workOrProc };
}

// allocateWork / dispatchWorkProcess / executeWorkProcess — the placement and transition acts on a
// work-as-process, run by the runtime's allocateProcess/dispatchProcess/executeProcess. These return
// process VALUES (with append-only rows + a named face); persisting their rows is the caller's job
// (swarm's events ledger). They are the process-layer twins of swarm's assignment/execution events,
// kept here so a caller that wants the trace-row form has it without re-implementing the runtime. Each
// accepts a work record OR a prior process value, so dispatch→execute chain their append-only rows.
export function allocateWork(workOrProc, world, principal, accountable) {
  return allocateProcess(asWorkProcess(workOrProc), world, principal, accountable);
}

export function dispatchWorkProcess(workOrProc, office, dispatcher, options = {}) {
  return dispatchProcess(asWorkProcess(workOrProc), office, dispatcher, options);
}

export function executeWorkProcess(workOrProc, executor, state, options = {}) {
  return executeProcess(asWorkProcess(workOrProc), executor, state, options);
}

export { deriveProcessState };
