/** Agent skill-proposal read model. */
import type {
  SequenceCandidate,
  SequenceRecurrenceMeasurement,
} from "../lib/math/number/sequence-recurrence.mts";

export type AgentSkillProposalState =
  | "reviewable"
  | "needs-more-support"
  | "needs-cross-session-evidence"
  | "needs-failure-review";

export type AgentSkillProposalRisk = "low" | "medium" | "high";

export interface AgentSkillProposalGate {
  readonly name:
    | "strict-input-schema"
    | "strict-output-schema"
    | "authorization-scopes"
    | "effect-report"
    | "verification"
    | "human-approval"
    | "supply-chain-review";
  readonly state: "required";
}

export interface AgentSkillProposal {
  readonly kind: "metroplat.agent.skill-proposal";
  readonly id: string;
  readonly state: AgentSkillProposalState;
  readonly risk: AgentSkillProposalRisk;
  readonly chain: readonly string[];
  readonly support: number;
  readonly sessions: readonly string[];
  readonly argShapes: readonly (readonly string[])[];
  readonly excludedInvalid: number;
  readonly gates: readonly AgentSkillProposalGate[];
  readonly evidence: readonly string[];
}

export interface AgentSkillProposalDossierOptions {
  readonly date: string;
  readonly source?: string;
  readonly minSupport?: number;
  readonly minSessions?: number;
}

export interface AgentSkillProposalDossier {
  readonly kind: "metroplat.agent.skill-proposal-dossier";
  readonly date: string;
  readonly source: string;
  readonly policy: "proposal-only-human-approval-required";
  readonly minSupport: number;
  readonly minSessions: number;
  readonly candidates: number;
  readonly reviewable: number;
  readonly proposals: readonly AgentSkillProposal[];
  readonly evidence: readonly string[];
}

const DEFAULT_MIN_SUPPORT = 2;
const DEFAULT_MIN_SESSIONS = 1;

const REVIEW_GATES: readonly AgentSkillProposalGate[] = Object.freeze([
  Object.freeze({ name: "strict-input-schema", state: "required" as const }),
  Object.freeze({ name: "strict-output-schema", state: "required" as const }),
  Object.freeze({ name: "authorization-scopes", state: "required" as const }),
  Object.freeze({ name: "effect-report", state: "required" as const }),
  Object.freeze({ name: "verification", state: "required" as const }),
  Object.freeze({ name: "human-approval", state: "required" as const }),
  Object.freeze({ name: "supply-chain-review", state: "required" as const }),
]);

const HIGH_RISK_PREFIXES = Object.freeze(["write", "delete", "remove", "trash", "commit", "push", "send", "publish", "deploy", "install", "exec", "run", "shell", "http", "mcp", "archive", "label", "calendar", "mail"]);
const MEDIUM_RISK_PREFIXES = Object.freeze(["read", "search", "fetch", "list", "summarize", "draft", "plan", "classify", "review"]);

function slugPart(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  return slug.length === 0 ? "step" : slug;
}

function proposalId(candidate: SequenceCandidate): string {
  return `skill-proposal:${candidate.chain.map(slugPart).join("__")}`;
}

function riskOfCandidate(candidate: SequenceCandidate): AgentSkillProposalRisk {
  const verbs = candidate.chain.map(slugPart);
  if (verbs.some((verb) => HIGH_RISK_PREFIXES.some((prefix) => verb.startsWith(prefix)))) return "high";
  if (verbs.some((verb) => MEDIUM_RISK_PREFIXES.some((prefix) => verb.startsWith(prefix)))) return "medium";
  return "low";
}

function stateOfCandidate(
  candidate: SequenceCandidate,
  minSupport: number,
  minSessions: number,
): AgentSkillProposalState {
  if (candidate.excludedInvalid > 0) return "needs-failure-review";
  if (candidate.support < minSupport) return "needs-more-support";
  if (candidate.sessions.length < minSessions) return "needs-cross-session-evidence";
  return "reviewable";
}

function proposalOfCandidate(
  candidate: SequenceCandidate,
  options: { readonly minSupport: number; readonly minSessions: number },
): AgentSkillProposal {
  const state = stateOfCandidate(candidate, options.minSupport, options.minSessions);
  const risk = riskOfCandidate(candidate);
  return Object.freeze({
    kind: "metroplat.agent.skill-proposal" as const,
    id: proposalId(candidate),
    state,
    risk,
    chain: candidate.chain,
    support: candidate.support,
    sessions: candidate.sessions,
    argShapes: candidate.argShapes,
    excludedInvalid: candidate.excludedInvalid,
    gates: REVIEW_GATES,
    evidence: Object.freeze([
      `support:${candidate.support}`,
      `sessions:${candidate.sessions.length}`,
      `excluded-invalid:${candidate.excludedInvalid}`,
      `risk:${risk}`,
      `state:${state}`,
      "policy:proposal-only-human-approval-required",
    ]),
  });
}

function compareProposals(left: AgentSkillProposal, right: AgentSkillProposal): number {
  const leftReady = left.state === "reviewable" ? 0 : 1;
  const rightReady = right.state === "reviewable" ? 0 : 1;
  if (leftReady !== rightReady) return leftReady - rightReady;
  if (left.support !== right.support) return right.support - left.support;
  if (left.sessions.length !== right.sessions.length) return right.sessions.length - left.sessions.length;
  if (left.chain.length !== right.chain.length) return right.chain.length - left.chain.length;
  return left.id.localeCompare(right.id);
}

export function agentSkillProposalDossier(
  measurement: SequenceRecurrenceMeasurement,
  options: AgentSkillProposalDossierOptions,
): AgentSkillProposalDossier {
  const minSupport = options.minSupport ?? DEFAULT_MIN_SUPPORT;
  const minSessions = options.minSessions ?? DEFAULT_MIN_SESSIONS;
  const proposals = Object.freeze(measurement.candidates
    .map((candidate) => proposalOfCandidate(candidate, { minSupport, minSessions }))
    .sort(compareProposals));
  const reviewable = proposals.filter((proposal) => proposal.state === "reviewable").length;
  return Object.freeze({
    kind: "metroplat.agent.skill-proposal-dossier" as const,
    date: options.date,
    source: options.source ?? "sequence-recurrence",
    policy: "proposal-only-human-approval-required" as const,
    minSupport,
    minSessions,
    candidates: measurement.candidates.length,
    reviewable,
    proposals,
    evidence: Object.freeze([
      `measurement:${measurement.kind}`,
      `candidates:${measurement.candidates.length}`,
      `reviewable:${reviewable}`,
      `min-support:${minSupport}`,
      `min-sessions:${minSessions}`,
      "gates:strict-input-schema,strict-output-schema,authorization-scopes,effect-report,verification,human-approval,supply-chain-review",
    ]),
  });
}
