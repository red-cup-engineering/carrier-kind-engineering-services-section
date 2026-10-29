// @red-cup-engineering/organizing-with-claude/session - Claude-facing coding-agent session substrate.
//
// The generic workspace/impact/findings and mount carriers live upstream in
// @red-cup-engineering/organizing-with-llm-agents. This package exposes them as the normative
// Claude session surface so Claude leaves depend on Claude, not the raw generic
// substrate.
export {
  WsPackageSchema,
  wsPackageCarrier,
  findRepoRoot,
  loadWorkspace,
} from "@red-cup-engineering/organizing-with-llm-agents/session";
export type { WsPackage, Workspace } from "@red-cup-engineering/organizing-with-llm-agents/session";

export {
  ImpactPackageSchema,
  impactPackageCarrier,
  ChangeImpactSchema,
  changeImpactCarrier,
  computeImpact,
  suggestCommands,
} from "@red-cup-engineering/organizing-with-llm-agents/session";
export type { ImpactPackage, ChangeImpact } from "@red-cup-engineering/organizing-with-llm-agents/session";

export {
  FindingSchema,
  findingCarrier,
  finding,
  recall,
  recallStatus,
} from "@red-cup-engineering/organizing-with-llm-agents/session";
export type { Finding } from "@red-cup-engineering/organizing-with-llm-agents/session";

export {
  FindingLogEntrySchema,
  SessionRecallSchema,
  SessionStateSchema,
  findingLogEntryCarrier,
  sessionRecallCarrier,
  sessionStateCarrier,
  findingLogEntry,
  findingLogEntryTerm,
  findingFromLogEntry,
  appendSessionFindings,
  readSessionFindings,
  recallSessionSubject,
  renderSessionRecall,
  sessionStateFold,
  sessionStateTerm,
  cutSessionState,
} from "@red-cup-engineering/organizing-with-llm-agents/session";
export type {
  FindingLogEntryCarrier,
  SessionRecallCarrier,
  SessionStateCarrier,
} from "@red-cup-engineering/organizing-with-llm-agents/session";

export {
  DatePartitionSchema,
  datePartitionCarrier,
  MountRecordSchema,
  mountRecordCarrier,
  dataMountRoot,
  datePartition,
  logPath,
  statePath,
  recordPath,
  appendLog,
  readLog,
  writeState,
  readState,
  cutRecord,
} from "@red-cup-engineering/organizing-with-llm-agents/mount";
export type {
  DatePartition,
  MountRecord,
  JsonValue,
  LogFold,
} from "@red-cup-engineering/organizing-with-llm-agents/mount";
