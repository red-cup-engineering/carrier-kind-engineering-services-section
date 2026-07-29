import {
  finding,
  recallStatus,
  type ChangeImpact,
} from "@emsenn/organizing-with-openai-codex/session";
import {
  dispatchReadiness,
  incumbentProvisions,
  requirements,
  type AgentProvisions,
  type DispatchReadiness,
  type GovernanceDecision,
  type Office,
} from "../../operating/governing/dispatching/readiness.mts";
import {
  charge,
  chargeValue,
  cell,
  type ChargeValueName,
  mark,
  negate,
  witnessedPotential,
} from "@emsenn/relating";

import {
  CODEX_AGENT_CAPABILITIES,
  CODEX_PLATFORM_SESSION,
  CODEX_RECALL_SUBJECTS,
  codexFindingSummary,
  codexPlatformCapabilities,
  type CodexFindingSummary,
  type CodexPlatformCapability,
} from "../../codecs/codex.mts";
import type { SitePlayReading } from "../../site-play.mts";
import {
  codexAgentProvisions,
  codexDispatchFiber,
  codexDispatchOffices,
  codexGovernanceDecisions,
} from "../../operating/governing/dispatching/readiness.mts";
import {
  assignWork,
  deriveWorkType,
  officeName,
  officeTerm,
  predicate,
  term,
  termKey,
  workItem,
  workChargeStatus,
  workProject,
  workPriority,
  workPrompt,
  workReport,
  workStatusName,
  workTask,
  workTitle,
  type WorkAssignment,
  type WorkItem,
  type WorkProject,
  type WorkReport,
  type WorkType,
} from "../../work-carriers.mts";

type WorkStatusName = "proposed" | "assigned" | "active" | "blocked" | "complete";

export type CodexBridgeWork = Readonly<{
  item: WorkItem;
  assignment: WorkAssignment;
  readiness: DispatchReadiness;
  workType: WorkType;
}>;

export type CodexPlatformSession = Readonly<{
  kind: "operations-manifold.codex.platform.session";
  id: string;
  agent: string;
  at: string;
  metadata: Readonly<{
    benchmark: string;
    focus: string;
  }>;
}>;

export type CodexHolographyProjection = Readonly<{
  session: CodexPlatformSession;
  capabilities: readonly CodexPlatformCapability[];
  findings: readonly CodexFindingSummary[];
  recall: Readonly<Record<string, ChargeValueName>>;
  offices: readonly Office[];
  provisions: AgentProvisions;
  governance: readonly GovernanceDecision[];
  project: WorkProject;
  work: readonly CodexBridgeWork[];
  reports: readonly WorkReport[];
  next: readonly WorkItem[];
}>;

export function codexHolographyProjection(input: {
  readonly generatedAt: string;
  readonly focus: string | undefined;
  readonly impact: ChangeImpact;
  readonly play: SitePlayReading;
}): CodexHolographyProjection {
  const currentSession: CodexPlatformSession = Object.freeze({
    kind: "operations-manifold.codex.platform.session" as const,
    id: CODEX_PLATFORM_SESSION,
    agent: "operations-manifold",
    at: input.generatedAt,
    metadata: Object.freeze({
      benchmark: "agentic platform runtimes",
      focus: input.focus ?? "@emsenn/koios.news",
    }),
  });
  const capabilities = codexPlatformCapabilities();
  const findings = codexFindingSummaries(input.impact, input.play, capabilities);
  const offices = codexDispatchOffices();
  const agentProvisions = codexAgentProvisions(CODEX_AGENT_CAPABILITIES);
  const governance = codexGovernanceDecisions(agentProvisions, offices[0]!);
  const { project, work } = codexWorkProject(input.generatedAt, input.impact, input.play, offices, agentProvisions);
  const reports = work.map((entry) => workReport({
    term: term(["report", termKey(entry.item.term), "current"]),
    work: entry.item,
    office: entry.assignment.office,
    charge: workChargeStatus(entry.item),
    at: term(["generated-at", input.generatedAt]),
    evidence: Object.freeze([
      term(["summary", `${entry.readiness.ready ? "ready" : `gap:${entry.readiness.gap}`} ${workTitle(entry.item)}`]),
      term(["source", "operations-manifold.holography.llm.codex"]),
      term(["read-work-type", entry.workType]),
      term(["readiness", entry.readiness.delta]),
    ]),
  }));

  return Object.freeze({
    session: currentSession,
    capabilities,
    findings,
    recall: codexRecall(currentSession, findings),
    offices,
    provisions: agentProvisions,
    governance,
    project,
    work,
    reports: Object.freeze(reports),
    next: Object.freeze(work.filter((entry) => workStatusName(entry.item) !== "complete").map((entry) => entry.item).slice(0, 8)),
  });
}

