import {
  deriveLessons,
  settleLessonJudgments,
  type DerivedLesson,
  type LessonEvidence,
  type LessonJudgment,
  type LessonSettlement,
} from "@red-cup-engineering/knowing/learning";

import { operationsManifoldLogPath, operationsManifoldStatePath } from "../../../package-surface.mts";
import { hash, optionalText } from "../../../records.mts";
import { readMessages, type ChannelMessageRecord, type ReadMessagesParams } from "../../messaging/channels/channel-message.mts";

export type MessageLearningParams = ReadMessagesParams & Readonly<{
  status?: string | undefined;
}>;

export type MessageLearningCandidateKind =
  | "user-directive"
  | "agent-claim"
  | "endpoint-witness"
  | "endpoint-boundary"
  | "budget-pressure"
  | "tool-observation";

export type MessageLearningCandidate = Readonly<{
  id: string;
  kind: MessageLearningCandidateKind;
  messageId: string;
  channel: string;
  role: ChannelMessageRecord["role"];
  speaker: string;
  status: ChannelMessageRecord["status"];
  summary: string;
  review: "candidate" | "review-needed" | "blocked";
  evidence: readonly string[];
}>;

export type MessageLearningReading = Readonly<{
  kind: "operations-manifold.message-learning";
  generatedAt: string;
  query: MessageLearningParams;
  source: Readonly<{
    messages: string;
    state: string;
    upstream: readonly string[];
  }>;
  candidates: readonly MessageLearningCandidate[];
  lessonEvidence: readonly LessonEvidence[];
  lessons: readonly DerivedLesson[];
  judgments: readonly LessonJudgment[];
  settlement: LessonSettlement;
  interfaces: readonly Readonly<{
    bin: string;
    purpose: string;
    params: Readonly<Record<string, string>>;
  }>[];
}>;

export async function deriveMessageLearning(repoRoot: string, params: MessageLearningParams = {}): Promise<MessageLearningReading> {
  const read = await readMessages(repoRoot, params);
  const requestedStatus = optionalText(params.status);
  const messages = requestedStatus === null
    ? read.messages
    : read.messages.filter((message) => message.status === requestedStatus);
  const candidates = Object.freeze(messages.flatMap(messageCandidates));
  const lessonEvidence = Object.freeze(candidates.flatMap(candidateEvidence));
  const judgments = Object.freeze(candidates.map(candidateJudgment));
  const lessons = deriveLessons(lessonEvidence);
  const settlement = settleLessonJudgments(judgments);
  const channel = params.channel ?? params.focus ?? params.q;
  const readMessageParams = channel === undefined
    ? { limit: String(params.limit ?? "24") }
    : { channel, limit: String(params.limit ?? "24") };
  return Object.freeze({
    kind: "operations-manifold.message-learning" as const,
    generatedAt: new Date().toISOString(),
    query: params,
    source: Object.freeze({
      messages: operationsManifoldLogPath("messages"),
      state: operationsManifoldStatePath("messages"),
      upstream: Object.freeze([
        "@red-cup-engineering/knowing/learning.deriveLessons",
        "@red-cup-engineering/knowing/learning.settleLessonJudgments",
        "@emsenn/operations-manifold.readMessages",
      ]),
    }),
    candidates,
    lessonEvidence,
    lessons,
    judgments,
    settlement,
    interfaces: Object.freeze([
      iface("read-messages", "inspect the source messages", readMessageParams),
      iface("read-recognition", "compare derived learning against recognized context sources", { intent: "message learning", focus: "sites/ops.561.group" }),
      iface("consolidate-memory", "read current durable memory snapshots without mutating them", { intent: "message learning review" }),
      iface("update-work", "record review evidence after an officer or agent accepts a lesson", { evidence: "message-learning-review" }),
    ]),
  });
}

