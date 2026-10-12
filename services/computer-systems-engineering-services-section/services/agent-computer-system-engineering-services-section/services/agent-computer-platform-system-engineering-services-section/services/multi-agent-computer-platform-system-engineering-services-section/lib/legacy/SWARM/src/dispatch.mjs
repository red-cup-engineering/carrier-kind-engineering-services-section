import { advanceProcesses } from "@561-group/computer-kernel-process";
import { REGIMES } from "@561-group/computer/distribution/governance";

import { assignWork } from "./events.mjs";
import { governAction } from "./governance.mjs";
import { can } from "./offices.mjs";
import { readinessSort, writeReadiness } from "./readiness.mjs";
import { workProcess } from "./process.mjs";
import { dispatchGate } from "./safety-cohomology.mjs";
import { routingAdvice } from "./saturation.mjs";
import { selectGovernanceRegime } from "./structuration.mjs";
import { regimeForWork } from "./structuration.mjs";
import { listWorkObjects } from "./work.mjs";

function dispatchableWork(root) {
  return listWorkObjects(root).filter((record) => ["workitem", "task"].includes(record.doc.workKind));
}

// selectNextWork — settle the dispatchable board through the OS process model (advanceProcesses), then
// pick the first ready work in readiness order. Each work is lifted to a process whose judge is its
// readiness checks (process.mjs workProcess); advanceProcesses folds those judgments to the FOUR
// composite AND applies the dependency order (a work held by an unsettled predecessor is `blocked`,
// not dispatched). The readiness witness is still WRITTEN for each candidate (the durable trace);
// selection rides the runtime's dispatched/blocked partition rather than swarm's own composite scan.
export function selectNextWork(root, dispatcher, options = {}) {
  const works = dispatchableWork(root);
  // write the readiness witness for every candidate (durable trace) and carry the lifted process.
  const witnesses = works
    .map((work) => ({ work, readiness: writeReadiness(root, work, dispatcher, options) }))
    .sort(readinessSort);

  // lift the (now readiness-sorted) board to processes and advance it through the runtime: the
  // dispatched partition is ready AND dependency-clear; the regimeSelector folds structuration to a
  // regime, ctx.can is swarm's office gate. The process judge is each work's readiness checks.
  const processList = witnesses.map((entry) => workProcess(root, entry.work, dispatcher, options));
  const dispatchableIds = new Set();
  if (processList.length) {
    const advance = advanceProcesses(
      { processList },
      (structuration) => selectGovernanceRegime(structuration),
      { regimes: REGIMES, can, defaultRegime: "kyriarchical" },
    );
    for (const s of advance.dispatched) dispatchableIds.add(s.id);
  }

  // the selected work: the first in readiness order whose process the runtime dispatched (ready and
  // its dependencies settled). Falls back to the composite-⊤ reading for parity with the prior API.
  const selected = witnesses.find((entry) => dispatchableIds.has(`work:${entry.work.doc.id}`))
    ?? witnesses.find((entry) => entry.readiness.doc.composite === "potential")
    ?? null;
  return { selected, witnesses };
}

export function dispatchNextWork(root, dispatcher, options = {}) {
  const decision = governAction(root, dispatcher, "work.dispatch", { kind: "work", title: "next ready work" }, options);
  if (!decision.admitted) return { dispatched: false, decision, selected: null, witnesses: [], assignment: null };

  // SAFETY-AS-COHOMOLOGY gate (JOB 2): when the caller designates safety-critical terms, refuse
  // dispatch while any designated H¹ safety sector is non-zero (a held ⊤ in the safety-critical trace).
  // Default: no safety terms supplied → no gate, behavior unchanged. The held contradiction is surfaced
  // (value ⊤), never collapsed to a silent denial.
  if (options.safetyTerms?.length) {
    const safety = dispatchGate(root, options.safetyTerms, options);
    if (!safety.admitted) return { dispatched: false, decision, safety, selected: null, witnesses: [], assignment: null };
  }

  // SATURATION as an ADVISORY regime read (the ~4-agent wall → stigmergic routing). dispatch CONSULTS
  // the saturation verdict (saturation.mjs routingAdvice) and attaches it beside the decision: past the
  // empirical knee the advice flips to preferStigmergic, recommending new work ride the cheap O(N+|L|)
  // stigmergic substrate (stigmergy.mjs) rather than add orchestrated load. This is ADVISORY ONLY — it
  // does NOT gate dispatch and we do NOT branch on it. SATURATION_THRESHOLD=4 is EMPIRICAL (MASFT 2025),
  // not derived from the substrate, so it cannot be allowed to admit/deny work; it only annotates. The
  // caller (or a downstream router) MAY honor `saturationAdvice.preferStigmergic` and MAY ignore it.
  const saturationAdvice = routingAdvice(root, options);

  const selection = selectNextWork(root, dispatcher, options);
  if (!selection.selected) return { dispatched: false, decision, saturationAdvice, selected: null, witnesses: selection.witnesses, assignment: null };

  // The swarm selects a governance regime for the selected work from its structuration (work first,
  // governance read off it), then settles the work's dispatch under that regime. The dispatcher's
  // authority to dispatch at all is the separate kyriarchical gate above (`decision`).
  const { structuration, regime } = regimeForWork(root, selection.selected.work, options);
  const workDecision = governAction(
    root,
    dispatcher,
    "work.dispatch",
    { kind: "work", title: selection.selected.work.doc.title, ...selection.selected.work.doc },
    { ...options, regime, structuration },
  );

  const assignment = assignWork(
    root,
    selection.selected.work,
    selection.selected.readiness.doc.assigneeOffice,
    dispatcher,
    selection.selected.readiness,
    options,
  );
  return {
    dispatched: true,
    decision,
    saturationAdvice,
    structuration,
    regime,
    workDecision,
    selected: selection.selected,
    witnesses: selection.witnesses,
    assignment,
  };
}
