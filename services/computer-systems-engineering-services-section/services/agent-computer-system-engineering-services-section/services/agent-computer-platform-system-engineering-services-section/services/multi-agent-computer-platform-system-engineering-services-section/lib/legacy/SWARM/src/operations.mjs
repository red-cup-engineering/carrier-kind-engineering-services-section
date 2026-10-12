import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { costGraphSummary } from "./cost.mjs";
import { listWorkIntakeReports } from "./intake.mjs";
import { ledgerFoldSummary, toolLedgerSummary, traceLedgerSummary } from "./ledger.mjs";
import { memoryRootOf } from "./memory.mjs";
import { officeDefinitions } from "./offices.mjs";
import { listLeaderActionRequestReports } from "./requests.mjs";
import { computeReadiness, officeForSkill, readinessSort } from "./readiness.mjs";
import { listSafetyEnvelopeReports } from "./safety.mjs";
import { summarizeWorkStatuses } from "./status.mjs";
import { listToolPolicies, toolPolicyFor } from "./tool-policy.mjs";
import { listWorkObjects, replayRunbooks } from "./work.mjs";

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

function walkJsonl(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonl(path));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) out.push(path);
  }
  return out;
}

function dispatcherAgent(name = "orchestrator") {
  return {
    name,
    office: name,
    provider: "local",
    model: "swarm-office-v0",
  };
}

function dispatchable(work) {
  return ["workitem", "task"].includes(work.doc.workKind);
}

function readinessBlockers(readiness) {
  return readiness.checks
    .filter((check) => check.value !== "potential")
    .map((check) => ({
      name: check.name,
      value: check.value,
      reason: check.reason,
      path: check.path ?? "",
    }));
}

function toolPolicyForWork(work) {
  const required = work.doc.requiredSkill ?? "";
  const policy = required ? toolPolicyFor(required) : toolPolicyFor("");
  const isTool = policy.known || String(required).startsWith("tool.");
  return isTool ? policy : null;
}

function leaderRequestFor(work, readiness) {
  const blockers = readinessBlockers(readiness);
  const safetyBlock = blockers.find((blocker) => (
    blocker.name === "safety-envelope"
    && String(blocker.reason ?? "").startsWith("missing safety envelope boundary")
  ));
  if (safetyBlock) {
    return {
      kind: "safety-envelope",
      workId: work.doc.id,
      workTitle: work.doc.title,
      requestedAction: "work.safety-envelope.report",
      requestedTool: work.doc.requiredSkill ?? "",
      office: "leader",
      reason: safetyBlock.reason,
    };
  }

  const toolBlock = blockers.find((blocker) => blocker.name === "tool-admission" && blocker.reason === "leader-delegation-required");
  if (toolBlock) {
    return {
      kind: "tool-delegation",
      workId: work.doc.id,
      workTitle: work.doc.title,
      requestedAction: "work.dispatch.request",
      requestedTool: work.doc.requiredSkill,
      office: officeForSkill(work.doc.requiredSkill) || "unknown",
      reason: `leader delegation required for ${work.doc.requiredSkill}`,
    };
  }

  const compositionBlock = blockers.find((blocker) => blocker.name === "plan-composition");
  if (compositionBlock) {
    return {
      kind: "plan-composition-witness",
      workId: work.doc.id,
      workTitle: work.doc.title,
      requestedAction: "work.plan-composition.witness",
      requestedTool: "",
      office: "leader",
      reason: compositionBlock.reason,
    };
  }

  const worktreeBlock = blockers.find((blocker) => blocker.name === "worktree-isolation");
  if (worktreeBlock) {
    return {
      kind: "worktree-isolation",
      workId: work.doc.id,
      workTitle: work.doc.title,
      requestedAction: "work.dispatch.request",
      requestedTool: work.doc.requiredSkill ?? "",
      office: "leader",
      reason: worktreeBlock.reason,
    };
  }

  return null;
}