function codexRecall(currentSession: CodexPlatformSession, summaries: readonly CodexFindingSummary[]): Readonly<Record<string, ChargeValueName>> {
  const findings = summaries.map((entry) => finding({
    session: currentSession.id,
    subject: entry.subject,
    predicate: entry.predicate,
    charge: chargeFromValue(entry.value, entry.subject, entry.predicate),
    ...(entry.note === undefined ? {} : { note: entry.note }),
  }));
  const recall: Record<string, ChargeValueName> = {};
  for (const subject of CODEX_RECALL_SUBJECTS) {
    recall[subject.join("/")] = recallStatus(findings, subject);
  }
  return Object.freeze(recall);
}

function chargeFromValue(value: ChargeValueName, subject: readonly string[], predicate: string) {
  return value === "potential"
    ? witnessedPotential(mark({ subject, predicate }))
    : value === "active"
      ? negate(witnessedPotential(mark({ subject, predicate })))
      : charge(chargeValue(value));
}

function codexFindingSummaries(
  impact: ChangeImpact,
  play: SitePlayReading,
  capabilities: readonly CodexPlatformCapability[],
): readonly CodexFindingSummary[] {
  return Object.freeze([
    codexFindingSummary(["operations-manifold", "read-agent-platform"], "has-capability-map", capabilities.every((item) => item.status !== "gap") ? "potential" : "stable", `${capabilities.length} benchmark capabilities mapped`),
    codexFindingSummary(["operations-manifold", "execution-impact"], "has-change-impact", impact.packageImpacts.length > 0 || impact.rootChanges.length > 0 ? "potential" : "active", `${impact.changedFiles.length} changed file(s)`),
    codexFindingSummary(["operations-manifold", "koios-orchestration"], "has-read-site-play", play.steps.length > 0 ? "potential" : "active", `${play.steps.length} read-site-play step(s)`),
    codexFindingSummary(["operations-manifold", "read-work-state"], "has-read-work-items", play.workItems.length > 0 ? "potential" : "active", `${play.workItems.length} site read-work item(s)`),
  ]);
}

function codexWorkProject(
  generatedAt: string,
  impact: ChangeImpact,
  play: SitePlayReading,
  offices: readonly Office[],
  agentProvisions: AgentProvisions,
): { readonly project: WorkProject; readonly work: readonly CodexBridgeWork[] } {
  const work = [
    codexWorkItem("operations-manifold.read-agent-platform.capability-map", "Mount Agent Platform Capability Map", "active", 100, "operations-manifold.engineering", "Compare 561 Group Operations Manifold to multiple contemporary agent software runtimes and expose the gap as data.", ["read-agent-platform"]),
    codexWorkItem("operations-manifold.read-agent-platform.session-state", "Externalize Session Memory And Recall", "active", 95, "operations-manifold.engineering", "Route goals, findings, recalls, and continuation state through 561 Group Operations Manifold instead of chat-only memory.", ["animating.doing.learning", "read-session"]),
    codexWorkItem("operations-manifold.read-agent-platform.execution-trace", "Ingest Agent Run Traces", "complete", 90, "operations-manifold.engineering", "Accept agent runtime traces through a neutral transport and project them to trace, findings, read-work reports, and MCP output.", ["read-agent-run-trace", "codexExecTrace", "animating.topology.trace"]),
    codexWorkItem("operations-manifold.read-agent-platform.governance", "Gate Tool Use Through Dispatch", "active", 85, "operations-manifold.governance", "Use capability and authority residuation for operations instead of implicit tool access.", ["governOperation", "dispatchReadiness"]),
    codexWorkItem("operations-manifold.read-agent-platform.impact", "Verify Current Change Impact", impact.suggestedCommands.length > 0 ? "active" : "complete", 80, "operations-manifold.engineering", impactSummary(impact), ["gitStatus", "changeImpact"]),
    ...play.workItems.map((item) => codexWorkItem(
      item.workId,
      item.fields.title,
      item.fields.requiredSkill === "fable" ? "assigned" : "active",
      item.fields.priority,
      item.fields.requiredSkill === "fable" ? "koios.newsroom" : "operations-manifold.engineering",
      item.fields.summary,
      [item.fields.source],
    )),
  ];
  const assignments = work.map((item) => assignWork({
    term: term(["assignment", termKey(item.term)]),
    work: item,
    office: item.office ?? officeTerm("operations-manifold.engineering"),
    duties: Object.freeze([item.task.term]),
    at: term(["generated-at", generatedAt]),
    evidence: Object.freeze([term(["source", "operations-manifold.holography.llm.codex"])]),
  }));
  const project = workProject({
    term: term(["operations-manifold", "read-agent-platform"]),
    work,
    offices: Object.freeze(offices.map((item) => item.term)),
    assignments,
    evidence: Object.freeze([
      term(["title", "561 Group Operations Manifold Agentic Platform Work"]),
      term(["generated-at", generatedAt]),
      term(["impact-packages", impact.packageImpacts.length]),
      term(["read-site-play-steps", play.steps.length]),
    ]),
  });
  const engineering = offices.find((item) => officeName(item.term) === "operations-manifold.engineering") ?? offices[0]!;
  const governance = offices.find((item) => officeName(item.term) === "operations-manifold.governance") ?? engineering;
  const newsroom = offices.find((item) => officeName(item.term) === "koios.newsroom") ?? engineering;
  const capabilities = agentProvisions.capabilities ?? codexDispatchFiber([]);
  return {
    project,
    work: Object.freeze(work.map((item) => {
      const assignment = assignments.find((candidate) => termKey(candidate.work.term) === termKey(item.term))!;
      const itemOffice = officeName(item.office, "operations-manifold.engineering");
      const officeValue = itemOffice === "koios.newsroom" ? newsroom : itemOffice === "operations-manifold.governance" ? governance : engineering;
      return Object.freeze({
        item,
        assignment,
        readiness: readinessFor(item, officeValue, capabilities),
        workType: workTypeFor(item),
      });
    })),
  };
}

