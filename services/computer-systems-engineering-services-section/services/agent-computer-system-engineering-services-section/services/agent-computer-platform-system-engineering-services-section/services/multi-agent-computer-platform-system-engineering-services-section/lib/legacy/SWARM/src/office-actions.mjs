import { stableId } from "./cognition.mjs";
import { analyzeCoordinationPatterns } from "./coordination.mjs";
import { costDescentSummary, costGraphSummary } from "./cost.mjs";
import { dispatchNextWork } from "./dispatch.mjs";
import { auditEvent, executionEvent, listEvents, reviewEvent, writeTrace } from "./events.mjs";
import { governAction } from "./governance.mjs";
import { buildWorkIntakeReport, writeWorkIntakeReport } from "./intake.mjs";
import {
  governanceDecisionLedgerSummary,
  ledgerFoldSummary,
  messageLedgerSummary,
  officeActionLedgerSummary,
  providerLedgerSummary,
  toolLedgerSummary,
  traceLedgerSummary,
} from "./ledger.mjs";
import { agentCapabilities, officeDefinitions, officeFor, officeNameFor } from "./offices.mjs";
import { operationsBoard } from "./operations.mjs";
import { buildLeaderActionRequestReport, writeLeaderActionRequestReport } from "./requests.mjs";
import { buildSafetyEnvelopeReport, writeSafetyEnvelopeReport } from "./safety.mjs";
import { deriveWorkStatus, summarizeWorkStatuses } from "./status.mjs";
import { coordinationWorkspace } from "./workspace.mjs";
import { buildWorkObjectReport, commitWorkObjectReport, createWorkObject, latestWorkObject, listWorkObjects } from "./work.mjs";

function cleanGoal(text) {
  return String(text)
    .trim()
    .replace(/^[,:\s]+/, "")
    .replace(/^(?:to|for|about)\s+/i, "")
    .replace(/[.?!]\s*$/, "")
    .trim();
}

function goalAfterKind(prompt, kind) {
  const pattern = new RegExp(`\\b${kind}\\b\\s*[,;:-]?\\s*(?:to\\s+|for\\s+|about\\s+)?([\\s\\S]+)$`, "i");
  const match = String(prompt).match(pattern);
  return cleanGoal(match?.[1] ?? "");
}

function wantsCreate(prompt, kind) {
  const lower = String(prompt).toLowerCase();
  return lower.includes(kind) && /\b(new|create|start|open|make|build)\b/.test(lower);
}

function titleFromGoal(goal, fallback) {
  const value = cleanGoal(goal) || fallback;
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function wantsDevelopmentCycle(prompt) {
  return /\b(question[- ]driven|proof[- ]driven|development[- ]cycle|driven[- ]development|praxis[- ]driven|style progression)\b/i.test(String(prompt));
}

function wantsOrganizationRunbook(prompt) {
  return /\brunbook\b/i.test(String(prompt))
    && /\b(organization(?:al)?|operations?|openclaw|intake|triage|dispatch|execution|review|escalation)\b/i.test(String(prompt));
}

function planShapeFromPrompt(prompt) {
  const lower = String(prompt).toLowerCase();
  if (/\b(fan[- ]out|parallel|branch(?:es|ing)?)\b/.test(lower)) return "fan-out";
  if (/\b(audit[- ]fix|review[- ]fix|repair loop|review loop)\b/.test(lower)) return "audit-fix-loop";
  if (/\b(exploratory|explore|search|discovery)\b/.test(lower)) return "exploratory-search";
  return "";
}

function convergenceCriteriaFor(shape) {
  if (shape === "audit-fix-loop") return "loop converges when the latest review is approved and no rejected review remains without later repair execution";
  if (shape === "exploratory-search") return "search converges when findings name the next settled question, evidence residue, and a bounded implementation path";
  if (shape === "fan-out") return "fan-out converges when all parallel branches reach done or record explicit obstruction residue";
  if (shape === "development-cycle") return "cycle converges when the result phase answers the driving question and records the next question";
  return "pipeline converges when each handoff predicate is satisfied and the verification work reaches done";
}

function accessShapeForSkill(skill) {
  if (skill === "tool.files.write") return { writePaths: ["development/lab/swarm"] };
  if (skill === "tests.run") return { readPaths: ["development/lab/swarm"] };
  return {};
}

function isLeader(agent) {
  return officeNameFor(agent) === "leader";
}

function wantsCreateWork(prompt) {
  return wantsCreate(prompt, "mission")
    || wantsCreate(prompt, "campaign")
    || wantsCreate(prompt, "project")
    || wantsCreate(prompt, "workitem")
    || wantsCreate(prompt, "work item")
    || wantsCreate(prompt, "task");
}

function wantsPlanWork(prompt) {
  const lower = String(prompt).toLowerCase();
  return /\b(plan|work items|tasks|break down|orchestrate)\b/.test(lower) && /\b(mission|swarm|project)\b/.test(lower);
}

function wantsDispatchWork(prompt) {
  const lower = String(prompt).toLowerCase();
  return /\bdispatch\b/.test(lower) && /\b(next|ready|work|work item|task)\b/.test(lower);
}

function wantsStartAssignedWork(prompt) {
  const lower = String(prompt).toLowerCase();
  return /\b(start|begin)\b/.test(lower) && /\b(assigned|assignment|work)\b/.test(lower);
}

function wantsCompleteAssignedWork(prompt) {
  const lower = String(prompt).toLowerCase();
  return /\b(complete|finish|done)\b/.test(lower) && /\b(assigned|assignment|work)\b/.test(lower);
}

function wantsReviewWork(prompt) {
  const lower = String(prompt).toLowerCase();
  return /\b(review|approve)\b/.test(lower) && /\b(completed|done|last|work)\b/.test(lower);
}

function wantsRecordPlanCompositionWitness(prompt) {
  const lower = String(prompt).toLowerCase();
  return /\b(witness|certif(?:y|ies|ied|icate)|authorize|admit|record)\b/.test(lower)
    && /\b(frobenius|merge[-/ ]?split|fan[- ]in|fan[- ]out|plan[- ]composition|composition witness)\b/.test(lower);
}

function wantsRecordLeaderActionRequests(prompt) {
  const lower = String(prompt).toLowerCase();
  return /\b(record|write|create|admit|capture)\b/.test(lower)
    && /\b(leader[- ]action|action requests?|request reports?|operations board requests?)\b/.test(lower);
}

function wantsRecordSafetyEnvelopeReport(prompt) {
  const lower = String(prompt).toLowerCase();
  return /\b(record|write|create|admit|capture)\b/.test(lower)
    && /\b(safety[- ]envelope|admissible[- ]region|safety boundary|privileged boundary)\b/.test(lower);
}

function wantsLeaderMediatedWrite(prompt) {
  return wantsCreateWork(prompt)
    || wantsPlanWork(prompt)
    || wantsDispatchWork(prompt)
    || wantsStartAssignedWork(prompt)
    || wantsCompleteAssignedWork(prompt)
    || wantsReviewWork(prompt)
    || wantsRecordPlanCompositionWitness(prompt)
    || wantsRecordLeaderActionRequests(prompt)
    || wantsRecordSafetyEnvelopeReport(prompt);
}

function localUtterance(agent, prompt, reply, options = {}, meta = {}) {
  const created = options.now ?? new Date().toISOString();
  const id = options.id ?? stableId([agent.name, agent.provider, agent.model, prompt, reply, created], "msg");
  return [
    {
      id,
      agent: agent.name,
      provider: agent.provider,
      model: agent.model,
      prompt,
      created,
      local: true,
      office: officeNameFor(agent),
      ...meta,
    },
    { const: reply },
  ];
}

const DEVELOPMENT_CYCLE_PHASES = [
  {
    style: "question-driven-development",
    phase: "question",
    title: "State the driving question",
    skill: "research.synthesize",
    precondition: "mission intent is named and unsettled",
    postcondition: "question names the uncertainty, desired result, and acceptance shape",
    evidence: "user research note: flow begins with a question",
    commensurateWith: ["inquiry-driven-development", "requirements-discovery"],
  },
  {
    style: "question-driven-development",
    phase: "theorem",
    title: "Frame the theorem that would answer the question",
    skill: "research.synthesize",
    handoffPredicate: "driving question is stated",
    precondition: "question names the uncertainty, desired result, and acceptance shape",
    postcondition: "theorem states the claim whose proof would answer the question",
    evidence: "user research note: question moves to theorem",
    commensurateWith: ["theorem-driven-development", "proof-driven-development"],
  },
  {
    style: "question-driven-development",
    phase: "prove",
    title: "Prove the theorem obligation",
    skill: "research.synthesize",
    handoffPredicate: "theorem is framed",
    precondition: "theorem states the claim whose proof would answer the question",
    postcondition: "proof obligation is discharged, weakened, or refuted with witness residue",
    evidence: "user research note: theorem moves to prove",
    commensurateWith: ["proof-driven-development", "formal-methods"],
  },
  {
    style: "question-driven-development",
    phase: "examples",
    title: "Collect examples that exercise the proof",
    skill: "research.synthesize",
    handoffPredicate: "proof obligation has witness residue",
    precondition: "proof obligation is discharged, weakened, or refuted with witness residue",
    postcondition: "examples expose the theorem boundary and expected behavior",
    evidence: "user research note: proof moves to examples",
    commensurateWith: ["example-driven-development", "behavior-driven-development"],
  },
  {
    style: "question-driven-development",
    phase: "spec",
    title: "Write the spec artifact from examples",
    skill: "research.synthesize",
    handoffPredicate: "examples expose the behavior boundary",
    precondition: "examples expose the theorem boundary and expected behavior",
    postcondition: "spec artifact records interfaces, constraints, and acceptance criteria",
    evidence: "user research note: examples move to spec; spec is artifact, not driver",
    commensurateWith: ["specification-driven-development", "domain-driven-design"],
  },
  {
    style: "question-driven-development",
    phase: "test",
    title: "Turn the spec into executable tests",
    skill: "tests.run",
    handoffPredicate: "spec artifact is recorded",
    precondition: "spec artifact records interfaces, constraints, and acceptance criteria",
    postcondition: "tests witness the spec and fail or pass for explicit reasons",
    evidence: "user research note: spec moves to test; repo notes name TDD and CI gates",
    commensurateWith: ["test-driven-development", "acceptance-test-driven-development"],
  },
  {
    style: "question-driven-development",
    phase: "code",
    title: "Code the minimum answer-producing capability",
    skill: "tool.files.write",
    handoffPredicate: "executable tests witness the spec",
    precondition: "tests witness the spec and fail or pass for explicit reasons",
    postcondition: "code produces the result path demanded by the driving question",
    evidence: "user research note: test moves to code",
    commensurateWith: ["implementation-driven-development", "continuous-delivery-development"],
  },
  {
    style: "question-driven-development",
    phase: "result",
    title: "Return the result for the question",
    skill: "research.synthesize",
    handoffPredicate: "code produces an answer path",
    precondition: "code produces the result path demanded by the driving question",
    postcondition: "result answers the question and records what new question appeared",
    evidence: "user research note: code finally gets a result for the question; praxis notes cycle through action and reflection",
    commensurateWith: ["result-driven-development", "praxis-driven-development"],
  },
];

const ORGANIZATION_RUNBOOK_STEPS = [
  {
    id: "intake",
    title: "Intake organizational request",
    skill: "work.mission.create",
    acts: ["seed-observation", "recognize-value", "normalize-observation"],
    policyRequirements: ["office-capability", "leader-mediated-write-boundary", "work-intake-report"],
    outputs: ["normalized work-intake report", "admitted work object"],
    postcondition: "request is validated, policy-gated, normalized, audited, and represented as work rows",
  },
  {
    id: "triage",
    title: "Triage operational state",
    skill: "operations.report",
    acts: ["witness-judgement", "build-dependency-graph", "detect-blockers"],
    policyRequirements: ["operations-report"],
    inputs: ["admitted work object"],
    outputs: ["operations board residue", "leader action requests"],
    handoffPredicate: "intake report is admitted",
    postcondition: "operations board names open work, dispatch blockers, office load, and leader-action residue",
  },
  {
    id: "dispatch",
    title: "Dispatch ready work",
    skill: "work.dispatch",
    acts: ["evaluate-readiness", "select-ready-work", "assign-work"],
    policyRequirements: ["leader-action-request-report", "readiness-witness"],
    inputs: ["operations board residue"],
    outputs: ["readiness witness", "assignment event"],
    handoffPredicate: "triage identifies ready or leader-action-requestable work",
    postcondition: "ready work is assigned or blocker residue is recorded",
  },
  {
    id: "execution",
    title: "Execute assigned work",
    skill: "work.execution.start",
    acts: ["start-trace", "execute-assignment", "record-step"],
    policyRequirements: ["leader-delegated-execution", "assignment-event"],
    inputs: ["assignment event"],
    outputs: ["execution event"],
    handoffPredicate: "dispatch emits an assignment event",
    postcondition: "assigned office records started/completed execution trace or obstruction residue",
  },
  {
    id: "review",
    title: "Review completed work",
    skill: "work.review",
    acts: ["witness-judgement", "approve-or-reject", "record-review"],
    policyRequirements: ["leader-delegated-review", "governance-review"],
    inputs: ["execution event"],
    outputs: ["review event"],
    handoffPredicate: "execution event reaches completed state",
    postcondition: "completed work is approved or rejected with repair obligations",
  },
  {
    id: "report",
    title: "Report operational accountability",
    skill: "operations.report",
    acts: ["fold-ledger", "summarize-cost", "render-accountability"],
    policyRequirements: ["operations-report", "ledger-report"],
    inputs: ["review event", "ledger rows"],
    outputs: ["operations board", "cost report"],
    handoffPredicate: "review decision exists or open residue remains",
    postcondition: "leader can answer launch path, budget, tool-permission, and office-load questions from traces",
  },
  {
    id: "escalation",
    title: "Escalate unresolved residue",
    skill: "governance.audit",
    acts: ["detect-residue", "create-request-report", "audit-escalation"],
    policyRequirements: ["governance-audit", "leader-action-request-report"],
    inputs: ["operations board", "cost report"],
    outputs: ["audit event", "leader action request report"],
    handoffPredicate: "report exposes unresolved blocker, budget, tool, or governance residue",
    postcondition: "unresolved residue becomes governed action request, audit event, or explicit obstruction",
  },
];

function rejection(agent, action, decision) {
  return [
    `${officeFor(agent).title} did not admit that action.`,
    `Requested capability: ${action}.`,
    `Reason: ${decision.reason}`,
  ].join("\n");
}

function leaderWriteBoundary(agent, prompt, requestedAction = "") {
  const requested = requestedAction
    || (wantsCreateWork(prompt)
      ? "work.create"
      : wantsRecordSafetyEnvelopeReport(prompt)
        ? "work.safety-envelope.report"
        : wantsDispatchWork(prompt)
          ? "work.dispatch"
          : wantsStartAssignedWork(prompt)
            ? "work.execution.start"
            : wantsCompleteAssignedWork(prompt)
              ? "work.execution.complete"
              : wantsReviewWork(prompt)
                ? "work.review"
                : "work.plan");
  return {
    handled: true,
    reply: [
      "State-changing SWARM writes are leader-mediated.",
      `Requested action: ${requested}.`,
      `Current office: ${officeNameFor(agent)}.`,
      'Use: swarm message leader "<request>"',
    ].join("\n"),
    governance: [],
    work: [],
    actions: ["write.boundary.reject"],
  };
}

function localOfficeAgent(name) {
  return {
    name,
    office: name,
    provider: "local",
    model: "swarm-office-v0",
  };
}

function admitWorkObjectReport(root, agent, report, decision, options = {}) {
  const intakeReport = writeWorkIntakeReport(
    root,
    buildWorkIntakeReport(root, report, agent, decision, options),
    options,
  );
  const admittedReport = {
    ...report,
    status: "admitted",
    admission: {
      decisionId: decision.id,
      decisionTerm: decision.term,
      decisionPath: decision.log,
      admittedBy: decision.actor,
      policy: "office-capability",
      reason: decision.reason,
      intakeReportPath: intakeReport.path,
    },
    tracePaths: [decision.log, intakeReport.path],
  };
  const work = commitWorkObjectReport(root, admittedReport, options);
  return { intakeReport, work };
}

function officeNameFromPrompt(prompt) {
  const lower = String(prompt).toLowerCase();
  return Object.keys(officeDefinitions).find((office) => new RegExp(`\\b${office}\\b`).test(lower)) ?? "";
}

function createMission(root, agent, prompt, options = {}) {
  const goal = goalAfterKind(prompt, "mission") || cleanGoal(prompt);
  const title = titleFromGoal(goal, "New Mission");
  const report = buildWorkObjectReport(root, "mission", {
    title,
    goal,
    status: "open",
    createdBy: agent.name,
    office: officeNameFor(agent),
    priority: "high",
    action: "work.mission.create",
  }, options);
  const decision = governAction(root, agent, "work.mission.create", {
    kind: "mission",
    title,
    reportKind: report.kind,
    reportStatus: report.status,
    proposedRowCount: report.rowCount,
  }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "work.mission.create", decision), governance: [decision], work: [] };

  const { intakeReport, work: mission } = admitWorkObjectReport(root, agent, report, decision, options);
  return {
    handled: true,
    reply: [
      `Created mission: ${mission.doc.title}`,
      `Mission id: ${mission.doc.id}`,
      "Status: open",
      `Intake report: ${intakeReport.path}`,
      "Governance: admitted by office-capability policy",
    ].join("\n"),
    governance: [decision],
    work: [mission],
    reports: [intakeReport, mission],
    actions: ["work.mission.create"],
  };
}

