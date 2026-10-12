import { deriveProcessState } from "@561-group/computer-kernel-process";

import { listEvents } from "./events.mjs";
import { listWorkObjects } from "./work.mjs";

const EXECUTION_STATUS = {
  started: "active",
  completed: "done",
  done: "done",
  failed: "failed",
  blocked: "blocked",
  suspended: "suspended",
  abandoned: "abandoned",
};

// the work's assignment/execution lifecycle as an append-only process TRACE: each event becomes a row
// the process-runtime's deriveProcessState folds back (latest-t wins for the functional predicates).
// The runtime's transition fold (dispatched-to / execution-state) was lifted from this very module;
// swarm hands its events back as process rows so the dispatch/execution state comes from the OS fold,
// and keeps the work-domain reading (open→assigned, review approved→done / rejected→blocked) on top.
function processRowsFromEvents(workId, events) {
  const rows = [];
  for (const event of events) {
    const e = `work:${workId}`;
    const t = String(event.doc.created ?? event.term ?? "");
    if (event.doc.eventType === "assignment") {
      rows.push({ e, a: "dispatched-to", v: String(event.doc.toOffice ?? ""), t });
    } else if (event.doc.eventType === "execution") {
      rows.push({ e, a: "execution-state", v: String(event.doc.state ?? ""), t });
    }
  }
  return rows;
}

export function deriveWorkStatus(root, work) {
  const doc = work?.doc ?? work ?? {};
  const events = listEvents(root, { workId: doc.id });
  let status = doc.status ?? "open";
  let assignment = null;
  let execution = null;
  let review = null;

  // the OS process fold over the assignment/execution rows: the latest dispatched-to / execution-state.
  const processState = deriveProcessState({ id: `work:${doc.id}`, rows: processRowsFromEvents(doc.id, events) });

  for (const event of events) {
    if (event.doc.eventType === "assignment") {
      assignment = event;
      if (status === "open") status = "assigned";
    } else if (event.doc.eventType === "execution") {
      execution = event;
      status = EXECUTION_STATUS[event.doc.state] ?? status;
    } else if (event.doc.eventType === "review") {
      review = event;
      if (event.doc.decision === "approved") status = "done";
      if (event.doc.decision === "rejected") status = "blocked";
    }
  }

  // reconcile with the OS fold: if no review overrode the status, the runtime's latest execution-state
  // is the authority for the lifecycle status (mapped through swarm's EXECUTION_STATUS vocabulary).
  if (!review && processState.executionState) {
    status = EXECUTION_STATUS[processState.executionState] ?? status;
  }

  return {
    workId: doc.id,
    workTerm: work?.term ?? doc.term ?? "",
    status,
    assignment,
    execution,
    review,
    events,
    processState,                 // the OS process fold: { dispatchedTo, executionState, history }
    tracePaths: events.map((event) => event.path),
  };
}

export function listWorkStatuses(root, options = {}) {
  return listWorkObjects(root, options).map((work) => ({ work, status: deriveWorkStatus(root, work) }));
}

function dependsOn(work) {
  const value = work?.doc?.dependsOn ?? [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

export function summarizeWorkStatuses(root, options = {}) {
  const entries = listWorkStatuses(root, options);
  const byId = new Map(entries.map((entry) => [entry.work.doc.id, entry]));
  const counts = {
    open: 0,
    assigned: 0,
    active: 0,
    done: 0,
    blocked: 0,
  };
  const dependencyHeld = [];

  for (const entry of entries) {
    const status = entry.status.status ?? "open";
    counts[status] = (counts[status] ?? 0) + 1;

    const heldBy = dependsOn(entry.work).filter((dependencyId) => {
      const dependency = byId.get(dependencyId);
      return !dependency || dependency.status.status !== "done";
    });
    if (heldBy.length && !["done", "blocked", "failed", "abandoned"].includes(status)) {
      dependencyHeld.push({ ...entry, heldBy });
    }
  }

  return {
    total: entries.length,
    counts,
    dependencyHeld,
    entries,
  };
}