function operationalRisk(root, statusSummary, dispatchRows) {
  const costGraph = costGraphSummary(root);
  const ledgerFold = ledgerFoldSummary(root);
  const toolLedger = toolLedgerSummary(root);
  const blocked = statusSummary.counts.blocked ?? 0;
  const dependencyHeld = statusSummary.dependencyHeld.length;
  const blockedDispatch = dispatchRows.filter((row) => row.readiness.composite !== "potential").length;
  const risks = [
    blocked ? {
      kind: "blocked-work",
      severity: "warning",
      count: blocked,
      reason: "blocked work consumes attention until reviewed, repaired, or abandoned",
    } : null,
    dependencyHeld ? {
      kind: "dependency-held-work",
      severity: "info",
      count: dependencyHeld,
      reason: "handoff dependencies are currently holding downstream work",
    } : null,
    blockedDispatch ? {
      kind: "dispatch-not-ready",
      severity: "info",
      count: blockedDispatch,
      reason: "work exists but does not currently pass the dispatch readiness fold",
    } : null,
    costGraph.dimensions.unknownTokenRows ? {
      kind: "unknown-token-cost",
      severity: "warning",
      count: costGraph.dimensions.unknownTokenRows,
      reason: "provider cost is not settled because some calls lack token usage",
    } : null,
    costGraph.dimensions.safetyEnvelopeGaps ? {
      kind: "safety-envelope-gaps",
      severity: "high",
      count: costGraph.dimensions.safetyEnvelopeGaps,
      reason: "privileged work needs admissible read/write/process/network boundaries",
    } : null,
    costGraph.dimensions.worktreeIsolationConflicts ? {
      kind: "worktree-isolation-conflicts",
      severity: "high",
      count: costGraph.dimensions.worktreeIsolationConflicts,
      reason: "in-flight writes overlap without an isolated worktree declaration",
    } : null,
  ].filter(Boolean);

  return {
    risks,
    costGraph,
    ledgerFold,
    toolLedger,
    budgetQuestions: [
      `will we hit launch path: ${dependencyHeld || blocked ? "unsettled" : "no trace-held blocker detected"}`,
      `are we still on token budget: ${costGraph.dimensions.unknownTokenRows ? "unknown token rows present" : "settled by current ledger fold"}`,
      `are tool permissions accountable: ${costGraph.dimensions.safetyEnvelopeGaps || costGraph.dimensions.worktreeIsolationConflicts ? "privileged boundary residue present" : "no privileged boundary residue detected"}`,
    ],
  };
}