function createProject(root, agent, prompt, options = {}) {
  const goal = goalAfterKind(prompt, "project") || cleanGoal(prompt);
  const title = titleFromGoal(goal, "New Project");
  const report = buildWorkObjectReport(root, "project", {
    title,
    goal,
    status: "open",
    createdBy: agent.name,
    office: officeNameFor(agent),
    action: "work.project.create",
  }, options);
  const decision = governAction(root, agent, "work.project.create", {
    kind: "project",
    title,
    reportKind: report.kind,
    reportStatus: report.status,
    proposedRowCount: report.rowCount,
  }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "work.project.create", decision), governance: [decision], work: [] };

  const { intakeReport, work: project } = admitWorkObjectReport(root, agent, report, decision, options);
  return {
    handled: true,
    reply: [
      `Created project: ${project.doc.title}`,
      `Project id: ${project.doc.id}`,
      "Status: open",
      `Intake report: ${intakeReport.path}`,
    ].join("\n"),
    governance: [decision],
    work: [project],
    reports: [intakeReport, project],
    actions: ["work.project.create"],
  };
}

function createCampaign(root, agent, prompt, options = {}) {
  const goal = goalAfterKind(prompt, "campaign") || cleanGoal(prompt);
  const title = titleFromGoal(goal, "New Campaign");
  const report = buildWorkObjectReport(root, "campaign", {
    title,
    goal,
    status: "open",
    createdBy: agent.name,
    office: officeNameFor(agent),
    priority: "high",
    action: "work.campaign.create",
  }, options);
  const decision = governAction(root, agent, "work.campaign.create", {
    kind: "campaign",
    title,
    reportKind: report.kind,
    reportStatus: report.status,
    proposedRowCount: report.rowCount,
  }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "work.campaign.create", decision), governance: [decision], work: [] };

  const { intakeReport, work: campaign } = admitWorkObjectReport(root, agent, report, decision, options);
  return {
    handled: true,
    reply: [
      `Created campaign: ${campaign.doc.title}`,
      `Campaign id: ${campaign.doc.id}`,
      "Status: open",
      `Intake report: ${intakeReport.path}`,
    ].join("\n"),
    governance: [decision],
    work: [campaign],
    reports: [intakeReport, campaign],
    actions: ["work.campaign.create"],
  };
}

function createWorkItem(root, agent, prompt, options = {}) {
  const kind = /\btask\b/i.test(prompt) ? "task" : "workitem";
  const action = `work.${kind}.create`;
  const goal = goalAfterKind(prompt, kind) || goalAfterKind(prompt, "work item") || cleanGoal(prompt);
  const title = titleFromGoal(goal, kind === "task" ? "New Task" : "New Work Item");
  const report = buildWorkObjectReport(root, kind, {
    title,
    goal,
    status: "open",
    createdBy: agent.name,
    office: officeNameFor(agent),
    action,
  }, options);
  const decision = governAction(root, agent, action, {
    kind,
    title,
    reportKind: report.kind,
    reportStatus: report.status,
    proposedRowCount: report.rowCount,
  }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, action, decision), governance: [decision], work: [] };

  const { intakeReport, work: item } = admitWorkObjectReport(root, agent, report, decision, options);
  return {
    handled: true,
    reply: [
      `Created ${kind}: ${item.doc.title}`,
      `${kind === "task" ? "Task" : "Work item"} id: ${item.doc.id}`,
      "Status: open",
      `Intake report: ${intakeReport.path}`,
    ].join("\n"),
    governance: [decision],
    work: [item],
    reports: [intakeReport, item],
    actions: [action],
  };
}

function planDevelopmentCycle(root, agent, prompt, options = {}) {
  const mission = latestWorkObject(root, "mission", prompt);
  const projectTitle = mission ? `Development cycle for ${mission.doc.title}` : "Development cycle for SWARM orchestration substrate";
  const decisions = [
    governAction(root, agent, "work.project.create", { kind: "project", title: projectTitle }, options),
    governAction(root, agent, "work.workitem.create", { kind: "workitem", title: projectTitle }, options),
  ];
  const denied = decisions.find((decision) => !decision.admitted);
  if (denied) return { handled: true, reply: rejection(agent, denied.action, denied), governance: decisions, work: [] };

  const parent = mission?.doc.id ?? "";
  const project = createWorkObject(root, "project", {
    title: projectTitle,
    goal: mission?.doc.goal ?? "Build SWARM into a governed agentic orchestration platform",
    parent,
    createdBy: agent.name,
    office: officeNameFor(agent),
    priority: "high",
    coordination: "development-cycle",
    expectedCostShape: "development-cycle",
    convergenceCriteria: convergenceCriteriaFor("development-cycle"),
    developmentStyle: "question-to-result-cycle",
    developmentPhase: "cycle",
    commensurateWith: ["proof-driven-development", "test-driven-development", "domain-driven-design", "praxis-driven-development"],
    evidence: "user note plus praxis, domain-driven design, and DevOps/CD research notes",
  }, options);

  const items = [];
  for (const phase of DEVELOPMENT_CYCLE_PHASES) {
    const prior = items.at(-1);
    items.push(createWorkObject(root, "workitem", {
      title: phase.title,
      goal: phase.title,
      parent: project.doc.id,
      partOf: project.doc.id,
      dependsOn: prior ? [prior.doc.id] : [],
      handoffPredicate: phase.handoffPredicate ?? "",
      precondition: phase.precondition,
      postcondition: phase.postcondition,
      coordination: "development-cycle",
      expectedCostShape: "development-cycle",
      convergenceCriteria: convergenceCriteriaFor("development-cycle"),
      developmentStyle: phase.style,
      developmentPhase: phase.phase,
      commensurateWith: phase.commensurateWith,
      evidence: phase.evidence,
      requiredSkill: phase.skill,
      ...accessShapeForSkill(phase.skill),
      priority: prior ? "normal" : "high",
      createdBy: agent.name,
      office: officeNameFor(agent),
    }, options));
  }

  return {
    handled: true,
    reply: [
      `Planned development cycle: ${project.doc.title}`,
      `Project id: ${project.doc.id}`,
      `Mission: ${mission?.doc.title ?? "none found; created standalone cycle"}`,
      "Driver: question-driven-development",
      `Cost shape: ${project.doc.expectedCostShape}`,
      `Convergence: ${project.doc.convergenceCriteria}`,
      "Phases:",
      ...items.map((item, index) => {
        const dependency = item.doc.dependsOn.length ? ` after ${item.doc.dependsOn.join(", ")}` : "";
        return `- ${index + 1}. ${item.doc.developmentPhase}: ${item.doc.title} [${item.doc.requiredSkill}]${dependency}`;
      }),
    ].join("\n"),
    governance: decisions,
    work: [project, ...items],
    actions: ["work.project.create", "work.workitem.create"],
  };
}