function readinessFor(item: WorkItem, officeValue: Office, capabilities: NonNullable<AgentProvisions["capabilities"]>): DispatchReadiness {
  const itemOffice = officeName(item.office, "operations-manifold.engineering");
  const capabilityRequirements = itemOffice === "koios.newsroom"
    ? ["news.edit"]
    : itemOffice === "operations-manifold.governance"
      ? ["governance.dispatch"]
      : ["code.edit"];
  const authorityRequirements = itemOffice === "koios.newsroom"
    ? ["review-copy"]
    : itemOffice === "operations-manifold.governance"
      ? ["assign-read-work"]
      : ["edit-site-code"];
  return dispatchReadiness(
    requirements({ capabilities: codexDispatchFiber(capabilityRequirements), authorities: codexDispatchFiber(authorityRequirements, "authority") }),
    incumbentProvisions(capabilities, officeValue),
  );
}

function impactSummary(impact: ChangeImpact): string {
  if (impact.suggestedCommands.length === 0) return "read-working tree has no package verification suggestions";
  const head = impact.suggestedCommands.slice(0, 8).join("; ");
  const rest = impact.suggestedCommands.length > 8 ? `; +${impact.suggestedCommands.length - 8} more suggested command(s)` : "";
  return `${impact.changedFiles.length} changed file(s), ${impact.packageImpacts.length} impacted package(s): ${head}${rest}`;
}

function codexWorkItem(
  id: string,
  title: string,
  status: WorkStatusName,
  priority: number,
  officeValue: string,
  prompt: string,
  evidence: readonly string[],
): WorkItem {
  const subject = term(["operations-manifold", "read-agent-platform", id]);
  const taskCarrier = workTask({
    term: term(["operations-manifold", "read-agent-platform", id, "task"]),
    goals: Object.freeze([
      cell(subject, predicate(["operations-manifold", "normalize"]), term(["site", officeValue])),
    ]),
    evidence: Object.freeze([
      term(["title", title]),
      term(["status", status]),
      term(["priority", priority]),
      term(["prompt", prompt]),
      term(["source", "operations-manifold.holography.llm.codex"]),
      ...evidence.map((entry) => term(["evidence", entry])),
    ]),
  });
  return workItem({
    term: subject,
    task: taskCarrier,
    office: officeTerm(officeValue),
    evidence: Object.freeze([
      term(["title", title]),
      term(["status", status]),
      term(["priority", priority]),
      term(["prompt", prompt]),
      term(["source", "operations-manifold.holography.llm.codex"]),
      ...evidence.map((entry) => term(["evidence", entry])),
    ]),
  });
}

function workTypeFor(item: WorkItem): WorkType {
  const status = workStatusName(item);
  return deriveWorkType({
    goalCells: Object.freeze([{ cell: termKey(item.term), determinedAtDispatch: status !== "proposed" }]),
    rules: Object.freeze([{ name: termKey(item.task.term), branching: status === "proposed" || status === "blocked" }]),
  });
}
