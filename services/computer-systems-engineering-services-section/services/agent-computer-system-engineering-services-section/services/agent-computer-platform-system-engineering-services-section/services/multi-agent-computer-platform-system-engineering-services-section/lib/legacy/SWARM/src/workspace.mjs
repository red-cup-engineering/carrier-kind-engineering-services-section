import { operationsBoard } from "./operations.mjs";
import { officeForSkill } from "./readiness.mjs";
import { summarizeWorkStatuses } from "./status.mjs";
import { listWorkObjects } from "./work.mjs";

function countBy(entries, keyFn) {
  const counts = new Map();
  for (const entry of entries) {
    const key = keyFn(entry) || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function dispatchable(work) {
  return ["workitem", "task"].includes(work.doc.workKind);
}

function officeForWork(entry, statusEntry) {
  return statusEntry?.status?.assignment?.doc?.toOffice
    || officeForSkill(entry.doc.requiredSkill)
    || entry.doc.office
    || "unassigned";
}

function workSummary(entry, statusEntry, extra = {}) {
  return {
    workId: entry.doc.id,
    title: entry.doc.title,
    workKind: entry.doc.workKind,
    status: statusEntry?.status.status ?? entry.doc.status ?? "open",
    priority: entry.doc.priority ?? "normal",
    office: officeForWork(entry, statusEntry),
    requiredSkill: entry.doc.requiredSkill ?? "",
    parent: entry.doc.parent ?? "",
    partOf: entry.doc.partOf ?? "",
    dependsOn: asArray(entry.doc.dependsOn),
    tracePaths: [entry.path, ...(statusEntry?.status.tracePaths ?? [])].filter(Boolean),
    ...extra,
  };
}

function statusLane(statusEntry, heldIds, holdByWorkId) {
  const status = statusEntry?.status.status ?? "open";
  const workId = statusEntry?.work.doc.id ?? "";
  if (status === "blocked" || status === "failed") return "follow-up";
  if (status === "done" && statusEntry?.status.execution && !statusEntry?.status.review) return "review";
  if (holdByWorkId.has(workId)) return "governance-hold";
  if (heldIds.has(workId)) return "waiting";
  if (status === "assigned" || status === "active") return "doing";
  if (status === "done") return "done";
  return "ready";
}

function priorityRank(priority) {
  return { urgent: 4, high: 3, normal: 2, low: 1 }[priority] ?? 0;
}

function sortWorkRows(a, b) {
  return priorityRank(b.priority) - priorityRank(a.priority) || a.title.localeCompare(b.title);
}

function laneSummary(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const lane = row.lane ?? "ready";
    if (!grouped.has(lane)) grouped.set(lane, []);
    grouped.get(lane).push(row);
  }
  return ["ready", "doing", "waiting", "governance-hold", "review", "follow-up", "done"].map((lane) => ({
    lane,
    count: grouped.get(lane)?.length ?? 0,
    work: (grouped.get(lane) ?? []).sort(sortWorkRows).slice(0, 8),
  }));
}

function governanceHolds(board) {
  return board.leaderActionRequests.map((request, index) => ({
    index,
    kind: request.kind,
    workId: request.workId,
    workTitle: request.workTitle,
    requestedAction: request.requestedAction,
    requestedTool: request.requestedTool ?? "",
    office: request.office ?? "",
    reason: request.reason,
  }));
}

function decisionKindForHold(hold) {
  if (hold.kind === "tool-delegation") return "delegate-tool";
  if (hold.kind === "safety-envelope") return "settle-safety-envelope";
  if (hold.kind === "plan-composition-witness") return "witness-plan-composition";
  if (hold.kind === "worktree-isolation") return "isolate-worktree";
  return hold.kind || "decide";
}

function explicitDecisionRows(work) {
  return work.filter((entry) => entry.doc.decisionQuestion || entry.doc.decisionRequired || entry.doc.decisionKind).map((entry) => {
    return {
      kind: entry.doc.decisionKind || "work-decision",
      workId: entry.doc.id,
      workTitle: entry.doc.title,
      requestedAction: entry.doc.decisionAction || "decision.record",
      office: entry.doc.decisionOffice || entry.doc.office || "leader",
      reason: entry.doc.decisionQuestion || entry.doc.decisionRequired || "work row declares a decision requirement",
    };
  });
}

export function coordinationWorkspace(root, options = {}) {
  const board = operationsBoard(root, options);
  const work = listWorkObjects(root);
  const statuses = summarizeWorkStatuses(root);
  const statusById = new Map(statuses.entries.map((entry) => [entry.work.doc.id, entry]));
  const heldIds = new Set(statuses.dependencyHeld.map((entry) => entry.work.doc.id));
  const holds = governanceHolds(board);
  const holdByWorkId = new Map();
  for (const hold of holds) {
    if (!holdByWorkId.has(hold.workId)) holdByWorkId.set(hold.workId, []);
    holdByWorkId.get(hold.workId).push(hold);
  }

  const rows = work.filter(dispatchable).map((entry) => {
    const statusEntry = statusById.get(entry.doc.id);
    return workSummary(entry, statusEntry, {
      lane: statusLane(statusEntry, heldIds, holdByWorkId),
      governanceHolds: holdByWorkId.get(entry.doc.id) ?? [],
      heldBy: statuses.dependencyHeld.find((held) => held.work.doc.id === entry.doc.id)?.heldBy ?? [],
    });
  });

  const officeQueues = countBy(rows, (row) => row.office).map(({ key: office, count }) => {
    const officeRows = rows.filter((row) => row.office === office);
    return {
      office,
      count,
      lanes: laneSummary(officeRows),
      next: officeRows.filter((row) => ["ready", "doing", "review"].includes(row.lane)).sort(sortWorkRows).slice(0, 5),
      held: officeRows.filter((row) => ["waiting", "governance-hold", "follow-up"].includes(row.lane)).sort(sortWorkRows).slice(0, 5),
    };
  });

  const projects = work.filter((entry) => entry.doc.workKind === "project");
  const projectViews = projects.map((project) => {
    const children = rows.filter((row) => row.parent === project.doc.id || row.partOf === project.doc.id);
    return {
      projectId: project.doc.id,
      title: project.doc.title,
      status: statusById.get(project.doc.id)?.status.status ?? project.doc.status ?? "open",
      coordination: project.doc.coordination ?? "",
      expectedCostShape: project.doc.expectedCostShape ?? "",
      convergenceCriteria: project.doc.convergenceCriteria ?? "",
      childCount: children.length,
      lanes: laneSummary(children),
      next: children.filter((row) => ["ready", "doing", "review"].includes(row.lane)).sort(sortWorkRows).slice(0, 5),
      held: children.filter((row) => ["waiting", "governance-hold", "follow-up"].includes(row.lane)).sort(sortWorkRows).slice(0, 5),
    };
  }).sort((a, b) => b.childCount - a.childCount || a.title.localeCompare(b.title));

  const decisionPoints = [
    ...holds.map((hold) => ({
      kind: decisionKindForHold(hold),
      workId: hold.workId,
      workTitle: hold.workTitle,
      requestedAction: hold.requestedAction,
      requestedTool: hold.requestedTool,
      office: hold.office,
      reason: hold.reason,
    })),
    ...explicitDecisionRows(work),
  ];

  const followUps = rows
    .filter((row) => row.lane === "follow-up")
    .map((row) => ({
      ...row,
      reason: statusById.get(row.workId)?.status.review?.doc.note
        || statusById.get(row.workId)?.status.execution?.doc.note
        || "blocked or failed work needs explicit repair, abandonment, or replan trace",
    }))
    .sort(sortWorkRows);

  return {
    kind: "swarm.workspace.coordination",
    generatedAt: options.now ?? new Date().toISOString(),
    researchBasis: [
      "agentive triad: speaking precedes doing, and doing emits higher-stratum atoms whose dependencies point back to prior claims",
      "polity work notes: the swarm does the work while leadership decides what work to do; decisions and work allocation must be substrate-settled",
      "runbook research: operational work needs ordered steps, policy requirements, and replayable residue rather than hidden task-manager state",
      "task-management skill research: closing, blocking, follow-up, and context compilation are work surfaces derived from records",
    ],
    summary: {
      workRows: rows.length,
      offices: officeQueues.length,
      projects: projectViews.length,
      governanceHolds: holds.length,
      decisionPoints: decisionPoints.length,
      followUps: followUps.length,
      lanes: countBy(rows, (row) => row.lane),
    },
    officeQueues,
    projectViews,
    governanceHolds: holds,
    decisionPoints,
    followUps,
    tracePaths: [
      ...work.map((entry) => entry.path),
      ...statuses.entries.flatMap((entry) => entry.status.tracePaths ?? []),
    ].filter(Boolean),
  };
}