function planOrganizationRunbook(root, agent, prompt, options = {}) {
  const mission = latestWorkObject(root, "mission", prompt);
  const projectTitle = mission ? `Operations runbook for ${mission.doc.title}` : "Operations runbook for SWARM organization";
  const decisions = [
    governAction(root, agent, "work.project.create", { kind: "project", title: projectTitle }, options),
    governAction(root, agent, "work.workitem.create", { kind: "workitem", title: projectTitle }, options),
  ];
  const denied = decisions.find((decision) => !decision.admitted);
  if (denied) return { handled: true, reply: rejection(agent, denied.action, denied), governance: decisions, work: [] };

  const parent = mission?.doc.id ?? "";
  const runbookName = "organization-operations-runbook";
  const convergenceCriteria = "runbook converges when every unresolved intake, dispatch, execution, review, report, or escalation residue is either settled or captured as a governed leader-action request";
  const project = createWorkObject(root, "project", {
    title: projectTitle,
    goal: mission?.doc.goal ?? "Operate SWARM as an organization-facing agent swarm",
    parent,
    createdBy: agent.name,
    office: officeNameFor(agent),
    priority: "high",
    coordination: "organization-runbook",
    expectedCostShape: "operations-runbook",
    convergenceCriteria,
    runbookName,
    runbookStepId: "runbook",
    runbookStepIndex: 0,
    runbookActs: ["build-dependency-graph", "detect-cycles", "execute-policy-gated-steps"],
    policyRequirements: ["office-capability", "leader-mediated-write-boundary"],
    runbookOutputs: ["trace-backed organizational operations plan"],
    evidence: "runbook research: ordered steps carry act references, dependency wiring, and policy requirements; organizational accountability research: autonomous offices need launch, budget, and relevance answers",
  }, options);

  const items = [];
  for (const [index, step] of ORGANIZATION_RUNBOOK_STEPS.entries()) {
    const prior = items.at(-1);
    items.push(createWorkObject(root, "workitem", {
      title: step.title,
      goal: step.title,
      parent: project.doc.id,
      partOf: project.doc.id,
      dependsOn: prior ? [prior.doc.id] : [],
      handoffPredicate: step.handoffPredicate ?? "",
      precondition: step.inputs?.join("; ") ?? "",
      postcondition: step.postcondition,
      coordination: "organization-runbook",
      expectedCostShape: "operations-runbook",
      convergenceCriteria,
      requiredSkill: step.skill,
      priority: index === 0 ? "high" : "normal",
      createdBy: agent.name,
      office: officeNameFor(agent),
      runbookName,
      runbookStepId: step.id,
      runbookStepIndex: index + 1,
      runbookActs: step.acts,
      policyRequirements: step.policyRequirements,
      runbookInputs: step.inputs ?? [],
      runbookOutputs: step.outputs ?? [],
      evidence: "organization-level runbook plan: intake -> triage -> dispatch -> execution -> review -> report -> escalation",
    }, options));
  }

  return {
    handled: true,
    reply: [
      `Planned organization runbook: ${project.doc.title}`,
      `Project id: ${project.doc.id}`,
      `Mission: ${mission?.doc.title ?? "none found; created standalone runbook"}`,
      `Runbook: ${project.doc.runbookName}`,
      `Cost shape: ${project.doc.expectedCostShape}`,
      `Convergence: ${project.doc.convergenceCriteria}`,
      "Steps:",
      ...items.map((item) => {
        const dependency = item.doc.dependsOn.length ? ` after ${item.doc.dependsOn.join(", ")}` : "";
        return `- ${item.doc.runbookStepIndex}. ${item.doc.runbookStepId}: ${item.doc.title} [${item.doc.requiredSkill}]${dependency}`;
      }),
    ].join("\n"),
    governance: decisions,
    work: [project, ...items],
    actions: ["work.project.create", "work.workitem.create"],
  };
}

function planMission(root, agent, prompt, options = {}) {
  if (wantsOrganizationRunbook(prompt)) return planOrganizationRunbook(root, agent, prompt, options);
  if (wantsDevelopmentCycle(prompt)) return planDevelopmentCycle(root, agent, prompt, options);
  const requestedShape = planShapeFromPrompt(prompt);
  if (requestedShape) return planShapedWork(root, agent, prompt, requestedShape, options);

  const mission = latestWorkObject(root, "mission", prompt);
  const projectTitle = mission ? `Build plan for ${mission.doc.title}` : "Build SWARM orchestration substrate";
  const decisions = [
    governAction(root, agent, "work.project.create", { kind: "project", title: projectTitle }, options),
    governAction(root, agent, "work.workitem.create", { kind: "workitem", title: projectTitle }, options),
  ];
  const denied = decisions.find((decision) => !decision.admitted);
  if (denied) return { handled: true, reply: rejection(agent, denied.action, denied), governance: decisions, work: [] };

  const parent = mission?.doc.id ?? "";
  const project = createWorkObject(root, "project", {
    title: projectTitle,
    goal: mission?.doc.goal ?? "Build SWARM into a governed agentic orchestration platform",
    parent,
    createdBy: agent.name,
    office: officeNameFor(agent),
    priority: "high",
    expectedCostShape: "sequential-pipeline",
    convergenceCriteria: convergenceCriteriaFor("sequential-pipeline"),
  }, options);
  const research = createWorkObject(root, "workitem", {
    title: "Map research into offices, authority, and work types",
    goal: "Map research into offices, authority, and work types",
    parent: project.doc.id,
    partOf: project.doc.id,
    requiredSkill: "research.synthesize",
    priority: "high",
    postcondition: "research synthesis names the office, authority, and work-type implications",
    coordination: "pipeline",
    expectedCostShape: "sequential-pipeline",
    convergenceCriteria: convergenceCriteriaFor("sequential-pipeline"),
    createdBy: agent.name,
    office: officeNameFor(agent),
  }, options);
  const implementation = createWorkObject(root, "workitem", {
    title: "Implement governed message routing for office actions",
    goal: "Implement governed message routing for office actions",
    parent: project.doc.id,
    partOf: project.doc.id,
    dependsOn: [research.doc.id],
    handoffPredicate: "research synthesis is complete",
    precondition: "research synthesis names the office, authority, and work-type implications",
    postcondition: "implementation trace proves governed office routing changed",
    coordination: "pipeline",
    expectedCostShape: "sequential-pipeline",
    convergenceCriteria: convergenceCriteriaFor("sequential-pipeline"),
    requiredSkill: "tool.files.write",
    ...accessShapeForSkill("tool.files.write"),
    priority: "normal",
    createdBy: agent.name,
    office: officeNameFor(agent),
  }, options);
  const verification = createWorkObject(root, "workitem", {
    title: "Prove memory, planning, and work state change later turns",
    goal: "Prove memory, planning, and work state change later turns",
    parent: project.doc.id,
    partOf: project.doc.id,
    dependsOn: [implementation.doc.id],
    handoffPredicate: "implementation trace is complete",
    precondition: "implementation trace proves governed office routing changed",
    postcondition: "verification trace proves memory, planning, and work state change later turns",
    coordination: "pipeline",
    expectedCostShape: "sequential-pipeline",
    convergenceCriteria: convergenceCriteriaFor("sequential-pipeline"),
    requiredSkill: "tests.run",
    ...accessShapeForSkill("tests.run"),
    priority: "normal",
    createdBy: agent.name,
    office: officeNameFor(agent),
  }, options);
  const items = [research, implementation, verification];

  return {
    handled: true,
    reply: [
      `Planned project: ${project.doc.title}`,
      `Project id: ${project.doc.id}`,
      `Mission: ${mission?.doc.title ?? "none found; created standalone plan"}`,
      `Cost shape: ${project.doc.expectedCostShape}`,
      `Convergence: ${project.doc.convergenceCriteria}`,
      "Work items:",
      ...items.map((item) => `- ${item.doc.title} [${item.doc.requiredSkill}]${item.doc.dependsOn.length ? ` after ${item.doc.dependsOn.join(", ")}` : ""}`),
    ].join("\n"),
    governance: decisions,
    work: [project, ...items],
    actions: ["work.project.create", "work.workitem.create"],
  };
}

function planShapedWork(root, agent, prompt, shape, options = {}) {
  const mission = latestWorkObject(root, "mission", prompt);
  const label = {
    "fan-out": "Fan-out plan",
    "audit-fix-loop": "Audit-fix loop",
    "exploratory-search": "Exploratory search",
  }[shape] ?? "Shaped plan";
  const projectTitle = mission ? `${label} for ${mission.doc.title}` : `${label} for SWARM orchestration substrate`;
  const decisions = [
    governAction(root, agent, "work.project.create", { kind: "project", title: projectTitle }, options),
    governAction(root, agent, "work.workitem.create", { kind: "workitem", title: projectTitle }, options),
  ];
  const denied = decisions.find((decision) => !decision.admitted);
  if (denied) return { handled: true, reply: rejection(agent, denied.action, denied), governance: decisions, work: [] };

  const parent = mission?.doc.id ?? "";
  const convergenceCriteria = convergenceCriteriaFor(shape);
  const project = createWorkObject(root, "project", {
    title: projectTitle,
    goal: mission?.doc.goal ?? "Build SWARM into a governed agentic orchestration platform",
    parent,
    createdBy: agent.name,
    office: officeNameFor(agent),
    priority: "high",
    coordination: shape,
    expectedCostShape: shape,
    convergenceCriteria,
    evidence: "SWARM ledger/cost-Laplacian roadmap: plans expose cost shape and convergence criteria for non-default coordination",
  }, options);

  const itemSpecs = {
    "fan-out": [
      {
        title: "Survey independent evidence branch",
        skill: "research.synthesize",
        postcondition: "evidence branch records findings or obstruction residue",
      },
      {
        title: "Prototype independent implementation branch",
        skill: "tool.files.write",
        postcondition: "implementation branch records changed capability or obstruction residue",
      },
      {
        title: "Verify independent risk branch",
        skill: "tests.run",
        postcondition: "risk branch records verification result or obstruction residue",
      },
    ],
    "audit-fix-loop": [
      {
        title: "Implement candidate change for audit",
        skill: "tool.files.write",
        postcondition: "candidate implementation is ready for review",
      },
      {
        title: "Audit candidate change",
        skill: "governance.audit",
        handoffPredicate: "candidate implementation is ready for review",
        postcondition: "review approves the candidate or records rejected repair obligations",
      },
      {
        title: "Repair rejected audit findings",
        skill: "tool.files.write",
        handoffPredicate: "review records rejected repair obligations",
        postcondition: "repair execution addresses every rejected finding or records obstruction residue",
      },
    ],
    "exploratory-search": [
      {
        title: "Frame exploratory question",
        skill: "research.synthesize",
        postcondition: "search question names uncertainty, evidence target, and acceptance shape",
      },
      {
        title: "Collect search evidence",
        skill: "research.synthesize",
        handoffPredicate: "search question names the evidence target",
        postcondition: "evidence residue names findings, contradictions, and unknowns",
      },
      {
        title: "Settle bounded next path",
        skill: "research.synthesize",
        handoffPredicate: "evidence residue is recorded",
        postcondition: "next settled question and bounded implementation path are recorded",
      },
    ],
  }[shape];

  const items = [];
  for (const spec of itemSpecs) {
    const prior = items.at(-1);
    const dependsOn = shape === "fan-out" || !prior ? [] : [prior.doc.id];
    items.push(createWorkObject(root, "workitem", {
      title: spec.title,
      goal: spec.title,
      parent: project.doc.id,
      partOf: project.doc.id,
      dependsOn,
      handoffPredicate: spec.handoffPredicate ?? "",
      precondition: spec.handoffPredicate ?? "",
      postcondition: spec.postcondition,
      coordination: shape,
      expectedCostShape: shape,
      convergenceCriteria,
      requiredSkill: spec.skill,
      ...accessShapeForSkill(spec.skill),
      priority: dependsOn.length ? "normal" : "high",
      createdBy: agent.name,
      office: officeNameFor(agent),
      evidence: "non-default plan cost shape records coordination pattern and convergence criteria",
    }, options));
  }

  return {
    handled: true,
    reply: [
      `Planned ${shape}: ${project.doc.title}`,
      `Project id: ${project.doc.id}`,
      `Mission: ${mission?.doc.title ?? "none found; created standalone plan"}`,
      `Cost shape: ${project.doc.expectedCostShape}`,
      `Convergence: ${project.doc.convergenceCriteria}`,
      "Work items:",
      ...items.map((item) => `- ${item.doc.title} [${item.doc.requiredSkill}]${item.doc.dependsOn.length ? ` after ${item.doc.dependsOn.join(", ")}` : ""}`),
    ].join("\n"),
    governance: decisions,
    work: [project, ...items],
    actions: ["work.project.create", "work.workitem.create"],
  };
}

