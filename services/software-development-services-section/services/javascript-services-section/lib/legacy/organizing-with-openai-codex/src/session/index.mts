// The codex coding-agent session computer: the generic session substrate
// (workspace discovery, change-impact, charged findings) now lives in
// @emsenn/organizing-with-openai-agents/session and is surfaced here as the
// normative Codex session substrate; codex adds the `codex exec --json` trace
// projection and the four-capability CLI.
export {
  WsPackageSchema,
  wsPackageCarrier,
  findRepoRoot,
  loadWorkspace,
} from "@emsenn/organizing-with-openai-agents/session";
export type { WsPackage, Workspace } from "@emsenn/organizing-with-openai-agents/session";

export {
  ImpactPackageSchema,
  impactPackageCarrier,
  ChangeImpactSchema,
  changeImpactCarrier,
  computeImpact,
  suggestCommands,
} from "@emsenn/organizing-with-openai-agents/session";
export type { ImpactPackage, ChangeImpact } from "@emsenn/organizing-with-openai-agents/session";

export {
  FindingSchema,
  findingCarrier,
  finding,
  recall,
  recallStatus,
} from "@emsenn/organizing-with-openai-agents/session";
export type { Finding } from "@emsenn/organizing-with-openai-agents/session";

export {
  CliResultSchema,
  CapsuleFileSliceSchema,
  SessionCapsuleSchema,
  cliResultCarrier,
  capsuleFileSliceCarrier,
  sessionCapsuleCarrier,
  canonicalizeCliResultAction,
  canonicalizeCapsuleFileSliceAction,
  canonicalizeSessionCapsuleAction,
  actions as codexSessionActions,
  runSessionCli,
} from "./session.mjs";
export type { CliResult } from "./session.mjs";

export {
  codexExecFindings,
  codexExecTrace,
  codexExecTraceEntries,
  codexExecUsageCostEvents,
  codexExecWorkItems,
  codexExecWorkReports,
  canonicalizeTraceEntryAction,
  canonicalizeTraceCellReadingAction,
  canonicalizeCodexWorkTaskAction,
  canonicalizeCodexWorkItemAction,
  canonicalizeCodexWorkReportAction,
  canonicalizeCodexExecTraceAction,
  eventActions,
  parseCodexExecJsonl,
  parseCodexExecTraceJsonl,
} from "./events.mjs";
export type { CodexExecEvent, CodexExecTraceCarrier } from "./events.mjs";
