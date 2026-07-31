/**
 * @red-cup-engineering/claude-infotics — Red Cup Engineering's Claude capability, as an
 * application ON the MetroPlat platform.
 *
 * It is NOT a standalone toolkit: its Claude capabilities are authored as
 * MetroPlat `Operation`s and composed with the platform operations it reuses,
 * and every face (CLI, HTTP, MCP, LSP) is DERIVED by the platform from that one
 * catalog. Drive it with the `claude-infotics` bin, or mount the catalog/surface
 * programmatically.
 *
 *   claude-run           drive the claude binary (integrations/process)
 *   claude-complete      Anthropic Messages completion (integrations/anthropic)
 *   claude-harness-plan  compose MCP/hooks/context into run options
 *   claude-capsule       slice files into a context capsule
 *   claude-finding       record a durable finding (journal EAVT row)
 *   claude-recall        recall a subject's findings (journal causal fold)
 *   claude-impact        git change → module reverse-dependents
 *   claude-project-run   a run → work items + token usage/cost
 *   + reused platform ops: claude-session-*, claude-fleet, workspace-change-readout
 *
 * @packageDocumentation
 */
export { claudeInfoticsOperations } from "./catalog.mts";
export { claudeInfoticsSurface } from "./surface.mts";
export { CLAUDE_INFOTICS_PROGRAM, CLAUDE_INFOTICS_SUBJECT, claudeInfoticsGrants } from "./authorization.mts";
export { claudeRunOperations, claudeArgv } from "./operations/run.mts";
export { claudeMessagesOperations } from "./operations/messages.mts";
export { claudeHarnessOperations, composeHarnessRunOptions } from "./operations/harness.mts";
export { claudeCapsuleOperations, buildCapsule } from "./operations/capsule.mts";
export { claudeSessionComputerOperations, gitRepoRoot } from "./operations/session.mts";
export { claudeProjectOperations, projectRunWorkItems, projectRunUsage, projectRunCostUsd } from "./operations/project.mts";
export { parseClaudeEvents, summarizeRun, type ClaudeEvent, type ClaudeRunSummary } from "./operations/events.mts";