function dispatchReadyWork(root, agent, _prompt, options = {}) {
  const dispatch = dispatchNextWork(root, agent, options);
  if (!dispatch.decision.admitted) {
    return {
      handled: true,
      reply: rejection(agent, "work.dispatch", dispatch.decision),
      governance: [dispatch.decision],
      work: [],
      events: [],
      readiness: [],
      dispatch,
      actions: ["work.dispatch"],
    };
  }

  const readiness = dispatch.witnesses.map((entry) => entry.readiness);
  if (!dispatch.dispatched) {
    return {
      handled: true,
      reply: [
        "No work item is dispatch-ready.",
        `Readiness witnesses: ${readiness.length}`,
        ...readiness.slice(0, 3).map((trace) => `- ${trace.doc.workTitle}: ${trace.doc.composite} (${trace.path})`),
      ].join("\n"),
      governance: [dispatch.decision],
      work: [],
      events: [],
      readiness,
      dispatch,
      actions: ["work.dispatch"],
      traces: readiness.map((trace) => trace.path),
    };
  }

  const selected = dispatch.selected.work;
  const assignment = dispatch.assignment;
  return {
    handled: true,
    reply: [
      `Dispatched work: ${selected.doc.title}`,
      `Assigned to: ${assignment.doc.toOffice}`,
      `Readiness: ${dispatch.selected.readiness.doc.composite}`,
      `Readiness path: ${dispatch.selected.readiness.path}`,
      `Assignment path: ${assignment.path}`,
    ].join("\n"),
    governance: [dispatch.decision],
    work: [selected],
    events: [assignment],
    readiness,
    dispatch,
    actions: ["work.dispatch", "work.assignment.create"],
    traces: [dispatch.selected.readiness.path, assignment.path],
  };
}

function leaderDispatchReadyWork(root, agent, prompt, options = {}) {
  const requestDecision = governAction(root, agent, "work.dispatch.request", { kind: "work", title: "next ready work" }, options);
  if (!requestDecision.admitted) {
    return {
      handled: true,
      reply: rejection(agent, "work.dispatch.request", requestDecision),
      governance: [requestDecision],
      work: [],
      events: [],
      readiness: [],
      dispatch: null,
      actions: ["work.dispatch.request"],
    };
  }

  const delegated = localOfficeAgent("orchestrator");
  const dispatch = dispatchNextWork(root, delegated, {
    ...options,
    delegatedBy: agent.name,
    delegationOffice: officeNameFor(agent),
    delegationAction: "work.dispatch.request",
    delegationDecisionPath: requestDecision.log,
  });
  const readiness = dispatch.witnesses.map((entry) => entry.readiness);
  const governance = [requestDecision, dispatch.decision];

  if (!dispatch.decision.admitted) {
    return {
      handled: true,
      reply: rejection(delegated, "work.dispatch", dispatch.decision),
      governance,
      work: [],
      events: [],
      readiness,
      dispatch,
      actions: ["work.dispatch.request"],
      traces: readiness.map((trace) => trace.path),
    };
  }

  if (!dispatch.dispatched) {
    return {
      handled: true,
      reply: [
        "No work item is dispatch-ready.",
        "Leader-mediated dispatch request delegated to orchestrator.",
        `Readiness witnesses: ${readiness.length}`,
        ...readiness.slice(0, 3).map((trace) => `- ${trace.doc.workTitle}: ${trace.doc.composite} (${trace.path})`),
      ].join("\n"),
      governance,
      work: [],
      events: [],
      readiness,
      dispatch,
      actions: ["work.dispatch.request"],
      traces: readiness.map((trace) => trace.path),
    };
  }

  const selected = dispatch.selected.work;
  const assignment = dispatch.assignment;
  return {
    handled: true,
    reply: [
      `Dispatched work: ${selected.doc.title}`,
      "Leader-mediated dispatch request delegated to orchestrator.",
      `Assigned to: ${assignment.doc.toOffice}`,
      `Readiness: ${dispatch.selected.readiness.doc.composite}`,
      `Readiness path: ${dispatch.selected.readiness.path}`,
      `Assignment path: ${assignment.path}`,
    ].join("\n"),
    governance,
    work: [selected],
    events: [assignment],
    readiness,
    dispatch,
    actions: ["work.dispatch.request"],
    traces: [dispatch.selected.readiness.path, assignment.path],
  };
}

function latestProjectForPrompt(root, prompt) {
  const projects = listWorkObjects(root, { kind: "project" });
  if (!projects.length) return null;
  const lower = String(prompt).toLowerCase();
  const idMatch = projects.find((project) => lower.includes(String(project.doc.id).toLowerCase()));
  if (idMatch) return idMatch;
  return latestWorkObject(root, "project", prompt) ?? projects[0];
}

function claimObject(tuple, role) {
  return tuple?.elements?.find((element) => element.role === role)?.claim?.object;
}

function writePlanCompositionWitnessReport(root, project, composition, decision, actor, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const tuple = composition?.tuplet ?? {};
  const operation = composition?.operation ?? claimObject(tuple, "operation") ?? "unknown";
  const id = stableId(["plan-composition-witness", project.doc.id, operation, decision.id, now], "report");
  const term = `reports/plan-composition-witness/${id}`;
  const tracePaths = [decision.log];
  const report = writeTrace(root, term, {
    kind: "swarm.report.plan_composition_witness",
    id,
    reportKind: "plan-composition-witness",
    created: now,
    actor: actor.name,
    office: officeNameFor(actor),
    projectId: project.doc.id,
    projectTerm: project.term,
    projectTitle: project.doc.title,
    operation,
    witnessed: true,
    childCount: composition?.childCount ?? 0,
    childIds: composition?.childIds ?? [],
    childTitles: composition?.childTitles ?? [],
    inBoundaryCells: claimObject(tuple, "in-boundary") ?? [],
    outBoundaryCells: claimObject(tuple, "out-boundary") ?? [],
    taskCobordisms: claimObject(tuple, "task-cobordisms") ?? [],
    compositionLaw: claimObject(tuple, "composition-law") ?? "",
    governanceDecisionId: decision.id,
    governanceDecisionTerm: decision.term,
    governanceDecisionPath: decision.log,
    proofPayload: {
      tuple,
      coordinationRow: composition ?? {},
    },
    tracePaths,
    evidence: "witness traces are concrete carriers for admitted judgments; Frobenius fan-in/out dispatch needs a replayable merge/split witness, not a free-text label",
  }, { ...options, t: id });
  return {
    ...report,
    tracePaths: [...tracePaths, report.path],
  };
}

function recordPlanCompositionWitness(root, agent, prompt, options = {}) {
  const project = latestProjectForPrompt(root, prompt);
  if (!project) {
    return {
      handled: true,
      reply: "No project found for a plan-composition witness.",
      governance: [],
      work: [],
      reports: [],
      actions: ["work.plan-composition.witness"],
    };
  }

  const composition = analyzeCoordinationPatterns(root).composition.rows.find((row) => row.planId === project.doc.id);
  const operation = composition?.operation ?? "unknown";
  const decision = governAction(root, agent, "work.plan-composition.witness", {
    kind: "project",
    title: project.doc.title,
    operation,
    childCount: composition?.childCount ?? 0,
  }, options);
  if (!decision.admitted) {
    return { handled: true, reply: rejection(agent, "work.plan-composition.witness", decision), governance: [decision], work: [], reports: [] };
  }
  const witnessReport = writePlanCompositionWitnessReport(root, project, composition, decision, agent, options);

  const report = buildWorkObjectReport(root, "project", {
    id: project.doc.id,
    title: project.doc.title,
    goal: project.doc.goal,
    status: project.doc.status,
    parent: project.doc.parent,
    partOf: project.doc.partOf,
    dependsOn: project.doc.dependsOn,
    handoffPredicate: project.doc.handoffPredicate,
    precondition: project.doc.precondition,
    postcondition: project.doc.postcondition,
    coordination: project.doc.coordination,
    expectedCostShape: project.doc.expectedCostShape,
    convergenceCriteria: project.doc.convergenceCriteria,
    costCeiling: project.doc.costCeiling,
    governanceBudget: project.doc.governanceBudget,
    readPaths: project.doc.readPaths,
    writePaths: project.doc.writePaths,
    worktreeIsolation: project.doc.worktreeIsolation,
    worktreePath: project.doc.worktreePath,
    developmentStyle: project.doc.developmentStyle,
    developmentPhase: project.doc.developmentPhase,
    commensurateWith: project.doc.commensurateWith,
    planCompositionWitness: `leader-governed ${operation}`,
    frobeniusWitness: `leader-governed ${operation}`,
    mergeSplitWitness: `leader-governed ${operation}`,
    compositionWitnessPath: witnessReport.path,
    frobeniusWitnessPath: witnessReport.path,
    evidence: [
      project.doc.evidence,
      "leader-mediated plan-composition witness: witness report path is the authoritative merge/split witness",
    ].filter(Boolean).join("; "),
    requiredSkill: project.doc.requiredSkill,
    priority: project.doc.priority,
    createdBy: project.doc.createdBy || agent.name,
    office: project.doc.office || officeNameFor(agent),
    action: "work.plan-composition.witness",
  }, options);

  const admittedReport = {
    ...report,
    status: "admitted",
    admission: {
      decisionId: decision.id,
      decisionTerm: decision.term,
      decisionPath: decision.log,
      admittedBy: decision.actor,
      policy: "office-capability",
      reason: decision.reason,
    },
    tracePaths: [decision.log],
  };
  const updated = commitWorkObjectReport(root, admittedReport, options);

  return {
    handled: true,
    reply: [
      `Recorded plan-composition witness for project: ${updated.doc.title}`,
      `Project id: ${updated.doc.id}`,
      `Composition: ${operation}`,
      `Witness path: ${witnessReport.path}`,
      `Governance path: ${decision.log}`,
      "Governance: admitted by office-capability policy",
    ].join("\n"),
    governance: [decision],
    work: [updated],
    reports: [witnessReport, updated],
    actions: ["work.plan-composition.witness"],
    traces: [decision.log, witnessReport.path, updated.log],
  };
}

function workById(root, workId) {
  return listWorkObjects(root).find((record) => record.doc.id === workId) ?? null;
}

function assignmentWithStatus(root, officeName, statuses) {
  for (const assignment of listEvents(root, { eventType: "assignment", toOffice: officeName })) {
    const work = workById(root, assignment.doc.workId);
    if (!work) return { assignment, work: null, status: null };
    const status = deriveWorkStatus(root, work);
    if (status.assignment?.term === assignment.term && statuses.includes(status.status)) {
      return { assignment, work, status };
    }
  }
  return { assignment: null, work: null, status: null };
}