export function operationsBoard(root, options = {}) {
  const dispatcher = options.dispatcher ?? dispatcherAgent(options.dispatcherOffice ?? "orchestrator");
  const work = listWorkObjects(root);
  const intakeReports = listWorkIntakeReports(root);
  const leaderRequestReports = listLeaderActionRequestReports(root);
  const safetyReports = listSafetyEnvelopeReports(root);
  const statusSummary = summarizeWorkStatuses(root);
  const statusById = new Map(statusSummary.entries.map((entry) => [entry.work.doc.id, entry]));
  const dispatchRows = work
    .filter(dispatchable)
    .map((entry) => ({
      work: entry,
      status: statusById.get(entry.doc.id)?.status ?? null,
      readiness: computeReadiness(root, entry, dispatcher, options.readiness ?? {}),
    }))
    .sort((a, b) => readinessSort({ work: a.work }, { work: b.work }));
  const readyDispatch = dispatchRows.filter((row) => row.readiness.composite === "potential");
  const heldDispatch = dispatchRows.filter((row) => row.readiness.composite !== "potential");
  const toolPolicies = listToolPolicies();
  const privilegedPolicies = toolPolicies.filter((policy) => policy.requiresLeaderAuthorization);
  const privilegedWork = work
    .map((entry) => ({ work: entry, policy: toolPolicyForWork(entry) }))
    .filter((entry) => entry.policy?.requiresLeaderAuthorization);
  const leaderActionRequests = dispatchRows
    .map((row) => leaderRequestFor(row.work, row.readiness))
    .filter(Boolean);
  const risk = operationalRisk(root, statusSummary, dispatchRows);

  return {
    kind: "swarm.operations.board",
    generatedAt: options.now ?? new Date().toISOString(),
    researchBasis: [
      "intake pipeline: validate, policy-gate, normalize, and audit recognitions before persistence",
      "runbook model: expose ordered dependency steps with policy requirements",
      "autonomy/accountability note: autonomous cells need upward reports for launch, budget, and operational relevance",
      "task lifecycle graph: operational status is a labelled transition graph, not a hidden mutable field",
    ],
    intake: {
      totalWork: work.length,
      missions: work.filter((entry) => entry.doc.workKind === "mission").length,
      campaigns: work.filter((entry) => entry.doc.workKind === "campaign").length,
      projects: work.filter((entry) => entry.doc.workKind === "project").length,
      workItems: work.filter((entry) => entry.doc.workKind === "workitem").length,
      tasks: work.filter((entry) => entry.doc.workKind === "task").length,
      openUnassigned: statusSummary.entries.filter((entry) => entry.status.status === "open").length,
      intakeReports: intakeReports.length,
      admittedIntakeReports: intakeReports.filter((entry) => entry.doc.policyResult?.allowed).length,
      rejectedIntakeReports: intakeReports.filter((entry) => entry.doc.policyResult && !entry.doc.policyResult.allowed).length,
      intakeKinds: countBy(intakeReports, (entry) => entry.doc.workKind),
    },
    lifecycle: {
      counts: statusSummary.counts,
      dependencyHeld: statusSummary.dependencyHeld.map((entry) => ({
        workId: entry.work.doc.id,
        title: entry.work.doc.title,
        heldBy: entry.heldBy,
      })),
    },
    dispatch: {
      dispatcherOffice: dispatcher.office,
      totalDispatchable: dispatchRows.length,
      readyCount: readyDispatch.length,
      heldCount: heldDispatch.length,
      ready: readyDispatch.slice(0, 8).map((row) => ({
        workId: row.work.doc.id,
        title: row.work.doc.title,
        office: row.readiness.assigneeOffice,
        requiredSkill: row.work.doc.requiredSkill ?? "",
        priority: row.work.doc.priority ?? "normal",
      })),
      held: heldDispatch.slice(0, 8).map((row) => ({
        workId: row.work.doc.id,
        title: row.work.doc.title,
        requiredSkill: row.work.doc.requiredSkill ?? "",
        readiness: row.readiness.composite,
        blockers: readinessBlockers(row.readiness).slice(0, 4),
      })),
    },
    offices: {
      definitions: Object.values(officeDefinitions).map((office) => ({
        office: office.office,
        title: office.title,
        capabilities: office.capabilities ?? [],
      })),
      roleLoad: countBy(work.filter(dispatchable), (entry) => officeForSkill(entry.doc.requiredSkill) || "unassigned"),
      activeLoad: countBy(statusSummary.entries.filter((entry) => ["assigned", "active"].includes(entry.status.status)), (entry) => {
        return entry.status.assignment?.doc?.toOffice || officeForSkill(entry.work.doc.requiredSkill) || "unassigned";
      }),
    },
    tools: {
      policyCount: toolPolicies.length,
      privilegedPolicyCount: privilegedPolicies.length,
      privilegedPolicies: privilegedPolicies.map((policy) => ({
        tool: policy.tool,
        capability: policy.capability,
        scope: policy.scope,
        sandbox: policy.sandbox,
        authorization: policy.authorization,
      })),
      privilegedWork: privilegedWork.map((entry) => ({
        workId: entry.work.doc.id,
        title: entry.work.doc.title,
        tool: entry.policy.tool,
        capability: entry.policy.capability,
        sandbox: entry.policy.sandbox,
      })),
      observedToolCalls: risk.toolLedger.summary.toolCallCount,
      observedWriteToolCalls: risk.toolLedger.summary.writeToolCallCount,
    },
    leaderActionRequests,
    leaderActionRequestReports: {
      total: leaderRequestReports.length,
      admitted: leaderRequestReports.filter((entry) => entry.doc.policyResult?.allowed).length,
      rejected: leaderRequestReports.filter((entry) => entry.doc.policyResult && !entry.doc.policyResult.allowed).length,
      requestKinds: countBy(leaderRequestReports.flatMap((entry) => entry.doc.requestKinds ?? []), (kind) => kind),
      requestedActions: countBy(leaderRequestReports.flatMap((entry) => entry.doc.requestedActions ?? []), (action) => action),
    },
    safetyEnvelopeReports: {
      total: safetyReports.length,
      admitted: safetyReports.filter((entry) => entry.doc.policyResult?.allowed).length,
      rejected: safetyReports.filter((entry) => entry.doc.policyResult && !entry.doc.policyResult.allowed).length,
      requestedTools: countBy(safetyReports.flatMap((entry) => entry.doc.requestedTools ?? []), (tool) => tool),
      requestedActions: countBy(safetyReports.flatMap((entry) => entry.doc.requestedActions ?? []), (action) => action),
    },
    accountability: {
      risks: risk.risks,
      budgetQuestions: risk.budgetQuestions,
      ledgerRows: risk.ledgerFold.summary.entryCount,
      totalTokens: risk.ledgerFold.summary.totalTokens,
      unknownUsageCount: risk.ledgerFold.summary.unknownUsageCount,
      costBottlenecks: risk.costGraph.bottlenecks,
    },
  };
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ""))];
}