function messageCandidates(message: ChannelMessageRecord): readonly MessageLearningCandidate[] {
  const evidence = Object.freeze([message.messageId, ...message.evidence]);
  const directive = directiveCandidate(message, evidence);
  const roleCandidate = roleLearningCandidate(message, evidence);
  const budget = budgetCandidate(message, evidence);
  return Object.freeze([directive, roleCandidate, budget].filter((item): item is MessageLearningCandidate => item !== null));
}

function directiveCandidate(message: ChannelMessageRecord, evidence: readonly string[]): MessageLearningCandidate | null {
  if (message.role !== "user") return null;
  if (!/\b(need|want|should|must|please|focus|prioriti[sz]e|stop|don't|do not|fix|add|remove|rename|commit|push)\b/iu.test(message.text)) return null;
  return candidate(message, "user-directive", "review-needed", `User directive: ${clip(message.text)}`, evidence);
}

function roleLearningCandidate(message: ChannelMessageRecord, evidence: readonly string[]): MessageLearningCandidate | null {
  if (message.role === "endpoint" && (message.status === "error" || message.status === "unavailable")) {
    return candidate(message, "endpoint-boundary", "blocked", `${message.speaker} boundary: ${clip(message.text)}`, evidence);
  }
  if (message.role === "endpoint") {
    return candidate(message, "endpoint-witness", "candidate", `${message.speaker} witness: ${clip(message.text)}`, evidence);
  }
  if (message.role === "agent" || message.role === "assistant") {
    return candidate(message, "agent-claim", "candidate", `${message.speaker} claim: ${clip(message.text)}`, evidence);
  }
  if (message.role === "tool") {
    return candidate(message, "tool-observation", "candidate", `${message.speaker} observed: ${clip(message.text)}`, evidence);
  }
  return null;
}

function budgetCandidate(message: ChannelMessageRecord, evidence: readonly string[]): MessageLearningCandidate | null {
  const warnings = message.budgetWarnings ?? [];
  const pressuredStatus = message.budgetStatus === "exhausted" || message.budgetStatus === "downgrade";
  if (!pressuredStatus && warnings.length === 0 && message.budgetBand !== "over" && message.budgetBand !== "huge") return null;
  return candidate(message, "budget-pressure", "review-needed", `Budget pressure on ${message.channel}: ${[message.budgetStatus, message.budgetBand, ...warnings].filter(Boolean).join(", ")}`, evidence);
}

function candidate(
  message: ChannelMessageRecord,
  kind: MessageLearningCandidateKind,
  review: MessageLearningCandidate["review"],
  summary: string,
  evidence: readonly string[],
): MessageLearningCandidate {
  return Object.freeze({
    id: `message-learning:${kind}:${hash({ kind, messageId: message.messageId, summary }).slice(0, 16)}`,
    kind,
    messageId: message.messageId,
    channel: message.channel,
    role: message.role,
    speaker: message.speaker,
    status: message.status,
    summary,
    review,
    evidence,
  });
}

function candidateEvidence(candidate: MessageLearningCandidate): readonly LessonEvidence[] {
  return Object.freeze([
    {
      subject: candidate.messageId,
      predicate: "operations-manifold.message-yields-learning-candidate",
      object: candidate.kind,
      provenance: candidate,
    },
    {
      subject: candidate.id,
      predicate: "operations-manifold.learning-review-status",
      object: candidate.review,
      provenance: { messageId: candidate.messageId, evidence: candidate.evidence },
    },
  ]);
}

function candidateJudgment(candidate: MessageLearningCandidate): LessonJudgment {
  return Object.freeze({
    name: candidate.kind,
    value: candidate.review === "blocked" ? "absurd" as const : candidate.review === "review-needed" ? "active" as const : "potential" as const,
    reason: candidate.summary,
    path: `messages/${candidate.channel}/${candidate.messageId}`,
  });
}

function iface(bin: string, purpose: string, params: Readonly<Record<string, string>>) {
  return Object.freeze({ bin, purpose, params });
}

function clip(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length > 220 ? `${normalized.slice(0, 220)}...` : normalized;
}