function firstAssignmentWithStatus(root, statuses) {
  for (const assignment of listEvents(root, { eventType: "assignment" })) {
    const work = workById(root, assignment.doc.workId);
    if (!work) return { assignment, work: null, status: null };
    const status = deriveWorkStatus(root, work);
    if (status.assignment?.term === assignment.term && statuses.includes(status.status)) {
      return { assignment, work, status };
    }
  }
  return { assignment: null, work: null, status: null };
}

function executionTarget(root, prompt, statuses) {
  const officeName = officeNameFromPrompt(prompt);
  if (officeName) return { officeName, ...assignmentWithStatus(root, officeName, statuses) };
  const target = firstAssignmentWithStatus(root, statuses);
  return { officeName: target.assignment?.doc.toOffice ?? "", ...target };
}

function executeAssignedWork(root, agent, state, options = {}) {
  const action = state === "started" ? "work.execution.start" : "work.execution.complete";
  const statuses = state === "started" ? ["assigned"] : ["active"];
  const { assignment, work } = assignmentWithStatus(root, officeNameFor(agent), statuses);
  if (!assignment) {
    return {
      handled: true,
      reply: `No pending assignment found for ${officeNameFor(agent)}.`,
      governance: [],
      work: [],
      events: [],
      actions: [action],
    };
  }
  if (!work) {
    return {
      handled: true,
      reply: `Assignment points at missing work ${assignment.doc.workId}.`,
      governance: [],
      work: [],
      events: [],
      actions: [action],
      traces: [assignment.path],
    };
  }
  const event = executionEvent(root, work, agent, state, {
    assignmentTerm: assignment.term,
    assignmentPath: assignment.path,
    delegatedBy: options.delegatedBy ?? "",
    delegationOffice: options.delegationOffice ?? "",
    delegationAction: options.delegationAction ?? "",
    delegationDecisionPath: options.delegationDecisionPath ?? "",
  }, options);
  const status = deriveWorkStatus(root, work);
  const verb = state === "started" ? "Started" : "Completed";
  return {
    handled: true,
    reply: [
      `${verb} work: ${work.doc.title}`,
      `Assignment path: ${assignment.path}`,
      `Execution path: ${event.path}`,
      `Derived status: ${status.status}`,
    ].join("\n"),
    governance: [],
    work: [work],
    events: [event],
    status: [status],
    actions: [action],
    traces: [assignment.path, event.path],
  };
}

function startAssignedWork(root, agent, _prompt, options = {}) {
  return executeAssignedWork(root, agent, "started", options);
}

function completeAssignedWork(root, agent, _prompt, options = {}) {
  return executeAssignedWork(root, agent, "completed", options);
}

function leaderExecuteAssignedWork(root, agent, prompt, state, options = {}) {
  const requestAction = state === "started" ? "work.execution.start.request" : "work.execution.complete.request";
  const delegatedAction = state === "started" ? "work.execution.start" : "work.execution.complete";
  const statuses = state === "started" ? ["assigned"] : ["active"];
  const requestDecision = governAction(root, agent, requestAction, { kind: "work", title: `${state} assigned work` }, options);
  if (!requestDecision.admitted) {
    return {
      handled: true,
      reply: rejection(agent, requestAction, requestDecision),
      governance: [requestDecision],
      work: [],
      events: [],
      actions: [requestAction],
    };
  }

  const target = executionTarget(root, prompt, statuses);
  if (!target.assignment) {
    const label = state === "started" ? "pending" : "active";
    const office = target.officeName || "any office";
    return {
      handled: true,
      reply: `No ${label} assignment found for ${office}.`,
      governance: [requestDecision],
      work: [],
      events: [],
      actions: [requestAction],
    };
  }
  if (!target.work) {
    return {
      handled: true,
      reply: `Assignment points at missing work ${target.assignment.doc.workId}.`,
      governance: [requestDecision],
      work: [],
      events: [],
      actions: [requestAction],
      traces: [target.assignment.path],
    };
  }

  const delegated = localOfficeAgent(target.officeName);
  const executionDecision = governAction(root, delegated, delegatedAction, { kind: "work", title: target.work.doc.title }, options);
  if (!executionDecision.admitted) {
    return {
      handled: true,
      reply: rejection(delegated, delegatedAction, executionDecision),
      governance: [requestDecision, executionDecision],
      work: [target.work],
      events: [],
      actions: [requestAction],
      traces: [target.assignment.path],
    };
  }

  const result = executeAssignedWork(root, delegated, state, {
    ...options,
    delegatedBy: agent.name,
    delegationOffice: officeNameFor(agent),
    delegationAction: requestAction,
    delegationDecisionPath: requestDecision.log,
  });
  const verb = state === "started" ? "start" : "completion";
  return {
    ...result,
    reply: [
      result.reply,
      `Leader-mediated execution ${verb} request delegated to ${target.officeName}.`,
    ].join("\n"),
    governance: [requestDecision, executionDecision],
    actions: [requestAction],
  };
}

function reviewCompletedWork(root, agent, _prompt, options = {}) {
  const completed = listWorkObjects(root)
    .map((work) => ({ work, status: deriveWorkStatus(root, work) }))
    .filter((entry) => entry.status.status === "done")
    .at(-1);
  if (!completed) {
    return {
      handled: true,
      reply: "No completed work found for review.",
      governance: [],
      work: [],
      events: [],
      actions: ["work.review"],
    };
  }
  const event = reviewEvent(root, completed.work, agent, "approved", {
    targetEventPath: completed.status.execution?.path ?? "",
    targetEventTerm: completed.status.execution?.term ?? "",
    delegatedBy: options.delegatedBy ?? "",
    delegationOffice: options.delegationOffice ?? "",
    delegationAction: options.delegationAction ?? "",
    delegationDecisionPath: options.delegationDecisionPath ?? "",
  }, options);
  return {
    handled: true,
    reply: [
      `Reviewed work: ${completed.work.doc.title}`,
      "Decision: approved",
      `Review path: ${event.path}`,
    ].join("\n"),
    governance: [],
    work: [completed.work],
    events: [event],
    status: [deriveWorkStatus(root, completed.work)],
    actions: ["work.review"],
    traces: [event.path],
  };
}

function leaderReviewCompletedWork(root, agent, prompt, options = {}) {
  const requestAction = "work.review.request";
  const delegatedAction = "work.review";
  const requestDecision = governAction(root, agent, requestAction, { kind: "work", title: "completed work review" }, options);
  if (!requestDecision.admitted) {
    return {
      handled: true,
      reply: rejection(agent, requestAction, requestDecision),
      governance: [requestDecision],
      work: [],
      events: [],
      actions: [requestAction],
    };
  }

  const delegated = localOfficeAgent("governance");
  const reviewDecision = governAction(root, delegated, delegatedAction, { kind: "work", title: "completed work review" }, {
    ...options,
    costWitness: true,
  });
  if (!reviewDecision.admitted) {
    return {
      handled: true,
      reply: rejection(delegated, delegatedAction, reviewDecision),
      governance: [requestDecision, reviewDecision],
      work: [],
      events: [],
      actions: [requestAction],
    };
  }

  const result = reviewCompletedWork(root, delegated, prompt, {
    ...options,
    delegatedBy: agent.name,
    delegationOffice: officeNameFor(agent),
    delegationAction: requestAction,
    delegationDecisionPath: requestDecision.log,
  });
  return {
    ...result,
    reply: [
      result.reply,
      "Leader-mediated review request delegated to governance.",
    ].join("\n"),
    governance: [requestDecision, reviewDecision],
    actions: [requestAction],
  };
}

function formatTokenCount(value) {
  return String(Number(value) || 0);
}

function formatProviderRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 5).map((row) => {
    const unknown = row.unknownUsageCount ? `, unknown usage: ${row.unknownUsageCount}` : "";
    return `- ${row.key}: calls ${row.providerCallCount}, tokens ${formatTokenCount(row.totalTokens)}${unknown}`;
  });
}

function formatOfficeActionRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 5).map((row) => {
    return [
      `- ${row.key}: actions ${row.officeActionCount}`,
      `governance ${row.governanceDecisionCount}`,
      `work ${row.workRecordCount}`,
      `events ${row.eventRecordCount}`,
      `readiness ${row.readinessWitnessCount}`,
      `status ${row.statusRecordCount}`,
    ].join(", ");
  });
}

function formatTraceLedgerRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 5).map((row) => {
    return [
      `- ${row.key}: rows ${row.traceLedgerCount}`,
      `events ${row.eventRecordCount}`,
      `readiness ${row.readinessWitnessCount}`,
      `reports ${row.reportRecordCount}`,
      `work ${row.workRecordCount}`,
    ].join(", ");
  });
}

function formatMessageLedgerRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 5).map((row) => {
    return [
      `- ${row.key}: rows ${row.messageLedgerCount}`,
      `local ${row.localMessageCount}`,
      `provider ${row.providerMessageCount}`,
      `settled ${row.settledMessageCount}`,
    ].join(", ");
  });
}

function formatGovernanceLedgerRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 5).map((row) => {
    return [
      `- ${row.key}: decisions ${row.governanceDecisionLedgerCount}`,
      `admitted ${row.admittedDecisionCount}`,
      `rejected ${row.rejectedDecisionCount}`,
    ].join(", ");
  });
}

function formatToolLedgerRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 5).map((row) => {
    return [
      `- ${row.key}: calls ${row.toolCallCount}`,
      `read ${row.readToolCallCount}`,
      `write ${row.writeToolCallCount}`,
      `compute ${row.computeToolCallCount}`,
      `ok ${row.okToolCallCount}`,
      `failed ${row.failedToolCallCount}`,
    ].join(", ");
  });
}

function formatCostBottlenecks(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 6).map((row) => `- ${row}`);
}

function formatCostRelations(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 6).map((row) => `- ${row.relation}: ${row.count}`);
}

function formatEmbodiedCostCoordinates(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 6).map((row) => {
    const objects = (row.objects ?? []).slice(0, 2).join(" | ") || "none";
    return `- ${row.coordinate}: claims ${row.count}, work ${row.workIds?.length ?? 0}, objects ${objects}`;
  });
}

function formatCutVertices(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 5).map((row) => `- ${row.id}: +${row.componentIncrease} components`);
}

function formatBridgeEdges(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 5).map((row) => `- ${row.from} -> ${row.to} (${row.relation}): +${row.componentIncrease} components`);
}

function formatCostFibers(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 6).map((row) => `- ${row.predicate}: ${row.value} (${row.count ?? row.supportPaths?.length ?? 0}) - ${row.reason}`);
}

function formatClaimPhases(rows) {
  if (!rows.length) return ["- none"];
  return rows.map((row) => [
    `- ${row.phase}: ${row.predicate}`,
    `value ${row.value || "n/a"}`,
    `count ${row.count}`,
  ].join(", "));
}

function formatLedgerFoldRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 6).map((row) => [
    `- ${row.label ?? row.key}: rows ${row.entryCount}`,
    `messages ${row.messageCount}`,
    `provider calls ${row.providerCallCount}`,
    `tool calls ${row.toolCallCount}`,
    `tokens ${formatTokenCount(row.totalTokens)}`,
    `unknown usage ${row.unknownUsageCount}`,
    `work ${row.workRecordCount}`,
  ].join(", "));
}

function formatOperationsWorkRows(rows, empty = "- none") {
  if (!rows.length) return [empty];
  return rows.slice(0, 6).map((row) => {
    const office = row.office ? ` -> ${row.office}` : "";
    const skill = row.requiredSkill ? ` [${row.requiredSkill}]` : "";
    return `- ${row.title}${skill}${office}`;
  });
}

function formatOperationsHeldRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 6).map((row) => {
    const blockers = row.blockers?.length
      ? row.blockers.map((blocker) => `${blocker.name}:${blocker.value}`).join(", ")
      : "no blocker recorded";
    return `- ${row.title} (${row.readiness}) [${row.requiredSkill || "no skill"}] - ${blockers}`;
  });
}

function formatOperationsBuckets(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 8).map((row) => `- ${row.key}: ${row.count}`);
}

function formatLeaderActionRequests(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 8).map((row) => {
    const tool = row.requestedTool ? `, tool ${row.requestedTool}` : "";
    return `- ${row.kind}: ${row.workTitle} -> ${row.requestedAction}${tool} (${row.reason})`;
  });
}

function formatToolPermissionRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 8).map((row) => `- ${row.tool}: ${row.scope}, ${row.sandbox}, ${row.authorization}`);
}

function formatPrivilegedWorkRows(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 8).map((row) => `- ${row.title}: ${row.tool}, ${row.sandbox}`);
}

function formatOperationalRisks(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 8).map((row) => `- ${row.severity}: ${row.kind} (${row.count}) - ${row.reason}`);
}

function formatWorkspaceLaneCounts(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 8).map((row) => `- ${row.key}: ${row.count}`);
}

function formatWorkspaceWorkRows(rows, empty = "- none") {
  if (!rows.length) return [empty];
  return rows.slice(0, 6).map((row) => {
    const skill = row.requiredSkill ? ` [${row.requiredSkill}]` : "";
    const priority = row.priority && row.priority !== "normal" ? ` (${row.priority})` : "";
    return `- ${row.title}${skill}${priority} -> ${row.lane}`;
  });
}

function formatWorkspaceQueues(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 6).map((row) => {
    const lanes = row.lanes.filter((lane) => lane.count).map((lane) => `${lane.lane}:${lane.count}`).join(", ") || "empty";
    return `- ${row.office}: ${row.count} (${lanes})`;
  });
}

function formatWorkspaceProjects(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 6).map((row) => {
    const lanes = row.lanes.filter((lane) => lane.count).map((lane) => `${lane.lane}:${lane.count}`).join(", ") || "empty";
    return `- ${row.title}: ${row.childCount} (${lanes})`;
  });
}

function formatWorkspaceDecisions(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 8).map((row) => {
    const tool = row.requestedTool ? `, tool ${row.requestedTool}` : "";
    return `- ${row.kind}: ${row.workTitle} -> ${row.requestedAction}${tool} (${row.reason})`;
  });
}

function reportCoordinationWorkspace(root, agent, _prompt, options = {}) {
  const decision = governAction(root, agent, "coordination.report", { kind: "workspace", title: "work coordination workspace" }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "coordination.report", decision), governance: [decision], work: [] };

  const workspace = coordinationWorkspace(root, options);
  return {
    handled: true,
    reply: [
      "SWARM work coordination workspace",
      `Generated: ${workspace.generatedAt}`,
      "Research basis:",
      ...workspace.researchBasis.map((basis) => `- ${basis}`),
      "Summary:",
      `Work rows: ${workspace.summary.workRows}`,
      `Offices: ${workspace.summary.offices}`,
      `Projects: ${workspace.summary.projects}`,
      `Governance holds: ${workspace.summary.governanceHolds}`,
      `Decision points: ${workspace.summary.decisionPoints}`,
      `Follow-ups: ${workspace.summary.followUps}`,
      "Lanes:",
      ...formatWorkspaceLaneCounts(workspace.summary.lanes),
      "Office queues:",
      ...formatWorkspaceQueues(workspace.officeQueues),
      "Project views:",
      ...formatWorkspaceProjects(workspace.projectViews),
      "Decision points:",
      ...formatWorkspaceDecisions(workspace.decisionPoints),
      "Follow-ups:",
      ...formatWorkspaceWorkRows(workspace.followUps),
      "Next by office:",
      ...workspace.officeQueues.flatMap((queue) => [
        `${queue.office}:`,
        ...formatWorkspaceWorkRows(queue.next),
      ]).slice(0, 24),
    ].join("\n"),
    governance: [decision],
    coordination: workspace,
    work: listWorkObjects(root),
    actions: ["coordination.report"],
  };
}

function reportOperationsBoard(root, agent, _prompt, options = {}) {
  const decision = governAction(root, agent, "operations.report", { kind: "operations", title: "organizational operations board" }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "operations.report", decision), governance: [decision], work: [] };

  const board = operationsBoard(root, options);
  return {
    handled: true,
    reply: [
      "SWARM organizational operations board",
      `Generated: ${board.generatedAt}`,
      "Research basis:",
      ...board.researchBasis.map((basis) => `- ${basis}`),
      "Intake:",
      `Work records: ${board.intake.totalWork}`,
      `Missions: ${board.intake.missions}`,
      `Campaigns: ${board.intake.campaigns}`,
      `Projects: ${board.intake.projects}`,
      `Work items: ${board.intake.workItems}`,
      `Tasks: ${board.intake.tasks}`,
      `Open unassigned: ${board.intake.openUnassigned}`,
      `Intake reports: ${board.intake.intakeReports}`,
      `Admitted intake reports: ${board.intake.admittedIntakeReports}`,
      `Rejected intake reports: ${board.intake.rejectedIntakeReports}`,
      "Intake by work kind:",
      ...formatOperationsBuckets(board.intake.intakeKinds),
      "Lifecycle:",
      `Open: ${board.lifecycle.counts.open ?? 0}`,
      `Assigned: ${board.lifecycle.counts.assigned ?? 0}`,
      `Active: ${board.lifecycle.counts.active ?? 0}`,
      `Done: ${board.lifecycle.counts.done ?? 0}`,
      `Blocked: ${board.lifecycle.counts.blocked ?? 0}`,
      `Dependency-held: ${board.lifecycle.dependencyHeld.length}`,
      "Dispatch queue:",
      `Dispatcher office: ${board.dispatch.dispatcherOffice}`,
      `Dispatchable: ${board.dispatch.totalDispatchable}`,
      `Ready: ${board.dispatch.readyCount}`,
      `Held: ${board.dispatch.heldCount}`,
      "Ready work:",
      ...formatOperationsWorkRows(board.dispatch.ready),
      "Held work:",
      ...formatOperationsHeldRows(board.dispatch.held),
      "Office role load:",
      ...formatOperationsBuckets(board.offices.roleLoad),
      "Active office load:",
      ...formatOperationsBuckets(board.offices.activeLoad),
      "Tool permissions:",
      `Policies: ${board.tools.policyCount}`,
      `Privileged policies: ${board.tools.privilegedPolicyCount}`,
      `Observed tool calls: ${board.tools.observedToolCalls}`,
      `Observed write tool calls: ${board.tools.observedWriteToolCalls}`,
      "Privileged policies:",
      ...formatToolPermissionRows(board.tools.privilegedPolicies),
      "Privileged work:",
      ...formatPrivilegedWorkRows(board.tools.privilegedWork),
      "Leader action requests:",
      ...formatLeaderActionRequests(board.leaderActionRequests),
      "Leader action request reports:",
      `Reports: ${board.leaderActionRequestReports.total}`,
      `Admitted: ${board.leaderActionRequestReports.admitted}`,
      `Rejected: ${board.leaderActionRequestReports.rejected}`,
      "Request report kinds:",
      ...formatOperationsBuckets(board.leaderActionRequestReports.requestKinds),
      "Request report actions:",
      ...formatOperationsBuckets(board.leaderActionRequestReports.requestedActions),
      "Safety envelope reports:",
      `Reports: ${board.safetyEnvelopeReports.total}`,
      `Admitted: ${board.safetyEnvelopeReports.admitted}`,
      `Rejected: ${board.safetyEnvelopeReports.rejected}`,
      "Safety report tools:",
      ...formatOperationsBuckets(board.safetyEnvelopeReports.requestedTools),
      "Safety report actions:",
      ...formatOperationsBuckets(board.safetyEnvelopeReports.requestedActions),
      "Accountability:",
      `Ledger rows: ${board.accountability.ledgerRows}`,
      `Total tokens: ${formatTokenCount(board.accountability.totalTokens)}`,
      `Unknown usage rows: ${board.accountability.unknownUsageCount}`,
      "Budget questions:",
      ...board.accountability.budgetQuestions.map((question) => `- ${question}`),
      "Operational risks:",
      ...formatOperationalRisks(board.accountability.risks),
      "Cost bottlenecks:",
      ...formatCostBottlenecks(board.accountability.costBottlenecks),
    ].join("\n"),
    governance: [decision],
    operations: board,
    work: listWorkObjects(root),
    actions: ["operations.report"],
  };
}

function recordLeaderActionRequests(root, agent, _prompt, options = {}) {
  const board = operationsBoard(root, options);
  const decision = governAction(root, agent, "leader-action.request", {
    kind: "operations",
    title: "leader action requests from operations board",
    requestCount: board.leaderActionRequests.length,
  }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "leader-action.request", decision), governance: [decision], work: [] };

  const report = writeLeaderActionRequestReport(
    root,
    buildLeaderActionRequestReport(root, board, agent, decision, options),
    options,
  );

  return {
    handled: true,
    reply: [
      "Recorded leader action request report.",
      `Requests: ${report.doc.requestCount}`,
      `Request kinds: ${report.doc.requestKinds.join(", ") || "none"}`,
      `Requested actions: ${report.doc.requestedActions.join(", ") || "none"}`,
      `Report path: ${report.path}`,
      "Governance: admitted by office-capability policy",
    ].join("\n"),
    governance: [decision],
    reports: [report],
    operations: board,
    actions: ["leader-action.request"],
    traces: [decision.log, report.path],
  };
}

function recordSafetyEnvelopeReport(root, agent, _prompt, options = {}) {
  const board = operationsBoard(root, options);
  const safetyRequests = board.leaderActionRequests.filter((request) => request.kind === "safety-envelope");
  const decision = governAction(root, agent, "work.safety-envelope.report", {
    kind: "operations",
    title: "safety envelope requests from operations board",
    requestCount: safetyRequests.length,
  }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "work.safety-envelope.report", decision), governance: [decision], work: [] };

  const report = writeSafetyEnvelopeReport(
    root,
    buildSafetyEnvelopeReport(root, board, agent, decision, options),
    options,
  );

  return {
    handled: true,
    reply: [
      "Recorded safety-envelope report.",
      `Requests: ${report.doc.requestCount}`,
      `Requested tools: ${report.doc.requestedTools.join(", ") || "none"}`,
      `Requested actions: ${report.doc.requestedActions.join(", ") || "none"}`,
      `Report path: ${report.path}`,
      "Governance: admitted by office-capability policy",
    ].join("\n"),
    governance: [decision],
    reports: [report],
    operations: board,
    actions: ["work.safety-envelope.report"],
    traces: [decision.log, report.path],
  };
}

function severityRank(severity) {
  return { critical: 4, high: 3, warning: 2, info: 1 }[severity] ?? 0;
}

function costAnomalyFindings(root, provider, officeActions, workShape) {
  const findings = [];
  const untracedProviderRows = provider.entries.filter((entry) => !(entry.doc.tracePaths ?? []).length);
  const untracedOfficeRows = officeActions.entries.filter((entry) => !(entry.doc.tracePaths ?? []).length);

  if (provider.summary.unknownUsageCount) {
    findings.push({
      kind: "unknown-provider-usage",
      severity: "warning",
      count: provider.summary.unknownUsageCount,
      reason: "provider ledger rows exist without token usage, so token cost is a predicate rather than a settled scalar",
      evidencePaths: provider.entries.filter((entry) => !entry.doc.usageKnown).map((entry) => entry.path),
    });
  }

  if (untracedProviderRows.length || untracedOfficeRows.length) {
    findings.push({
      kind: "ledger-row-without-trace-path",
      severity: "high",
      count: untracedProviderRows.length + untracedOfficeRows.length,
      reason: "ledger rows without trace paths cannot be replayed back to message, governance, work, or event witnesses",
      evidencePaths: [...untracedProviderRows, ...untracedOfficeRows].map((entry) => entry.path),
    });
  }

  if (workShape.missingLedgerWorkIds.length) {
    findings.push({
      kind: "ledger-cites-missing-work",
      severity: "high",
      count: workShape.missingLedgerWorkIds.length,
      reason: "office-action ledger rows cite work ids that are not present in the current work fold",
      evidencePaths: officeActions.entries.filter((entry) => (entry.doc.workIds ?? []).some((workId) => workShape.missingLedgerWorkIds.includes(workId))).map((entry) => entry.path),
    });
  }

  if (workShape.statuses.counts.blocked) {
    findings.push({
      kind: "blocked-work-cost",
      severity: "warning",
      count: workShape.statuses.counts.blocked,
      reason: "blocked work accumulates coordination and attention cost until repaired or explicitly abandoned",
      evidencePaths: workShape.statuses.entries.filter((entry) => entry.status.status === "blocked").flatMap((entry) => entry.status.tracePaths ?? []),
    });
  }

  if (workShape.statuses.dependencyHeld.length) {
    findings.push({
      kind: "dependency-held-work-cost",
      severity: "info",
      count: workShape.statuses.dependencyHeld.length,
      reason: "dependency-held work marks a handoff cost that should be visible to dispatch and planning",
      evidencePaths: workShape.statuses.dependencyHeld.flatMap((entry) => entry.status.tracePaths ?? []),
    });
  }

  if (workShape.coordination.counts.warning) {
    findings.push({
      kind: "coordination-warning-cost",
      severity: "warning",
      count: workShape.coordination.counts.warning,
      reason: "coordination warnings indicate hidden dependency or handoff resistance in the work graph",
      evidencePaths: [],
    });
  }

  return findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.kind.localeCompare(b.kind));
}