function reportWitnessKey(reportKind, reportPath) {
  return `${reportKind}:${reportPath}`;
}

function reportWitnessKeys(traceLedger) {
  return new Set(traceLedger.entries
    .filter((entry) => entry.doc.ledgerKind === "report-witness")
    .map((entry) => reportWitnessKey(entry.doc.reportKind, entry.doc.reportPath))
    .filter((key) => !key.endsWith(":")));
}

function missingReportWitnessResidue(reportKind, reports, witnessedReports) {
  return reports
    .filter((report) => !witnessedReports.has(reportWitnessKey(report.doc.reportKind ?? reportKind, report.path)))
    .map((report) => ({
      kind: "missing-report-witness",
      reportKind,
      reportId: report.doc.id ?? "",
      reportPath: report.path,
      reason: "report exists but no report-witness ledger row cites its path",
    }));
}

function missingReadinessWitnessResidue(traceLedger) {
  return traceLedger.entries
    .filter((entry) => entry.doc.ledgerKind === "readiness-witness")
    .filter((entry) => !entry.doc.readinessPath || !existsSync(entry.doc.readinessPath))
    .map((entry) => ({
      kind: "missing-readiness-witness-trace",
      readinessId: entry.doc.readinessId ?? "",
      readinessPath: entry.doc.readinessPath ?? "",
      ledgerPath: entry.path,
      workIds: entry.doc.workIds ?? [],
      reason: "readiness-witness ledger row exists but its readiness trace path is missing",
    }));
}

function corruptJsonlResidue(root) {
  const base = memoryRootOf(root);
  const roots = ["work", "reports", "events", "traces", "ledger"].map((name) => join(base, name));
  return roots.flatMap((dir) => walkJsonl(dir)).flatMap((path) => {
    try {
      return readFileSync(path, "utf8")
        .split("\n")
        .flatMap((line, index) => {
          if (!line.trim()) return [];
          try {
            JSON.parse(line);
            return [];
          } catch (error) {
            return [{
              kind: "corrupt-jsonl-row",
              path,
              line: index + 1,
              error: error.message,
              reason: "JSONL row could not be parsed during operations replay",
            }];
          }
        });
    } catch (error) {
      return [{
        kind: "unreadable-jsonl-file",
        path,
        error: error.message,
        reason: "JSONL file could not be read during operations replay",
      }];
    }
  });
}

export function replayOperations(root, options = {}) {
  const board = operationsBoard(root, options);
  const work = listWorkObjects(root);
  const intakeReports = listWorkIntakeReports(root);
  const leaderRequestReports = listLeaderActionRequestReports(root);
  const safetyReports = listSafetyEnvelopeReports(root);
  const traceLedger = traceLedgerSummary(root);
  const runbooks = replayRunbooks(root);
  const witnessedReports = reportWitnessKeys(traceLedger);
  const tracePaths = uniqueValues([
    ...work.map((entry) => entry.path),
    ...intakeReports.map((entry) => entry.path),
    ...leaderRequestReports.map((entry) => entry.path),
    ...safetyReports.map((entry) => entry.path),
    ...traceLedger.entries.map((entry) => entry.path),
    ...runbooks.flatMap((runbook) => runbook.tracePaths),
  ]);
  const snapshot = {
    workRecords: work.length,
    intakeReports: intakeReports.length,
    admittedIntakeReports: intakeReports.filter((entry) => entry.doc.policyResult?.allowed).length,
    leaderActionRequestReports: leaderRequestReports.length,
    admittedLeaderActionRequestReports: leaderRequestReports.filter((entry) => entry.doc.policyResult?.allowed).length,
    safetyEnvelopeReports: safetyReports.length,
    admittedSafetyEnvelopeReports: safetyReports.filter((entry) => entry.doc.policyResult?.allowed).length,
    runbooks: runbooks.length,
    runbookSteps: runbooks.reduce((sum, runbook) => sum + runbook.stepCount, 0),
    lifecycleCounts: board.lifecycle.counts,
    dependencyHeld: board.lifecycle.dependencyHeld.length,
    dispatchable: board.dispatch.totalDispatchable,
    dispatchReady: board.dispatch.readyCount,
    dispatchHeld: board.dispatch.heldCount,
    traceLedgerRows: traceLedger.summary.traceLedgerCount,
    traceEvents: traceLedger.summary.eventRecordCount,
    readinessWitnesses: traceLedger.summary.readinessWitnessCount,
    reportWitnesses: traceLedger.summary.reportRecordCount,
    ledgerWorkRecords: traceLedger.summary.workRecordCount,
    corruptJsonlRows: 0,
  };
  const residue = [];
  const jsonlResidue = corruptJsonlResidue(root);
  snapshot.corruptJsonlRows = jsonlResidue.filter((entry) => entry.kind === "corrupt-jsonl-row").length;
  if (snapshot.workRecords !== board.intake.totalWork) {
    residue.push({ kind: "work-count-mismatch", board: board.intake.totalWork, replay: snapshot.workRecords });
  }
  if (snapshot.intakeReports !== board.intake.intakeReports) {
    residue.push({ kind: "intake-report-count-mismatch", board: board.intake.intakeReports, replay: snapshot.intakeReports });
  }
  if (snapshot.leaderActionRequestReports !== board.leaderActionRequestReports.total) {
    residue.push({
      kind: "leader-action-request-report-count-mismatch",
      board: board.leaderActionRequestReports.total,
      replay: snapshot.leaderActionRequestReports,
    });
  }
  if (snapshot.safetyEnvelopeReports !== board.safetyEnvelopeReports.total) {
    residue.push({
      kind: "safety-envelope-report-count-mismatch",
      board: board.safetyEnvelopeReports.total,
      replay: snapshot.safetyEnvelopeReports,
    });
  }
  for (const runbook of runbooks) {
    for (const item of runbook.residue) {
      residue.push({ kind: "runbook-replay-residue", runbookName: runbook.runbookName, residue: item });
    }
  }
  const missingReportWitnesses = [
    ...missingReportWitnessResidue("work-intake", intakeReports, witnessedReports),
    ...missingReportWitnessResidue("leader-action-request", leaderRequestReports, witnessedReports),
    ...missingReportWitnessResidue("safety-envelope", safetyReports, witnessedReports),
  ];
  const expectedReportWitnesses = snapshot.intakeReports + snapshot.leaderActionRequestReports + snapshot.safetyEnvelopeReports;
  if (missingReportWitnesses.length || snapshot.reportWitnesses < expectedReportWitnesses) {
    residue.push({
      kind: "missing-report-witness-ledger-rows",
      expectedAtLeast: expectedReportWitnesses,
      actual: snapshot.reportWitnesses,
      missingReportCount: missingReportWitnesses.length,
      missingReportPaths: missingReportWitnesses.map((entry) => entry.reportPath),
    });
  }
  residue.push(...missingReportWitnesses);
  residue.push(...missingReadinessWitnessResidue(traceLedger));
  residue.push(...jsonlResidue);

  return {
    kind: "swarm.replay.operations",
    replayedFrom: "jsonl-eavt-work-report-event-ledger-rows",
    board,
    snapshot,
    runbooks,
    traceLedger: traceLedger.summary,
    tracePaths,
    residue,
  };
}