function formatAuditFindings(findings) {
  if (!findings.length) return ["- none"];
  return findings.slice(0, 8).map((finding) => `- ${finding.severity}: ${finding.kind} (${finding.count}) - ${finding.reason}`);
}

function auditCostAnomalies(root, agent, _prompt, options = {}) {
  const action = isLeader(agent) ? "governance.request" : "governance.audit";
  const decision = governAction(root, agent, action, { kind: "ledger", title: "cost anomaly audit" }, {
    ...options,
    costWitness: true,
  });
  if (!decision.admitted) return { handled: true, reply: rejection(agent, action, decision), governance: [decision], work: [] };

  const provider = providerLedgerSummary(root);
  const officeActions = officeActionLedgerSummary(root);
  const workShape = workLedgerShape(root, officeActions.entries);
  const findings = costAnomalyFindings(root, provider, officeActions, workShape);
  const auditDecision = findings.length ? "flagged" : "approved";
  const auditState = findings.length ? "attention-required" : "settled";
  const evidencePaths = uniqueValues(findings.flatMap((finding) => finding.evidencePaths ?? []));
  const event = auditEvent(root, agent, "cost-anomaly", {
    targetKind: "ledger",
    targetTitle: "cost anomaly audit",
    delegatedOffice: "governance",
    decision: auditDecision,
    state: auditState,
    findings,
    tracePaths: evidencePaths,
    note: [
      `providerRows=${provider.entries.length}`,
      `officeActionRows=${officeActions.entries.length}`,
      `unknownUsage=${provider.summary.unknownUsageCount}`,
      `missingWork=${workShape.missingLedgerWorkIds.length}`,
      `blocked=${workShape.statuses.counts.blocked ?? 0}`,
      `dependencyHeld=${workShape.statuses.dependencyHeld.length}`,
    ].join("; "),
    evidence: "SWARM prior-thought feature mining: reviews and audits should write durable decisions; cost is multi-dimensional and anomaly-bearing",
  }, options);

  return {
    handled: true,
    reply: [
      "Cost anomaly audit",
      `Decision: ${auditDecision}`,
      `Audit state: ${auditState}`,
      `Audit path: ${event.path}`,
      `Provider ledger rows: ${provider.entries.length}`,
      `Office action ledger rows: ${officeActions.entries.length}`,
      `Findings: ${findings.length}`,
      ...formatAuditFindings(findings),
    ].join("\n"),
    governance: [decision],
    events: [event],
    ledger: [...provider.entries, ...officeActions.entries],
    status: workShape.statuses.entries.map((entry) => entry.status),
    coordination: workShape.coordination,
    actions: [action],
    traces: [event.path, ...evidencePaths],
  };
}

function formatStatusRows(entries, limit = 5) {
  if (!entries.length) return ["- none"];
  return entries.slice(0, limit).map((entry) => {
    const doc = entry.work.doc;
    const skill = doc.requiredSkill ? ` [${doc.requiredSkill}]` : "";
    return `- ${doc.title} (${doc.workKind}, ${entry.status.status})${skill}`;
  });
}

function reportWorkStatus(root, agent, _prompt, options = {}) {
  const decision = governAction(root, agent, "work.status.report", { kind: "work", title: "work status report" }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "work.status.report", decision), governance: [decision], work: [] };

  const summary = summarizeWorkStatuses(root);
  const byStatus = new Map();
  for (const entry of summary.entries) {
    const status = entry.status.status ?? "open";
    if (!byStatus.has(status)) byStatus.set(status, []);
    byStatus.get(status).push(entry);
  }

  return {
    handled: true,
    reply: [
      "SWARM work status report",
      `Work records: ${summary.total}`,
      `Open: ${summary.counts.open ?? 0}`,
      `Assigned: ${summary.counts.assigned ?? 0}`,
      `Active: ${summary.counts.active ?? 0}`,
      `Done: ${summary.counts.done ?? 0}`,
      `Blocked: ${summary.counts.blocked ?? 0}`,
      `Dependency-held: ${summary.dependencyHeld.length}`,
      "Open work:",
      ...formatStatusRows(byStatus.get("open") ?? []),
      "Assigned work:",
      ...formatStatusRows(byStatus.get("assigned") ?? []),
      "Active work:",
      ...formatStatusRows(byStatus.get("active") ?? []),
      "Done work:",
      ...formatStatusRows(byStatus.get("done") ?? []),
      "Blocked work:",
      ...formatStatusRows(byStatus.get("blocked") ?? []),
      "Dependency-held work:",
      ...formatStatusRows(summary.dependencyHeld),
    ].join("\n"),
    governance: [decision],
    work: summary.entries.map((entry) => entry.work),
    status: summary.entries.map((entry) => entry.status),
    actions: ["work.status.report"],
  };
}

function formatCoordinationFindings(findings) {
  if (!findings.length) return ["- none"];
  return findings.slice(0, 8).map((finding) => {
    const titles = finding.workTitles?.length ? `: ${finding.workTitles.join(" -> ")}` : "";
    return `- ${finding.pattern} (${finding.severity})${titles} — ${finding.reason}`;
  });
}

function formatPlanCompositions(rows) {
  if (!rows.length) return ["- none"];
  return rows.slice(0, 8).map((row) => `- ${row.planTitle}: ${row.operation} (${row.childCount} task cobordisms)`);
}

function reportCoordinationPatterns(root, agent, _prompt, options = {}) {
  const decision = governAction(root, agent, "coordination.report", { kind: "coordination", title: "coordination pattern report" }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "coordination.report", decision), governance: [decision], work: [] };

  const analysis = analyzeCoordinationPatterns(root);
  return {
    handled: true,
    reply: [
      "SWARM coordination pattern report",
      `Work records: ${analysis.workCount}`,
      `Dependency edges: ${analysis.dependencyEdgeCount}`,
      `Pipelines: ${analysis.counts.pipeline}`,
      `Fan-out: ${analysis.counts.fanOut}`,
      `Audit-fix cycles: ${analysis.counts.auditFix}`,
      `Hidden-dependency warnings: ${analysis.counts.hiddenDependency}`,
      `Warnings: ${analysis.counts.warning}`,
      "Plan composition:",
      `Sequential plans: ${analysis.counts.planSequential}`,
      `Tensor plans: ${analysis.counts.planTensor}`,
      `Frobenius-shaped plans: ${analysis.counts.planFrobenius}`,
      `General-poset plans: ${analysis.counts.planGeneral}`,
      ...formatPlanCompositions(analysis.composition.rows),
      "Findings:",
      ...formatCoordinationFindings(analysis.findings),
    ].join("\n"),
    governance: [decision],
    coordination: analysis,
    actions: ["coordination.report"],
  };
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function formatMissionRows(missions) {
  if (!missions.length) return ["- none"];
  return missions.slice(0, 5).map((mission) => `- ${mission.doc.title} (${mission.doc.status ?? "open"})`);
}

function workLedgerShape(root, officeActionEntries) {
  const statuses = summarizeWorkStatuses(root);
  const coordination = analyzeCoordinationPatterns(root);
  const missions = listWorkObjects(root, { kind: "mission" });
  const ledgerWorkIds = uniqueValues(officeActionEntries.flatMap((entry) => entry.doc.workIds ?? []));
  const knownWorkIds = new Set(statuses.entries.map((entry) => entry.work.doc.id));
  const missingLedgerWorkIds = ledgerWorkIds.filter((workId) => !knownWorkIds.has(workId));
  const bottlenecks = [
    statuses.dependencyHeld.length ? `dependency-held work ${statuses.dependencyHeld.length}` : "",
    coordination.counts.warning ? `coordination warnings ${coordination.counts.warning}` : "",
    coordination.counts.fanOut ? `fan-out points ${coordination.counts.fanOut}` : "",
    coordination.counts.auditFix ? `audit-fix cycles ${coordination.counts.auditFix}` : "",
  ].filter(Boolean);

  return {
    missions,
    statuses,
    coordination,
    ledgerWorkIds,
    missingLedgerWorkIds,
    bottleneckShape: bottlenecks.length ? bottlenecks.join("; ") : "none detected",
  };
}

function reportLedgerCosts(root, agent, _prompt, options = {}) {
  const decision = governAction(root, agent, "ledger.report", { kind: "ledger", title: "provider cost report" }, options);
  if (!decision.admitted) return { handled: true, reply: rejection(agent, "ledger.report", decision), governance: [decision], work: [] };

  const provider = providerLedgerSummary(root);
  const messages = messageLedgerSummary(root);
  const officeActions = officeActionLedgerSummary(root);
  const governanceDecisions = governanceDecisionLedgerSummary(root);
  const toolLedger = toolLedgerSummary(root);
  const traceLedger = traceLedgerSummary(root);
  const costGraph = costGraphSummary(root);
  const costDescent = costDescentSummary(root);
  const ledgerFold = ledgerFoldSummary(root);
  const workShape = workLedgerShape(root, officeActions.entries);
  const { entries, summary } = provider;
  return {
    handled: true,
    reply: [
      "Provider ledger cost report",
      `Ledger rows: ${entries.length}`,
      `Provider calls: ${summary.providerCallCount}`,
      `Prompt tokens: ${formatTokenCount(summary.promptTokens)}`,
      `Completion tokens: ${formatTokenCount(summary.completionTokens)}`,
      `Total tokens: ${formatTokenCount(summary.totalTokens)}`,
      `Unknown usage rows: ${summary.unknownUsageCount}`,
      `Money: ${summary.moneyAmount.toFixed(2)} ${summary.moneyCurrency} (${summary.moneyBasis})`,
      `Resource use nonzero: ${summary.resourceUseNonzero}`,
      "By provider:",
      ...formatProviderRows(summary.byProvider),
      "By office:",
      ...formatProviderRows(summary.byOffice),
      "Debit accounts:",
      ...formatProviderRows(summary.byDebitAccount),
      "Message ledger:",
      `Ledger rows: ${messages.entries.length}`,
      `Local messages: ${messages.summary.localMessageCount}`,
      `Provider messages: ${messages.summary.providerMessageCount}`,
      `Settled messages: ${messages.summary.settledMessageCount}`,
      "By message office:",
      ...formatMessageLedgerRows(messages.summary.byOffice),
      "Office action ledger:",
      `Ledger rows: ${officeActions.entries.length}`,
      `Office actions: ${officeActions.summary.officeActionCount}`,
      `Governance decisions: ${officeActions.summary.governanceDecisionCount}`,
      `Work records cited: ${officeActions.summary.workRecordCount}`,
      `Event records cited: ${officeActions.summary.eventRecordCount}`,
      `Readiness witnesses cited: ${officeActions.summary.readinessWitnessCount}`,
      `Status records cited: ${officeActions.summary.statusRecordCount}`,
      "By office action office:",
      ...formatOfficeActionRows(officeActions.summary.byOffice),
      "By capability:",
      ...formatOfficeActionRows(officeActions.summary.byCapability),
      "Governance decision ledger:",
      `Ledger rows: ${governanceDecisions.entries.length}`,
      `Admitted: ${governanceDecisions.summary.admittedDecisionCount}`,
      `Rejected: ${governanceDecisions.summary.rejectedDecisionCount}`,
      "By governance action:",
      ...formatGovernanceLedgerRows(governanceDecisions.summary.byAction),
      "Tool ledger:",
      `Ledger rows: ${toolLedger.entries.length}`,
      `Tool calls: ${toolLedger.summary.toolCallCount}`,
      `Read calls: ${toolLedger.summary.readToolCallCount}`,
      `Write calls: ${toolLedger.summary.writeToolCallCount}`,
      `Compute calls: ${toolLedger.summary.computeToolCallCount}`,
      "By tool:",
      ...formatToolLedgerRows(toolLedger.summary.byTool),
      "By tool scope:",
      ...formatToolLedgerRows(toolLedger.summary.byScope),
      "Trace ledger:",
      `Ledger rows: ${traceLedger.entries.length}`,
      `Trace events: ${traceLedger.summary.eventRecordCount}`,
      `Readiness witnesses: ${traceLedger.summary.readinessWitnessCount}`,
      `Report witnesses: ${traceLedger.summary.reportRecordCount}`,
      `Work records cited: ${traceLedger.summary.workRecordCount}`,
      "By trace kind:",
      ...formatTraceLedgerRows(traceLedger.summary.byTraceKind),
      "Cost graph:",
      `Vertices: ${costGraph.graph.vertexCount}`,
      `Edges: ${costGraph.graph.edgeCount}`,
      `Components: ${costGraph.graph.componentCount}`,
      `Token cost status: ${costGraph.bilattice.tokenCostStatus}`,
      `Unknown is zero: ${costGraph.bilattice.unknownIsZero}`,
      `Tool calls: ${costGraph.dimensions.toolCalls}`,
      `Write tool calls: ${costGraph.dimensions.writeToolCalls}`,
      `Report witnesses: ${costGraph.dimensions.reportWitnesses}`,
      `Embodied cost coordinates: ${costGraph.dimensions.embodiedCostCoordinates}`,
      `Embodied cost claims: ${costGraph.dimensions.embodiedCostClaims}`,
      `Dependency edges: ${costGraph.dimensions.dependencyEdges}`,
      `Dependency-held: ${costGraph.dimensions.dependencyHeld}`,
      `Worktree isolation conflicts: ${costGraph.dimensions.worktreeIsolationConflicts}`,
      `Worktree conflict edges: ${costGraph.dimensions.worktreeConflictEdges}`,
      `Safety envelope gaps: ${costGraph.dimensions.safetyEnvelopeGaps}`,
      `Coordination warnings: ${costGraph.dimensions.coordinationWarnings}`,
      "Embodied cost coordinates:",
      ...formatEmbodiedCostCoordinates(costGraph.embodiedCost.coordinates),
      "Cost graph relations:",
      ...formatCostRelations(costGraph.graph.relationCounts),
      "Removal-sensitive vertices:",
      ...formatCutVertices(costGraph.graph.cutVertices),
      "Bridge edges:",
      ...formatBridgeEdges(costGraph.graph.bridgeEdges),
      "Cost bottlenecks:",
      ...formatCostBottlenecks(costGraph.bottlenecks),
      "Cost descent:",
      `Articulated: ${costDescent.articulated.value} (${costDescent.articulated.vertices} vertices, ${costDescent.articulated.edges} edges)`,
      `Predicated: ${costDescent.predicated.value} (${costDescent.predicated.fiberCount} unsettled fibers)`,
      `Posited: ${costDescent.posited.value} (${costDescent.posited.admittedGovernanceDecisions} admitted governance, ${costDescent.posited.costWitnesses} cost witnesses, ${costDescent.posited.toolRows} tool rows, ${costDescent.posited.traceRows} trace rows)`,
      `Settled: ${costDescent.settled.value} (${costDescent.settled.reason})`,
      "Claim phases:",
      ...formatClaimPhases(costDescent.claimPhaseSummary.phases),
      "Unsettled cost predicates:",
      ...formatCostFibers(costDescent.predicated.fibers),
      "Ledger fold:",
      `Rows: ${ledgerFold.summary.entryCount}`,
      `Work buckets: ${ledgerFold.dimensions.workBuckets}`,
      `Mission buckets: ${ledgerFold.dimensions.missionBuckets}`,
      `Office buckets: ${ledgerFold.dimensions.officeBuckets}`,
      `Provider buckets: ${ledgerFold.dimensions.providerBuckets}`,
      `Capability buckets: ${ledgerFold.dimensions.capabilityBuckets}`,
      `Time buckets (${ledgerFold.dimensions.timeWindow}): ${ledgerFold.dimensions.timeBuckets}`,
      "Ledger fold by mission:",
      ...formatLedgerFoldRows(ledgerFold.byMission),
      "Ledger fold by work item:",
      ...formatLedgerFoldRows(ledgerFold.byWorkItem),
      "Ledger fold by capability:",
      ...formatLedgerFoldRows(ledgerFold.byCapability),
      "Ledger fold by time:",
      ...formatLedgerFoldRows(ledgerFold.byTimeWindow),
      "Work ledger shape:",
      `Missions: ${workShape.missions.length}`,
      ...formatMissionRows(workShape.missions),
      `Work records: ${workShape.statuses.total}`,
      `Unique work records cited: ${workShape.ledgerWorkIds.length}`,
      `Missing cited work records: ${workShape.missingLedgerWorkIds.length}`,
      `Open: ${workShape.statuses.counts.open ?? 0}`,
      `Assigned: ${workShape.statuses.counts.assigned ?? 0}`,
      `Active: ${workShape.statuses.counts.active ?? 0}`,
      `Done: ${workShape.statuses.counts.done ?? 0}`,
      `Blocked: ${workShape.statuses.counts.blocked ?? 0}`,
      `Dependency-held: ${workShape.statuses.dependencyHeld.length}`,
      `Coordination warnings: ${workShape.coordination.counts.warning}`,
      `Bottleneck shape: ${workShape.bottleneckShape}`,
    ].join("\n"),
    governance: [decision],
    ledger: [...entries, ...messages.entries, ...officeActions.entries, ...governanceDecisions.entries, ...toolLedger.entries, ...traceLedger.entries],
    costGraph,
    costDescent,
    ledgerFold,
    status: workShape.statuses.entries.map((entry) => entry.status),
    coordination: workShape.coordination,
    actions: ["ledger.report"],
  };
}

function officeReport(agent) {
  const office = officeFor(agent);
  return [
    `${office.title} office is available.`,
    `Duties: ${(office.duties ?? []).join(", ") || "none declared"}.`,
    `Capabilities: ${agentCapabilities(agent).join(", ") || "none declared"}.`,
  ].join("\n");
}

export function routeOfficeMessage(root, agent, prompt, cognition = {}, options = {}) {
  const lower = String(prompt).toLowerCase();
  let result = null;
  if (agent.provider === "local" && wantsRecordPlanCompositionWitness(prompt)) {
    result = isLeader(agent) ? recordPlanCompositionWitness(root, agent, prompt, options) : leaderWriteBoundary(agent, prompt, "work.plan-composition.witness");
  } else if (agent.provider === "local" && wantsRecordSafetyEnvelopeReport(prompt)) {
    result = isLeader(agent) ? recordSafetyEnvelopeReport(root, agent, prompt, options) : leaderWriteBoundary(agent, prompt, "work.safety-envelope.report");
  } else if (agent.provider === "local" && wantsRecordLeaderActionRequests(prompt)) {
    result = isLeader(agent) ? recordLeaderActionRequests(root, agent, prompt, options) : leaderWriteBoundary(agent, prompt, "leader-action.request");
  } else if (agent.provider === "local" && /\baudit\b/.test(lower) && /\b(cost|costs|anomal(?:y|ies)|ledger|tokens)\b/.test(lower)) {
    result = isLeader(agent) ? auditCostAnomalies(root, agent, prompt, options) : leaderWriteBoundary(agent, prompt, "governance.audit");
  } else if (agent.provider === "local" && !wantsPlanWork(prompt) && /\b(report|summarize|summary|show|display|board|dashboard|brief|workspace|queues?|views?)\b/.test(lower) && /\b(workspace|project views?|coordination workspace|work coordination|personal work|follow[- ]?ups?|decision points?|governance holds?)\b/.test(lower)) {
    result = reportCoordinationWorkspace(root, agent, prompt, options);
  } else if (agent.provider === "local" && !wantsPlanWork(prompt) && /\b(report|summarize|summary|show|display|board|dashboard|brief)\b/.test(lower) && /\b(operations?|operational|organization(?:al)?|intake|triage|dispatch queue|leader action|tool permissions?|accountability)\b/.test(lower)) {
    result = reportOperationsBoard(root, agent, prompt, options);
  } else if (agent.provider === "local" && /\b(report|summarize|summary|balance|cost|costs|ledger|tokens)\b/.test(lower) && /\b(ledger|cost|costs|tokens|provider|balance)\b/.test(lower)) {
    result = reportLedgerCosts(root, agent, prompt, options);
  } else if (agent.provider === "local" && !/\bplan\b/.test(lower) && /\b(coordination|patterns?|analy[sz]e|detect|pipeline|fan[- ]out|audit[- ]fix|hidden[- ]dependency)\b/.test(lower) && /\b(coordination|patterns?|pipeline|fan[- ]out|audit[- ]fix|hidden[- ]dependency|work|swarm|mission)\b/.test(lower)) {
    result = reportCoordinationPatterns(root, agent, prompt, options);
  } else if (agent.provider === "local" && !wantsPlanWork(prompt) && /\b(report|summarize|summary|status|progress|state)\b/.test(lower) && /\b(work|swarm|mission|project|task|tasks|items|status|progress)\b/.test(lower)) {
    result = reportWorkStatus(root, agent, prompt, options);
  } else if (agent.provider === "local" && !isLeader(agent) && wantsLeaderMediatedWrite(prompt)) {
    result = leaderWriteBoundary(agent, prompt);
  } else if (wantsDispatchWork(prompt)) {
    result = isLeader(agent) ? leaderDispatchReadyWork(root, agent, prompt, options) : leaderWriteBoundary(agent, prompt, "work.dispatch");
  } else if (wantsStartAssignedWork(prompt)) {
    result = isLeader(agent) ? leaderExecuteAssignedWork(root, agent, prompt, "started", options) : leaderWriteBoundary(agent, prompt, "work.execution.start");
  } else if (wantsCompleteAssignedWork(prompt)) {
    result = isLeader(agent) ? leaderExecuteAssignedWork(root, agent, prompt, "completed", options) : leaderWriteBoundary(agent, prompt, "work.execution.complete");
  } else if (wantsReviewWork(prompt)) {
    result = isLeader(agent) ? leaderReviewCompletedWork(root, agent, prompt, options) : leaderWriteBoundary(agent, prompt, "work.review");
  } else if (wantsCreate(prompt, "mission")) result = createMission(root, agent, prompt, options);
  else if (wantsCreate(prompt, "campaign")) result = createCampaign(root, agent, prompt, options);
  else if (wantsCreate(prompt, "project")) result = createProject(root, agent, prompt, options);
  else if (wantsCreate(prompt, "workitem") || wantsCreate(prompt, "work item") || wantsCreate(prompt, "task")) {
    result = createWorkItem(root, agent, prompt, options);
  }
  else if (/\b(plan|work items|tasks|break down|orchestrate|dispatch)\b/.test(lower) && /\b(mission|swarm|project)\b/.test(lower)) {
    result = planMission(root, agent, prompt, options);
  } else if (agent.provider === "local") {
    result = { handled: true, reply: officeReport(agent), governance: [], work: [], actions: ["office.report"] };
  }

  if (!result?.handled) return { handled: false, cognition };
  const actions = result.actions ?? [];
  return {
    ...result,
    actions,
    utterance: localUtterance(agent, prompt, result.reply, options, { actions }),
    cognition,
  };
}
